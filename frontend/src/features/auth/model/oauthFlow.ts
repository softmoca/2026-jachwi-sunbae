import { queryClient } from '@/shared/api/queryClient';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import { ApiError, isApiErrorCode, reloadAuthentication } from '../api/apiClient';
import { startOAuth } from '../api/oauthApi';
import { toAnalyticsProvider, trackOAuthLinkEvent, trackOAuthLinkStarted } from '../lib/oauthAnalytics';
import {
  createOAuthFailureNotice,
  createOAuthSuccessNotice,
  type OAuthFailure,
  type OAuthNotice,
  type OAuthProvider,
  parseOAuthFailure,
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

const toFailure = (error: unknown): OAuthFailure =>
  isApiErrorCode(error, 'OAUTH_PROVIDER_UNAVAILABLE') ||
  (error instanceof ApiError && (error.kind === 'network' || (error.status !== null && error.status >= 500)))
    ? 'unavailable'
    : 'failed';

/** 취소와 실패를 다른 이벤트로 남기고 안내를 만든다. 지금 회원과 인증은 건드리지 않는다. */
const fail = (
  provider: OAuthProvider | null,
  failure: OAuthFailure,
  propertyCount: number | undefined,
): OAuthNotice => {
  const properties = { provider: toAnalyticsProvider(provider), ...withPropertyCount(propertyCount) };
  if (failure === 'cancelled') trackOAuthLinkEvent('oauth_link_cancelled', properties);
  else trackOAuthLinkEvent('oauth_link_failed', { ...properties, reason: failure });
  return createOAuthFailureNotice(failure);
};

type StartOptions = {
  config: PublicConfig;
  provider: OAuthProvider;
  memberId: number;
  linkedProvider: OAuthProvider | null;
  countProperties?: CountProperties;
  /** 제공자 화면으로 페이지를 옮기는 방법. 테스트에서 바꾼다. */
  leavePage?: (url: string) => void;
};

/** 성공하면 페이지를 떠나므로 결과가 없다. 시작 실패는 바로 안내할 결과를 돌려준다. */
export type OAuthStartResult = { kind: 'left-page' } | { kind: 'finished'; notice: OAuthNotice };

/**
 * 계정 연결을 시작한다. 시작 정보를 남기고 지금 브라우저 탭을 제공자 화면으로 옮긴다.
 * 백엔드 콜백은 시작한 브라우저의 Refresh 쿠키를 요구한다. 콜백이 끝나면 서버가 `/oauth/complete`로 돌려보낸다.
 * 시작에 실패하면 지금 회원과 인증을 건드리지 않는다(REQ-AUTH-017).
 * 매물 수는 시작 API와 함께 구해 페이지를 떠나기 전까지 기다리는 시간을 늘리지 않는다.
 */
export const startOAuthLink = async ({
  config,
  provider,
  memberId,
  linkedProvider,
  countProperties = unknownCount,
  leavePage = (url) => window.location.assign(url),
}: StartOptions): Promise<OAuthStartResult> => {
  const propertyCount = countProperties().catch(() => undefined);

  let authorizationUrl: string;
  try {
    authorizationUrl = await startOAuth(config, provider);
  } catch (error) {
    return { kind: 'finished', notice: fail(provider, toFailure(error), await propertyCount) };
  }

  trackOAuthLinkStarted({
    provider: toAnalyticsProvider(provider),
    already_linked: linkedProvider !== null,
    ...withPropertyCount(await propertyCount),
  });
  const pending: PendingOAuth = {
    provider,
    previousMemberId: memberId,
    previousProvider: linkedProvider,
    startedAt: 0,
  };
  savePendingOAuth(pending);
  leavePage(authorizationUrl);
  return { kind: 'left-page' };
};

/**
 * OAuth 콜백 뒤 돌아온 화면(`/oauth/complete`)에서 부른다. 오류가 있으면 지금 회원을 그대로 두고 안내만 만든다.
 * 성공했으면 이전 회원의 토큰과 캐시를 버리고 바뀐 쿠키로 다시 로그인해 결과를 정한다. 다른 탭에는 로그인이 새 회원을 알린다.
 * 완료 이벤트의 매물 수는 바뀐 회원 기준이라, 통합이면 합친 뒤의 수다.
 */
export const completeOAuthLink = async (
  config: PublicConfig,
  search: string,
  countProperties: CountProperties = unknownCount,
): Promise<OAuthNotice> => {
  const params = new URLSearchParams(search);
  const pending = takePendingOAuth();
  const failure = parseOAuthFailure(params.get('error'));
  if (failure !== null) {
    return fail(pending?.provider ?? null, failure, await countProperties().catch(() => undefined));
  }

  const memberId = await reloadAuthentication(config);
  // 복귀 화면은 새로 연 페이지지만, 회원과 무관해 보이는 캐시도 이전 회원 기준일 수 있어 모두 비운다.
  queryClient.clear();
  if (pending !== null) saveLinkedProvider(memberId, pending.provider);
  const outcome = resolveOAuthOutcome(pending, memberId, params.get('result'));
  trackOAuthLinkEvent('oauth_link_completed', {
    provider: toAnalyticsProvider(pending?.provider),
    ...(outcome === 'completed' ? {} : { outcome }),
    ...withPropertyCount(await countProperties().catch(() => undefined)),
  });
  return createOAuthSuccessNotice(outcome, pending?.provider ?? null);
};
