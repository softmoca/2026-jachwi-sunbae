import type { GoodPriceStore } from '@/features/good-price/model/GoodPriceStore';

export type BusinessTypeCount = { name: string; count: number };

/**
 * 지금 목록의 업종과 가게 수. 가게가 많은 업종부터, 같으면 이름순으로 둔다.
 * 고른 업종이 새 동네 목록에 없어도 칩을 지우지 않고 0곳으로 남겨, 사용자가 무엇을 골라 두었는지 보고 풀 수 있게 한다.
 */
export const countBusinessTypes = (stores: GoodPriceStore[], selected: string | null): BusinessTypeCount[] => {
  const counts = new Map<string, number>();
  stores.forEach((store) => {
    const name = store.businessType.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  if (selected !== null && !counts.has(selected)) counts.set(selected, 0);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
};

export const filterByBusinessType = (stores: GoodPriceStore[], selected: string | null): GoodPriceStore[] =>
  selected === null ? stores : stores.filter((store) => store.businessType.trim() === selected);
