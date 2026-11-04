import { queryClient } from '@/shared/api/queryClient';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';
import { trackPostHogEvent } from '@/shared/lib/analytics/posthog';
import { isNativeAuthAvailable, openNativeAuthSession } from '@/shared/lib/native-app/nativeAuth';
import { OAUTH_COMPLETE_PATH } from '@/shared/lib/navigation/appPaths';

import { ApiError, isApiErrorCode, reloadAuthentication } from '../api/apiClient';
import { completeAppOAuth, type OAuthClient, startOAuth } from '../api/oauthApi';
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

const APP_CALLBACK_SCHEME = 'jachwisunbae:';

const toFailure = (error: unknown): OAuthFailure =>
  isApiErrorCode(error, 'OAUTH_PROVIDER_UNAVAILABLE') ||
  (error instanceof ApiError && (error.kind === 'network' || (error.status !== null && error.status >= 500)))
    ? 'unavailable'
    : 'failed';

const fail = (provider: OAuthProvider | null, client: OAuthClient, failure: OAuthFailure): OAuthNotice => {
  trackPostHogEvent('oauth_failed', { provider, client, reason: failure });
  return createOAuthFailureNotice(failure);
};

/**
 * 인증으로 이 기기의 쿠키가 바뀐 뒤 공통으로 마무리한다. 이전 회원의 토큰과 캐시를 버리고 쿠키로 다시 로그인해
 * 결과를 정한다. 다른 탭에는 로그인이 새 회원을 알린다.
 */
const finishWithNewCookie = async (
  config: PublicConfig,
  pending: PendingOAuth | null,
  client: OAuthClient,
  serverOutcome: string | null,
): Promise<OAuthNotice> => {
  const memberId = await reloadAuthentication(config);
  // 복귀 화면은 새로 연 페이지지만, 회원과 무관해 보이는 캐시도 이전 회원 기준일 수 있어 모두 비운다.
  queryClient.clear();
  if (pending !== null) saveLinkedProvider(memberId, pending.provider);
  const outcome = resolveOAuthOutcome(pending, memberId, serverOutcome);
  trackPostHogEvent('oauth_completed', { provider: pending?.provider ?? null, client, outcome });
  return createOAuthSuccessNotice(outcome, pending?.provider ?? null);
};

type AppCallback = { code: string; result: string | null } | { error: string };

/** 앱 콜백 주소(`jachwisunbae://auth/oauth/complete?code=...`)에서 완료 코드나 오류를 꺼낸다. */
export const parseAppCallback = (value: string): AppCallback | null => {
  try {
    const url = new URL(value);
    if (url.protocol !== APP_CALLBACK_SCHEME) return null;
    const error = url.searchParams.get('error');
    if (error !== null) return { error };
    const code = url.searchParams.get('code');
    if (code === null || code.length === 0 || code.length > 512) return null;
    return { code, result: url.searchParams.get('result') };
  } catch {
    return null;
  }
};

type StartOptions = {
  config: PublicConfig;
  provider: OAuthProvider;
  memberId: number;
  linkedProvider: OAuthProvider | null;
  /** 제공자 화면이나 복귀 화면으로 페이지를 새로 여는 방법. 테스트에서 바꾼다. */
  leavePage?: (url: string) => void;
};

/** 성공하면 페이지를 떠나므로 결과가 없다. 취소와 실패는 바로 안내할 결과를 돌려준다. */
export type OAuthStartResult = { kind: 'left-page' } | { kind: 'finished'; notice: OAuthNotice };

/**
 * 계정 연결을 시작한다. 실패하거나 취소하면 지금 회원과 인증을 건드리지 않는다(REQ-AUTH-017).
 * - 웹: 시작 정보를 남기고 제공자 화면으로 이동한다. 콜백 뒤 `/oauth/complete`로 돌아와 마무리한다.
 * - 앱: 시스템 인증 화면을 열고, 돌아온 완료 코드로 WebView의 인증을 바꾼 뒤 `/oauth/complete`를 새로 연다.
 */
export const startOAuthLink = async ({
  config,
  provider,
  memberId,
  linkedProvider,
  leavePage = (url) => window.location.assign(url),
}: StartOptions): Promise<OAuthStartResult> => {
  const client: OAuthClient = isNativeAuthAvailable() ? 'app' : 'web';
  const pending: PendingOAuth = {
    provider,
    previousMemberId: memberId,
    previousProvider: linkedProvider,
    startedAt: 0,
  };
  trackPostHogEvent('oauth_started', { provider, client, linked: linkedProvider !== null });

  let authorizationUrl: string;
  try {
    authorizationUrl = await startOAuth(config, provider, client);
  } catch (error) {
    return { kind: 'finished', notice: fail(provider, client, toFailure(error)) };
  }

  if (client === 'web') {
    savePendingOAuth(pending);
    leavePage(authorizationUrl);
    return { kind: 'left-page' };
  }

  const session = await openNativeAuthSession(authorizationUrl);
  if (!session.ok) {
    return {
      kind: 'finished',
      notice: fail(provider, client, session.error === 'cancelled' ? 'cancelled' : 'unavailable'),
    };
  }
  const callback = parseAppCallback(session.callbackUrl);
  if (callback === null) return { kind: 'finished', notice: fail(provider, client, 'failed') };
  if ('error' in callback) {
    return { kind: 'finished', notice: fail(provider, client, parseOAuthFailure(callback.error) ?? 'failed') };
  }

  try {
    await completeAppOAuth(config, callback.code);
  } catch (error) {
    return { kind: 'finished', notice: fail(provider, client, toFailure(error)) };
  }
  // 쿠키가 바뀌었다. 웹과 같은 복귀 화면을 새로 열어, 이전 회원의 화면 상태 없이 새 쿠키로 마무리한다.
  savePendingOAuth(pending);
  leavePage(createOAuthCompletePath(callback.result));
  return { kind: 'left-page' };
};

const createOAuthCompletePath = (result: string | null) =>
  result === null ? OAUTH_COMPLETE_PATH : `${OAUTH_COMPLETE_PATH}?${new URLSearchParams({ result }).toString()}`;

/**
 * 웹의 OAuth 콜백 뒤 돌아온 화면(`/oauth/complete`)에서 부른다. 오류가 있으면 지금 회원을 그대로 두고 안내만 만든다.
 * 성공했으면 새 쿠키로 다시 로그인해 결과를 정한다.
 */
export const completeWebOAuth = async (config: PublicConfig, search: string): Promise<OAuthNotice> => {
  const params = new URLSearchParams(search);
  const pending = takePendingOAuth();
  const failure = parseOAuthFailure(params.get('error'));
  if (failure !== null) return fail(pending?.provider ?? null, 'web', failure);
  return finishWithNewCookie(config, pending, 'web', params.get('result'));
};
