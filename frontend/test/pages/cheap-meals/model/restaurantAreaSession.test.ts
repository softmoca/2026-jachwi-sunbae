import { describe, expect, it } from 'vitest';

import { readRestaurantArea, writeRestaurantArea } from '@/pages/cheap-meals/model/restaurantAreaSession';

const KEY = 'jachwi-sunbae.cheapMeals.restaurantArea';

describe('restaurantAreaSession', () => {
  it('고른 동네의 좌표와 이름만 저장하고 다시 읽는다', () => {
    writeRestaurantArea({ latitude: 37.5665, longitude: 126.978, label: '서울 중구' });
    expect(readRestaurantArea()).toEqual({ latitude: 37.5665, longitude: 126.978, label: '서울 중구' });
  });

  it.each([
    ['깨진 값', '{'],
    ['남한 밖 좌표', JSON.stringify({ latitude: 35.68, longitude: 139.76, label: '도쿄' })],
    ['빈 이름', JSON.stringify({ latitude: 37.5, longitude: 127, label: ' ' })],
    ['숫자가 아닌 좌표', JSON.stringify({ latitude: '37.5', longitude: 127, label: '서울' })],
    ['너무 긴 이름', JSON.stringify({ latitude: 37.5, longitude: 127, label: '가'.repeat(201) })],
  ])('%s은 없는 값처럼 다뤄 기본 동네로 연다', (_, stored) => {
    sessionStorage.setItem(KEY, stored);
    expect(readRestaurantArea()).toBeNull();
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
    expect(() => writeRestaurantArea({ latitude: 37.5, longitude: 127, label: '서울' }, broken)).not.toThrow();
    expect(readRestaurantArea(broken)).toBeNull();
  });
});
