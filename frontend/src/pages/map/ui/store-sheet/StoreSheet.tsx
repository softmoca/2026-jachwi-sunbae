import { useLayoutEffect, useRef } from 'react';

import type { GoodPriceResult, GoodPriceStore } from '@/features/good-price/model/GoodPriceStore';
import type useMapSheet from '@/features/map/hooks/useMapSheet';
import { Button } from '@/shared/ui/button/Button';
import Icon from '@/shared/ui/icon/Icon';

import StoreCard from '../store-card/StoreCard';
import StoreDetail from '../store-detail/StoreDetail';

import styles from './StoreSheet.module.css';

type Props = {
  sheet: ReturnType<typeof useMapSheet>;
  data: GoodPriceResult | undefined;
  radius: GoodPriceResult['radius'];
  selectedStore: GoodPriceStore | null;
  isLoading: boolean;
  isError: boolean;
  onSelect: (id: number) => void;
  onBack: () => void;
  onRetry: () => void;
  onExpandRadius: () => void;
  onChangeArea: () => void;
};

const StoreSheet = ({
  sheet,
  data,
  radius,
  selectedStore,
  isLoading,
  isError,
  onSelect,
  onBack,
  onRetry,
  onExpandRadius,
  onChangeArea,
}: Props) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const listScroll = useRef(0);
  const isOpen = sheet.sheetStage !== 'closed' || sheet.isDragging;
  const radiusLabel = radius === 500 ? '500m' : `${radius / 1000}km`;
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (body === null) return;
    body.scrollTop = selectedStore === null ? listScroll.current : 0;
  }, [selectedStore?.id]);

  return (
    <div className={styles.viewport} data-sheet-viewport>
      <section
        ref={sheet.sheetRef}
        className={styles.sheet}
        data-dragging={sheet.isDragging || undefined}
        aria-label={selectedStore?.name ?? '반경 안 가게 목록'}
      >
        <button
          type="button"
          className={styles.header}
          aria-expanded={isOpen}
          aria-label={`${selectedStore === null ? '가게 목록' : '가게 정보'} ${isOpen ? '닫기' : '열기'}`}
          onPointerDown={sheet.handleDragStart}
          onPointerMove={sheet.handleDragMove}
          onPointerUp={sheet.handleDragEnd}
          onPointerCancel={sheet.handleDragCancel}
          onClick={sheet.toggleSheet}
        >
          <span className={styles.handle} />
          <span className={styles.headerRow}>
            <strong>
              {selectedStore?.name ??
                (isLoading
                  ? '주변 가게를 찾고 있어요'
                  : isError
                    ? '가게 목록을 불러오지 못했어요'
                    : `${radiusLabel} 안 착한가격 가게 ${data?.count ?? 0}곳`)}
            </strong>
            <Icon name={isOpen ? 'chevron-down' : 'chevron-up'} size={18} />
          </span>
        </button>
        <div className={styles.contentViewport}>
          <div
            ref={bodyRef}
            className={styles.body}
            data-sheet-content
            aria-hidden={!isOpen}
            inert={!isOpen}
            onScroll={(event) => {
              if (selectedStore === null) listScroll.current = event.currentTarget.scrollTop;
            }}
          >
            <div className={styles.tools}>
              {selectedStore === null ? (
                <span>가까운 순 · 직선거리 · 가격 단위 원</span>
              ) : (
                <button type="button" onClick={onBack}>
                  <Icon name="arrow-left" size={15} />
                  가게 목록으로
                </button>
              )}
              {sheet.sheetStage !== 'full' && (
                <button type="button" onClick={sheet.expandSheet}>
                  전체 펼치기
                  <Icon name="chevron-up" size={15} />
                </button>
              )}
            </div>
            {isLoading ? (
              <p className={styles.state} role="status">
                주변 가게를 찾고 있어요…
              </p>
            ) : isError ? (
              <div className={styles.state} role="alert">
                <h2>가게를 불러오지 못했어요</h2>
                <Button onClick={onRetry}>다시 시도</Button>
              </div>
            ) : selectedStore !== null ? (
              <StoreDetail store={selectedStore} dataAsOf={data?.dataAsOf ?? null} />
            ) : data?.count === 0 ? (
              <div className={styles.state}>
                <h2>{radiusLabel} 안에 등록된 가게가 없어요</h2>
                <p>조금 더 넓은 범위나 다른 동네를 살펴보세요.</p>
                {radius < 2000 && <Button onClick={onExpandRadius}>반경 넓히기</Button>}
                <Button variant="secondary" onClick={onChangeArea}>
                  다른 동네 찾기
                </Button>
              </div>
            ) : (
              <ul className={styles.list} aria-label="가게 목록">
                {data?.stores.map((store) => (
                  <li key={store.id}>
                    <StoreCard store={store} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            )}
            {selectedStore === null && data !== undefined && (
              <p className={styles.source}>
                행정안전부 착한가격업소 현황{data.dataAsOf === null ? '' : ` · ${data.dataAsOf} 기준`}
                <br />
                방문 전 가격과 영업 여부를 확인해 주세요.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default StoreSheet;
