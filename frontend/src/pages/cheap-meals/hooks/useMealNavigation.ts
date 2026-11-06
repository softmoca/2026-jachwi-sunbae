import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { cheapMealsTabPath } from '@/shared/lib/navigation/appPaths';

import { DEFAULT_MEAL_TAB, type MealDetail, type MealTab, resolveMealLocation } from '../model/MealNavigation';
import { readLastMealTab, writeLastMealTab } from '../model/mealTabSession';

type SheetState = { cheapMealDetail?: MealDetail };

/**
 * 탭은 경로(`/cheap-meals/:mealTab`)로 고른다. 탭을 바꿔도 같은 라우트라 화면을 새로 만들지 않아 패널 상태가 남는다.
 * 탭 주소가 아니면(탭 없음, 예전 `?tab=`) 화면은 그 탭으로 바로 그리고 주소만 탭 주소로 바꿔 둔다.
 * 홈 카드와 헤더 메뉴는 탭 없는 주소로 들어오므로, 다른 화면을 다녀와도 마지막으로 연 탭이 다시 열린다.
 */
const useMealNavigation = () => {
  const { mealTab } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [lastTab] = useState(() => readLastMealTab() ?? DEFAULT_MEAL_TAB);
  const { tab, redirect } = resolveMealLocation(mealTab, location.search, lastTab);
  const detail = (location.state as SheetState | null)?.cheapMealDetail;
  const state: unknown = location.state;
  useEffect(() => {
    if (redirect !== null) navigate(redirect, { replace: true, state });
  }, [redirect, navigate, state]);
  useEffect(() => {
    writeLastMealTab(tab);
  }, [tab]);
  return {
    tab,
    detail,
    // 다른 탭 주소에는 식당 탭 쿼리를 붙이지 않는다. 식당 탭의 동네는 패널이 기억한다.
    selectTab: (next: MealTab) => {
      if (tab === next) return;
      navigate(cheapMealsTabPath(next), { state: null });
    },
    openDetail: (detail: MealDetail) =>
      navigate({ pathname: location.pathname, search: location.search }, { state: { cheapMealDetail: detail } }),
    closeDetail: () => navigate(-1),
  };
};
export default useMealNavigation;
