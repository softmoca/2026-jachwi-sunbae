import { useState } from 'react';

import useAddressSearch from '@/features/map/api/useAddressSearch';
import { SEOUL_MAP_CENTER } from '@/features/map/lib/mapLocation';
import AddressSearchResults from '@/features/map/ui/address-search-results/AddressSearchResults';
import MapRadiusSelector from '@/features/map/ui/map-radius-selector/MapRadiusSelector';
import { Button } from '@/shared/ui/button/Button';
import Icon from '@/shared/ui/icon/Icon';
import SearchField from '@/shared/ui/search-field/SearchField';

import useNeighborhood, { isNeighborhoodPreview, previewAreas } from './hooks/useNeighborhood';
import NeighborhoodDialog from './ui/neighborhood-dialog/NeighborhoodDialog';
import StoreMap from './ui/store-map/StoreMap';
import StoreSheet from './ui/store-sheet/StoreSheet';

import styles from './NeighborhoodPage.module.css';

const NeighborhoodPage = () => {
  const neighborhood = useNeighborhood();
  const { area, viewport, radius, query, selectedStore, sheet } = neighborhood;
  const [isLocationOpen, setLocationOpen] = useState(false);
  const search = useAddressSearch();
  const closeLocation = () => {
    setLocationOpen(false);
    search.clear();
  };

  return (
    <main className={styles.page}>
      <h1 className="sr-only">동네생활</h1>
      <section ref={neighborhood.mapStageRef} className={styles.mapStage} aria-label="착한가격 가게 지도">
        <StoreMap
          stores={query.data?.stores ?? []}
          area={area ?? SEOUL_MAP_CENTER}
          viewport={viewport ?? SEOUL_MAP_CENTER}
          radius={radius}
          level={neighborhood.level}
          selectedId={selectedStore?.id ?? null}
          onMove={neighborhood.moveMap}
          onSelect={neighborhood.openStore}
        />
        <button
          type="button"
          className={styles.location}
          onClick={() => setLocationOpen(true)}
          aria-label="탐색할 동네 변경"
        >
          <Icon name="search" size={18} />
          <span>{area?.label ?? '둘러볼 동네 검색'}</span>
          <Icon name="chevron-down" size={16} />
        </button>
        <MapRadiusSelector
          label="조회 반경"
          disabled={area === null}
          options={([500, 1000, 2000] as const).map((value) => ({
            value,
            label: value === 500 ? '500m' : `${value / 1000}km`,
            isSelected: radius === value,
          }))}
          onSelect={neighborhood.selectRadius}
        />
        <div className={styles.category}>
          <Icon name="store" size={17} />
          <span>착한가격 가게</span>
          {query.data !== undefined && <strong>{query.data.count}</strong>}
        </div>
        {isNeighborhoodPreview && <span className={styles.preview}>샘플 데이터</span>}
        <button
          className={styles.currentLocation}
          type="button"
          aria-label="현재 위치로 찾기"
          disabled={neighborhood.isLocating}
          onClick={() => void neighborhood.locate()}
        >
          <Icon name="target" size={22} />
        </button>
        {neighborhood.locationError !== null && !isLocationOpen && (
          <p className={styles.notice} role="alert">
            {neighborhood.locationError}
          </p>
        )}
        {neighborhood.isMapMoved && (
          <button type="button" className={styles.searchMap} onClick={neighborhood.searchMap}>
            <Icon name="search" size={16} />이 위치에서 찾기
          </button>
        )}
        {area === null ? (
          <div className={styles.firstLocation}>
            <h2>우리 동네 착한가격 가게</h2>
            <p>매물 등록 없이 주변 가게를 살펴보세요.</p>
            <Button onClick={() => setLocationOpen(true)}>동네 검색하기</Button>
          </div>
        ) : (
          <StoreSheet
            sheet={sheet}
            data={query.data}
            radius={radius}
            selectedStore={selectedStore}
            isLoading={query.isPending}
            isError={query.isError}
            onSelect={neighborhood.openStore}
            onBack={neighborhood.closeStore}
            onRetry={() => void query.refetch()}
            onExpandRadius={() => neighborhood.selectRadius(radius === 500 ? 1000 : 2000)}
            onChangeArea={() => setLocationOpen(true)}
          />
        )}
      </section>
      <NeighborhoodDialog isOpen={isLocationOpen} title="어느 동네를 둘러볼까요?" onClose={closeLocation}>
        <div className={styles.locationContent}>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void neighborhood.locate()}
            isLoading={neighborhood.isLocating}
            loadingLabel="현재 위치 확인 중…"
          >
            현재 위치로 찾기
          </Button>
          {neighborhood.locationError !== null && (
            <p className={styles.locationError} role="alert">
              {neighborhood.locationError}
            </p>
          )}
          {area?.label === '현재 위치 주변' && !neighborhood.isLocating && neighborhood.locationError === null && (
            <Button onClick={closeLocation}>현재 위치 주변 보기</Button>
          )}
          <SearchField
            label="동네 주소 검색"
            placeholder="도로명이나 지번 주소 검색"
            value={search.query}
            onValueChange={search.changeQuery}
            onSubmit={() => void search.submit()}
          />
          <AddressSearchResults
            results={search.results}
            status={search.status}
            onSelect={(address) => {
              neighborhood.chooseArea({
                latitude: address.latitude,
                longitude: address.longitude,
                label: address.roadAddress ?? address.jibunAddress ?? '선택한 동네',
              });
              closeLocation();
            }}
          />
          {isNeighborhoodPreview && (
            <div className={styles.sampleAreas}>
              <p>샘플 동네 둘러보기</p>
              {previewAreas.map((sample) => (
                <button
                  type="button"
                  key={sample.label}
                  onClick={() => {
                    neighborhood.chooseArea(sample);
                    closeLocation();
                  }}
                >
                  {sample.label}
                  <Icon name="arrow-right" size={16} />
                </button>
              ))}
            </div>
          )}
        </div>
      </NeighborhoodDialog>
    </main>
  );
};

export default NeighborhoodPage;
