import { describe, expect, it } from 'vitest';

import { selectProducts } from '@/pages/cheap-meals/lib/convenienceProducts';
import type { Product, Promotion } from '@/features/meal-deals/model/MealDeal';

const product = (name: string, price: number, promotionType: Promotion): Product => ({
  name,
  price,
  imageUrl: 'https://example.com/product.png',
  category: 'UNKNOWN',
  promotionType,
});

const products = [
  product('코카콜라 500ml', 2000, 'ONE_PLUS_ONE'),
  product('신라면 컵', 1500, 'TWO_PLUS_ONE'),
  product('펩시 콜라', 1500, 'SALE'),
  product('진라면 매운맛', 3000, 'THREE_PLUS_ONE'),
  product('제로 콜라', 2000, 'PICK_AND_MIX'),
];
const names = (list: Product[]) => list.map((item) => item.name);
const base = { filter: 'ALL', keyword: '', sort: 'DEFAULT' } as const;

describe('selectProducts', () => {
  it('조건이 없으면 API 응답 순서를 그대로 둔다', () => {
    expect(selectProducts(products, base)).toEqual(products);
  });

  it('상품명 일부로 검색하고 대소문자와 공백 차이를 무시한다', () => {
    expect(names(selectProducts(products, { ...base, keyword: '콜라' }))).toEqual([
      '코카콜라 500ml',
      '펩시 콜라',
      '제로 콜라',
    ]);
    expect(names(selectProducts(products, { ...base, keyword: '  코카 콜라500ML ' }))).toEqual(['코카콜라 500ml']);
    expect(names(selectProducts(products, { ...base, keyword: '   ' }))).toHaveLength(products.length);
    expect(selectProducts(products, { ...base, keyword: '우유' })).toEqual([]);
  });

  it('행사 유형 필터와 기타 행사(3+1·골라담기)를 검색과 함께 적용한다', () => {
    expect(names(selectProducts(products, { ...base, filter: 'OTHER' }))).toEqual(['진라면 매운맛', '제로 콜라']);
    expect(names(selectProducts(products, { ...base, filter: 'OTHER', keyword: '콜라' }))).toEqual(['제로 콜라']);
    expect(names(selectProducts(products, { ...base, filter: 'SALE', keyword: '라면' }))).toEqual([]);
  });

  it('판매가격으로 정렬하고 같은 가격은 기존 순서를 지킨다', () => {
    expect(names(selectProducts(products, { ...base, sort: 'PRICE_ASC' }))).toEqual([
      '신라면 컵',
      '펩시 콜라',
      '코카콜라 500ml',
      '제로 콜라',
      '진라면 매운맛',
    ]);
    expect(names(selectProducts(products, { ...base, sort: 'PRICE_DESC' }))).toEqual([
      '진라면 매운맛',
      '코카콜라 500ml',
      '제로 콜라',
      '신라면 컵',
      '펩시 콜라',
    ]);
  });

  it('검색·필터 결과에 정렬을 적용하고 원본 배열은 바꾸지 않는다', () => {
    const snapshot = [...products];
    expect(names(selectProducts(products, { filter: 'ALL', keyword: '콜라', sort: 'PRICE_ASC' }))).toEqual([
      '펩시 콜라',
      '코카콜라 500ml',
      '제로 콜라',
    ]);
    expect(products).toEqual(snapshot);
  });
});
