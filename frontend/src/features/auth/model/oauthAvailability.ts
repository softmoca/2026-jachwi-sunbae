import { isNativeOAuthEnabled } from '@/shared/config/publicConfig';
import { getNativeAuthProviders, hasNativeAppFeature, isRunningInNativeApp } from '@/shared/lib/native-app/nativeApp';

import type { NativeAuthProvider } from '../lib/nativeAuthBridge';
import { OAUTH_PROVIDERS, type OAuthProvider } from './oauthLink';

/** 앱이 네이티브 로그인(Apple 로그인 시트, 카카오 SDK)을 지원할 때 `features`에 알릴 이름. */
export const NATIVE_OAUTH_FEATURE = 'auth';

const NATIVE_PROVIDER: Record<OAuthProvider, NativeAuthProvider> = { KAKAO: 'kakao', APPLE: 'apple' };
export const toNativeAuthProvider = (provider: OAuthProvider): NativeAuthProvider => NATIVE_PROVIDER[provider];

const SERVER_UNSUPPORTED_KEY = 'jachwi:native-oauth-unsupported';
// 백엔드가 API를 내놓으면 하루 안에 다시 보인다.
const SERVER_UNSUPPORTED_TTL_MS = 24 * 60 * 60 * 1_000;

/** 서버에 네이티브 로그인 API(`/nonce`, `/id-token`)가 없다고 확인했을 때 남긴다. 그동안 앱에서는 계정 연결을 숨긴다. */
export const markNativeOAuthServerUnsupported = (now = Date.now()) => {
  try {
    window.localStorage.setItem(SERVER_UNSUPPORTED_KEY, String(now + SERVER_UNSUPPORTED_TTL_MS));
  } catch {
    // 저장하지 못하면 다음에 다시 눌렀을 때 같은 안내를 한 번 더 볼 뿐이다.
  }
};

const isNativeOAuthServerUnsupported = (now = Date.now()): boolean => {
  try {
    const until = Number(window.localStorage.getItem(SERVER_UNSUPPORTED_KEY));
    return Number.isFinite(until) && until > now;
  } catch {
    return false;
  }
};

/**
 * 계정 연결에 쓸 수 있는 제공자. 카드, 버튼, 복귀 화면이 모두 이 함수로 판단한다.
 * - 브라우저: 모두. #570의 `/start`, `/callback`으로 연결한다.
 * - 앱 WebView: 카카오, Apple 로그인 화면을 WebView 안에서 열면 안 되므로(RFC 8252) 네이티브 로그인 브리지(#591)로만 연다.
 *   웹 빌드의 `NATIVE_OAUTH_ENABLED`가 꺼져 있으면 앱이 무엇을 알려도 빈 목록이라 숨긴다.
 *   켜져 있으면 앱이 `features`에 `auth`를 알리고 `authProviders`에 넣은 제공자만 쓴다. 이 둘이 없는 예전 앱(2.1.x 이하)이나
 *   키가 없는 빌드, 서버에 API가 없다고 확인한 동안에는 빈 목록이라 숨긴다.
 * 출시 순서: 백엔드 nonce, id-token API가 배포되면 `NATIVE_OAUTH_ENABLED`를 켜고 웹을 배포한다.
 */
export const getAvailableOAuthProviders = (): readonly OAuthProvider[] => {
  if (!isRunningInNativeApp()) return OAUTH_PROVIDERS;
  if (!isNativeOAuthEnabled()) return [];
  if (!hasNativeAppFeature(NATIVE_OAUTH_FEATURE) || isNativeOAuthServerUnsupported()) return [];
  const nativeProviders = getNativeAuthProviders();
  return OAUTH_PROVIDERS.filter((provider) => nativeProviders.includes(toNativeAuthProvider(provider)));
};

export const isOAuthLinkAvailable = (): boolean => getAvailableOAuthProviders().length > 0;

/** 앱 WebView에서는 제공자 화면으로 떠나지 않고 네이티브 로그인 브리지로 연결한다. */
export const usesNativeOAuth = (): boolean => isRunningInNativeApp();
