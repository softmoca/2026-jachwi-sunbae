import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestNativeLogin } from '@/features/auth/lib/nativeAuthBridge';

type Sent = { type: string; action: string; requestId: string; provider: string; nonce: string };

/** 앱처럼 메시지를 받고 `jachwi-auth` 이벤트로 답한다. */
const installApp = (reply: (sent: Sent) => Record<string, unknown> | null) => {
  const sent: Sent[] = [];
  window.ReactNativeWebView = {
    postMessage: (raw: string) => {
      const message = JSON.parse(raw) as Sent;
      sent.push(message);
      const detail = reply(message);
      if (detail === null) return;
      queueMicrotask(() =>
        window.dispatchEvent(new CustomEvent('jachwi-auth', { detail: { requestId: message.requestId, ...detail } })),
      );
    },
  };
  return sent;
};

afterEach(() => {
  delete window.ReactNativeWebView;
  vi.useRealTimers();
});

describe('네이티브 로그인 브리지', () => {
  it('#591 형식으로 요청하고 같은 requestId의 성공 응답에서 토큰을 받는다', async () => {
    const sent = installApp(({ nonce }) => ({
      status: 'success',
      provider: 'apple',
      idToken: 'id-token',
      authorizationCode: 'code',
      nonce,
    }));

    const result = await requestNativeLogin({ provider: 'apple', nonce: 'nonce-1' });

    expect(sent).toEqual([
      {
        type: 'auth',
        action: 'login',
        requestId: expect.stringMatching(/^[A-Za-z0-9_-]{1,64}$/),
        provider: 'apple',
        nonce: 'nonce-1',
      },
    ]);
    expect(result).toEqual({ status: 'success', idToken: 'id-token', authorizationCode: 'code', nonce: 'nonce-1' });
  });

  it('다른 requestId의 응답은 무시하고 자기 응답을 기다린다', async () => {
    installApp(({ nonce, requestId }) => {
      window.dispatchEvent(
        new CustomEvent('jachwi-auth', {
          detail: { requestId: `${requestId}-other`, status: 'success', idToken: 'other', nonce },
        }),
      );
      return { status: 'cancelled', provider: 'kakao' };
    });

    await expect(requestNativeLogin({ provider: 'kakao', nonce: 'n' })).resolves.toEqual({ status: 'cancelled' });
  });

  it('돌려준 nonce가 다르거나 토큰이 없으면 실패로 본다', async () => {
    installApp(() => ({ status: 'success', provider: 'kakao', idToken: 'id-token', nonce: 'other' }));
    await expect(requestNativeLogin({ provider: 'kakao', nonce: 'n' })).resolves.toEqual({
      status: 'error',
      code: 'failed',
    });

    installApp(({ nonce }) => ({ status: 'success', provider: 'kakao', nonce }));
    await expect(requestNativeLogin({ provider: 'kakao', nonce: 'n' })).resolves.toEqual({
      status: 'error',
      code: 'failed',
    });
  });

  it('앱 오류 코드는 그대로, 모르는 코드는 실패로 받는다. 원인 메시지는 버린다', async () => {
    installApp(() => ({ status: 'error', provider: 'kakao', code: 'not_configured', message: 'kakao_oidc_disabled' }));
    await expect(requestNativeLogin({ provider: 'kakao', nonce: 'n' })).resolves.toEqual({
      status: 'error',
      code: 'not_configured',
    });

    installApp(() => ({ status: 'error', provider: 'kakao', code: 'brand_new' }));
    await expect(requestNativeLogin({ provider: 'kakao', nonce: 'n' })).resolves.toEqual({
      status: 'error',
      code: 'failed',
    });
  });

  it('앱 통로가 없으면 바로 unavailable로 답한다', async () => {
    await expect(requestNativeLogin({ provider: 'apple', nonce: 'n' })).resolves.toEqual({
      status: 'error',
      code: 'unavailable',
    });
  });

  it('앱이 시간 안에 답하지 않으면 timeout으로 끝내고 늦은 응답은 무시한다', async () => {
    vi.useFakeTimers();
    installApp(() => null);

    const result = requestNativeLogin({ provider: 'kakao', nonce: 'n', timeoutMs: 1_000 });
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(result).resolves.toEqual({ status: 'error', code: 'timeout' });
  });
});
