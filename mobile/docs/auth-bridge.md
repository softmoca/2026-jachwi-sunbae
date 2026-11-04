# 앱 인증 브리지

앱은 OAuth 인증 화면을 열고 결과를 웹에 돌려주는 일, WebView의 Refresh 쿠키를 기기 저장소에 백업하고 되살리는 일만 한다. 어떤 API를 부르고 언제 저장할지는 웹이 정하므로 API 주소나 인증 정책이 바뀌어도 앱을 다시 내지 않는다. 웹의 흐름은 [OAuth 계정 연결](../../frontend/docs/oauth-account-linking.md)을 참고한다.

## 기능 목록

`window.__JACHWI_NATIVE_APP__.features`에 `auth`를 더한다. 웹은 `auth`가 있을 때만 계정 연결을 보여 주고 아래 메시지를 보낸다. 응답은 요청한 웹 출처에서 `jachwi-auth` 이벤트(`event.detail`)로 받는다.

| `action`          | 보내는 값                          | 응답                                                    |
| ----------------- | ---------------------------------- | ------------------------------------------------------- |
| `open`            | `url`: HTTPS 인증 주소             | `{ ok: true, callbackUrl }` 또는 `{ ok: false, error }` |
| `persist-session` | `origin`, `name`, `path`, `maxAge` | `{ ok: true, saved }` 또는 `{ ok: false, error }`       |

`error`는 `cancelled`, `busy`, `unavailable`이다. 요청 ID는 영문, 숫자, 밑줄, 하이픈 1~64자다. 우리 웹 화면(`navigationPolicy`의 서비스 호스트)이 보낸 요청만 처리한다.

## 인증 화면

- iOS는 `ASWebAuthenticationSession`, Android는 Custom Tabs로 연다. 콜백 스킴은 `jachwisunbae`다.
- iOS는 인증 화면이 콜백을 직접 받는다. Android는 콜백이 딥링크(`jachwisunbae://auth/...`)로 앱에 돌아오고, 네이티브가 바로 받아 끝낸다. 이 딥링크는 웹 화면으로 열지 않는다.
- Android에서 콜백 없이 앱으로 돌아오면 1초 뒤 취소로 본다.
- 한 번에 하나만 연다. 진행 중이면 `busy`로 거절한다.

## Refresh 쿠키 백업

WebView 쿠키는 앱을 강제로 끝내거나 저장 공간을 정리할 때 사라질 수 있다. 쿠키를 잃으면 자동 로그인이 새 익명 회원을 만들어 기록을 이어 쓰지 못하므로, 기기 저장소에 백업해 둔다.

- 웹은 로그인 응답을 받을 때마다 `persist-session`을 보낸다. 자동 로그인, OAuth 복귀 뒤 로그인, 로그아웃과 초기화 뒤 새 회원이 모두 여기에 해당한다.
- 네이티브는 WebView 쿠키 저장소에서 그 쿠키를 직접 읽어 백업한다. 쿠키 값은 웹 JS에 노출하지 않고 로그로 남기지 않는다. 쿠키가 없으면 백업을 지운다.
- 앱을 시작할 때 WebView를 띄우기 전에, WebView에 그 쿠키가 없으면 백업으로 되살린다. 처음 받은 쿠키처럼 API 호스트 전용, `HttpOnly`, `Secure`, `SameSite=Lax`로 둔다.
- 서비스 도메인(`jachwi-sunbae.kr`과 그 하위 도메인)의 HTTPS 출처만 받는다.

| 플랫폼  | 저장 위치                                                                                  |
| ------- | ------------------------------------------------------------------------------------------ |
| iOS     | Keychain(`kr.jachwisunbae.app.auth-session`, `AfterFirstUnlockThisDeviceOnly`)             |
| Android | 앱 전용 SharedPreferences(`jachwi_auth_session`). `allowBackup="false"`라 백업되지 않는다. |

Refresh Token은 기기별로 발급한다(POL-AUTH-027). iOS Keychain은 앱을 지워도 남으므로, 새로 설치한 앱의 첫 실행에서 이전 백업을 지운다. iCloud Keychain이나 다른 기기로 옮기지 않는다.

## 코드 위치

- JS: `src/auth/policy.ts`(메시지 검사), `src/auth/useAuthBridge.ts`, `src/auth/nativeAuthModule.ts`
- iOS: `ios/JachwiNativeUI/Sources/JachwiAuthModule.m`. 기존 로컬 팟에 넣어 `AppDelegate.swift`와 Xcode 프로젝트 파일을 바꾸지 않는다.
- Android: `android/app/src/main/java/com/jachwisunbae/app/auth/`. `MainApplication`에서 패키지를 등록하고 `androidx.browser`를 쓴다.
- Sign in with Apple 권한(`com.apple.developer.applesignin`)은 `JachwiSunbaeMobile.entitlements`에 있다.
