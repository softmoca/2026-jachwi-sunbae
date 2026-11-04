# 앱 인증 브리지

OAuth 계정 연결의 앱 쪽 설정이다. 웹의 흐름은 [OAuth 계정 연결](../../frontend/docs/oauth-account-linking.md)을 참고한다.

## 지금 쓰는 흐름: WebView 안 이동

백엔드 콜백이 인증을 시작한 기기의 Refresh 쿠키를 요구하므로, 웹은 앱에서도 WebView 안에서 제공자 화면으로 이동한다. `src/navigationPolicy.ts`는 아래 주소만 WebView 안에 두고, 그 밖의 외부 링크는 지금처럼 시스템 브라우저로 연다.

| 호스트                                                  | 범위                      |
| ------------------------------------------------------- | ------------------------- |
| `kauth.kakao.com`, `accounts.kakao.com`                 | 카카오 인증 화면 전체     |
| `appleid.apple.com`                                     | Apple 인증 화면 전체      |
| `dev-api.jachwi-sunbae.kr`, `api.jachwi-sunbae.kr`      | `/api/auth/oauth/` 경로만 |

카카오톡 앱 로그인(`kakaotalk://`)은 앱 밖으로 나가 쿠키가 이어지지 않으므로 이번 흐름에서 쓰지 않는다.

## 미리 넣어 둔 브리지: `type: 'auth'`

나중에 시스템 인증 화면으로 바꿀 때 앱을 다시 내지 않도록 브리지를 먼저 넣어 둔다. 지금 웹은 부르지 않는다. 앱은 백엔드 계약을 모르고, 웹이 준 주소를 열어 돌아온 주소를 그대로 돌려줄 뿐이다.

- 기능 목록 `window.__JACHWI_NATIVE_APP__.features`에 `auth`를 더한다.
- 웹이 `{ type: 'auth', action: 'open', requestId, url }`을 보내면 iOS는 ASWebAuthenticationSession, Android는 Custom Tabs로 `url`(HTTPS만)을 연다.
- 응답은 요청한 웹 출처에서 `jachwi-auth` 이벤트로 받는다. 성공은 `{ type: 'auth:response', requestId, ok: true, callbackUrl }`, 실패는 `{ ok: false, error }`다. `error`는 `cancelled`(사용자가 닫음), `busy`(이미 열려 있음), `failed`(그 밖의 실패)다.
- 콜백 스킴은 `jachwisunbae`다. 경로는 따지지 않고, 인증 화면이 열려 있는 동안 돌아온 이 스킴의 주소를 결과로 돌려준다. 이 딥링크는 웹 화면으로 열지 않는다.
- Android에서 콜백 없이 앱으로 돌아오면 1초 뒤 취소로 본다.
- 우리 웹 화면(`navigationPolicy`의 서비스 호스트)이 보낸 요청만 처리한다. 요청 ID는 영문, 숫자, 밑줄, 하이픈 1~64자다.

## 코드 위치

- JS: `src/auth/policy.ts`(메시지 검사), `src/auth/useAuthBridge.ts`
- iOS: `ios/JachwiNativeUI/Sources/JachwiAuthModule.m`. 기존 로컬 팟에 넣어 `AppDelegate.swift`와 Xcode 프로젝트 파일을 바꾸지 않는다.
- Android: `android/app/src/main/java/com/jachwisunbae/app/auth/`. `MainApplication`에서 패키지를 등록하고 `androidx.browser`를 쓴다.
- Sign in with Apple 권한(`com.apple.developer.applesignin`)은 `JachwiSunbaeMobile.entitlements`에 있다.
