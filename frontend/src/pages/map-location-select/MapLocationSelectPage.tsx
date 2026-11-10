import { css } from '@emotion/css';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import RecordAddressSearch from '@/pages/design-records/ui/record-address-search/RecordAddressSearch';
import type { MapAddress } from '@/features/map/model/Map';
import MapCanvas from '@/features/map/ui/map-canvas/MapCanvas';
import { RECORDS_PATH } from '@/shared/lib/navigation/appPaths';

import useLocationConfirm from './hooks/useLocationConfirm';
import useLocationSelection from './hooks/useLocationSelection';
import usePropertyMarkers from './hooks/usePropertyMarkers';
import LocationAddressSheet from './ui/location-address-sheet/LocationAddressSheet';
import LocationMapControls from './ui/location-map-controls/LocationMapControls';

type RouteState = { returnTo?: string; initialLocation?: MapAddress; propertyId?: number };

/**
 * 매물 수정에서 지도로 위치를 고친다. 돌아갈 수정 화면(`returnTo`) 없이 들어오면 고칠 매물이 없으므로 본 방 기록으로 보낸다.
 * 매물 등록은 본 방 기록 지도에서 하므로 이 화면은 위치만 골라 수정 화면에 돌려준다.
 */
const MapLocationSelectPage = () => {
  const routeState = (useLocation().state as RouteState | null) ?? {};
  if (routeState.returnTo === undefined) return <Navigate to={RECORDS_PATH} replace />;
  return (
    <MapLocationSelect
      returnTo={routeState.returnTo}
      initialLocation={routeState.initialLocation}
      propertyId={routeState.propertyId}
    />
  );
};

const MapLocationSelect = ({
  returnTo,
  initialLocation,
  propertyId,
}: {
  returnTo: string;
  initialLocation?: MapAddress;
  propertyId?: number;
}) => {
  const navigate = useNavigate();
  const knownLocationLevel = initialLocation === undefined ? 5 : 3;
  const selection = useLocationSelection(initialLocation);
  const confirm = useLocationConfirm(returnTo, propertyId);
  const propertyMarkers = usePropertyMarkers(propertyId);

  return (
    <main className={styles.page}>
      <section className={styles.mapStage} aria-label="매물 위치 선택 지도">
        {/* 본 방 기록 지도와 같은 주소 검색창. 뒤로가기는 검색창 안에 있고, 결과를 고르면 그 자리로 지도가 옮겨 간다. */}
        <div className={styles.searchBar}>
          <RecordAddressSearch
            onBack={() => navigate(returnTo, { replace: true })}
            onSelect={selection.applySearchedAddress}
            label="주소 검색"
            placeholder="주소로 위치 찾기"
          />
        </div>
        <MapCanvas
          center={selection.selected}
          markers={propertyMarkers}
          level={knownLocationLevel}
          interactive
          showCenterPin
          onSelectLocation={(latitude, longitude) => void selection.selectCoordinates(latitude, longitude)}
          onCenterChange={selection.handleCenterChange}
        />
        <LocationMapControls
          isLocating={selection.status === 'locating'}
          onMoveToCurrentLocation={() => void selection.moveToCurrentLocation()}
        />
        <LocationAddressSheet
          selected={selection.selected}
          status={selection.status}
          isSaving={confirm.isSaving}
          saveFailed={confirm.failed}
          onConfirm={() => void confirm.confirm(selection.selected)}
        />
      </section>
    </main>
  );
};

const styles = {
  page: css`
    label: MapLocationSelectPage-page;
    position: relative;
    display: grid;
    width: 100%;
    height: 100%;
    min-height: 0;
    grid-template-rows: minmax(0, 1fr);
    overflow: hidden;
    background: var(--color-surface);
  `,

  /* 지도 위 맨 위에 뜬 검색창. 빈 자리는 지도 조작을 막지 않는다. */
  searchBar: css`
    label: MapLocationSelectPage-searchBar;
    position: absolute;
    top: max(0.75rem, env(safe-area-inset-top));
    right: 0.75rem;
    left: 0.75rem;
    z-index: 40;
    display: flex;
    pointer-events: none;
  `,

  mapStage: css`
    label: MapLocationSelectPage-mapStage;
    position: relative;
    width: 100%;
    height: auto;
    min-height: 0;
    margin-left: 0;
    overflow: hidden;
    box-sizing: border-box;

    & form[role='search'],
    & form[role='search'] input,
    & form[role='search'] button {
      font-size: 0.875rem;
    }
  `,
};

export default MapLocationSelectPage;
