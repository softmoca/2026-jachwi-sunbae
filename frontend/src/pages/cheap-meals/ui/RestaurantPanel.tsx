import { css, cx } from '@emotion/css';

import useAddressSearch from '@/features/map/api/useAddressSearch';
import AddressSearchResults from '@/features/map/ui/address-search-results/AddressSearchResults';
import MapCanvas from '@/features/map/ui/map-canvas/MapCanvas';
import useDelayedLoading from '@/shared/lib/hooks/useDelayedLoading';
import BottomSheet from '@/shared/ui/bottom-sheet/BottomSheet';
import { Button } from '@/shared/ui/button/Button';
import EmptyState from '@/shared/ui/empty-state/EmptyState';
import Icon from '@/shared/ui/icon/Icon';
import InlineNotice from '@/shared/ui/inline-notice/InlineNotice';
import ListDetailLayout from '@/shared/ui/list-detail-layout/ListDetailLayout';
import ProgressCircle from '@/shared/ui/progress-circle/ProgressCircle';
import SearchField from '@/shared/ui/search-field/SearchField';

import type { MealLayout } from '../hooks/useMealTabs';
import useRestaurantMap from '../hooks/useRestaurantMap';
import MealSheet from './MealSheet';
import StoreCard from './store-card/StoreCard';
import StoreDetail from './store-detail/StoreDetail';

type RestaurantPanelProps = { isActive: boolean; layout: MealLayout };

const RestaurantPanel = ({ isActive, layout }: RestaurantPanelProps) => {
  const map = useRestaurantMap(isActive);
  // 식당 탭을 처음 열어 보여 줄 목록이 없을 때는 찾는 중 문구를 바로 보여 준다.
  // 지도를 옮겨 다시 찾을 때는 이전 목록을 둔 채 기다리고, 응답이 늦을 때만 찾는 중 문구로 바꾼다.
  const isDelayedLoadingVisible = useDelayedLoading(map.query.isPlaceholderData);
  const isLoadingVisible = map.query.isPending || isDelayedLoadingVisible;
  const search = useAddressSearch();
  const data = map.query.isError ? undefined : map.query.data;
  const locate = () => void map.locate();
  const controls = (
    <div className={styles.controls}>
      {/* 검색창과 현재 위치를 한 줄에 두고 안내 문구를 바로 아래에 붙여 지도 위 빈 줄을 줄인다. */}
      <div className={styles.row}>
        <button type="button" className={styles.search} onClick={map.openSearch}>
          <Icon name="search" size={18} />
          <span>{map.area.label}</span>
          <small>주소 검색</small>
        </button>
        <button
          type="button"
          className={styles.locate}
          disabled={map.isLocating}
          onClick={locate}
          aria-label="현재 위치로 찾기"
        >
          <Icon name="locate" size={19} />
          {map.isLocating ? '확인 중' : '현재 위치'}
        </button>
      </div>
      <p className={styles.hint}>음식점 외 업종도 있어요. 가게별 업종을 확인해 주세요.</p>
      {map.locationError && (
        <p className={styles.hint} role="alert">
          {map.locationError}
        </p>
      )}
    </div>
  );
  const mapView = (
    <>
      {isActive && (
        <MapCanvas
          onRetry={() => window.location.reload()}
          center={map.viewport}
          markers={map.markers}
          circles={[{ radiusMeters: map.radius, label: `${map.radius}m` }]}
          radiusCenter={map.area}
          level={map.level}
          interactive
          selectedMarkerId={map.selectedStore ? String(map.selectedStore.id) : null}
          onSelectMarker={(marker) => map.openStore(Number(marker.id))}
          onCenterChange={map.moveMap}
          onLevelChange={map.changeLevel}
        />
      )}
    </>
  );
  const storeList = isLoadingVisible ? (
    <ProgressCircle size={24} label="주변 가게를 찾고 있어요." />
  ) : map.query.isError ? (
    <div role="alert">
      <p>가게 정보를 불러오지 못했어요.</p>
      <Button onClick={() => void map.query.refetch()}>다시 시도</Button>
    </div>
  ) : data?.count === 0 ? (
    <EmptyState
      variant="plain"
      icon="map"
      title="이 반경 안에 등록된 가게가 없어요"
      description="지도를 옮겨 다시 찾거나 다른 동네를 검색해 보세요."
      action={
        <Button variant="secondary" onClick={map.openSearch}>
          다른 동네 찾기
        </Button>
      }
    />
  ) : (
    <>
      <p className={styles.notice}>가까운 순 · 기준 위치에서 직선거리 · 등록 가격</p>
      <ul className={styles.list} aria-label="가게 목록">
        {data?.stores.map((store) => (
          <li key={store.id}>
            <StoreCard store={store} onSelect={map.openStore} />
          </li>
        ))}
      </ul>
      <InlineNotice>
        행정안전부 착한가격업소 현황 · {data?.dataAsOf ?? '기준일 정보 없음'}
        <br />
        방문 전 가격과 영업 여부를 확인해 주세요.
      </InlineNotice>
    </>
  );
  const searchSheet = map.isSearchOpen && isActive && (
    <MealSheet title="어느 동네를 둘러볼까요?" layout={layout} onClose={map.closeOverlay}>
      <Button fullWidth variant="secondary" isLoading={map.isLocating} onClick={locate}>
        현재 위치로 찾기
      </Button>
      {map.locationError && <p role="alert">{map.locationError}</p>}
      <div className={styles.addressSearch}>
        <SearchField
          label="동네 주소 검색"
          placeholder="도로명이나 지번 주소 검색"
          value={search.query}
          onValueChange={search.changeQuery}
          onSubmit={() => void search.submit()}
        />
      </div>
      <AddressSearchResults
        results={search.results}
        status={search.status}
        onSelect={(address) => {
          map.chooseArea({
            latitude: address.latitude,
            longitude: address.longitude,
            label: address.roadAddress ?? address.jibunAddress ?? '선택한 위치',
          });
          search.clear();
        }}
      />
    </MealSheet>
  );

  // 데스크탑은 목록을 지도 왼쪽에 늘 펼쳐 두고, 고른 가게의 상세를 목록 옆 칸에 붙인다.
  if (layout === 'desktop') {
    return (
      <section className={styles.panel} aria-label="주변 착한가격업소">
        <ListDetailLayout
          className={styles.desktopLayout}
          list={
            <div className={styles.desktopList}>
              {controls}
              <div className={styles.desktopStores}>
                <h2 className={styles.desktopTitle}>착한가격 가게 {data?.count ?? 0}곳</h2>
                {storeList}
              </div>
            </div>
          }
          detail={
            map.selectedStore && (
              <div className={styles.desktopDetail} role="region" aria-label={`${map.selectedStore.name} 상세`}>
                <h2 className={styles.desktopTitle}>{map.selectedStore.name}</h2>
                <StoreDetail store={map.selectedStore} dataAsOf={data?.dataAsOf ?? null} />
              </div>
            )
          }
          onCloseDetail={map.closeOverlay}
          closeLabel="가게 상세 닫기"
        >
          <div className={cx(styles.map, styles.desktopMap)}>{mapView}</div>
        </ListDetailLayout>
        {searchSheet}
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-label="주변 착한가격업소">
      {controls}
      <div className={styles.map}>
        {mapView}
        {!map.isListOpen ? (
          <button type="button" className={styles.showList} onClick={map.openList}>
            가게 목록 보기 {data ? `· ${data.count}곳` : ''}
          </button>
        ) : (
          <BottomSheet
            title={map.selectedStore?.name ?? `착한가격 가게 ${data?.count ?? 0}곳`}
            initialHeightPercent={40}
            onClose={() => {
              if (map.selectedStore) map.closeOverlay();
              else map.closeList();
            }}
            closeLabel={map.selectedStore ? '가게 상세 닫기' : '가게 목록 닫기'}
            onBack={map.selectedStore ? map.closeOverlay : undefined}
          >
            <div className={styles.sheetContent}>
              {map.selectedStore && !map.query.isPending && !map.query.isError ? (
                <StoreDetail store={map.selectedStore} dataAsOf={data?.dataAsOf ?? null} />
              ) : (
                storeList
              )}
            </div>
          </BottomSheet>
        )}
      </div>
      {searchSheet}
    </section>
  );
};
const styles = {
  panel: css`
    label: RestaurantPanel-panel;
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  `,
  controls: css`
    label: RestaurantPanel-controls;
    padding: 0.8rem 1rem 0.6rem;
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-border);
  `,
  search: css`
    label: RestaurantPanel-search;
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    gap: 0.55rem;
    min-height: 44px;
    padding: 0.6rem 0.8rem;
    border: 0;
    border-radius: var(--radius-md);
    background: var(--color-search-surface);
    color: var(--color-ink);
    font: inherit;
    cursor: pointer;
    & span {
      flex: 1;
      text-align: left;
      font-size: 0.83rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    & small {
      flex-shrink: 0;
      font-size: 0.7rem;
    }
  `,
  row: css`
    label: RestaurantPanel-row;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  `,
  locate: css`
    label: RestaurantPanel-locate;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.3rem;
    min-height: 44px;
    padding: 0.4rem;
    background: none;
    border: 0;
    color: var(--color-ink);
    font-size: 0.75rem;
    cursor: pointer;
  `,
  hint: css`
    label: RestaurantPanel-hint;
    font-size: 0.7rem;
    color: var(--color-ink-soft);
    line-height: 1.5;
    margin: 0.4rem 0 0;
    /* 좁은 칸이나 큰 글씨에서 줄이 넘어가도 낱말 가운데서 끊지 않는다. */
    word-break: keep-all;
    & + & {
      margin-top: 0.15rem;
    }
  `,
  notice: css`
    label: RestaurantPanel-notice;
    font-size: 0.7rem;
    color: var(--color-ink-soft);
    line-height: 1.5;
    margin: 0.5rem 0 0.2rem;
    /* 좁은 칸이나 큰 글씨에서 줄이 넘어가도 낱말 가운데서 끊지 않는다. */
    word-break: keep-all;
  `,
  map: css`
    label: RestaurantPanel-map;
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
    & .BottomSheet-sheet header h2 {
      white-space: normal;
      overflow-wrap: anywhere;
    }
  `,
  showList: css`
    label: RestaurantPanel-showList;
    position: absolute;
    bottom: max(1rem, env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%);
    z-index: 25;
    min-height: 44px;
    padding: 0.7rem 1.2rem;
    border: 0;
    border-radius: 99px;
    background: var(--color-action);
    color: var(--color-on-action);
    cursor: pointer;
    white-space: nowrap;
  `,
  list: css`
    label: RestaurantPanel-list;
    list-style: none;
    padding: 0;
    margin: 0;
  `,
  desktopLayout: css`
    label: RestaurantPanel-desktopLayout;
    flex: 1;
    min-height: 0;
    border-top: 1px solid var(--color-border);
  `,
  desktopList: css`
    label: RestaurantPanel-desktopList;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    border-right: 1px solid var(--color-border);
  `,
  desktopStores: css`
    label: RestaurantPanel-desktopStores;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem;
  `,
  desktopDetail: css`
    label: RestaurantPanel-desktopDetail;
    height: 100%;
    overflow-y: auto;
    padding: 1rem 1.25rem;
    border-right: 1px solid var(--color-border);
  `,
  // 목록 옆 본문 칸은 세로 배치가 아니라서 높이를 직접 채운다.
  desktopMap: css`
    label: RestaurantPanel-desktopMap;
    height: 100%;
  `,
  desktopTitle: css`
    label: RestaurantPanel-desktopTitle;
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
    letter-spacing: -0.035em;
    overflow-wrap: anywhere;
  `,
  addressSearch: css`
    label: RestaurantPanel-addressSearch;
    margin-top: 1rem;
  `,
  sheetContent: css`
    label: RestaurantPanel-sheetContent;
    padding-bottom: env(safe-area-inset-bottom);
  `,
};
export default RestaurantPanel;
