import type { Brand, DeliveryOffer, Product } from '@/features/meal-deals/model/MealDeal';
import {
  CHEAP_MEALS_SEARCH_PARAM,
  CHEAP_MEALS_STORE_PARAM,
  CHEAP_MEALS_TAB_PARAM,
  cheapMealsTabPath,
} from '@/shared/lib/navigation/appPaths';

/** 한 끼 카테고리. 고를 카드만 늘어놓던 `전체` 탭 없이 식당부터 바로 보여 준다. */
export const MEAL_TABS = { restaurant: '식당', convenience: '편의점', delivery: '배달' } as const;
export const DEFAULT_MEAL_TAB: MealTab = 'restaurant';
export type MealTab = keyof typeof MEAL_TABS;
export type MealDetail =
  { kind: 'product'; product: Product; brand: Brand; sourceUrl: string } | { kind: 'delivery'; offer: DeliveryOffer };

export const isMealTab = (value: string | null | undefined): value is MealTab =>
  value !== null && value !== undefined && Object.prototype.hasOwnProperty.call(MEAL_TABS, value);

/** 식당 탭만 쓰는 쿼리. 다른 탭 주소에는 붙이지 않는다. */
const RESTAURANT_ONLY_PARAMS = [CHEAP_MEALS_STORE_PARAM, CHEAP_MEALS_SEARCH_PARAM];

export type MealLocation = { tab: MealTab; redirect: string | null };

/**
 * 주소에서 지금 탭을 읽고, 탭 주소가 아니면 옮겨 갈 탭 주소를 함께 돌려준다.
 * - 탭 없는 `/cheap-meals`, 틀린 탭, 예전 `?tab=` 주소는 탭 주소로 바꾼다. 경로에 맞는 탭이 있으면 경로를 따른다.
 * - 경로에도 예전 쿼리에도 탭이 없으면 `fallbackTab`(마지막으로 연 탭)을 연다.
 * - 식당 탭 쿼리(`?store=`, `?search=`)는 식당 주소에만 남기고, 그 밖의 쿼리(유입 경로 등)는 그대로 둔다.
 */
export const resolveMealLocation = (
  pathTab: string | undefined,
  search: string,
  fallbackTab: MealTab = DEFAULT_MEAL_TAB,
): MealLocation => {
  const params = new URLSearchParams(search);
  const legacyTab = params.get(CHEAP_MEALS_TAB_PARAM);
  // 예전 `?tab=all`처럼 없어진 탭이나 틀린 탭은 마지막으로 연 탭(없으면 식당 탭)으로 연다.
  const tab = isMealTab(pathTab) ? pathTab : isMealTab(legacyTab) ? legacyTab : fallbackTab;
  const original = params.toString();
  params.delete(CHEAP_MEALS_TAB_PARAM);
  if (tab !== 'restaurant') RESTAURANT_ONLY_PARAMS.forEach((key) => params.delete(key));
  const query = params.toString();
  const isCanonical = pathTab === tab && original === query;
  return { tab, redirect: isCanonical ? null : `${cheapMealsTabPath(tab)}${query ? `?${query}` : ''}` };
};
