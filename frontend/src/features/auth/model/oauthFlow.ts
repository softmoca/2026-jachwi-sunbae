import { queryClient } from '@/shared/api/queryClient';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';
import { trackPostHogEvent } from '@/shared/lib/analytics/posthog';
import { isRunningInNativeApp } from '@/shared/lib/native-app/nativeApp';

import { ApiError, isApiErrorCode, reloadAuthentication } from '../api/apiClient';
import { startOAuth } from '../api/oauthApi';
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

/** 분석에서 앱과 브라우저를 나눠 보려고만 쓴다. 인증 흐름은 둘이 같다. */
const getClient = () => (isRunningInNativeApp() ? 'app' : 'web');

const toFailure = (error: unknown): OAuthFailure =>
  isApiErrorCode(error, 'OAUTH_PROVIDER_UNAVAILABLE') ||
  (error instanceof ApiError && (error.kind === 'network' || (error.status !== null && error.status >= 500)))
    ? 'unavailable'
    : 'failed';

const fail = (provider: OAuthProvider | null, failure: OAuthFailure): OAuthNotice => {
  trackPostHogEvent('oauth_failed', { provider, client: getClient(), reason: failure });
  return createOAuthFailureNotice(failure);
};

type StartOptions = {
  config: PublicConfig;
  provider: OAuthProvider;
  memberId: number;
  linkedProvider: OAuthProvider | null;
  /** 제공자 화면으로 페이지를 옮기는 방법. 테스트에서 바꾼다. */
  leavePage?: (url: string) => void;
};

/** 성공하면 페이지를 떠나므로 결과가 없다. 시작 실패는 바로 안내할 결과를 돌려준다. */
export type OAuthStartResult = { kind: 'left-page' } | { kind: 'finished'; notice: OAuthNotice };

/**
 * 계정 연결을 시작한다. 시작 정보를 남기고 지금 페이지(웹은 브라우저 탭, 앱은 WebView)를 제공자 화면으로 옮긴다.
 * 백엔드 콜백은 시작한 기기의 Refresh 쿠키를 요구하므로, 앱도 시스템 브라우저가 아니라 WebView 안에서 이동해야 한다.
 * 콜백이 끝나면 서버가 `/oauth/complete`로 돌려보낸다. 시작에 실패하면 지금 회원과 인증을 건드리지 않는다(REQ-AUTH-017).
 */
export const startOAuthLink = async ({
  config,
  provider,
  memberId,
  linkedProvider,
  leavePage = (url) => window.location.assign(url),
}: StartOptions): Promise<OAuthStartResult> => {
  trackPostHogEvent('oauth_started', { provider, client: getClient(), linked: linkedProvider !== null });

  let authorizationUrl: string;
  try {
    authorizationUrl = await startOAuth(config, provider);
  } catch (error) {
    return { kind: 'finished', notice: fail(provider, toFailure(error)) };
  }

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
 */
export const completeOAuthLink = async (config: PublicConfig, search: string): Promise<OAuthNotice> => {
  const params = new URLSearchParams(search);
  const pending = takePendingOAuth();
  const failure = parseOAuthFailure(params.get('error'));
  if (failure !== null) return fail(pending?.provider ?? null, failure);

  const memberId = await reloadAuthentication(config);
  // 복귀 화면은 새로 연 페이지지만, 회원과 무관해 보이는 캐시도 이전 회원 기준일 수 있어 모두 비운다.
  queryClient.clear();
  if (pending !== null) saveLinkedProvider(memberId, pending.provider);
  const outcome = resolveOAuthOutcome(pending, memberId, params.get('result'));
  trackPostHogEvent('oauth_completed', { provider: pending?.provider ?? null, client: getClient(), outcome });
  return createOAuthSuccessNotice(outcome, pending?.provider ?? null);
};
