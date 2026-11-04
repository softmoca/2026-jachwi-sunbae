# OAuth 계정 연결

익명으로 쓰다가 필요할 때 카카오나 Apple 계정을 연결해 기록을 보관하고 다른 기기에서 이어 쓴다. 정책은 [회원과 인증 기능 명세](../../docs/product/specs/authentication.md)를 따르고, 백엔드 API는 [PR #570](https://github.com/woowacourse-teams/2026-jachwi-sunbae/pull/570)을 그대로 쓴다.

OAuth는 **웹(브라우저)에서 먼저 출시**한다. 앱 WebView에서는 숨기고, 다음 앱 버전에서 네이티브 로그인(Apple 로그인 시트, 카카오 SDK)으로 연다. 출시 순서와 이유는 [#570 코멘트](https://github.com/woowacourse-teams/2026-jachwi-sunbae/pull/570#issuecomment-6635306937)를 참고한다.

## 보여 줄지 정하기

`features/auth/model/oauthAvailability.ts`의 `isOAuthLinkAvailable()` 하나로 카드, 버튼, 복귀 화면을 모두 판단한다.

| 환경                                     | 계정 연결 |
| ---------------------------------------- | --------- |
| 브라우저                                 | 보인다    |
| 앱 WebView                               | 숨긴다    |
| `features`에 `auth`를 알린 앱(다음 버전) | 보인다    |

앱인지는 `window.__JACHWI_NATIVE_APP__`이나 앱 User-Agent(`JachwiSunbae/`)로 본다. 앱 WebView에서 `/oauth/complete`로 들어오면 아무것도 하지 않고 마이로 보낸다. 앱을 다시 빌드하지 않아도 웹 배포만으로 숨겨진다.

## 화면

마이의 계정 연결 카드(`pages/my/ui/account-link-card`)가 상태에 따라 버튼을 바꾼다.

| 상태             | 보여 주는 것                        |
| ---------------- | ----------------------------------- |
| 연결하지 않음    | 카카오로 계속하기, Apple로 계속하기 |
| 한 계정을 연결함 | 다른 계정으로 바꾸기, 로그아웃      |

연결 전 확인 창에서 지금 기록이 그 계정에 보관되고 다른 계정으로 옮길 수 없다는 것, 이미 쓰던 계정이면 그쪽으로 합친다는 것을 알린다(POL-AUTH-021). 계정을 바꿀 때는 기록을 합치지 않는다고, 로그아웃은 이 기기에서만 끝나고 같은 계정으로 다시 인증하면 돌아온다고 알린다.

연결 상태는 아직 서버가 알려 주지 않는다. 이 기기에서 인증을 마쳤을 때 `localStorage`의 `jachwi:oauth-link`에 회원 번호와 제공자를 남기고, 같은 회원일 때만 연결됨으로 보인다.

## 흐름

백엔드 콜백은 인증을 시작한 브라우저의 Refresh 쿠키(`SameSite=Lax`, `Path=/api/auth`)를 요구한다. 제공자 화면에서 콜백으로 오는 이동은 최상위 GET 이동이라(Apple도 `response_mode=query`) 같은 브라우저 안이면 쿠키가 함께 간다.

1. 확인하면 `POST /api/auth/oauth/{KAKAO|APPLE}/start`를 Access Token과 Refresh 쿠키를 함께 실어 보낸다.
2. 시작 정보(이전 회원 번호, 연결 계정)를 `sessionStorage`의 `jachwi:oauth-pending`에 남기고 지금 페이지를 받은 제공자 주소로 옮긴다.
3. 서버가 콜백을 검증해 이 브라우저의 Refresh 쿠키를 바꾸고 `/oauth/complete`로 보낸다(`OAUTH_SUCCESS_REDIRECT_URI`).
4. `/oauth/complete`는 이전 회원의 토큰과 캐시를 모두 버리고 새 쿠키로 다시 로그인한다. 시작 정보와 비교해 결과를 정하고 마이로 보내 안내한다.
   - 같은 회원: 처음 연결했다.
   - 다른 회원, 익명이었음: 이미 연결된 회원의 기록에 이 기기의 기록을 합쳤다.
   - 다른 회원, 다른 계정을 연결했었음: 그 계정으로 바꿨다.
5. 시작에 실패하면 지금 회원과 인증을 그대로 두고 안내만 한다. `/oauth/complete?error=`로 돌아와도 다시 로그인하지 않는다.

로그아웃은 `POST /api/auth/logout`으로 이 기기의 Refresh Token만 폐기하고, 쿠키 없이 로그인해 새 익명 회원으로 홈에 간다. 실패하면 지금 회원을 그대로 둔다.

## 다른 탭

로그인으로 회원이 정해질 때마다 `BroadcastChannel('jachwi-auth')`로 회원 번호를 알린다. 다른 회원으로 남아 있던 탭은 Access Token과 캐시를 바로 버려 늦게 온 응답을 쓰지 않고, 화면을 새로 열어 바뀐 쿠키로 다시 인증한다. 숨은 탭은 다시 보일 때 새로 연다.

## 분석 이벤트

연결은 마이 카드에서만 시작한다. 화면 흐름 중간에 연결을 권하는 진입점은 아직 없다(매물 등록 수 같은 시점의 제안은 따로 만든다). 이벤트 이름과 속성 타입은 `features/auth/lib/oauthAnalytics.ts`에 둔다.

| 이벤트                 | 발생 시점                                                        | 속성                                                                  |
| ---------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| `oauth_link_started`   | 시작 API가 성공해 제공자 화면으로 떠나기 직전. Beacon으로 보낸다 | `provider`, `already_linked`, `property_count`                        |
| `oauth_link_completed` | 복귀 화면에서 새 쿠키로 다시 로그인한 뒤                         | `provider`, `outcome`(`linked`/`merged`/`switched`), `property_count` |
| `oauth_link_cancelled` | 제공자가 거부(`?error=access_denied`)를 알리며 돌아왔을 때       | `provider`, `property_count`                                          |
| `oauth_link_failed`    | 시작 API 실패, 또는 그 밖의 오류로 돌아왔을 때                   | `provider`, `reason`(`unavailable`/`failed`), `property_count`        |

- `provider`는 `kakao`, `apple`이다. 복귀 화면에서 시작 정보를 잃었으면 `unknown`이다.
- `property_count`는 그 시점 지금 회원의 매물 수다. 완료는 바뀐 회원(통합이면 합친 뒤) 기준이다. 목록 캐시가 없으면 목록을 한 번 받아 세고, 받지 못하면 `first_property`처럼 속성을 빼고 보낸다.
- `outcome`은 시작 정보가 없어 결과를 모르면 뺀다.
- 지금 #570은 취소와 콜백 실패를 웹으로 돌려보내지 않고 JSON 오류를 보여 줘서, `oauth_link_cancelled`와 복귀 화면의 `oauth_link_failed`는 백엔드가 `/oauth/complete?error=`로 돌려보내야 쌓인다.
- 로그아웃은 `logout_succeeded`, `logout_failed`(`error_kind`, `error_code`)로 남긴다. 제공자 응답이나 토큰은 싣지 않는다.

## 한계

- 제공자 화면에서 취소하거나 콜백이 실패하면 지금 백엔드는 JSON 오류를 그대로 보여 준다. 회원과 기록은 그대로이고, 사용자는 뒤로 가기로 돌아온다.
