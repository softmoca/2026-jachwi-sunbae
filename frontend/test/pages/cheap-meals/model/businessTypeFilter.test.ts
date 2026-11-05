import { describe, expect, it } from 'vitest';

import { countBusinessTypes, filterByBusinessType } from '@/pages/cheap-meals/model/businessTypeFilter';
import type { GoodPriceStore } from '@/features/good-price/model/GoodPriceStore';

const store = (id: number, businessType: string) => ({ id, businessType }) as GoodPriceStore;
const stores = [store(1, '한식'), store(2, '일식'), store(3, '한식'), store(4, ' 기타비요식업 '), store(5, '')];

describe('businessTypeFilter', () => {
  it('업종별 가게 수를 많은 순, 같으면 이름순으로 센다. 빈 업종은 칩으로 만들지 않는다', () => {
    expect(countBusinessTypes(stores, null)).toEqual([
      { name: '한식', count: 2 },
      { name: '기타비요식업', count: 1 },
      { name: '일식', count: 1 },
    ]);
  });

  it('고른 업종이 새 목록에 없어도 0곳으로 남긴다', () => {
    expect(countBusinessTypes([store(1, '한식')], '일식')).toEqual([
      { name: '한식', count: 1 },
      { name: '일식', count: 0 },
    ]);
  });

  it('고른 업종의 가게만 남기고, 고르지 않으면 모두 둔다', () => {
    expect(filterByBusinessType(stores, '한식').map(({ id }) => id)).toEqual([1, 3]);
    expect(filterByBusinessType(stores, '기타비요식업').map(({ id }) => id)).toEqual([4]);
    expect(filterByBusinessType(stores, null)).toHaveLength(5);
  });
});
