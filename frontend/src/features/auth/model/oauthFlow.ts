import { queryClient } from '@/shared/api/queryClient';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import { ApiError, isApiErrorCode, reloadAuthentication } from '../api/apiClient';
import { completeOAuthWithIdToken, issueOAuthNonce, startOAuth } from '../api/oauthApi';
import { type NativeLoginResult, requestNativeLogin } from '../lib/nativeAuthBridge';
import {
  type NativeOAuthFailure,
  toAnalyticsProvider,
  trackOAuthLinkEvent,
  trackOAuthLinkStarted,
} from '../lib/oauthAnalytics';
import { markNativeOAuthServerUnsupported, toNativeAuthProvider } from './oauthAvailability';
import {
  createOAuthFailureNotice,
  createOAuthSuccessNotice,
  type OAuthFailure,
  type OAuthNotice,
  type OAuthProvider,
  type PendingOAuth,
  resolveOAuthOutcome,
  saveLinkedProvider,
  savePendingOAuth,
  takePendingOAuth,
} from './oauthLink';

/** 분석 이벤트에 실을 지금 회원의 매물 수. 화면이 매물 기능에서 넘겨준다. 모르면 `undefined`다. */
export type CountProperties = () => Promise<number | undefined>;

const unknownCount: CountProperties = () => Promise.resolve(undefined);

const withPropertyCount = (count: number | undefined) => (count === undefined ? {} : { property_count: count });

type RequestFailure = Exclude<OAuthFailure, 'unfinished' | 'cancelled'>;

const toStartFailure = (error: unknown): RequestFailure => {
  if (isApiErrorCode(error, 'OAUTH_AUTHENTICATION_FAILED')) return 'session';
  if (
    isApiErrorCode(error, 'OAUTH_PROVIDER_UNAVAILABLE') ||
    (error instanceof ApiError && (error.kind === 'network' || (error.status !== null && error.status >= 500)))
  ) {
    return 'unavailable';
  }
  return 'failed';
};

type StartOptions = {
  config: PublicConfig;
  provider: OAuthProvider;
  memberId: number;
  countProperties?: CountProperties;
  /** 제공자 화면으로 페이지를 옮기는 방법. 테스트에서 바꾼다. */
  leavePage?: (url: string) => void;
};

/** 성공하면 페이지를 떠나므로 결과가 없다. 시작 실패는 바로 안내할 결과를 돌려준다. */
export type OAuthStartResult = { kind: 'left-page' } | { kind: 'finished'; notice: OAuthNotice };

/**
 * 계정 연결을 시작한다. 시작 정보를 남기고 지금 브라우저 탭을 제공자 화면으로 옮긴다.
 * #570 콜백은 시작한 브라우저의 Refresh 쿠키를 요구하고, 성공하면 완료 주소(`/oauth/complete`)로 303을 보낸다.
 * 시작에 실패하면 지금 회원과 인증을 건드리지 않는다(REQ-AUTH-017).
 * 매물 수는 시작 API와 함께 구해 페이지를 떠나기 전까지 기다리는 시간을 늘리지 않는다.
 */
export const startOAuthLink = async ({
  config,
  provider,
  memberId,
  countProperties = unknownCount,
  leavePage = (url) => window.location.assign(url),
}: StartOptions): Promise<OAuthStartResult> => {
  const propertyCount = countProperties().catch(() => undefined);

  let authorizationUrl: string;
  try {
    authorizationUrl = await startOAuth(config, provider);
  } catch (error) {
    const failure = toStartFailure(error);
    trackOAuthLinkEvent('oauth_link_failed', {
      provider: toAnalyticsProvider(provider),
      reason: failure,
      ...withPropertyCount(await propertyCount),
    });
    return { kind: 'finished', notice: createOAuthFailureNotice(failure) };
  }

  trackOAuthLinkStarted({
    provider: toAnalyticsProvider(provider),
    ...withPropertyCount(await propertyCount),
  });
  const pending: PendingOAuth = {
    provider,
    previousMemberId: memberId,
    startedAt: 0,
  };
  savePendingOAuth(pending);
  leavePage(authorizationUrl);
  return { kind: 'left-page' };
};

type FinishOptions = {
  pending: PendingOAuth | null;
  countProperties: CountProperties;
  /** 이전 회원 기준 캐시를 버리는 방법. 복귀 화면은 새로 연 페이지라 모두 비우고, 네이티브 흐름은 지금 화면이 다시 불러오게 한다. */
  resetCache: () => void;
  flow?: 'native';
};

/** 바뀐 쿠키로 다시 로그인해 시작 전후 회원으로 결과를 정한다. 다른 탭에는 로그인이 새 회원을 알린다. */
const finishOAuthLink = async (
  config: PublicConfig,
  { pending, countProperties, resetCache, flow }: FinishOptions,
): Promise<OAuthNotice> => {
  const memberId = await reloadAuthentication(config);
  // 회원과 무관해 보이는 캐시도 이전 회원 기준일 수 있어 모두 버린다.
  resetCache();
  if (pending !== null) saveLinkedProvider(memberId, pending.provider);
  const outcome = resolveOAuthOutcome(pending, memberId);
  trackOAuthLinkEvent('oauth_link_completed', {
    provider: toAnalyticsProvider(pending?.provider),
    ...(outcome === 'completed' ? {} : { outcome }),
    ...(flow === undefined ? {} : { flow }),
    ...withPropertyCount(await countProperties().catch(() => undefined)),
  });
  return createOAuthSuccessNotice(outcome, pending?.provider ?? null);
};

/**
 * OAuth 콜백 뒤 돌아온 화면(`/oauth/complete`)에서 부른다. #570은 성공했을 때만 이 주소로 보낸다.
 * 이전 회원의 토큰과 캐시를 버리고 바뀐 쿠키로 다시 로그인해, 시작 전후 회원으로 결과를 정한다.
 * 완료 이벤트의 매물 수는 바뀐 회원 기준이라, 통합이면 합친 뒤의 수다.
 */
export const completeOAuthLink = (
  config: PublicConfig,
  countProperties: CountProperties = unknownCount,
): Promise<OAuthNotice> =>
  finishOAuthLink(config, { pending: takePendingOAuth(), countProperties, resetCache: () => queryClient.clear() });

/** 서버에 네이티브 로그인 API가 아직 없을 때의 응답. Spring은 없는 경로에 404를 준다. */
const isServerUnsupported = (error: unknown): boolean =>
  error instanceof ApiError && error.status !== null && [404, 405, 501].includes(error.status);

const toNativeLoginFailure = (
  result: Extract<NativeLoginResult, { status: 'error' }>,
): [RequestFailure, NativeOAuthFailure] => {
  switch (result.code) {
    case 'not_configured':
      return ['unavailable', 'not_configured'];
    case 'unavailable':
      return ['unavailable', 'bridge_unavailable'];
    case 'timeout':
      return ['failed', 'timeout'];
    case 'failed':
      return ['failed', 'bridge_failed'];
  }
};

const toIdTokenFailure = (error: unknown): [RequestFailure, NativeOAuthFailure | undefined] => {
  const failure = toStartFailure(error);
  if (failure !== 'failed') return [failure, undefined];
  // 세션 확인 실패와 서버 장애를 뺀 4xx는 서버가 id_token이나 nonce를 받아들이지 않은 것이다.
  return [
    'failed',
    error instanceof ApiError && error.status !== null && error.status < 500 ? 'token_rejected' : undefined,
  ];
};

type NativeStartOptions = Omit<StartOptions, 'leavePage'> & {
  /** 앱에 네이티브 로그인을 요청하는 방법. 테스트에서 바꾼다. */
  login?: typeof requestNativeLogin;
};

/**
 * 앱 WebView에서 계정을 연결한다(#570 2단계, 앱 브리지 #591). 페이지를 떠나지 않는다.
 * 1. `/nonce`로 지금 회원에 묶인 일회용 값을 받는다.
 * 2. 앱에 네이티브 로그인(Apple 로그인 시트, 카카오 SDK)을 요청해 그 nonce가 든 `id_token`을 받는다.
 * 3. `/id-token`으로 보내 서버가 기존 `completeOAuth`로 마치면 바뀐 쿠키로 다시 로그인한다. 결과 판단은 복귀 화면과 같다.
 * 취소나 실패는 지금 회원과 인증을 건드리지 않는다(REQ-AUTH-017). 서버에 API가 없으면 한동안 앱에서 계정 연결을 숨긴다.
 */
export const startNativeOAuthLink = async ({
  config,
  provider,
  memberId,
  countProperties = unknownCount,
  login = requestNativeLogin,
}: NativeStartOptions): Promise<OAuthNotice> => {
  const propertyCount = countProperties().catch(() => undefined);
  const analyticsProvider = toAnalyticsProvider(provider);
  const fail = async (reason: RequestFailure, nativeReason?: NativeOAuthFailure): Promise<OAuthNotice> => {
    if (nativeReason === 'server_unsupported') markNativeOAuthServerUnsupported();
    trackOAuthLinkEvent('oauth_link_failed', {
      provider: analyticsProvider,
      reason,
      flow: 'native',
      ...(nativeReason === undefined ? {} : { native_reason: nativeReason }),
      ...withPropertyCount(await propertyCount),
    });
    return createOAuthFailureNotice(reason);
  };

  let nonce: string;
  try {
    nonce = await issueOAuthNonce(config, provider);
  } catch (error) {
    if (isServerUnsupported(error)) return fail('unavailable', 'server_unsupported');
    return fail(toStartFailure(error));
  }

  trackOAuthLinkEvent('oauth_link_started', {
    provider: analyticsProvider,
    flow: 'native',
    ...withPropertyCount(await propertyCount),
  });
  const result = await login({ provider: toNativeAuthProvider(provider), nonce });
  if (result.status === 'cancelled') {
    trackOAuthLinkEvent('oauth_link_cancelled', {
      provider: analyticsProvider,
      flow: 'native',
      ...withPropertyCount(await propertyCount),
    });
    return createOAuthFailureNotice('cancelled');
  }
  if (result.status === 'error') return fail(...toNativeLoginFailure(result));

  try {
    await completeOAuthWithIdToken(config, provider, {
      idToken: result.idToken,
      ...(result.authorizationCode === undefined ? {} : { authorizationCode: result.authorizationCode }),
      nonce: result.nonce,
    });
  } catch (error) {
    if (isServerUnsupported(error)) return fail('unavailable', 'server_unsupported');
    return fail(...toIdTokenFailure(error));
  }

  return finishOAuthLink(config, {
    pending: { provider, previousMemberId: memberId, startedAt: Date.now() },
    countProperties,
    // 페이지를 떠나지 않으므로 캐시를 비우기만 하면 지금 화면의 조회가 다시 불리지 않는다. 초기화해 다시 불러오게 한다.
    resetCache: () => void queryClient.resetQueries().catch(() => undefined),
    flow: 'native',
  });
};

/**
 * 제공자 화면으로 떠났다가 완료 없이 이 탭으로 돌아왔는지 본다. #570은 취소(`error=access_denied`)와 콜백 실패를
 * API 도메인의 JSON 오류로 끝내므로, 사용자가 뒤로 가기로 돌아오면 쓰지 않은 시작 정보만 남는다.
 * 그때 취소 이벤트를 남기고 안내를 돌려준다. 취소와 실패는 구분하지 못한다. 시작 정보가 없으면 `null`이다.
 */
export const detectUnfinishedOAuthLink = async (
  countProperties: CountProperties = unknownCount,
): Promise<OAuthNotice | null> => {
  const pending = takePendingOAuth();
  if (pending === null) return null;
  trackOAuthLinkEvent('oauth_link_cancelled', {
    provider: toAnalyticsProvider(pending.provider),
    ...withPropertyCount(await countProperties().catch(() => undefined)),
  });
  return createOAuthFailureNotice('unfinished');
};
