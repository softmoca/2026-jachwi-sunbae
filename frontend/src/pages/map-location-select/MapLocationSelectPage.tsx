import { css } from '@emotion/css';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import type { MapAddress } from '@/features/map/model/Map';
import MapCanvas from '@/features/map/ui/map-canvas/MapCanvas';
import { RECORDS_PATH } from '@/shared/lib/navigation/appPaths';
import TopNavigation from '@/shared/ui/top-navigation/TopNavigation';

import useLocationConfirm from './hooks/useLocationConfirm';
import useLocationSelection from './hooks/useLocationSelection';
import usePropertyMarkers from './hooks/usePropertyMarkers';
import LocationAddressSheet from './ui/location-address-sheet/LocationAddressSheet';
import LocationMapControls from './ui/location-map-controls/LocationMapControls';
import MapAddressSearchPanel from './ui/map-address-search-panel/MapAddressSearchPanel';

type RouteState = { returnTo?: string; initialLocation?: MapAddress };

/**
 * 매물 수정에서 지도로 위치를 고친다. 돌아갈 수정 화면(`returnTo`) 없이 들어오면 고칠 매물이 없으므로 본 방 기록으로 보낸다.
 * 매물 등록은 본 방 기록 지도에서 하므로 이 화면은 위치만 골라 수정 화면에 돌려준다.
 */
const MapLocationSelectPage = () => {
  const routeState = (useLocation().state as RouteState | null) ?? {};
  if (routeState.returnTo === undefined) return <Navigate to={RECORDS_PATH} replace />;
  return <MapLocationSelect returnTo={routeState.returnTo} initialLocation={routeState.initialLocation} />;
};

const MapLocationSelect = ({ returnTo, initialLocation }: { returnTo: string; initialLocation?: MapAddress }) => {
  const knownLocationLevel = initialLocation === undefined ? 5 : 3;
  const [searchOpen, setSearchOpen] = useState(false);
  const selection = useLocationSelection(initialLocation);
  const confirm = useLocationConfirm(returnTo);
  const propertyMarkers = usePropertyMarkers();

  const moveToCurrentLocation = async () => {
    const moved = await selection.moveToCurrentLocation();
    if (!moved) setSearchOpen(true);
  };

  return (
    <main className={styles.page}>
      <TopNavigation
        className={styles.mapNavigation}
        title="지도에서 위치 확인"
        backTo={returnTo}
        backLabel="이전 화면으로 돌아가기"
        meta="13-2"
      />
      <section className={styles.mapStage} aria-label="매물 위치 선택 지도">
        <MapCanvas
          center={selection.selected}
          markers={propertyMarkers}
          level={knownLocationLevel}
          interactive
          showCenterPin
          onSelectLocation={(latitude, longitude) => void selection.selectCoordinates(latitude, longitude)}
          onCenterChange={selection.handleCenterChange}
        />
        <MapAddressSearchPanel
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSelect={selection.applySearchedAddress}
        />
        <LocationMapControls
          isLocating={selection.status === 'locating'}
          onOpenSearch={() => setSearchOpen(true)}
          onMoveToCurrentLocation={() => void moveToCurrentLocation()}
        />
        <LocationAddressSheet
          selected={selection.selected}
          status={selection.status}
          onOpenSearch={() => setSearchOpen(true)}
          onConfirm={() => confirm(selection.selected)}
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
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    background: var(--color-surface);
  `,

  mapNavigation: css`
    label: MapLocationSelectPage-mapNavigation;
    z-index: 40;
    margin: 0;
    padding: 0 1rem;
    background: var(--color-surface);
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
