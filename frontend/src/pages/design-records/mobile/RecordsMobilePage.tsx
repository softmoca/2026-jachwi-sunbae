import { useState } from 'react';

import usePreloadMapSdk from '@/features/map/hooks/usePreloadMapSdk';
import type { MapAddress } from '@/features/map/model/Map';
import AreaSkeleton from '@/shared/ui/area-skeleton/AreaSkeleton';

import useQuickCreateProperty from '../hooks/useQuickCreateProperty';
import useRecords from '../hooks/useRecords';
import useRecordsMapLayers from '../hooks/useRecordsMapLayers';
import useRecordsView from '../hooks/useRecordsView';
import { RECORDS_LOADING_LABEL } from '../RecordsPageSkeleton';
import RecordAddressSearch from '../ui/record-address-search/RecordAddressSearch';
import RecordDistricts from '../ui/record-districts/RecordDistricts';
import RecordList from '../ui/record-list/RecordList';
import RecordLoadError from '../ui/record-load-error/RecordLoadError';
import RecordNotice from '../ui/record-notice/RecordNotice';
import RecordsMobileHeader from './RecordsMobileHeader';
import RecordsMobileMap from './RecordsMobileMap';

import * as styles from './RecordsMobilePage.styles';

/**
 * 휴대폰·태블릿 본 방 기록. 위에서 지도·리스트를 바꿔 보고, 지도 보기에서는 헤더와 동네 뱃지를 지도 위에 띄운다.
 * 지도에서 고른 방은 지도 아래 바텀시트로, 리스트에서 고른 방은 상세 화면으로 연다.
 * 지도는 예전 인프라 지도의 시설·거리 메모 카테고리와 찍은 위치의 메모·매물 등록을 함께 맡는다.
 */
const RecordsMobilePage = () => {
  const records = useRecords();
  const { setNotice } = records;
  // 지도에서 찍어 매물을 만드는 중인 위치. 만드는 동안 그 자리에 등록 핀을 둔다.
  const [creatingAt, setCreatingAt] = useState<MapAddress | null>(null);
  // 데스크탑처럼 찍은 위치로 등록 화면 없이 바로 매물을 만든다. 상세로 넘어가지 않고 그 자리로 다가가
  // 새 핀을 띄우고 아래 시트에 열어, 어디에 생겼는지 보여 준다. 정보는 시트의 카드를 눌러 채운다.
  const quickCreate = useQuickCreateProperty({
    onCreated: (propertyId, location) => {
      setCreatingAt(null);
      records.revealCreated(String(propertyId), location);
      setNotice('매물을 기록했어요. 아래 카드를 눌러 정보를 채워 주세요.');
    },
    onError: () => {
      setCreatingAt(null);
      setNotice('매물을 만들지 못했어요. 다시 시도해 주세요.');
    },
  });
  const layers = useRecordsMapLayers(records, {
    initialCategory: 'MEMO',
    registeringAt: creatingAt,
    onRegister: (location) => {
      if (quickCreate.isCreating) return;
      setCreatingAt(location);
      quickCreate.create(location);
    },
  });
  const [view, setView] = useRecordsView();
  const showsMap = view === 'map';
  // 지도는 매물 목록이 온 뒤에 붙으므로, 목록을 기다리는 동안 지도 SDK를 먼저 받기 시작한다.
  usePreloadMapSdk(showsMap);
  // 오른쪽 위 검색 버튼을 누르면 헤더 자리를 주소 검색창으로 바꾼다.
  const [isSearching, setIsSearching] = useState(false);
  // 헤더·동네 뱃지는 지도가 실제로 보일 때만 지도 위에 띄운다. 불러오는 중·실패 안내를 가리지 않게 한다.
  const overMap = showsMap && records.properties.isSuccess;

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <div className={overMap ? styles.mapChrome : undefined}>
          <h1 ref={records.headingRef} className="sr-only" tabIndex={-1}>
            본 방 기록
          </h1>
          {isSearching ? (
            <div className={styles.searchHeader}>
              {/* 주소를 고르면 지도 보기로 바꿔 그 자리로 옮긴다. */}
              <RecordAddressSearch
                autoFocus
                onBack={() => setIsSearching(false)}
                onSelect={(address) => {
                  records.moveTo(address);
                  setView('map');
                  setIsSearching(false);
                }}
              />
            </div>
          ) : (
            <RecordsMobileHeader view={view} onViewChange={setView} onSearchOpen={() => setIsSearching(true)} />
          )}
          {/* 목적지 모드에서는 동네 뱃지도 거둬 목적지 고르기만 남긴다. 기록을 받는 동안은 뼈대처럼 칩 줄을 두지 않는다. */}
          {!records.properties.isPending && !(showsMap && layers.destination.isPicking) && (
            <RecordDistricts
              districts={records.districts}
              district={records.district}
              onSelect={records.selectDistrict}
              overMap={overMap}
            />
          )}
        </div>
        <div className={styles.body}>
          {/* 처음 여는 화면이라 남겨 둘 목록이 없다. 늦추지 않고 바로 뼈대를 보여, 화면 코드를 받는 동안의 뼈대에서 이어지게 한다.
              뼈대는 지금 보기 방식의 영역(지도, 리스트) 하나만 채운다. */}
          {records.properties.isPending ? (
            <AreaSkeleton area={showsMap ? 'map' : 'list'} label={RECORDS_LOADING_LABEL} />
          ) : records.properties.isError ? (
            <RecordLoadError
              className={styles.list}
              error={records.properties.error}
              onRetry={() => void records.properties.refetch()}
            />
          ) : showsMap ? (
            <RecordsMobileMap records={records} layers={layers} />
          ) : (
            <RecordList
              className={styles.list}
              records={records.records}
              district={records.district}
              commute={records.commute}
              distance={records.distance}
              onNotice={setNotice}
            />
          )}
        </div>
        <RecordNotice message={records.notice} onClose={() => setNotice('')} />
      </div>
    </main>
  );
};

export default RecordsMobilePage;
