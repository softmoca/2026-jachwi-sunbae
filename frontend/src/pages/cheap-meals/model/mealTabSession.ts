import { isMealTab, type MealTab } from './MealNavigation';

/**
 * 마지막으로 연 한 끼 탭. 다른 화면을 다녀오거나 홈 카드, 헤더 메뉴로 탭 없이 들어와도 그 탭을 다시 연다.
 * 고른 동네(`restaurantAreaSession`)처럼 브라우저 탭(세션)에만 두어 새 탭이나 다음 방문은 첫 탭부터 연다.
 */
const LAST_MEAL_TAB_KEY = 'jachwi-sunbae.cheapMeals.lastTab';

export const readLastMealTab = (storage: Storage = window.sessionStorage): MealTab | null => {
  try {
    const value = storage.getItem(LAST_MEAL_TAB_KEY);
    return isMealTab(value) ? value : null;
  } catch {
    return null;
  }
};

export const writeLastMealTab = (tab: MealTab, storage: Storage = window.sessionStorage): void => {
  try {
    storage.setItem(LAST_MEAL_TAB_KEY, tab);
  } catch {
    // 브라우저 저장소를 쓸 수 없으면 탭 없이 들어올 때 첫 탭을 열 뿐이다.
  }
};
