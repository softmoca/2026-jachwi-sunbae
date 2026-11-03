import { useCallback, useEffect, useRef, useState } from 'react';

import { reverseGeocode } from '@/features/map/api/mapApi';
import { DEFAULT_MAP_CENTER, readLastMapCenter } from '@/features/map/lib/mapLocation';
import type { MapAddress } from '@/features/map/model/Map';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';

export type PropertyLocationStatus = 'loading' | 'ready' | 'error';

const CENTER_RESOLVE_DELAY_MS = 450;

const blankAddress = (latitude: number, longitude: number): MapAddress => ({
  address: null,
  roadAddress: null,
  jibunAddress: null,
  latitude,
  longitude,
});

/**
 * 매물 위치를 관리한다. 지도 중앙 좌표를 주소로 바꾸며, 늦게 도착한 이전 응답은 버린다.
 * 주소가 확정될 때마다 `onLocationReady`를 부른다. 매번 새로 만들지 않도록 useCallback으로 넘긴다.
 */
const usePropertyLocation = (presetLocation: MapAddress | undefined, onLocationReady: () => void) => {
  const config = usePublicConfig();
  const [selectedLocation, setSelectedLocation] = useState<MapAddress>(() => {
    const lastCenter = readLastMapCenter() ?? DEFAULT_MAP_CENTER;
    return presetLocation ?? blankAddress(lastCenter.latitude, lastCenter.longitude);
  });
  const [locationStatus, setLocationStatus] = useState<PropertyLocationStatus>('loading');
  const initialCoordinateRef = useRef({ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude });
  const sequenceRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const resolveLocation = useCallback(
    async (latitude: number, longitude: number) => {
      const sequence = ++sequenceRef.current;
      setLocationStatus('loading');
      try {
        const address = await reverseGeocode(config, latitude, longitude);
        if (sequenceRef.current !== sequence) return;
        setSelectedLocation(address);
        setLocationStatus('ready');
        onLocationReady();
      } catch {
        if (sequenceRef.current === sequence) {
          setSelectedLocation((current) => ({ ...current, address: null, roadAddress: null, jibunAddress: null }));
          setLocationStatus('error');
        }
      }
    },
    [config, onLocationReady],
  );

  useEffect(() => {
    if (presetLocation !== undefined) {
      setLocationStatus('ready');
      return;
    }
    const initial = initialCoordinateRef.current;
    void resolveLocation(initial.latitude, initial.longitude);
  }, [resolveLocation, presetLocation]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  /** 지도를 끌어 옮기면 멈춘 뒤에 주소를 확인한다. */
  const handleCenterChange = (latitude: number, longitude: number) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void resolveLocation(latitude, longitude), CENTER_RESOLVE_DELAY_MS);
  };

  /** 검색 결과처럼 이미 주소를 아는 위치를 바로 선택한다. */
  const selectAddress = (address: MapAddress) => {
    ++sequenceRef.current;
    setSelectedLocation(address);
    setLocationStatus('ready');
    onLocationReady();
  };

  return { selectedLocation, locationStatus, resolveLocation, handleCenterChange, selectAddress };
};

export default usePropertyLocation;
