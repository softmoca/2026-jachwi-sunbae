import { css, cx } from '@emotion/css';

import useAddressSearch from '@/features/map/api/useAddressSearch';
import AddressSearchResults from '@/features/map/ui/address-search-results/AddressSearchResults';
import MapCanvas from '@/features/map/ui/map-canvas/MapCanvas';
import MapCurrentLocationButton from '@/features/map/ui/map-current-location-button/MapCurrentLocationButton';
import useDelayedLoading from '@/shared/lib/hooks/useDelayedLoading';
import BottomSheet from '@/shared/ui/bottom-sheet/BottomSheet';
import { Button } from '@/shared/ui/button/Button';
import ContentState from '@/shared/ui/content-state/ContentState';
import Icon from '@/shared/ui/icon/Icon';
import InlineNotice from '@/shared/ui/inline-notice/InlineNotice';
import ListDetailLayout from '@/shared/ui/list-detail-layout/ListDetailLayout';
import ProgressCircle from '@/shared/ui/progress-circle/ProgressCircle';
import SearchField from '@/shared/ui/search-field/SearchField';

import type { MealLayout } from '../hooks/useMealTabs';
import useRestaurantMap from '../hooks/useRestaurantMap';
import BusinessTypeChips from './business-type-chips/BusinessTypeChips';
import MealEmptyState from './MealEmptyState';
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
  const searchButton = (
    <button
      type="button"
      className={cx(styles.search, layout === 'desktop' && styles.searchDesktop)}
      onClick={map.openSearch}
    >
      <Icon name="search" size={18} />
      <span>{map.area.label}</span>
      <small>주소 검색</small>
    </button>
  );
  const chips = (
    <BusinessTypeChips
      floating={layout === 'mobile'}
      types={map.businessTypes}
      selected={map.businessType}
      total={data?.count ?? 0}
      onSelect={map.selectBusinessType}
    />
  );
  // 다른 지도 화면처럼 현재 위치는 지도 위 동그란 공용 버튼으로 두고, 확인 중이거나 실패하면 그 옆에 짧게 알린다.
  const locationControl = (
    <div className={cx(styles.location, layout === 'desktop' && styles.locationDesktop)}>
      {(map.isLocating || map.locationError) && (
        <p className={styles.locationStatus} role={map.locationError ? 'alert' : 'status'}>
          {map.isLocating ? '현재 위치를 확인하는 중이에요.' : map.locationError}
        </p>
      )}
      <MapCurrentLocationButton isLocating={map.isLocating} onClick={locate} />
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
    <ContentState
      page={false}
      tone="error"
      title="가게 정보를 불러오지 못했어요"
      description="연결 상태를 확인하고 다시 시도해 주세요."
      onRetry={() => void map.query.refetch()}
    />
  ) : data?.count === 0 ? (
    <MealEmptyState
      title="이 반경 안에 등록된 가게가 없어요"
      description="지도를 옮겨 다시 찾거나 다른 동네를 검색해 보세요."
      action={
        <Button variant="secondary" onClick={map.openSearch}>
          다른 동네 찾기
        </Button>
      }
    />
  ) : map.stores.length === 0 ? (
    <MealEmptyState
      title={`이 반경 안에 ${map.businessType ?? ''} 가게가 없어요`}
      description="다른 업종을 고르거나 전체 업종으로 다시 살펴보세요."
      action={
        <Button variant="secondary" onClick={() => map.selectBusinessType(null)}>
          전체 업종 보기
        </Button>
      }
    />
  ) : (
    <>
      <p className={styles.notice}>가까운 순 · 기준 위치에서 직선거리 · 등록 가격</p>
      <ul className={styles.list} aria-label="가게 목록">
        {map.stores.map((store) => (
          <li key={store.id}>
            <StoreCard store={store} onSelect={map.openStore} />
          </li>
        ))}
      </ul>
      <InlineNotice>
        행정안전부 착한가격업소 현황 · {data?.dataAsOf ?? '기준일 정보 없음'}
        <br />
        음식점 외 업종도 있어요. 방문 전 업종과 가격, 영업 여부를 확인해 주세요.
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
              <div className={styles.desktopControls}>
                {searchButton}
                {chips}
              </div>
              <div className={styles.desktopStores}>
                <h2 className={styles.desktopTitle}>착한가격 가게 {map.stores.length}곳</h2>
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
          <div className={cx(styles.map, styles.desktopMap)}>
            {mapView}
            {locationControl}
          </div>
        </ListDetailLayout>
        {searchSheet}
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-label="주변 착한가격업소">
      <div className={styles.map}>
        {mapView}
        {/* 검색창과 업종 칩은 흰 띠 없이 지도 위에 띄운다. */}
        <div className={styles.overlay}>
          {searchButton}
          {chips}
          {locationControl}
        </div>
        {!map.isListOpen ? (
          <Button className={styles.showList} onClick={map.openList}>
            가게 목록 보기 {data ? `${map.stores.length}곳` : ''}
          </Button>
        ) : (
          <BottomSheet
            title={map.selectedStore?.name ?? `착한가격 가게 ${map.stores.length}곳`}
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
  /* 휴대폰은 검색창, 업종 칩, 현재 위치를 지도 위에 띄운다. 빈 곳은 지도를 그대로 만질 수 있게 둔다. */
  overlay: css`
    label: RestaurantPanel-overlay;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    display: grid;
    gap: 0.5rem;
    padding: 0.75rem 0.85rem 0;
    pointer-events: none;
    & > * {
      pointer-events: auto;
    }
  `,
  search: css`
    label: RestaurantPanel-search;
    display: flex;
    width: 100%;
    min-width: 0;
    align-items: center;
    gap: 0.55rem;
    min-height: 44px;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    box-shadow: var(--shadow-floating);
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
      color: var(--color-ink-soft);
      font-size: 0.7rem;
    }
  `,
  location: css`
    label: RestaurantPanel-location;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    justify-self: end;
  `,
  /* 데스크탑은 지도 칸 오른쪽 아래에 둔다. */
  locationDesktop: css`
    label: RestaurantPanel-locationDesktop;
    position: absolute;
    right: 1rem;
    bottom: 1.5rem;
    z-index: 20;
  `,
  locationStatus: css`
    label: RestaurantPanel-locationStatus;
    max-width: 16rem;
    margin: 0;
    padding: 0.45rem 0.7rem;
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    box-shadow: var(--shadow-floating);
    color: var(--color-ink);
    font-size: 0.72rem;
    line-height: 1.45;
    word-break: keep-all;
  `,
  desktopControls: css`
    label: RestaurantPanel-desktopControls;
    display: grid;
    gap: 0.6rem;
    padding: 1rem 1rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
  `,
  /* 데스크탑 목록 칸에서는 띄우지 않고 다른 검색창처럼 회색 바탕에 둔다. */
  searchDesktop: css`
    label: RestaurantPanel-searchDesktop;
    border-color: transparent;
    background: var(--color-search-surface);
    box-shadow: none;
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
    border-radius: 99px;
    box-shadow: var(--shadow-floating);
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
