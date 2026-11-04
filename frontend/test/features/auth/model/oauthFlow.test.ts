import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { trackEvent, trackOutboundEvent } = vi.hoisted(() => ({ trackEvent: vi.fn(), trackOutboundEvent: vi.fn() }));
vi.mock('@/shared/lib/analytics/posthog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/analytics/posthog')>()),
  trackPostHogEvent: trackEvent,
  trackPostHogOutboundEvent: trackOutboundEvent,
}));

import { getAuthenticationSnapshot, setAuthentication } from '@/features/auth/model/authStore';
import { completeOAuthLink, startOAuthLink } from '@/features/auth/model/oauthFlow';
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

/** 로그인 이벤트는 빼고 OAuth 연결 이벤트만 모은다. */
const oauthEvents = () =>
  [...trackEvent.mock.calls, ...trackOutboundEvent.mock.calls].filter(([name]) =>
    String(name).startsWith('oauth_link_'),
  );

beforeEach(() => {
  trackEvent.mockClear();
  trackOutboundEvent.mockClear();
});

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
});

describe('OAuth 연결 분석 이벤트', () => {
  const kakaoStart = () =>
    server.use(http.post(START_URL, () => success({ authorizationUrl: 'https://kauth.kakao.com/oauth/authorize' })));

  it('시작은 제공자 화면으로 떠나기 직전 Beacon으로 제공자, 기존 연결 여부, 그 시점 매물 수를 남긴다', async () => {
    signIn(20);
    kakaoStart();

    await startOAuthLink({
      config,
      provider: 'KAKAO',
      memberId: 20,
      linkedProvider: null,
      countProperties: () => Promise.resolve(3),
      leavePage: vi.fn(),
    });

    expect(oauthEvents()).toEqual([
      ['oauth_link_started', { provider: 'kakao', already_linked: false, property_count: 3 }],
    ]);
    expect(trackOutboundEvent).toHaveBeenCalledTimes(1);
  });

  it('시작 API가 실패하면 시작 대신 실패 이벤트를 원인과 함께 남긴다', async () => {
    signIn(20);
    server.use(
      http.post(START_URL, () =>
        HttpResponse.json({ code: 'OAUTH_PROVIDER_UNAVAILABLE', message: '장애', errors: [] }, { status: 503 }),
      ),
    );

    await startOAuthLink({
      config,
      provider: 'APPLE',
      memberId: 20,
      linkedProvider: 'KAKAO',
      countProperties: () => Promise.resolve(4),
      leavePage: vi.fn(),
    });

    expect(oauthEvents()).toEqual([
      ['oauth_link_failed', { provider: 'apple', reason: 'unavailable', property_count: 4 }],
    ]);
  });

  it('매물 수를 모르면 추정하지 않고 속성을 빼고 보낸다', async () => {
    signIn(20);
    kakaoStart();

    await startOAuthLink({
      config,
      provider: 'KAKAO',
      memberId: 20,
      linkedProvider: 'APPLE',
      countProperties: () => Promise.reject(new Error('목록 실패')),
      leavePage: vi.fn(),
    });

    expect(oauthEvents()).toEqual([['oauth_link_started', { provider: 'kakao', already_linked: true }]]);
  });

  it('완료는 결과 종류와 바뀐 회원 기준 매물 수를 남긴다', async () => {
    savePendingOAuth({ provider: 'KAKAO', previousMemberId: 20, previousProvider: null });
    signIn(20);
    server.use(loginAs(10));
    let countedAs: number | null = null;

    await completeOAuthLink(config, '', () => {
      countedAs = getAuthenticationSnapshot().session?.memberId ?? null;
      return Promise.resolve(7);
    });

    expect(countedAs).toBe(10);
    expect(oauthEvents()).toEqual([
      ['oauth_link_completed', { provider: 'kakao', outcome: 'merged', property_count: 7 }],
    ]);
  });

  it.each([
    ['linked', 20, null],
    ['switched', 30, 'KAKAO'],
  ] as const)('완료 결과를 %s로 남긴다', async (outcome, newMemberId, previousProvider) => {
    savePendingOAuth({ provider: 'APPLE', previousMemberId: 20, previousProvider });
    signIn(20);
    server.use(loginAs(newMemberId));

    await completeOAuthLink(config, '', () => Promise.resolve(1));

    expect(oauthEvents()).toEqual([['oauth_link_completed', { provider: 'apple', outcome, property_count: 1 }]]);
  });

  it('제공자 화면에서 취소하고 돌아오면 실패가 아니라 취소 이벤트를 남긴다', async () => {
    savePendingOAuth({ provider: 'KAKAO', previousMemberId: 20, previousProvider: null });
    signIn(20);

    await completeOAuthLink(config, '?error=access_denied', () => Promise.resolve(2));

    expect(oauthEvents()).toEqual([['oauth_link_cancelled', { provider: 'kakao', property_count: 2 }]]);
  });

  it('콜백 오류로 돌아오면 실패 이벤트를 남기고, 시작 정보를 잃었으면 제공자를 unknown으로 둔다', async () => {
    signIn(20);

    await completeOAuthLink(config, '?error=server_error', () => Promise.resolve(2));

    expect(oauthEvents()).toEqual([
      ['oauth_link_failed', { provider: 'unknown', reason: 'failed', property_count: 2 }],
    ]);
  });
});

describe('OAuth 계정 연결 시작', () => {
  it('Access Token과 쿠키로 시작해 시작 정보를 남기고 지금 페이지를 제공자 화면으로 옮긴다', async () => {
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

  it('앱 WebView에서도 시스템 브라우저 없이 같은 페이지 이동으로 시작한다', async () => {
    window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 2 };
    signIn(20);
    let startPath = '';
    server.use(
      http.post(START_URL, ({ request }) => {
        startPath = new URL(request.url).pathname + new URL(request.url).search;
        return success({ authorizationUrl: 'https://appleid.apple.com/auth/authorize?response_mode=query' });
      }),
    );
    const leavePage = vi.fn();

    const result = await startOAuthLink({ config, provider: 'APPLE', memberId: 20, linkedProvider: null, leavePage });

    expect(startPath).toBe('/api/auth/oauth/APPLE/start');
    expect(result).toEqual({ kind: 'left-page' });
    expect(leavePage).toHaveBeenCalledWith('https://appleid.apple.com/auth/authorize?response_mode=query');
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
    expect(takePendingOAuth()).toBeNull();
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
});

describe('OAuth 복귀', () => {
  it('익명 회원이 이미 연결된 계정으로 인증하면 새 쿠키의 회원으로 바꾸고 통합 결과를 안내한다', async () => {
    savePendingOAuth({ provider: 'KAKAO', previousMemberId: 20, previousProvider: null });
    signIn(20);
    queryClient.setQueryData(propertyQueryKeys.detail(1), { name: '이전 회원 매물' });
    server.use(loginAs(10));

    const notice = await completeOAuthLink(config, '');

    expect(notice).toMatchObject({ tone: 'success', title: '카카오 계정의 기록을 불러왔어요' });
    expect(getAuthenticationSnapshot().session?.memberId).toBe(10);
    expect(queryClient.getQueryData(propertyQueryKeys.detail(1))).toBeUndefined();
    expect(readLinkedProvider(10)).toBe('KAKAO');
  });

  it('처음 연결하면 회원 번호가 그대로이고 연결 결과를 안내한다', async () => {
    savePendingOAuth({ provider: 'APPLE', previousMemberId: 20, previousProvider: null });
    server.use(loginAs(20));

    await expect(completeOAuthLink(config, '')).resolves.toMatchObject({ title: 'Apple 계정을 연결했어요' });
    expect(readLinkedProvider(20)).toBe('APPLE');
  });

  it('다른 계정을 연결했던 회원이 다른 회원으로 바뀌면 전환으로 안내한다', async () => {
    savePendingOAuth({ provider: 'APPLE', previousMemberId: 10, previousProvider: 'KAKAO' });
    signIn(10);
    server.use(loginAs(30));

    await expect(completeOAuthLink(config, '')).resolves.toMatchObject({ title: 'Apple 계정으로 바꿨어요' });
    expect(readLinkedProvider(30)).toBe('APPLE');
  });

  it('취소나 실패로 돌아오면 다시 로그인하지 않고 지금 회원을 그대로 둔다', async () => {
    savePendingOAuth({ provider: 'KAKAO', previousMemberId: 20, previousProvider: null });
    signIn(20);
    const login = vi.fn();
    server.use(http.post(`${config.apiBaseUrl}/api/auth/login`, login));

    const notice = await completeOAuthLink(config, '?error=access_denied');

    expect(notice).toMatchObject({ tone: 'error', title: '계정 연결을 취소했어요' });
    expect(login).not.toHaveBeenCalled();
    expect(getAuthenticationSnapshot().session?.memberId).toBe(20);
    expect(readLinkedProvider(20)).toBeNull();
  });
});
