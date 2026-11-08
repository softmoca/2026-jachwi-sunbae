import { useCallback, useEffect, useRef, useState } from 'react';

import { reverseGeocode } from '@/features/map/api/mapApi';
import { hasAddress, isAddressNotFound } from '@/features/map/lib/mapAddress';
import {
  coordinatesAreClose,
  DEFAULT_MAP_CENTER,
  readLastMapCenter,
  requestCurrentMapLocation,
  writeLastMapCenter,
} from '@/features/map/lib/mapLocation';
import type { MapAddress } from '@/features/map/model/Map';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import { trackPostHogEvent } from '@/shared/lib/analytics/posthog';

/** `unsupported`는 그 자리에 주소가 없다는 응답(바다, 산 등), `error`는 위치나 네트워크의 일시 실패다. */
export type LocationSelectionStatus = 'locating' | 'geocoding' | 'ready' | 'unsupported' | 'error';

const CENTER_RESOLVE_DELAY_MS = 450;

const blankAddress = (latitude: number, longitude: number): MapAddress => ({
  address: null,
  roadAddress: null,
  jibunAddress: null,
  latitude,
  longitude,
});

const hasNoAddress = (address: MapAddress) =>
  address.address === null && address.roadAddress === null && address.jibunAddress === null;

/** 지도에서 고른 좌표를 주소로 바꿔 선택 위치로 관리한다. 늦게 도착한 이전 응답은 버린다. */
const useLocationSelection = (initialLocation: MapAddress | undefined) => {
  const config = usePublicConfig();
  const [fallbackCenter] = useState(() => readLastMapCenter() ?? DEFAULT_MAP_CENTER);
  const [selected, setSelected] = useState<MapAddress>(
    () => initialLocation ?? blankAddress(fallbackCenter.latitude, fallbackCenter.longitude),
  );
  const [status, setStatus] = useState<LocationSelectionStatus>(initialLocation === undefined ? 'locating' : 'ready');
  const requestSequenceRef = useRef(0);
  const centerTimerRef = useRef<number | null>(null);

  const selectCoordinates = useCallback(
    async (latitude: number, longitude: number) => {
      const sequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = sequence;
      setSelected(blankAddress(latitude, longitude));
      setStatus('geocoding');
      try {
        const address = await reverseGeocode(config, latitude, longitude);
        if (requestSequenceRef.current !== sequence) return;
        setSelected(address);
        writeLastMapCenter(address);
        setStatus(hasAddress(address) ? 'ready' : 'unsupported');
      } catch (error) {
        if (requestSequenceRef.current === sequence) setStatus(isAddressNotFound(error) ? 'unsupported' : 'error');
      }
    },
    [config],
  );

  useEffect(() => {
    if (initialLocation === undefined) void selectCoordinates(fallbackCenter.latitude, fallbackCenter.longitude);
    else if (hasNoAddress(initialLocation)) void selectCoordinates(initialLocation.latitude, initialLocation.longitude);
  }, [fallbackCenter.latitude, fallbackCenter.longitude, initialLocation, selectCoordinates]);

  useEffect(
    () => () => {
      if (centerTimerRef.current !== null) window.clearTimeout(centerTimerRef.current);
    },
    [],
  );

  /** 현재 위치를 선택한다. 위치를 얻지 못하면 false를 돌려준다. */
  const moveToCurrentLocation = useCallback(async (): Promise<boolean> => {
    setStatus('locating');
    try {
      const coordinate = await requestCurrentMapLocation();
      await selectCoordinates(coordinate.latitude, coordinate.longitude);
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  }, [selectCoordinates]);

  /** 지도를 끌어 옮기면 멈춘 뒤에 주소를 확인한다. */
  const handleCenterChange = (latitude: number, longitude: number) => {
    if (coordinatesAreClose(selected, { latitude, longitude })) return;
    if (centerTimerRef.current !== null) window.clearTimeout(centerTimerRef.current);
    centerTimerRef.current = window.setTimeout(
      () => void selectCoordinates(latitude, longitude),
      CENTER_RESOLVE_DELAY_MS,
    );
  };

  const applySearchedAddress = (address: MapAddress) => {
    requestSequenceRef.current += 1;
    setSelected(address);
    writeLastMapCenter(address);
    setStatus('ready');
    trackPostHogEvent('address_selected', { source: 'search_panel' });
  };

  return { selected, status, selectCoordinates, moveToCurrentLocation, handleCenterChange, applySearchedAddress };
};

export default useLocationSelection;
