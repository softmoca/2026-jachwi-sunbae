import type { Product, Promotion } from '@/features/meal-deals/model/MealDeal';

export type PromotionFilter = 'ALL' | 'OTHER' | Promotion;
export type ProductSort = 'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC';

/** 대소문자와 공백 차이를 무시하도록 비교용 문자열로 바꾼다. */
const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, '');

const matchesFilter = (product: Product, filter: PromotionFilter) =>
  filter === 'ALL' ||
  (filter === 'OTHER'
    ? ['THREE_PLUS_ONE', 'PICK_AND_MIX'].includes(product.promotionType)
    : product.promotionType === filter);

/**
 * 브랜드 전체 상품에 행사 유형과 상품명 검색을 적용한 뒤 판매가격으로 정렬한다.
 * 화면에 보이는 일부가 아니라 전체 결과를 정렬해야 '더 보기'로 이어 붙여도 순서가 맞는다.
 * 가격이 같으면 안정 정렬이라 API 응답 순서를 그대로 지킨다.
 */
export const selectProducts = (
  products: Product[],
  { filter, keyword, sort }: { filter: PromotionFilter; keyword: string; sort: ProductSort },
): Product[] => {
  const normalizedKeyword = normalize(keyword);
  const matched = products.filter(
    (product) => matchesFilter(product, filter) && normalize(product.name).includes(normalizedKeyword),
  );
  if (sort === 'DEFAULT') return matched;
  const direction = sort === 'PRICE_ASC' ? 1 : -1;
  return [...matched].sort((a, b) => (a.price - b.price) * direction);
};
