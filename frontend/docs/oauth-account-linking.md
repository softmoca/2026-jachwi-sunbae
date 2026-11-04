# OAuth 계정 연결

익명으로 쓰다가 필요할 때 카카오나 Apple 계정을 연결해 기록을 보관하고 다른 기기에서 이어 쓴다. 정책은 [회원과 인증 기능 명세](../../docs/product/specs/authentication.md)를 따르고, 백엔드 API는 [PR #570](https://github.com/woowacourse-teams/2026-jachwi-sunbae/pull/570)에 있다. 앱 쪽 브리지는 [앱 인증 브리지](../../mobile/docs/auth-bridge.md)를 참고한다.

## 화면

마이의 계정 연결 카드(`pages/my/ui/account-link-card`)가 상태에 따라 버튼을 바꾼다.

| 상태                | 보여 주는 것                                            |
| ------------------- | ------------------------------------------------------- |
| 연결하지 않음       | 카카오로 계속하기, Apple로 계속하기                     |
| 한 계정을 연결함    | 다른 계정으로 바꾸기, 로그아웃                          |
| 인증 기능이 없는 앱 | 카드를 숨긴다. WebView 안에서 제공자 화면을 열 수 없다. |

연결 전 확인 창에서 지금 기록이 그 계정에 보관되고 다른 계정으로 옮길 수 없다는 것, 이미 쓰던 계정이면 그쪽으로 합친다는 것을 알린다(POL-AUTH-021). 계정을 바꿀 때는 기록을 합치지 않는다고, 로그아웃은 이 기기에서만 끝나고 같은 계정으로 다시 인증하면 돌아온다고 알린다.

연결 상태는 아직 서버가 알려 주지 않는다. 이 기기에서 인증을 마쳤을 때 `localStorage`의 `jachwi:oauth-link`에 회원 번호와 제공자를 남기고, 같은 회원일 때만 연결됨으로 보인다. 회원 조회 응답에 연결 상태가 생기면 그 값으로 바꾼다.

## 흐름

1. 확인하면 `POST /api/auth/oauth/{KAKAO|APPLE}/start`를 Access Token과 Refresh 쿠키를 함께 실어 보낸다.
2. 웹은 시작 정보(이전 회원 번호, 연결 계정)를 `sessionStorage`의 `jachwi:oauth-pending`에 남기고 받은 제공자 주소로 이동한다. 앱은 시스템 인증 화면으로 연다.
3. 서버가 콜백을 검증해 이 기기의 Refresh 쿠키를 바꾸고 `/oauth/complete`로 보낸다(`OAUTH_SUCCESS_REDIRECT_URI`).
4. `/oauth/complete`는 이전 회원의 토큰과 캐시를 모두 버리고 새 쿠키로 다시 로그인한다. 시작 정보와 비교해 결과를 정하고 마이로 보내 안내한다.
   - 같은 회원: 처음 연결했다.
   - 다른 회원, 익명이었음: 이미 연결된 회원의 기록에 이 기기의 기록을 합쳤다.
   - 다른 회원, 다른 계정을 연결했었음: 그 계정으로 바꿨다.
5. 시작에 실패하거나 사용자가 취소하면 지금 회원과 인증을 그대로 두고 안내만 한다. `/oauth/complete?error=`로 돌아와도 다시 로그인하지 않는다.

로그아웃은 `POST /api/auth/logout`으로 이 기기의 Refresh Token만 폐기하고, 쿠키 없이 로그인해 새 익명 회원으로 홈에 간다. 실패하면 지금 회원을 그대로 둔다.

## 다른 탭

로그인으로 회원이 정해질 때마다 `BroadcastChannel('jachwi-auth')`로 회원 번호를 알린다. 다른 회원으로 남아 있던 탭은 Access Token과 캐시를 바로 버려 늦게 온 응답을 쓰지 않고, 화면을 새로 열어 바뀐 쿠키로 다시 인증한다. 숨은 탭은 다시 보일 때 새로 연다.

## 분석 이벤트

`oauth_started`(`provider`, `client`, `linked`), `oauth_completed`(`provider`, `client`, `outcome`), `oauth_failed`(`provider`, `client`, `reason`), `logout_succeeded`, `logout_failed`(`error_kind`, `error_code`)를 남긴다. 제공자 응답이나 토큰은 싣지 않는다.

## 백엔드와 맞출 것

- 앱은 시스템 인증 화면과 WebView가 쿠키를 함께 쓰지 않는다. 지금 콜백은 시작한 기기의 Refresh 쿠키가 있어야 성공하므로 앱에서는 실패한다. 프론트는 `start?client=app`으로 시작하면 콜백이 `jachwisunbae://auth/oauth/complete?code=<일회용 완료 코드>`로 돌아오고, WebView가 `POST /api/auth/oauth/complete`(`{ code }`)로 쿠키를 바꾸는 계약을 가정해 두었다.
- 콜백이 실패하거나 취소되면 지금은 JSON 오류를 그대로 보여 준다. `/oauth/complete?error=cancelled|failed|unavailable`로 돌려보내야 웹이 안내할 수 있다.
- 완료 주소에 `result=linked|merged|switched`를 붙여 주면 프론트가 추정하지 않고 그 값을 쓴다.
