import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import PropertyDetailPage from '@/pages/property-detail/PropertyDetailPage';
import usePreloadMapSdk from '@/features/map/hooks/usePreloadMapSdk';
import type { MapAddress } from '@/features/map/model/Map';
import { RECORDS_PATH } from '@/shared/lib/navigation/appPaths';
import AreaSkeleton from '@/shared/ui/area-skeleton/AreaSkeleton';
import DesktopHeader from '@/shared/ui/desktop-header/DesktopHeader';
import DesktopHeaderSlot, { DesktopHeaderSlotProvider } from '@/shared/ui/desktop-header/DesktopHeaderSlot';
import ListDetailLayout from '@/shared/ui/list-detail-layout/ListDetailLayout';

import useQuickCreateProperty from '../hooks/useQuickCreateProperty';
import useRecords from '../hooks/useRecords';
import useRecordsMapLayers from '../hooks/useRecordsMapLayers';
import { RECORDS_LOADING_LABEL } from '../RecordsPageSkeleton';
import RecordAddressSearch from '../ui/record-address-search/RecordAddressSearch';
import RecordDistricts from '../ui/record-districts/RecordDistricts';
import RecordList from '../ui/record-list/RecordList';
import RecordLoadError from '../ui/record-load-error/RecordLoadError';
import RecordNotice from '../ui/record-notice/RecordNotice';
import RecordsDesktopMap from './RecordsDesktopMap';

import * as styles from './RecordsDesktopPage.styles';

/**
 * 데스크탑 본 방 기록. 왼쪽 칸에 리스트, 오른쪽에 지도를 두고 보기 전환 없이 함께 본다.
 * 리스트 위 `통근 시간`과 통근거리 줄은 휴대폰 리스트와 같이 둔다.
 * 리스트에서 방을 고르면 지도도 그 방 핀 자리로 옮긴다.
 * 리스트나 지도에서 고른 방(`/properties/:propertyId`)은 동네 찾기처럼 리스트 옆 칸에 연다.
 * 리스트를 덮지 않으므로 상세를 연 채로 다른 방을 바로 고를 수 있고, 지도 왼쪽 위 닫기 버튼으로 칸을 접는다.
 * 새 매물은 지도에서 위치를 찍어 등록 화면 없이 바로 만들고(이름은 `새 매물`), 만든 매물의 상세를 옆 칸에 연다.
 * 지도는 예전 인프라 지도의 시설·거리 메모 카테고리와 찍은 위치의 메모·매물 등록을 함께 맡는다.
 */
const RecordsDesktopPage = () => {
  const navigate = useNavigate();
  const records = useRecords({
    selectedId: useParams().propertyId ?? null,
    setSelectedId: (id) => navigate(id === null ? RECORDS_PATH : `${RECORDS_PATH}/${id}`),
  });
  const { selected, setSelectedId, setNotice } = records;
  // 데스크탑은 늘 지도를 함께 그린다. 매물 목록을 기다리는 동안 지도 SDK를 먼저 받기 시작한다.
  usePreloadMapSdk(true);
  // 지도에서 찍어 매물을 만드는 중인 위치. 만드는 동안 그 자리에 등록 핀을 둔다.
  const [creatingAt, setCreatingAt] = useState<MapAddress | null>(null);
  const quickCreate = useQuickCreateProperty({
    onCreated: (propertyId, location) => {
      setCreatingAt(null);
      // 지도도 새 매물 자리로 다가가 핀을 띄운다. 상세는 리스트 옆 칸에 연다.
      records.revealCreated(String(propertyId), location);
      setNotice('매물을 기록했어요. 항목을 눌러 정보를 채워 주세요.');
    },
    onError: () => {
      setCreatingAt(null);
      setNotice('매물을 만들지 못했어요. 다시 시도해 주세요.');
    },
  });
  // 휴대폰처럼 처음 들어오면 거리 메모를 켠 채로 연다.
  const layers = useRecordsMapLayers(records, {
    initialCategory: 'MEMO',
    registeringAt: creatingAt,
    groupAction: 'zoom',
    onRegister: (location) => {
      if (quickCreate.isCreating) return;
      setCreatingAt(location);
      quickCreate.create(location);
    },
  });
  const closeDetail = () => setSelectedId(null);

  // 처음 여는 화면이라 남겨 둘 목록이 없다. 늦추지 않고 바로 뼈대를 보여, 화면 코드를 받는 동안의 뼈대(`RecordsPageSkeleton`)에서 이어지게 한다.
  const list = records.properties.isPending ? (
    <AreaSkeleton area="list" label={RECORDS_LOADING_LABEL} />
  ) : records.properties.isError ? (
    <RecordLoadError
      className={styles.list}
      error={records.properties.error}
      onRetry={() => void records.properties.refetch()}
    />
  ) : (
    <RecordList
      className={styles.list}
      records={records.records}
      district={records.district}
      onOpen={records.showRecord}
      onNotice={setNotice}
    />
  );

  const detail =
    selected !== undefined ? (
      <aside className={styles.detail} aria-label="선택한 매물 상세">
        <PropertyDetailPage
          key={selected.id}
          panel={{ propertyId: Number(selected.id), onClose: () => setSelectedId(null) }}
        />
      </aside>
    ) : undefined;

  return (
    // 이 화면은 공용 레이아웃 밖에서 열려 헤더 가운데 자리를 직접 마련한다.
    <DesktopHeaderSlotProvider>
      <main className={styles.page}>
        <div className={styles.frame}>
          <DesktopHeader />
          {/* 헤더 가운데 자리에 주소 검색창을 넣는다. 고른 주소로 오른쪽 지도를 옮긴다. */}
          <DesktopHeaderSlot>
            <RecordAddressSearch className={styles.headerSearch} onSelect={records.moveTo} />
          </DesktopHeaderSlot>
          <h1 ref={records.headingRef} className="sr-only" tabIndex={-1}>
            본 방 기록
          </h1>
          <ListDetailLayout
            className={styles.body}
            list={list}
            detail={detail}
            onCloseDetail={closeDetail}
            closeLabel="매물 상세 칸 닫기"
          >
            {/* 기록을 받는 동안 지도 칸도 화면 코드를 받는 동안의 뼈대와 같은 지도 영역 뼈대로 채운다. 알림은 목록 영역이 맡는다. */}
            {records.properties.isPending && <AreaSkeleton area="map" />}
            {!records.properties.isPending && !records.properties.isError && (
              <RecordsDesktopMap
                records={records}
                layers={layers}
                className={styles.map}
                districts={
                  <RecordDistricts
                    districts={records.districts}
                    district={records.district}
                    onSelect={records.selectDistrict}
                    overMap
                  />
                }
              />
            )}
          </ListDetailLayout>
          <RecordNotice message={records.notice} onClose={() => setNotice('')} className={styles.notice} />
        </div>
      </main>
    </DesktopHeaderSlotProvider>
  );
};

export default RecordsDesktopPage;
