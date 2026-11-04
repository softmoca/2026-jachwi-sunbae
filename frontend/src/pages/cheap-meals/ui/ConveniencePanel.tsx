import { css, cx } from '@emotion/css';
import { useState } from 'react';

import { describeMealError, usePromotions } from '@/features/meal-deals/api/mealDealsApi';
import { formatKst, httpsUrl, won } from '@/features/meal-deals/lib/presentation';
import { type Brand, BRANDS, type Promotion, PROMOTIONS } from '@/features/meal-deals/model/MealDeal';
import { LogClick } from '@/shared/lib/analytics/logging';
import { Button } from '@/shared/ui/button/Button';
import InlineNotice from '@/shared/ui/inline-notice/InlineNotice';
import QueryState from '@/shared/ui/query-state/QueryState';
import { SegmentedControl, SegmentedControlItem } from '@/shared/ui/segmented-control/SegmentedControl';

import type { MealLayout } from '../hooks/useMealTabs';
import { CHEAP_MEAL_EVENTS, outboundClickedParams } from '../lib/cheapMealAnalytics';
import type { MealDetail } from '../model/MealNavigation';
import EmptyState from './MealEmptyState';
import ProductImage from './ProductImage';

import * as shared from './MealContent.styles';

type Filter = 'ALL' | 'OTHER' | Promotion;
const filters: { value: Filter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'ONE_PLUS_ONE', label: '1+1' },
  { value: 'TWO_PLUS_ONE', label: '2+1' },
  { value: 'SALE', label: '할인' },
  { value: 'OTHER', label: '기타 행사' },
];
type ConveniencePanelProps = { isActive: boolean; layout: MealLayout; onDetail: (detail: MealDetail) => void };

const ConveniencePanel = ({ isActive, layout, onDetail }: ConveniencePanelProps) => {
  const [brand, setBrand] = useState<Brand>('EMART24');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [limit, setLimit] = useState(24);
  const query = usePromotions(brand, isActive);
  return (
    <section className={cx(shared.section, layout === 'desktop' && shared.sectionDesktop)} aria-label="편의점 행사상품">
      <h2>편의점 행사상품</h2>
      <p className={shared.description}>지금 진행 중인 브랜드 행사 살펴보기</p>
      {/* 데스크탑은 브랜드와 행사 유형을 한 줄 도구 막대에 나란히 둬, 선택 줄이 겹겹이 쌓이지 않게 한다. */}
      <div className={layout === 'desktop' ? styles.toolbarDesktop : undefined}>
        <SegmentedControl
          value={brand}
          onValueChange={(value) => {
            setBrand(value as Brand);
            setLimit(24);
          }}
          aria-label="편의점 브랜드"
        >
          {Object.entries(BRANDS).map(([value, label]) => (
            <SegmentedControlItem key={value} value={value}>
              {label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <SegmentedControl
          className={styles.filters}
          value={filter}
          onValueChange={(value) => {
            setFilter(value as Filter);
            setLimit(24);
          }}
          aria-label="행사 유형"
        >
          {filters.map(({ value, label }) => (
            <SegmentedControlItem key={value} value={value}>
              {label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
      <QueryState query={query} loadingTitle="행사상품을 불러오고 있어요" describeError={describeMealError}>
        {(result) => {
          const products = result.products.filter(
            (product) =>
              filter === 'ALL' ||
              (filter === 'OTHER'
                ? ['THREE_PLUS_ONE', 'PICK_AND_MIX'].includes(product.promotionType)
                : product.promotionType === filter),
          );
          const source = httpsUrl(result.sourceUrl);
          return (
            <>
              <p className={shared.description} aria-live="polite">
                {BRANDS[brand]} · {products.length.toLocaleString('ko-KR')}개 상품
              </p>
              {products.length === 0 ? (
                <EmptyState
                  variant="plain"
                  title={
                    result.collectedAt === null && result.count === 0
                      ? '아직 행사정보를 수집하지 않았어요'
                      : result.count === 0
                        ? '현재 등록된 행사상품이 없어요'
                        : '이 행사 유형의 상품이 없어요'
                  }
                  description={
                    result.collectedAt === null
                      ? '공식 행사 페이지에서 최신 정보를 확인해 주세요.'
                      : '다른 행사 유형이나 브랜드를 살펴보세요.'
                  }
                />
              ) : (
                <ul className={cx(styles.grid, layout === 'desktop' && styles.gridDesktop)} aria-label="행사상품 목록">
                  {products.slice(0, limit).map((product, index) => (
                    <li key={`${index}-${product.name}-${product.promotionType}`}>
                      <button
                        type="button"
                        className={styles.card}
                        onClick={() => onDetail({ kind: 'product', product, brand, sourceUrl: result.sourceUrl })}
                        aria-label={`${product.name} 상세 보기`}
                      >
                        <ProductImage src={product.imageUrl} name={product.name} />
                        <span className={shared.badge}>{PROMOTIONS[product.promotionType]}</span>
                        <strong className={styles.name}>{product.name}</strong>
                        <span className={styles.price}>{won(product.price)}</span>
                        <small>판매가격</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {products.length > limit && (
                <Button fullWidth variant="secondary" onClick={() => setLimit((value) => value + 24)}>
                  상품 더 보기 ({Math.min(limit, products.length)}/{products.length})
                </Button>
              )}
              <footer className={styles.footer}>
                <InlineNotice>
                  마지막 수집:{' '}
                  {result.collectedAt === null ? '아직 수집되지 않음' : `${formatKst(result.collectedAt)} (한국 시간)`}
                  <br />
                  개별 매장에 따라 행사 적용과 재고가 다를 수 있어요. 표시한 금액은 상품 판매가격이며, 행사 조건은 공식
                  안내를 확인해 주세요.
                </InlineNotice>
                {source && (
                  <LogClick
                    event={CHEAP_MEAL_EVENTS.outboundClicked}
                    params={outboundClickedParams('convenience', 'official_source', brand)}
                  >
                    <a className={shared.sourceLink} href={source} target="_blank" rel="noreferrer">
                      {BRANDS[brand]} 공식 행사정보 ↗
                    </a>
                  </LogClick>
                )}
              </footer>
            </>
          );
        }}
      </QueryState>
    </section>
  );
};
const styles = {
  filters: css`
    label: ConveniencePanel-filters;
    margin: 0.75rem 0 0.25rem;
  `,
  /* 브랜드는 두 칸만큼만, 행사 유형은 남은 폭에서 최대 34rem까지 쓴다. */
  toolbarDesktop: css`
    label: ConveniencePanel-toolbarDesktop;
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;

    & > [role='radiogroup'] {
      flex: none;
      width: 16rem;
      margin: 0;
    }

    & > [role='radiogroup'] + [role='radiogroup'] {
      flex: 1;
      width: auto;
      max-width: 34rem;
    }
  `,
  footer: css`
    label: ConveniencePanel-footer;
    display: grid;
    gap: 0.5rem;
    margin-top: 1.25rem;
  `,
  grid: css`
    label: ConveniencePanel-grid;
    list-style: none;
    padding: 0;
    margin: 0 0 1.5rem;
    display: grid;
    /* 폭에 따라 열 수를 늘린다. 휴대폰은 두 칸, 태블릿은 서너 칸이 되고 칸 크기는 비슷하게 둔다. */
    grid-template-columns: repeat(auto-fill, minmax(min(9.5rem, calc(50% - 0.4rem)), 1fr));
    gap: 1.4rem 0.8rem;
  `,
  gridDesktop: css`
    label: ConveniencePanel-gridDesktop;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 2rem 1.25rem;
  `,
  card: css`
    label: ConveniencePanel-card;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-ink);
    text-align: left;
    cursor: pointer;
    font: inherit;
    & small {
      color: var(--color-ink-soft);
      font-size: 0.72rem;
    }
  `,
  name: css`
    label: ConveniencePanel-name;
    font-size: 0.87rem;
    line-height: 1.5;
    overflow-wrap: anywhere;
  `,
  price: css`
    label: ConveniencePanel-price;
    font-weight: 800;
    font-size: 1.06rem;
    margin-top: auto;
  `,
};
export default ConveniencePanel;
