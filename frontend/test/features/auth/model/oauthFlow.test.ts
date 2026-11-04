import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAuthenticationSnapshot, setAuthentication } from '@/features/auth/model/authStore';
import { completeWebOAuth, parseAppCallback, startOAuthLink } from '@/features/auth/model/oauthFlow';
import { readLinkedProvider, savePendingOAuth, takePendingOAuth } from '@/features/auth/model/oauthLink';
import { propertyQueryKeys } from '@/features/property/api/propertyQueryKeys';
import { queryClient } from '@/shared/api/queryClient';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import { server } from '../../../server';

const config: PublicConfig = { apiBaseUrl: 'http://localhost:8080' };
const START_URL = `${config.apiBaseUrl}/api/auth/oauth/:provider/start`;
const success = (data: unknown) => HttpResponse.json({ code: 'SUCCESS', message: '요청에 성공했습니다.', data });
const loginAs = (memberId: number) =>
  http.post(`${config.apiBaseUrl}/api/auth/login`, () =>
    success({ accessToken: `token-${memberId}`, tokenType: 'Bearer', expiresIn: 900, member: { memberId } }),
  );

const signIn = (memberId: number) =>
  setAuthentication({ accessToken: `token-${memberId}`, tokenType: 'Bearer', expiresIn: 900, memberId });

const installNativeApp = (reply: (message: { requestId: string; url: string }) => unknown) => {
  window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 2, features: ['auth'] };
  window.ReactNativeWebView = {
    postMessage: (raw: string) => {
      const message = JSON.parse(raw) as { requestId: string; url: string };
      queueMicrotask(() =>
        window.dispatchEvent(
          new CustomEvent('jachwi-auth', {
            detail: { type: 'auth:response', requestId: message.requestId, ...(reply(message) as object) },
          }),
        ),
      );
    },
  };
};

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
  delete window.ReactNativeWebView;
});

describe('OAuth 계정 연결 시작', () => {
  it('웹은 Access Token과 쿠키로 시작해 시작 정보를 남기고 제공자 화면으로 이동한다', async () => {
    signIn(20);
    const requests: string[] = [];
    server.use(
      http.post(START_URL, ({ request, params }) => {
        requests.push(`${String(params.provider)} ${request.headers.get('Authorization')} ${request.credentials}`);
        return success({ authorizationUrl: 'https://kauth.kakao.com/oauth/authorize?state=abc' });
      }),
    );
    const leavePage = vi.fn();

    const result = await startOAuthLink({ config, provider: 'KAKAO', memberId: 20, linkedProvider: null, leavePage });

    expect(result).toEqual({ kind: 'left-page' });
    expect(requests).toEqual(['KAKAO Bearer token-20 include']);
    expect(leavePage).toHaveBeenCalledWith('https://kauth.kakao.com/oauth/authorize?state=abc');
    expect(takePendingOAuth()).toMatchObject({ provider: 'KAKAO', previousMemberId: 20, previousProvider: null });
  });

  it('시작에 실패하면 이동하지 않고 지금 회원을 그대로 둔 채 안내한다', async () => {
    signIn(20);
    server.use(
      http.post(START_URL, () =>
        HttpResponse.json({ code: 'OAUTH_PROVIDER_UNAVAILABLE', message: '장애', errors: [] }, { status: 503 }),
      ),
    );
    const leavePage = vi.fn();

    const result = await startOAuthLink({ config, provider: 'APPLE', memberId: 20, linkedProvider: null, leavePage });

    expect(result).toMatchObject({
      kind: 'finished',
      notice: { tone: 'error', title: '지금은 계정을 연결할 수 없어요' },
    });
    expect(leavePage).not.toHaveBeenCalled();
    expect(getAuthenticationSnapshot().session?.memberId).toBe(20);
  });

  it('제공자 주소가 HTTPS가 아니면 이동하지 않는다', async () => {
    signIn(20);
    server.use(http.post(START_URL, () => success({ authorizationUrl: 'javascript:alert(1)' })));
    const leavePage = vi.fn();

    const result = await startOAuthLink({ config, provider: 'KAKAO', memberId: 20, linkedProvider: null, leavePage });

    expect(result).toMatchObject({ kind: 'finished', notice: { tone: 'error' } });
    expect(leavePage).not.toHaveBeenCalled();
  });

  it('앱에서 사용자가 인증 화면을 닫으면 취소로 안내하고 지금 회원을 그대로 둔다', async () => {
    signIn(20);
    installNativeApp(() => ({ ok: false, error: 'cancelled' }));
    let startPath = '';
    server.use(
      http.post(START_URL, ({ request }) => {
        startPath = new URL(request.url).search;
        return success({ authorizationUrl: 'https://kauth.kakao.com/oauth/authorize' });
      }),
    );
    const leavePage = vi.fn();

    const result = await startOAuthLink({ config, provider: 'KAKAO', memberId: 20, linkedProvider: null, leavePage });

    expect(startPath).toBe('?client=app');
    expect(result).toMatchObject({ kind: 'finished', notice: { title: '계정 연결을 취소했어요' } });
    expect(leavePage).not.toHaveBeenCalled();
    expect(getAuthenticationSnapshot().session?.memberId).toBe(20);
  });

  it('앱은 시스템 인증 화면이 돌려준 완료 코드로 인증을 바꾼 뒤 복귀 화면을 연다', async () => {
    signIn(20);
    const opened: string[] = [];
    installNativeApp((message) => {
      opened.push(message.url);
      return { ok: true, callbackUrl: 'jachwisunbae://auth/oauth/complete?code=one-time&result=merged' };
    });
    let completedCode: unknown = null;
    server.use(
      http.post(START_URL, () => success({ authorizationUrl: 'https://appleid.apple.com/auth/authorize' })),
      http.post(`${config.apiBaseUrl}/api/auth/oauth/complete`, async ({ request }) => {
        completedCode = ((await request.json()) as { code: string }).code;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const leavePage = vi.fn();

    const result = await startOAuthLink({ config, provider: 'APPLE', memberId: 20, linkedProvider: null, leavePage });

    expect(opened).toEqual(['https://appleid.apple.com/auth/authorize']);
    expect(completedCode).toBe('one-time');
    expect(result).toEqual({ kind: 'left-page' });
    expect(leavePage).toHaveBeenCalledWith('/oauth/complete?result=merged');
    expect(takePendingOAuth()).toMatchObject({ provider: 'APPLE', previousMemberId: 20 });
  });

  it('앱 콜백은 우리 스킴의 완료 코드나 오류만 받는다', () => {
    expect(parseAppCallback('jachwisunbae://auth/oauth/complete?code=abc')).toEqual({ code: 'abc', result: null });
    expect(parseAppCallback('jachwisunbae://auth/oauth/complete?error=access_denied')).toEqual({
      error: 'access_denied',
    });
    expect(parseAppCallback('https://evil.example/complete?code=abc')).toBeNull();
    expect(parseAppCallback('jachwisunbae://auth/oauth/complete')).toBeNull();
  });
});

describe('OAuth 복귀', () => {
  it('익명 회원이 이미 연결된 계정으로 인증하면 새 쿠키의 회원으로 바꾸고 통합 결과를 안내한다', async () => {
    savePendingOAuth({ provider: 'KAKAO', previousMemberId: 20, previousProvider: null });
    signIn(20);
    queryClient.setQueryData(propertyQueryKeys.detail(1), { name: '이전 회원 매물' });
    server.use(loginAs(10));

    const notice = await completeWebOAuth(config, '');

    expect(notice).toMatchObject({ tone: 'success', title: '카카오 계정의 기록을 불러왔어요' });
    expect(getAuthenticationSnapshot().session?.memberId).toBe(10);
    expect(queryClient.getQueryData(propertyQueryKeys.detail(1))).toBeUndefined();
    expect(readLinkedProvider(10)).toBe('KAKAO');
  });

  it('처음 연결하면 회원 번호가 그대로이고 연결 결과를 안내한다', async () => {
    savePendingOAuth({ provider: 'APPLE', previousMemberId: 20, previousProvider: null });
    server.use(loginAs(20));

    await expect(completeWebOAuth(config, '')).resolves.toMatchObject({ title: 'Apple 계정을 연결했어요' });
    expect(readLinkedProvider(20)).toBe('APPLE');
  });

  it('취소나 실패로 돌아오면 다시 로그인하지 않고 지금 회원을 그대로 둔다', async () => {
    savePendingOAuth({ provider: 'KAKAO', previousMemberId: 20, previousProvider: null });
    signIn(20);
    const login = vi.fn();
    server.use(http.post(`${config.apiBaseUrl}/api/auth/login`, login));

    const notice = await completeWebOAuth(config, '?error=access_denied');

    expect(notice).toMatchObject({ tone: 'error', title: '계정 연결을 취소했어요' });
    expect(login).not.toHaveBeenCalled();
    expect(getAuthenticationSnapshot().session?.memberId).toBe(20);
    expect(readLinkedProvider(20)).toBeNull();
  });
});
