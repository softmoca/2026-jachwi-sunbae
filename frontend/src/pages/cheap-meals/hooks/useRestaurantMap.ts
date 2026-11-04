import { useEffect, useMemo, useRef, useState } from 'react';

import { useGoodPriceStores } from '@/features/good-price/api/goodPriceApi';
import {
  coordinatesAreClose,
  DEFAULT_MAP_CENTER,
  isInSouthKorea,
  type MapCoordinate,
  requestCurrentMapLocation,
} from '@/features/map/lib/mapLocation';
import type { MapMarker } from '@/features/map/model/Map';

import { MAP_SEARCH_DELAY_MS, RESTAURANT_SEARCH_RADIUS, type RestaurantArea } from '../model/RestaurantMap';
import storePin from '../ui/store-pin.svg';
import useRestaurantOverlay from './useRestaurantOverlay';

const useRestaurantMap = (isActive: boolean) => {
  const overlay = useRestaurantOverlay();
  const [area, setArea] = useState<RestaurantArea>({ ...DEFAULT_MAP_CENTER, label: '판교 주변' });
  const [viewport, setViewport] = useState<MapCoordinate>(area);
  const [level, setLevel] = useState(7);
  const [isListOpen, setIsListOpen] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  // 사용자가 지도를 끌어 옮긴 자리. 지도가 멈추고 잠시 뒤 이 자리를 새 기준 위치로 다시 찾는다.
  const [movedTo, setMovedTo] = useState<MapCoordinate | null>(null);
  const requestId = useRef(0);
  useEffect(() => {
    setIsLocating(false);
    return () => {
      requestId.current += 1;
    };
  }, [isActive, overlay.isSearchOpen]);
  // 동네 찾기처럼 지도 이동이 멈춘 뒤(idle) 잠깐 더 기다렸다가 찾는다. 연달아 옮기면 마지막 자리만 찾는다.
  useEffect(() => {
    if (!isActive || movedTo === null) return;
    const timer = window.setTimeout(() => {
      requestId.current += 1;
      setIsLocating(false);
      setLocationError(null);
      setArea((current) =>
        coordinatesAreClose(current, movedTo) ? current : { ...movedTo, label: '지도에서 선택한 위치' },
      );
    }, MAP_SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isActive, movedTo]);
  const query = useGoodPriceStores(area, RESTAURANT_SEARCH_RADIUS, isActive);
  const selectedStore = query.data?.stores.find((store) => String(store.id) === overlay.selectedStoreId) ?? null;
  const markers = useMemo<MapMarker[]>(
    () =>
      query.data?.stores.map((store) => ({
        id: String(store.id),
        latitude: store.latitude,
        longitude: store.longitude,
        label: `${store.name} 상세 보기`,
        image: { src: storePin },
        actionable: true,
      })) ?? [],
    [query.data],
  );
  const chooseArea = (next: RestaurantArea) => {
    requestId.current += 1;
    setIsLocating(false);
    setLocationError(null);
    setArea(next);
    setViewport(next);
    setMovedTo(null);
    setIsListOpen(true);
    overlay.closeOverlay();
  };
  const locate = async () => {
    const id = ++requestId.current;
    setIsLocating(true);
    setLocationError(null);
    try {
      const coordinate = await requestCurrentMapLocation();
      if (id !== requestId.current) return;
      if (!isInSouthKorea(coordinate)) throw new Error('국내 위치가 필요합니다.');
      chooseArea({ ...coordinate, label: '현재 위치 주변' });
    } catch {
      if (id === requestId.current) {
        setIsLocating(false);
        setLocationError('현재 위치를 확인하지 못했어요. 권한을 확인하거나 주소를 검색해 주세요.');
      }
    }
  };
  return {
    area,
    viewport,
    radius: RESTAURANT_SEARCH_RADIUS,
    level,
    query,
    markers,
    selectedStore,
    isListOpen,
    isLocating,
    locationError,
    isSearchOpen: overlay.isSearchOpen,
    chooseArea,
    locate,
    changeLevel: setLevel,
    openList: () => setIsListOpen(true),
    closeList: () => setIsListOpen(false),
    // 지도가 멈출 때마다 불린다. 가게나 주소를 골라 지도를 옮긴 경우는 멈춘 자리가 지금 화면 가운데와 같아 다시 찾지 않는다.
    moveMap: (latitude: number, longitude: number) => {
      const next = { latitude, longitude };
      if (coordinatesAreClose(viewport, next)) return;
      setViewport(next);
      setMovedTo(next);
    },
    openSearch: overlay.openSearch,
    openStore: (id: number) => {
      const store = query.data?.stores.find((store) => store.id === id);
      if (!store) return;
      setViewport(store);
      setIsListOpen(true);
      overlay.openStore(id);
    },
    closeOverlay: () => {
      requestId.current += 1;
      setIsLocating(false);
      overlay.closeOverlay();
    },
  };
};
export default useRestaurantMap;
