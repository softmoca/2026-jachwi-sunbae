import { beforeEach, describe, expect, it } from 'vitest';

import { readLastMealTab, writeLastMealTab } from '@/pages/cheap-meals/model/mealTabSession';

describe('mealTabSession', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('마지막으로 연 탭을 저장하고 다시 읽는다', () => {
    expect(readLastMealTab()).toBeNull();
    writeLastMealTab('delivery');
    expect(readLastMealTab()).toBe('delivery');
  });

  it('없는 탭 이름이 남아 있으면 읽지 않는다', () => {
    window.sessionStorage.setItem('jachwi-sunbae.cheapMeals.lastTab', 'all');
    expect(readLastMealTab()).toBeNull();
  });

  it('저장소를 쓸 수 없어도 오류 없이 넘어간다', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(readLastMealTab(broken)).toBeNull();
    expect(() => writeLastMealTab('convenience', broken)).not.toThrow();
  });
});
