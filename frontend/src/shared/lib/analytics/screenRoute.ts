import { matchPath } from 'react-router-dom';

import {
  CHECKLISTS_PATH,
  COMPARE_PATH,
  EXPLORE_NEARBY_PATH,
  EXPLORE_PATH,
  GUIDE_PATH,
  HOME_PATH,
  LANDING_PATH,
  MAP_SELECT_LOCATION_PATH,
  MY_PATH,
  NEIGHBORHOODS_NEARBY_PATH,
  NEIGHBORHOODS_PATH,
  PRIVACY_PATH,
  RECORDS_PATH,
  ROUTE_PATTERNS,
} from '@/shared/lib/navigation/appPaths';

/** 라우터에 없는 주소(404)는 입력한 문자열이 그대로 실리지 않게 이 값으로 묶는다. */
export const UNKNOWN_SCREEN_ROUTE = '*';

// 구체적인 패턴을 먼저 둔다. 매개변수 자리에는 매물 번호나 동 코드가 들어가므로 패턴 그대로 싣는다.
const SCREEN_ROUTES = [
  ROUTE_PATTERNS.propertyEdit,
  ROUTE_PATTERNS.propertyPhotos,
  ROUTE_PATTERNS.propertyMemo,
  ROUTE_PATTERNS.propertyNearby,
  ROUTE_PATTERNS.propertyActiveChecklist,
  ROUTE_PATTERNS.propertyChecklist,
  '/properties/:propertyId',
  RECORDS_PATH,
  NEIGHBORHOODS_NEARBY_PATH,
  `${NEIGHBORHOODS_PATH}/${ROUTE_PATTERNS.areaDetails}`,
  `${NEIGHBORHOODS_PATH}/${ROUTE_PATTERNS.area}`,
  NEIGHBORHOODS_PATH,
  EXPLORE_NEARBY_PATH,
  `${EXPLORE_PATH}/${ROUTE_PATTERNS.areaDetails}`,
  `${EXPLORE_PATH}/${ROUTE_PATTERNS.area}`,
  EXPLORE_PATH,
  '/cheap-meals/:mealTab',
  '/cheap-meals',
  CHECKLISTS_PATH,
  MAP_SELECT_LOCATION_PATH,
  COMPARE_PATH,
  MY_PATH,
  GUIDE_PATH,
  PRIVACY_PATH,
  LANDING_PATH,
  HOME_PATH,
] as const;

/**
 * 화면 주소를 라우트 패턴으로 바꾼다(`/properties/12/memo` → `/properties/:propertyId/memo`).
 * 쿼리와 해시는 버린다. 좌표나 검색어, 매물 번호 같은 개인 값이 분석 속성에 남지 않게 한다.
 */
export const getAnalyticsScreenRoute = (pathname: string): string =>
  SCREEN_ROUTES.find((pattern) => matchPath(pattern, pathname) !== null) ?? UNKNOWN_SCREEN_ROUTE;

/** 지금 보고 있는 화면의 라우트 패턴. 브라우저 밖(테스트의 node 환경)에서는 값이 없다. */
export const getCurrentAnalyticsScreenRoute = (): string | undefined =>
  typeof window === 'undefined' ? undefined : getAnalyticsScreenRoute(window.location.pathname);
