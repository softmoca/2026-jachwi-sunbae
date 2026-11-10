import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock('@/shared/lib/analytics/posthog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/analytics/posthog')>()),
  trackPostHogEvent: trackEvent,
}));

import type { requestNativeLogin } from '@/features/auth/lib/nativeAuthBridge';
import { getAuthenticationSnapshot, setAuthentication } from '@/features/auth/model/authStore';
import { isOAuthLinkAvailable } from '@/features/auth/model/oauthAvailability';
import { startNativeOAuthLink } from '@/features/auth/model/oauthFlow';
import { readLinkedProvider } from '@/features/auth/model/oauthLink';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import { server } from '../../../server';

const config: PublicConfig = { apiBaseUrl: 'http://localhost:8080' };
const NONCE_URL = `${config.apiBaseUrl}/api/auth/oauth/:provider/nonce`;
const ID_TOKEN_URL = `${config.apiBaseUrl}/api/auth/oauth/:provider/id-token`;
const success = (data: unknown) => HttpResponse.json({ code: 'SUCCESS', message: '요청에 성공했습니다.', data });
const failure = (code: string, status: number) => HttpResponse.json({ code, message: '실패', errors: [] }, { status });

const signIn = (memberId: number) =>
  setAuthentication({ accessToken: `token-${memberId}`, tokenType: 'Bearer', expiresIn: 900, memberId });
const loginAs = (memberId: number) =>
  http.post(`${config.apiBaseUrl}/api/auth/login`, () =>
    success({ accessToken: `token-${memberId}`, tokenType: 'Bearer', expiresIn: 900, member: { memberId } }),
  );

const oauthEvents = () => trackEvent.mock.calls.filter(([name]) => String(name).startsWith('oauth_link_'));

type Login = typeof requestNativeLogin;
const loginReturns = (result: Awaited<ReturnType<Login>>) => vi.fn<Login>(() => Promise.resolve(result));

/** 서버를 흉내 낸다. 발급한 nonce와 받은 id-token 요청을 기록한다. */
const serveNativeOAuth = () => {
  const calls: string[] = [];
  const bodies: unknown[] = [];
  server.use(
    http.post(NONCE_URL, ({ request, params }) => {
      calls.push(`nonce ${String(params.provider)} ${request.headers.get('Authorization')} ${request.credentials}`);
      return success({ nonce: 'server-nonce' });
    }),
    http.post(ID_TOKEN_URL, async ({ request, params }) => {
      calls.push(`id-token ${String(params.provider)} ${request.headers.get('Authorization')} ${request.credentials}`);
      bodies.push(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { calls, bodies };
};

beforeEach(() => {
  trackEvent.mockClear();
  vi.stubGlobal('__NATIVE_OAUTH_ENABLED__', true);
  window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 2, features: ['auth'], authProviders: ['apple', 'kakao'] };
});

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
  vi.unstubAllGlobals();
});

describe('앱 네이티브 로그인으로 계정 연결', () => {
  it('nonce를 받아 앱에 넘기고, 받은 id_token을 쿠키와 함께 보내 같은 회원에 연결한다', async () => {
    signIn(20);
    server.use(loginAs(20));
    const { calls, bodies } = serveNativeOAuth();
    const login = loginReturns({ status: 'success', idToken: 'kakao-id-token', nonce: 'server-nonce' });

    const notice = await startNativeOAuthLink({
      config,
      provider: 'KAKAO',
      memberId: 20,
      linkedProvider: null,
      countProperties: () => Promise.resolve(2),
      login,
    });

    expect(calls).toEqual(['nonce KAKAO Bearer token-20 include', 'id-token KAKAO Bearer token-20 include']);
    expect(login).toHaveBeenCalledWith({ provider: 'kakao', nonce: 'server-nonce' });
    expect(bodies).toEqual([{ idToken: 'kakao-id-token', nonce: 'server-nonce' }]);
    expect(notice).toMatchObject({ tone: 'success', title: '카카오 계정을 연결했어요' });
    expect(readLinkedProvider(20)).toBe('KAKAO');
    expect(oauthEvents()).toEqual([
      ['oauth_link_started', { provider: 'kakao', already_linked: false, flow: 'native', property_count: 2 }],
      ['oauth_link_completed', { provider: 'kakao', outcome: 'linked', flow: 'native', property_count: 2 }],
    ]);
  });

  it('Apple은 인가 코드도 보내고, 이미 연결된 회원으로 바뀌면 통합으로 안내한다', async () => {
    signIn(20);
    server.use(loginAs(7));
    const { bodies } = serveNativeOAuth();
    const login = loginReturns({
      status: 'success',
      idToken: 'apple-id-token',
      authorizationCode: 'apple-code',
      nonce: 'server-nonce',
    });

    const notice = await startNativeOAuthLink({ config, provider: 'APPLE', memberId: 20, linkedProvider: null, login });

    expect(bodies).toEqual([{ idToken: 'apple-id-token', authorizationCode: 'apple-code', nonce: 'server-nonce' }]);
    expect(notice.title).toBe('Apple 계정으로 기록을 합쳤어요');
    expect(getAuthenticationSnapshot().session?.memberId).toBe(7);
  });

  it('앱에서 취소하면 서버에 보내지 않고 지금 회원을 그대로 둔 채 취소 이벤트를 남긴다', async () => {
    signIn(20);
    const { calls } = serveNativeOAuth();

    const notice = await startNativeOAuthLink({
      config,
      provider: 'APPLE',
      memberId: 20,
      linkedProvider: 'KAKAO',
      login: loginReturns({ status: 'cancelled' }),
    });

    expect(calls).toEqual(['nonce APPLE Bearer token-20 include']);
    expect(notice.title).toBe('계정 연결을 취소했어요');
    expect(getAuthenticationSnapshot().session?.memberId).toBe(20);
    expect(oauthEvents().map(([name, properties]) => [name, properties])).toEqual([
      ['oauth_link_started', { provider: 'apple', already_linked: true, flow: 'native' }],
      ['oauth_link_cancelled', { provider: 'apple', flow: 'native' }],
    ]);
  });

  it.each([
    ['not_configured', 'unavailable', '지금은 계정을 연결할 수 없어요'],
    ['unavailable', 'bridge_unavailable', '지금은 계정을 연결할 수 없어요'],
    ['timeout', 'timeout', '계정을 연결하지 못했어요'],
    ['failed', 'bridge_failed', '계정을 연결하지 못했어요'],
  ] as const)('앱이 %s로 답하면 서버에 보내지 않고 원인을 나눠 남긴다', async (code, nativeReason, title) => {
    signIn(20);
    const { calls } = serveNativeOAuth();

    const notice = await startNativeOAuthLink({
      config,
      provider: 'KAKAO',
      memberId: 20,
      linkedProvider: null,
      login: loginReturns({ status: 'error', code }),
    });

    expect(calls).toHaveLength(1);
    expect(notice.title).toBe(title);
    const [, failed] = oauthEvents().find(([name]) => name === 'oauth_link_failed') ?? [];
    expect(failed).toMatchObject({
      provider: 'kakao',
      flow: 'native',
      native_reason: code === 'not_configured' ? 'not_configured' : nativeReason,
    });
    // 앱 키 문제는 서버 미지원이 아니므로 계속 보여 준다.
    expect(isOAuthLinkAvailable()).toBe(true);
  });

  it('서버에 nonce API가 없으면(404) 앱을 부르지 않고, 앱에서 계정 연결을 숨긴다', async () => {
    signIn(20);
    server.use(http.post(NONCE_URL, () => failure('NOT_FOUND', 404)));
    const login = loginReturns({ status: 'cancelled' });

    const notice = await startNativeOAuthLink({ config, provider: 'KAKAO', memberId: 20, linkedProvider: null, login });

    expect(login).not.toHaveBeenCalled();
    expect(notice.title).toBe('지금은 계정을 연결할 수 없어요');
    expect(oauthEvents()).toEqual([
      [
        'oauth_link_failed',
        { provider: 'kakao', reason: 'unavailable', flow: 'native', native_reason: 'server_unsupported' },
      ],
    ]);
    expect(isOAuthLinkAvailable()).toBe(false);
  });

  it('서버에 id-token API가 없어도 같은 방식으로 숨긴다', async () => {
    signIn(20);
    server.use(
      http.post(NONCE_URL, () => success({ nonce: 'server-nonce' })),
      http.post(ID_TOKEN_URL, () => failure('NOT_FOUND', 404)),
    );

    await startNativeOAuthLink({
      config,
      provider: 'KAKAO',
      memberId: 20,
      linkedProvider: null,
      login: loginReturns({ status: 'success', idToken: 't', nonce: 'server-nonce' }),
    });

    expect(isOAuthLinkAvailable()).toBe(false);
    expect(getAuthenticationSnapshot().session?.memberId).toBe(20);
  });

  it('서버가 id_token이나 nonce를 받지 않으면 지금 회원을 그대로 두고 실패를 안내한다', async () => {
    signIn(20);
    server.use(
      http.post(NONCE_URL, () => success({ nonce: 'server-nonce' })),
      http.post(ID_TOKEN_URL, () => failure('OAUTH_ID_TOKEN_INVALID', 400)),
    );

    const notice = await startNativeOAuthLink({
      config,
      provider: 'APPLE',
      memberId: 20,
      linkedProvider: null,
      login: loginReturns({ status: 'success', idToken: 't', authorizationCode: 'c', nonce: 'server-nonce' }),
    });

    expect(notice.title).toBe('계정을 연결하지 못했어요');
    expect(getAuthenticationSnapshot().session?.memberId).toBe(20);
    expect(oauthEvents().at(-1)).toEqual([
      'oauth_link_failed',
      { provider: 'apple', reason: 'failed', flow: 'native', native_reason: 'token_rejected' },
    ]);
    expect(isOAuthLinkAvailable()).toBe(true);
  });

  it('nonce API가 쿠키를 확인하지 못한 401이면 토큰을 갱신하지 않고 접속 정보 안내를 한다', async () => {
    signIn(20);
    let refreshCalls = 0;
    server.use(
      http.post(NONCE_URL, () => failure('OAUTH_AUTHENTICATION_FAILED', 401)),
      http.post(`${config.apiBaseUrl}/api/auth/refresh`, () => {
        refreshCalls += 1;
        return failure('REFRESH_TOKEN_INVALID', 401);
      }),
    );

    const notice = await startNativeOAuthLink({
      config,
      provider: 'KAKAO',
      memberId: 20,
      linkedProvider: null,
      login: loginReturns({ status: 'cancelled' }),
    });

    expect(notice.title).toBe('이 브라우저의 접속 정보를 확인하지 못했어요');
    expect(refreshCalls).toBe(0);
    expect(getAuthenticationSnapshot().session?.memberId).toBe(20);
  });
});
