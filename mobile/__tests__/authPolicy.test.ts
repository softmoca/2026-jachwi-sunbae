import {
  createAuthReplyScript,
  isAuthCallbackUrl,
  parseAuthRequest,
  toAuthSessionError,
} from '../src/auth/policy';

const open = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: 'auth',
    action: 'open',
    requestId: 'abc-1',
    url: 'https://kauth.kakao.com/oauth/authorize?state=x',
    ...overrides,
  });

describe('auth policy', () => {
  it('HTTPS 주소를 여는 요청만 해석한다', () => {
    expect(parseAuthRequest(open())).toEqual({
      type: 'auth',
      action: 'open',
      requestId: 'abc-1',
      url: 'https://kauth.kakao.com/oauth/authorize?state=x',
    });
    for (const overrides of [
      { url: 'http://kauth.kakao.com/oauth/authorize' },
      // eslint-disable-next-line no-script-url -- 실행하지 않는 차단 검증용 입력이다.
      { url: 'javascript:alert(1)' },
      { url: 'https://name:pass@kauth.kakao.com' },
      { url: 'not a url' },
      { action: 'persist-session' },
      { type: 'push' },
      { requestId: '../x' },
    ]) {
      expect(parseAuthRequest(open(overrides))).toBeNull();
    }
    expect(parseAuthRequest('not json')).toBeNull();
  });

  it('콜백은 경로와 상관없이 우리 스킴인지만 본다', () => {
    expect(
      isAuthCallbackUrl('jachwisunbae://auth/oauth/complete?code=one-time'),
    ).toBe(true);
    expect(isAuthCallbackUrl('jachwisunbae://anything?x=1')).toBe(true);
    expect(isAuthCallbackUrl('https://www.jachwi-sunbae.kr')).toBe(false);
    expect(isAuthCallbackUrl('kakaotalk://kakaologin')).toBe(false);
  });

  it('네이티브 거절 코드를 취소, 중복, 실패로 나눈다', () => {
    expect(toAuthSessionError({ code: 'cancelled' })).toBe('cancelled');
    expect(toAuthSessionError({ code: 'busy' })).toBe('busy');
    expect(toAuthSessionError({ code: 'failed' })).toBe('failed');
    expect(toAuthSessionError(new Error('unknown'))).toBe('failed');
  });

  it('응답은 요청한 웹 출처에서만 이벤트로 전달한다', () => {
    const script = createAuthReplyScript('https://www.jachwi-sunbae.kr', {
      type: 'auth:response',
      requestId: 'r1',
      ok: true,
    });
    expect(script).toContain(
      'window.location.origin === "https://www.jachwi-sunbae.kr"',
    );
    expect(script).toContain("new CustomEvent('jachwi-auth'");
  });
});
