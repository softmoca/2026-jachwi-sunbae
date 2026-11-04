import { createAuthController, type AuthPort } from '../src/auth/controller';
import type { NativeAuthResult } from '../src/native/NativeJachwiAuth';
import type { AuthLoginRequest, AuthProvider } from '../src/auth/policy';

const request = (
  provider: AuthProvider,
  requestId = 'req_1',
): AuthLoginRequest => ({
  type: 'auth',
  action: 'login',
  requestId,
  provider,
  nonce: 'web-nonce',
});

const port = (
  login: AuthPort['login'],
  overrides: Partial<AuthPort> = {},
): AuthPort => ({
  supported: ['apple', 'kakao'],
  configured: ['apple', 'kakao'],
  login,
  ...overrides,
});

const deferred = () => {
  let resolve!: (value: NativeAuthResult) => void;
  const promise = new Promise<NativeAuthResult>(r => {
    resolve = r;
  });
  return { promise, resolve };
};

describe('auth 컨트롤러', () => {
  it('성공하면 웹이 준 nonce를 그대로 돌려준다', async () => {
    const login = jest.fn().mockResolvedValue({
      status: 'success',
      idToken: 'id',
      authorizationCode: 'code',
    });
    const reply = await createAuthController(port(login)).handle(
      request('apple'),
    );
    expect(login).toHaveBeenCalledWith('apple', 'web-nonce');
    expect(reply).toEqual({
      status: 'success',
      provider: 'apple',
      idToken: 'id',
      authorizationCode: 'code',
      nonce: 'web-nonce',
    });
  });

  it('카카오는 authorizationCode 없이 성공하고, Apple은 없으면 실패로 본다', async () => {
    const login = jest
      .fn()
      .mockResolvedValue({ status: 'success', idToken: 'id' });
    const controller = createAuthController(port(login));
    expect(await controller.handle(request('kakao'))).toEqual({
      status: 'success',
      provider: 'kakao',
      idToken: 'id',
      nonce: 'web-nonce',
    });
    expect(await controller.handle(request('apple'))).toEqual({
      status: 'error',
      provider: 'apple',
      code: 'failed',
      message: 'missing_authorization_code',
    });
  });

  it('취소와 네이티브 오류를 계약 모양으로 바꾼다', async () => {
    const login = jest
      .fn()
      .mockResolvedValueOnce({ status: 'cancelled' })
      .mockResolvedValueOnce({
        status: 'error',
        code: 'not_configured',
        message: 'kakao_oidc_disabled',
      })
      .mockResolvedValueOnce({ status: 'error', code: 'weird' })
      .mockResolvedValueOnce({ status: 'success', idToken: '' })
      .mockRejectedValueOnce(new Error('boom'));
    const controller = createAuthController(port(login));
    expect(await controller.handle(request('kakao'))).toEqual({
      status: 'cancelled',
      provider: 'kakao',
    });
    expect(await controller.handle(request('kakao'))).toEqual({
      status: 'error',
      provider: 'kakao',
      code: 'not_configured',
      message: 'kakao_oidc_disabled',
    });
    expect(await controller.handle(request('kakao'))).toMatchObject({
      code: 'failed',
    });
    expect(await controller.handle(request('kakao'))).toMatchObject({
      code: 'failed',
      message: 'missing_id_token',
    });
    expect(await controller.handle(request('kakao'))).toMatchObject({
      code: 'failed',
      message: 'native_error',
    });
  });

  it('모듈이 없거나 플랫폼이 지원하지 않으면 unavailable로 답한다', async () => {
    expect(await createAuthController(null).handle(request('kakao'))).toEqual({
      status: 'error',
      provider: 'kakao',
      code: 'unavailable',
      message: 'module_missing',
    });
    const login = jest.fn();
    const android = createAuthController(
      port(login, { supported: ['kakao'], configured: ['kakao'] }),
    );
    expect(await android.handle(request('apple'))).toMatchObject({
      code: 'unavailable',
      message: 'unsupported_provider',
    });
    expect(login).not.toHaveBeenCalled();
  });

  it('키가 없으면 네이티브를 부르지 않고 not_configured로 답한다', async () => {
    const login = jest.fn();
    const controller = createAuthController(
      port(login, { configured: ['apple'] }),
    );
    expect(await controller.handle(request('kakao'))).toEqual({
      status: 'error',
      provider: 'kakao',
      code: 'not_configured',
    });
    expect(login).not.toHaveBeenCalled();
  });

  it('진행 중인 로그인이 있으면 다음 요청을 바로 거절하고, 끝나면 다시 받는다', async () => {
    const first = deferred();
    const login = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ status: 'cancelled' });
    const controller = createAuthController(port(login));

    const pending = controller.handle(request('kakao', 'a'));
    expect(await controller.handle(request('apple', 'b'))).toEqual({
      status: 'error',
      provider: 'apple',
      code: 'failed',
      message: 'busy',
    });
    expect(login).toHaveBeenCalledTimes(1);

    first.resolve({ status: 'success', idToken: 'id' });
    expect(await pending).toMatchObject({ status: 'success' });
    expect(await controller.handle(request('kakao', 'c'))).toEqual({
      status: 'cancelled',
      provider: 'kakao',
    });
  });

  it('네이티브가 끝내 답하지 않아도 잠금 시간이 지나면 새 요청을 받는다', async () => {
    let time = 0;
    const stuck = deferred();
    const login = jest
      .fn()
      .mockReturnValueOnce(stuck.promise)
      .mockResolvedValueOnce({ status: 'cancelled' });
    const controller = createAuthController(port(login), {
      now: () => time,
      lockTimeoutMs: 1000,
    });

    controller.handle(request('kakao', 'a'));
    time = 999;
    expect(await controller.handle(request('kakao', 'b'))).toMatchObject({
      message: 'busy',
    });
    time = 1000;
    const late = controller.handle(request('kakao', 'c'));
    // 늦게 끝난 첫 요청이 새 요청의 잠금을 풀면 안 된다.
    stuck.resolve({ status: 'cancelled' });
    await late;
    expect(login).toHaveBeenCalledTimes(2);
  });
});
