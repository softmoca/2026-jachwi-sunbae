# 생활 날씨 카드

마이 화면의 생활 날씨 카드와 알림 받기 토글이다. 날씨 조회·알림 위치·수신 동의는 서버 API([PR #432](https://github.com/woowacourse-teams/2026-jachwi-sunbae/pull/432))를 쓰고, 앱 푸시 기기는 기존 모바일 2.1.1(8) 브리지로 등록한다. 실제 Dev·Prod 수신은 별도 검증이 필요하다.

- 작업 이슈: [#447](https://github.com/woowacourse-teams/2026-jachwi-sunbae/issues/447) (시연 화면 [#441](https://github.com/woowacourse-teams/2026-jachwi-sunbae/issues/441)에서 이어짐)
- 명세: [생활 날씨](../../docs/product/specs/weather.md)

## 실행

```bash
cd frontend
npm ci
# 개발 서버 API로 확인
DEV_API_PROXY_TARGET=https://dev-api.jachwi-sunbae.kr npm run dev
# 서버 없이 MSW 목으로 확인
npm run dev:mock
```

[마이페이지](http://localhost:3000/me)를 연다. 위치는 브라우저(앱은 WebView)의 위치 권한으로 구한다.

## 동작

1. 마이에는 생활 날씨 카드, 개인정보 처리방침, 초기화(아래에 완전 삭제 메일 요청 링크)만 둔다.
2. 알림이 꺼져 있으면 날씨 대신 알림 꺼짐 안내를 보이고, 켜져 있으면 현재 위치의 현재 시각 예보와 오늘 최저·최고 기온을 보인다. 위치 이름은 역지오코딩 결과의 구·동이다.
3. **알림 받기**를 켜면 현재 위치를 구하고 앱 `enable`·`token`으로 권한과 토큰을 확인한다. 위치·기기를 등록한 뒤 `PUT /api/members/me/weather-notification-settings`로 수신 동의를 켠다. 위치를 하나도 구하지 못하면 켜지 않는다.
4. 알림을 켜 둔 채 마이를 열 때마다 현재 위치를 다시 저장한다. 서버는 마지막으로 저장한 위치로 알림을 보낸다. 현재 위치를 못 잡으면 이 기기에 남긴 마지막 위치로 날씨를 보이고 `마지막 위치 기준`으로 표시한다.
5. 위치 권한 거부, 저장 실패, 웹 브라우저 접속(알림은 앱에서만 받음)은 토글 아래에 알린다. 앱 여부는 `window.__JACHWI_NATIVE_APP__` 또는 앱 User-Agent로 판단한다.

## 기기 연결과 실패 처리

- `PUT /api/members/me/weather-devices/current`에 origin별 설치 ID·32바이트 난수 비밀키와 토큰을 보낸다. 토큰은 영구 저장·로그·분석·Query 캐시에 넣지 않는다.
- 앱의 회원 화면 전체에서 로그인·재진입·네트워크 복구·토큰 갱신을 동기화한다. 새 회원의 동의는 이전하지 않으며 비동기 작업 중 회원이 바뀌면 이전 요청을 거절한다.
- OFF는 서버 동의를 먼저 끈 뒤 기기를 해제한다. 정리 실패는 OFF를 유지하며 재시도를 안내한다. OS 권한 철회도 서버 OFF로 반영한다.
- 브리지 없는 앱과 웹에서는 새 수신 동의를 켜지 않는다. 기존 서버 동의가 ON인 경우 OFF는 가능하다. ON 요청에는 현재 위치 또는 마지막 위치를 서버에 저장한다.
- 네이티브 코드·스토어 재제출 없이 연결한다. 콘솔 설정, Debug와 스토어 앱의 차이, 운영 승격 범위는 [운영 배포 기록](../../docs/operations/weather-push-release.md)을 따른다.
