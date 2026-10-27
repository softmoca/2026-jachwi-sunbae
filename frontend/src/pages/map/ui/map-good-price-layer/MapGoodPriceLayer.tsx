import useAddressSearch from '@/features/map/api/useAddressSearch';
import AddressSearchResults from '@/features/map/ui/address-search-results/AddressSearchResults';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import { Button } from '@/shared/ui/button/Button';
import Icon from '@/shared/ui/icon/Icon';
import SearchField from '@/shared/ui/search-field/SearchField';

import type useGoodPriceMap from '../../hooks/useGoodPriceMap';
import { isNeighborhoodPreview, previewAreas } from '../../hooks/useGoodPriceMap';
import NeighborhoodDialog from '../neighborhood-dialog/NeighborhoodDialog';
import StoreSheet from '../store-sheet/StoreSheet';

import styles from './MapGoodPriceLayer.module.css';

type Props = {
  exploration: ReturnType<typeof useGoodPriceMap>;
  isLocationOpen: boolean;
  onOpenLocation: () => void;
  onCloseLocation: () => void;
};

const MapGoodPriceLayer = ({ exploration, isLocationOpen, onOpenLocation, onCloseLocation }: Props) => {
  const { area, radius, query, selectedStore, sheet } = exploration;
  const search = useAddressSearch();
  const { goodPriceApiBaseUrl } = usePublicConfig();
  const usesGoodPriceServer = goodPriceApiBaseUrl !== undefined;
  const closeLocation = () => {
    onCloseLocation();
    search.clear();
  };
  return (
    <>
      <div className={styles.category}>
        <Icon name="store" size={17} />
        <span>착한가격 가게</span>
        {query.data !== undefined && <strong>{query.data.count}</strong>}
      </div>
      {isNeighborhoodPreview && (
        <span className={styles.preview}>{usesGoodPriceServer ? 'dev 서버 데이터' : '샘플 데이터'}</span>
      )}
      {exploration.locationError !== null && !isLocationOpen && (
        <p className={styles.notice} role="alert">
          {exploration.locationError}
        </p>
      )}
      {exploration.isMapMoved && (
        <button type="button" className={styles.searchMap} onClick={exploration.searchMap}>
          <Icon name="search" size={16} />이 위치에서 찾기
        </button>
      )}
      <StoreSheet
        sheet={sheet}
        data={query.data}
        radius={radius}
        selectedStore={selectedStore}
        isLoading={query.isPending}
        isError={query.isError}
        onSelect={exploration.openStore}
        onBack={exploration.closeStore}
        onRetry={() => void query.refetch()}
        onExpandRadius={() => exploration.selectRadius(radius === 500 ? 1000 : 2000)}
        onChangeArea={onOpenLocation}
      />
      <NeighborhoodDialog isOpen={isLocationOpen} title="어느 동네를 둘러볼까요?" onClose={closeLocation}>
        <div className={styles.locationContent}>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void exploration.locate()}
            isLoading={exploration.isLocating}
            loadingLabel="현재 위치 확인 중…"
          >
            현재 위치로 찾기
          </Button>
          {exploration.locationError !== null && (
            <p className={styles.locationError} role="alert">
              {exploration.locationError}
            </p>
          )}
          {area?.label === '현재 위치 주변' && !exploration.isLocating && exploration.locationError === null && (
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
              exploration.chooseArea({
                latitude: address.latitude,
                longitude: address.longitude,
                label: address.roadAddress ?? address.jibunAddress ?? '선택한 동네',
              });
              closeLocation();
            }}
          />
          {isNeighborhoodPreview && (
            <div className={styles.sampleAreas}>
              <p>{usesGoodPriceServer ? '동네 바로 선택' : '샘플 동네 둘러보기'}</p>
              {previewAreas.map((sample) => (
                <button
                  type="button"
                  key={sample.label}
                  onClick={() => {
                    exploration.chooseArea(sample);
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
    </>
  );
};

export default MapGoodPriceLayer;
