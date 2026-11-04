# 랜딩과 사용 방법 영상

랜딩(`/landing`) 첫 화면의 소개 영상과 사용 방법(`/guide`)의 시나리오 영상을 만든다.

## 실행 준비

Node.js 20 이상이 필요하다. 이 폴더에서 실행한다.

```bash
npm install
npm run setup     # Playwright용 Chromium 설치, 처음 한 번만
```

## 랜딩 소개 영상

`flyover.html` 한 장으로 그린 17초 영상이다. 로고, 지도 마커, 버튼은 앱과 같은 에셋(`assets/`)과 색을 쓰고, 글꼴은 Pretendard다.

```bash
npm run shots     # 주요 시점 스틸을 out/에 저장
npm run render    # 1440×1152, 60fps MP4를 out/flyover.mp4로 저장
```

- 30fps로 빠르게 확인하려면 `npm run render:preview`를 실행한다.
- 원하는 시점만 보려면 `node render.mjs --shots 5,10.5`처럼 초 단위로 넘긴다.
- 2배 해상도가 필요하면 `node render.mjs --scale 2`를 붙인다.
- 폰트를 CDN에서 불러오므로 렌더링할 때 인터넷 연결이 필요하다.
- 브라우저에서 `flyover.html#play`를 열면 실시간으로 재생하고, `flyover.html#t=10.5`를 열면 그 시점에 멈춘 화면을 보여준다.

렌더링한 MP4는 해상도는 그대로 두고 다시 압축해서 `frontend/src/pages/landing/assets/landing-flyover.mp4`로 넣는다. 화면에 보이는 폭(데스크톱 2배 밀도에서 약 1,350px)에 1440px가 맞으므로 줄이지 않는다. 2026-11 기준 4.5MB가 1.9MB가 되고 원본과의 SSIM은 0.994다.

```bash
ffmpeg -i out/flyover.mp4 -c:v libx264 -preset slow -crf 27 -profile:v high -pix_fmt yuv420p -an \
  -movflags +faststart ../../frontend/src/pages/landing/assets/landing-flyover.mp4
```

### 장면 구성

| 시간      | 장면                                                                                         |
| --------- | -------------------------------------------------------------------------------------------- |
| 0–1.4초   | 판교 골목 지도에서 두 박자로 줌아웃한다                                                      |
| 1.4–3초   | 행정동 경계가 그려지고 하나씩 지워져 다섯 곳이 남는다. 교통 추천과 매물 기록 추천을 구분한다 |
| 3–4초     | 삼평동으로 확대하며 지도가 눕는다                                                            |
| 4–8초     | 카메라 회전 없이 속도 변화로만 템포를 주며 비행하고, 느려질 때 거리 메모를 비춘다            |
| 8–9초     | 매물 핀을 고르고 매물 사진 속으로 들어간다                                                   |
| 9–13초    | 방 안에 두 페이지를 띄워 매물 정보를 입력하고 체크리스트를 누른다                            |
| 13–15.6초 | 2D로 빠져 원룸 3곳 비교표를 만든다                                                           |
| 15.6–17초 | 로고                                                                                         |

### 수정 방법

모든 움직임은 `flyover.html`의 `window.__seek(t)` 하나가 시간 `t`(초)만 보고 계산한다. 타이머나 CSS 애니메이션을 쓰지 않으므로 시간 값만 바꾸면 타이밍이 바뀐다.

| 바꿀 것                    | 위치               |
| -------------------------- | ------------------ |
| 색, 폰트                   | 맨 위 `:root` 토큰 |
| 줌아웃 박자                | `scaleAt`          |
| 비행 속도와 템포           | `BURSTS`, `CRUISE` |
| 지도 위 메모와 핀          | `SPEC`             |
| 행정동 이름과 추천 다섯 곳 | `NAMES`, `KEEP`    |
| 매물 정보와 체크리스트     | `FIELDS`, `CHECKS` |
| 비교표 값                  | `ROWS_T`           |
| 카메라 동선                | `camera`           |

행정동 경계와 방 안 장면은 아직 임의로 만든 모양이다. 실제 경계 데이터와 사진으로 바꿀 수 있다.

## 사용 방법 영상

`record-guide.mjs`가 개발 서버(`dev.jachwi-sunbae.kr`)에서 휴대폰 화면(390×844)을 실제로 조작하며 네 편을 녹화한다. 누르는 자리에는 파란 원을 잠깐 띄운다.

```bash
node record-guide.mjs                           # 네 편 모두
node record-guide.mjs memo,property,checklist   # 일부만
```

| 영상        | 내용                                                       |
| ----------- | ---------------------------------------------------------- |
| `explore`   | 판교역을 검색하고 통근 30분 이내로 고른 뒤 1위 동네 열기   |
| `memo`      | 정자동 지도에서 자리를 골라 좋아요와 거리 메모 남기기      |
| `property`  | 매물을 추가하고 이름, 보증금, 월세 채우기                  |
| `checklist` | 그 매물의 체크리스트에서 괜찮음, 주의를 고르고 메모 남기기 |

결과는 `out/guide/guide-*.mp4`에 저장한다. 프런트에 넣을 때는 `frontend/src/pages/usage-guide/assets/`로 복사하고, 마지막 장면을 포스터(`guide-*-poster.jpg`)로 함께 뽑는다.

녹화는 `out/guide/state.json`의 익명 회원 하나로 이어서 한다. 다시 녹화할 때는 먼저 그 회원의 매물과 영상용 거리 메모를 지운다. 마지막 녹화의 매물과 메모는 체크리스트 영상에 쓰므로 개발 서버에 남는다. 거리 메모는 다른 사람에게도 보이므로, 필요 없으면 지운다.
