import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { CHEAP_MEALS_TAB_PARAM } from '@/shared/lib/navigation/appPaths';

import { DEFAULT_MEAL_TAB, MEAL_TABS, type MealDetail, type MealTab } from '../model/MealNavigation';

type SheetState = { cheapMealDetail?: MealDetail };

const useMealNavigation = () => {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  // 주소에 탭이 없거나 예전 주소(`?tab=all`)면 식당 탭으로 연다.
  const value = params.get(CHEAP_MEALS_TAB_PARAM) ?? DEFAULT_MEAL_TAB;
  const tab: MealTab = Object.prototype.hasOwnProperty.call(MEAL_TABS, value) ? (value as MealTab) : DEFAULT_MEAL_TAB;
  const detail = (location.state as SheetState | null)?.cheapMealDetail;
  return {
    tab,
    detail,
    selectTab: (next: MealTab) => {
      if (tab === next) return;
      const query = new URLSearchParams();
      if (next !== DEFAULT_MEAL_TAB) query.set(CHEAP_MEALS_TAB_PARAM, next);
      setParams(query, { state: null });
    },
    openDetail: (detail: MealDetail) =>
      navigate({ pathname: location.pathname, search: location.search }, { state: { cheapMealDetail: detail } }),
    closeDetail: () => navigate(-1),
  };
};
export default useMealNavigation;
