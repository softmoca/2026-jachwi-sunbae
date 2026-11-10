import { hasNativeAppFeature, isRunningInNativeApp } from '@/shared/lib/native-app/nativeApp';

/** 앱이 네이티브 로그인(Apple 로그인 시트, 카카오 SDK)을 지원할 때 `features`에 알릴 이름. */
export const NATIVE_OAUTH_FEATURE = 'auth';

/**
 * OAuth 계정 연결을 보여 줄지 정한다. 카드, 버튼, 복귀 화면이 모두 이 함수 하나로 판단한다.
 * - 브라우저: 보인다. #570의 `/start`, `/callback`으로 연결한다.
 * - 앱 WebView: 숨긴다. 카카오, Apple 로그인 화면을 WebView 안에서 열면 안 되므로(RFC 8252)
 *   다음 앱 버전에서 네이티브 SDK로 연다. 그 앱이 `features`에 `auth`를 알리면 보인다.
 * 출시 순서는 https://github.com/woowacourse-teams/2026-jachwi-sunbae/pull/570#issuecomment-6635306937 을 따른다.
 */
export const isOAuthLinkAvailable = (): boolean => !isRunningInNativeApp() || hasNativeAppFeature(NATIVE_OAUTH_FEATURE);
