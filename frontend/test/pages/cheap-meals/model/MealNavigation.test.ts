import { describe, expect, it } from 'vitest';

import { resolveMealLocation } from '@/pages/cheap-meals/model/MealNavigation';

describe('resolveMealLocation', () => {
  it.each([
    ['restaurant', ''],
    ['restaurant', '?store=10'],
    ['convenience', ''],
    ['delivery', '?utm_source=push'],
  ])('탭 주소(/cheap-meals/%s%s)는 그대로 둔다', (pathTab, search) => {
    expect(resolveMealLocation(pathTab, search)).toEqual({ tab: pathTab, redirect: null });
  });

  it.each([
    [undefined, '', 'restaurant', '/cheap-meals/restaurant'],
    [undefined, '?tab=all', 'restaurant', '/cheap-meals/restaurant'],
    [undefined, '?tab=convenience', 'convenience', '/cheap-meals/convenience'],
    [undefined, '?tab=restaurant&store=10&search=1', 'restaurant', '/cheap-meals/restaurant?store=10&search=1'],
    [undefined, '?tab=delivery&store=10&utm_source=push', 'delivery', '/cheap-meals/delivery?utm_source=push'],
    ['unknown', '?store=10', 'restaurant', '/cheap-meals/restaurant?store=10'],
    ['convenience', '?tab=delivery', 'convenience', '/cheap-meals/convenience'],
    ['convenience', '?store=10', 'convenience', '/cheap-meals/convenience'],
  ])('경로 탭 %s, 쿼리 %s는 %s 탭으로 열고 %s로 바꾼다', (pathTab, search, tab, redirect) => {
    expect(resolveMealLocation(pathTab, search)).toEqual({ tab, redirect });
  });
});

describe('resolveMealLocation 마지막 탭', () => {
  it.each([
    [undefined, '', '/cheap-meals/delivery'],
    [undefined, '?utm_source=home', '/cheap-meals/delivery?utm_source=home'],
    ['unknown', '', '/cheap-meals/delivery'],
  ])('탭 없는 주소(경로 %s, 쿼리 %s)는 마지막으로 연 탭 %s로 연다', (pathTab, search, redirect) => {
    expect(resolveMealLocation(pathTab, search, 'delivery')).toEqual({ tab: 'delivery', redirect });
  });

  it('경로나 예전 쿼리에 탭이 있으면 마지막 탭보다 그 탭을 따른다', () => {
    expect(resolveMealLocation('restaurant', '', 'delivery')).toEqual({ tab: 'restaurant', redirect: null });
    expect(resolveMealLocation(undefined, '?tab=convenience', 'delivery')).toEqual({
      tab: 'convenience',
      redirect: '/cheap-meals/convenience',
    });
  });
});
