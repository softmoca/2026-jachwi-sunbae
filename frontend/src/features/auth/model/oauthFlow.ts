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

const toStartFailure = (error: unknown): Exclude<OAuthFailure, 'unfinished'> => {
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
  linkedProvider: OAuthProvider | null;
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
  linkedProvider,
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
 * OAuth 콜백 뒤 돌아온 화면(`/oauth/complete`)에서 부른다. #570은 성공했을 때만 이 주소로 보낸다.
 * 이전 회원의 토큰과 캐시를 버리고 바뀐 쿠키로 다시 로그인해, 시작 전후 회원으로 결과를 정한다.
 * 다른 탭에는 로그인이 새 회원을 알린다. 완료 이벤트의 매물 수는 바뀐 회원 기준이라, 통합이면 합친 뒤의 수다.
 */
export const completeOAuthLink = async (
  config: PublicConfig,
  countProperties: CountProperties = unknownCount,
): Promise<OAuthNotice> => {
  const pending = takePendingOAuth();
  const memberId = await reloadAuthentication(config);
  // 복귀 화면은 새로 연 페이지지만, 회원과 무관해 보이는 캐시도 이전 회원 기준일 수 있어 모두 비운다.
  queryClient.clear();
  if (pending !== null) saveLinkedProvider(memberId, pending.provider);
  const outcome = resolveOAuthOutcome(pending, memberId);
  trackOAuthLinkEvent('oauth_link_completed', {
    provider: toAnalyticsProvider(pending?.provider),
    ...(outcome === 'completed' ? {} : { outcome }),
    ...withPropertyCount(await countProperties().catch(() => undefined)),
  });
  return createOAuthSuccessNotice(outcome, pending?.provider ?? null);
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
