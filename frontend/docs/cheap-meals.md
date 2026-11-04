# 저렴한 한 끼 찾기

홈의 `오늘 한 끼, 저렴하게` 카드에서 주변 착한가격업소, 편의점 행사상품, 배달 할인정보를 탐색한다. [이슈 #461](https://github.com/woowacourse-teams/2026-jachwi-sunbae/issues/461)에 해당하는 프론트엔드 기능이다.

## 화면과 상태

| 주소                           | 화면                   |
| ------------------------------ | ---------------------- |
| `/cheap-meals`                 | 식당 (기본 탭)         |
| `/cheap-meals?tab=restaurant`  | 착한가격업소 지도·목록 |
| `/cheap-meals?tab=convenience` | 편의점 행사상품        |
| `/cheap-meals?tab=delivery`    | 배달 할인정보          |

탭은 식당, 편의점, 배달 세 가지이고 기본은 식당이다. `tab`이 없거나 예전 주소의 `?tab=all`처럼 모르는 값이면 식당을 연다. 카테고리에 진입하면 API를 조회한다. 방문한 패널은 숨겨서 필터·스크롤·더 보기 개수·식당 조회 위치·확대율을 유지한다. 새로고침 시 URL의 카테고리는 유지하지만 메모리 필터는 초기화한다. 상품·배달 상세는 Router history state, 업소 상세·주소 검색은 query parameter로 열어 브라우저 뒤로가기가 상세를 먼저 닫는다. 업소 상세와 주소 검색은 하나의 이력을 공유하고, 다른 마커 선택은 이력을 교체한다. 주소 선택으로 상세를 닫을 때 기존 목록 이력으로 돌아가므로 뒤로가기에 중복 화면이 남지 않는다. 직접 진입한 상세 URL은 현재 카테고리를 유지하며 닫는다. 주소 검색을 닫거나 다른 탭으로 이동하면 진행 중인 위치 요청의 늦은 응답을 무시한다. 상품·배달·주소 검색 모달은 기존 BottomSheet와 native dialog를 조합해 배경 스크롤 잠금, 초점 제한·복원, Escape와 Safe Area를 처리한다. 데스크탑에서는 같은 dialog를 화면 가운데 창으로 연다.

- 식당: 주소 검색, 사용자가 버튼을 누를 때만 현재 위치 요청, 고정 반경 2km 조회, 네이버 지도 마커, 목록·상세, 전화, 외부 길찾기, 지도 이동 후 자동 재검색(이동이 멈추고 400ms 뒤, 버튼 없음)을 제공한다. 음식점 외 업종도 원문 그대로 표시하고 메뉴 가격 문자열을 계산하거나 바꾸지 않는다. 반경 선택 버튼은 제공하지 않으며 주소 검색·현재 위치·지도 재검색에 같은 2km 반경을 적용한다. 위치 권한 거부 시 주소 검색을 사용할 수 있다.
- 편의점: 이마트24·세븐일레븐, 전체/1+1/2+1/할인/기타 행사 필터를 제공한다. 기타 행사는 3+1·골라담기를 포함한다. `UNKNOWN` 상품도 유지한다. 24개씩 표시하고 이미지 오류는 대체 UI로 처리한다. 공식 출처·마지막 수집 시각·매장별 적용 및 재고 차이를 안내한다. 판매가격을 행사 수량으로 나누지 않는다.
- 배달: 전체·배민·쿠팡이츠, 할인금액·최소 주문·기간·조건·한국 시간의 마지막 확인 시각을 보여준다. null은 정보 없음으로 표시하며 결제금액이나 주문 링크를 생성하지 않는다.

데스크탑(1024px 이상)은 진입점에서 `useIsDesktop()`으로 화면을 고른다. 공용 데스크탑 헤더 아래 왼쪽 13rem 칸에 `저렴한 한 끼` 제목과 세로 탭 (`aria-orientation="vertical"`, 위/아래 방향키로 이동)을 두고 오른쪽에 본문을 둔다. 편의점은 브랜드와 행사 유형을 한 줄 도구 막대에 나란히 두고 상품을 4열로, 배달 혜택은 2열로 놓는다. 휴대폰은 위쪽 가로 탭을 세 칸으로 나눈다. 식당 탭은 `ListDetailLayout`으로 왼쪽에 주소 검색과 가게 목록, 그 옆에 가게 상세, 오른쪽에 지도를 화면 끝까지 둔다. 홈 진입 카드는 옅은 노란 그라데이션에 진한 글자이고, 휴대폰 홈에서는 기능 카드 묶음 아래에, 데스크탑 홈에서는 사용방법 카드와 같은 줄의 오른쪽 열에 둔다.

지도 SDK의 인증 실패는 지도 영역에서 처리해 목록·다른 카테고리를 계속 사용할 수 있게 한다. 지도 다시 시도는 폐기된 SDK를 초기화하기 위해 페이지를 새로고침하므로 메모리 필터가 초기화된다. 지도 목록 시트는 지도를 함께 조작할 수 있는 비모달 시트이며 끌개 또는 키보드 위·아래 방향키로 확장할 수 있다. 목록 시트와 상품·배달 상세 시트는 끝까지 끌어 올리면 페이지로 연다.

## API와 코드 구조

기존 익명 로그인·Refresh Token 인증, `apiRequest`, 응답 파서, TanStack Query를 사용한다. 별도 인증이나 백엔드 구현은 없다.

```text
GET /api/maps/good-price-stores?latitude=...&longitude=...&radius=2000
GET /api/promotions?brand=EMART24
GET /api/promotions?brand=SEVEN_ELEVEN
GET /api/delivery-discount-offers
```

브랜드는 서버 조회 조건이며 행사 유형·배달 플랫폼은 클라이언트에서 필터링한다. API는 전체 목록을 반환하므로 점진적 표시는 DOM에 그리는 개수만 제한한다. 수집 시각이 null인 0건, 수집 완료 0건, 필터 결과 0건, API 오류를 구분하며 샘플 데이터를 자동으로 채우지 않는다.

- `features/good-price`: 업소 API 응답 검증·Query Hook·화면 모델
- `features/meal-deals`: API 응답 검증·Query Hook은 `api`, 화면 모델·표시 상수는 `model`, 표시 함수는 `lib`에 둔다.
- `pages/cheap-meals`: 탭 탐색, 지도·상세 이력 Hook, 카테고리 패널과 상세 시트. 공유 타입은 `model`에 두고 지도 Hook은 `openList`·`closeList`처럼 의도가 드러나는 동작을 제공한다. 화면은 `desktop`, `mobile`로 나누고 탭 목록과 패널은 `ui/meal-tab-list`, `ui/meal-tab-panels`를 함께 쓴다. 이벤트 이름과 속성은 `lib/cheapMealAnalytics.ts`가 소유한다.
- `pages/design-home/ui/CheapMealCard.tsx`: 공용 `ActionCard`로 만든 모바일, 데스크탑 공통 진입 카드
- `features/map`: 기존 지도 컴포넌트 재사용 및 늦은 SDK 인증 실패에 대한 정리 보호

`/cheap-meals`는 기존 ProtectedRoute 안에 lazy route로 추가한다. `/map`의 매물 경로와 리다이렉트, 홈의 방 찾기·동네 찾기·체크리스트·방 비교는 유지한다.

화면은 공용 `TopNavigation`, `EmptyState`, `InlineNotice`, `InfoValue`, `SegmentedControl`, `ActionCard`를 쓴다.

## PostHog 이벤트

UT 퍼널을 위해 이벤트 네 개만 둔다. 진입, 카테고리 선택, 상세 확인을 기본 퍼널로 보고 외부 이동은 따로 본다.

| 이벤트                         | 시점                                                                | 속성                                  |
| ------------------------------ | ------------------------------------------------------------------- | ------------------------------------- |
| `cheap_meal_viewed`            | 저렴한 한 끼 화면이 그려질 때 한 번                                 | 없음                                  |
| `cheap_meal_category_selected` | 사용자가 식당, 편의점, 배달을 직접 고를 때. 주소로 복원한 탭은 제외 | `category`, `source`                  |
| `cheap_meal_detail_viewed`     | 상품, 할인, 가게 상세가 실제로 열릴 때                              | `category`, `provider`(편의점, 배달)  |
| `cheap_meal_outbound_clicked`  | 공식 출처, 전화, 길찾기를 누를 때                                   | `category`, `destination`, `provider` |

`category`는 `restaurant`, `convenience`, `delivery`, `source`는 `top_tab`, `destination`은 `official_source`, `phone`, `directions`다. `provider`는 `EMART24`, `SEVEN_ELEVEN`, `BAEMIN`, `COUPANG_EATS` 같은 코드다. 상품명, 위치, 검색어 원문은 보내지 않는다. 화면과 상세 진입은 `LogScreen`으로 남겨 StrictMode에서도 한 번만 기록한다.

UT 진행자가 참가자마다 `?ut_session_id=UT01-P01` 링크를 한 번 열면 그 기기의 다음 이벤트 전체에 `ut_session_id`가 붙는다. 다음 참가자 링크로 덮어쓰고 `?ut_session_id=0`으로 지운다. 영문, 숫자, `-`, `_`로 된 32자 이하만 받는다.

### UT에서 보는 방법

- 퍼널: `cheap_meal_viewed` → `cheap_meal_category_selected` → `cheap_meal_detail_viewed`를 같은 사용자 기준으로 본다. `cheap_meal_outbound_clicked`는 퍼널에 넣지 않고 따로 센다.
- 필터: `ut_session_id`가 있는 이벤트만 보고, 참가자별로 나눌 때 `ut_session_id`로 쪼갠다. 운영 지표에서는 기존처럼 `environment`와 `traffic_type`으로 테스트 트래픽을 뺀다.
- 카테고리별 관심은 `cheap_meal_category_selected`와 `cheap_meal_detail_viewed`의 `category`로 나눈다.
- 기능 진입률은 자연 유입률이 아니라 식비 절약 과제를 줬을 때 기능을 발견한 비율이다. 한 끼 탐색 완료 여부, 선택 이유, 재방문 의향은 진행자가 직접 기록한다.

PostHog 프로젝트 토큰은 레포에 두지 않고 배포 빌드 환경변수로 넣는다([배포 문서](deployment.md#환경변수는-빌드-타임에-박힌다)). 로컬에서 실제 전송을 확인하려면 `.env.local`에 `POSTHOG_PROJECT_TOKEN`과 `POSTHOG_HOST`를 넣는다. 이때 이벤트는 `environment=development`로 구분된다. 인사이트와 대시보드를 만드는 개인 API 키는 프로젝트 토큰과 다르며 레포나 문서에 넣지 않는다.

## 이식 기준

원본은 [개인 브랜치](https://github.com/softmoca/mobile-kmp/tree/codex/cheap-meals)의 [React 패치](https://github.com/softmoca/mobile-kmp/blob/codex/cheap-meals/preview/cheap-meals.patch)다. 기준 커밋 `021267b55ac699d02ff0ccbf0a24f7da7fa73e0e`와 팀 `develop`의 `e15644e2b204d2214f03ea8c82d57ce2bc10ecab` 사이 프론트엔드 diff가 없음을 확인하고 이식했다.

원본과 달라진 부분은 전체 카드 문구를 요구사항의 업소·행사상품·할인정보로 맞춘 것, 업소 시트 하단 Safe Area 여백 보완, 테스트 보강, 팀 실행·검증 문서다. SDK 인증 실패 테스트는 단독 실행해도 성립하도록 이전 테스트에 대한 의존을 제거했다. KMP·SwiftUI·Xcode·인증서·개인 실행 스크립트는 이식하지 않았다. 이식 뒤 공용 컴포넌트, 데스크탑 화면, UT용 PostHog 이벤트를 더했다.

## 로컬 실행과 검사

Node 버전은 `frontend/.nvmrc`의 22.23.1이다. [프론트엔드 실행 안내](../README.md#dev-api-연동-확인)에 따라 의존성과 기존 지도 공개 Client ID를 준비한다. 이미 있는 `.env.local`을 덮어쓰지 않는다.

```bash
cd frontend
npm ci
ENABLE_MSW=false MAP_PROVIDER_MODE=naver DEV_API_PROXY_TARGET=https://dev-api.jachwi-sunbae.kr npm run dev
```

네이버 지도 Application에 현재 로컬 호스트가 허용돼 있어야 한다. 개발 서버 프록시는 기존 구현을 사용하며 TLS 검증과 인증 쿠키 보안 속성을 변경하지 않는다. 키·쿠키·토큰을 Git 또는 검증 기록에 넣지 않는다.

```bash
cd frontend
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
cd ..
npm run format:docs
npm run format:docs:check
```

단위·컴포넌트 테스트의 MSW fixture와 실제 API 브라우저 검증을 구분한다. 검사 결과와 배포 후 확인 항목은 [통합 검증 기록](cheap-meals-verification.md)에 정리한다.
