import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useGoodPriceStores } from '@/features/good-price/api/goodPriceApi';
import type { GoodPriceResult } from '@/features/good-price/model/GoodPriceStore';
import useMapSheet from '@/features/map/hooks/useMapSheet';
import type { MapCoordinate } from '@/features/map/lib/mapLocation';
import { coordinatesAreClose, isInSouthKorea, requestCurrentMapLocation } from '@/features/map/lib/mapLocation';
import { getMapFocusCenter } from '@/features/map/lib/mapViewportFocus';
import type { MapMarker } from '@/features/map/model/Map';

export type NeighborhoodArea = MapCoordinate & { label: string };
const AREA_KEY = 'jachwi-sunbae.neighborhoodArea';
export const isNeighborhoodPreview = typeof __ENABLE_MSW__ !== 'undefined' && __ENABLE_MSW__;
export const previewAreas: NeighborhoodArea[] = [
  { label: '서울 시청 주변', latitude: 37.5665, longitude: 126.978 },
  { label: '신림동 주변', latitude: 37.4841234, longitude: 126.9291234 },
  { label: '판교 주변', latitude: 37.3948, longitude: 127.1119 },
];

const readArea = (): NeighborhoodArea | null => {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(AREA_KEY) ?? 'null') as Partial<NeighborhoodArea> | null;
    if (
      value !== null &&
      typeof value.label === 'string' &&
      typeof value.latitude === 'number' &&
      typeof value.longitude === 'number'
    ) {
      const area = { label: value.label, latitude: value.latitude, longitude: value.longitude };
      if (isInSouthKorea(area)) return area;
    }
  } catch {
    /* 저장소가 없어도 동네 선택을 이어간다. */
  }
  return isNeighborhoodPreview ? (previewAreas[0] ?? null) : null;
};

const useGoodPriceMap = (initialArea: NeighborhoodArea) => {
  const [params, setParams] = useSearchParams();
  const isActive = params.get('mode') === 'thrifty';
  const [area, setArea] = useState(() => (isActive ? (readArea() ?? initialArea) : initialArea));
  const [viewport, setViewport] = useState<MapCoordinate>(area);
  const [radius, setRadius] = useState<GoodPriceResult['radius']>(1000);
  const [level, setLevel] = useState(6);
  const sheet = useMapSheet(isActive, params.has('store') ? 'mid' : 'closed');
  const mapStageRef = useRef<HTMLElement | null>(null);
  const [isMapMoved, setMapMoved] = useState(false);
  const [isLocating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationRequest = useRef(0);
  useEffect(
    () => () => {
      locationRequest.current += 1;
    },
    [isActive],
  );
  const query = useGoodPriceStores(isActive ? area : null, radius);
  const selectedStore = query.data?.stores.find((store) => String(store.id) === params.get('store')) ?? null;
  const markers = useMemo<MapMarker[]>(
    () =>
      query.data?.stores.map((store) => ({
        id: `store-${store.id}`,
        latitude: store.latitude,
        longitude: store.longitude,
        label: `${store.name} 상세 보기`,
        tone: 'store',
        actionable: true,
      })) ?? [],
    [query.data],
  );

  const chooseArea = (next: NeighborhoodArea) => {
    locationRequest.current += 1;
    setLocating(false);
    setLocationError(null);
    setArea(next);
    setViewport(next);
    setMapMoved(false);
    closeStore();
    sheet.previewSheet();
    try {
      window.sessionStorage.setItem(AREA_KEY, JSON.stringify(next));
    } catch {
      /* 탐색은 계속한다. */
    }
  };

  const locate = async () => {
    const request = requestCurrentMapLocation();
    const requestId = ++locationRequest.current;
    setLocating(true);
    setLocationError(null);
    try {
      const coordinate = await request;
      if (requestId !== locationRequest.current) return;
      if (!isInSouthKorea(coordinate)) throw new Error('국내 위치를 선택해 주세요.');
      chooseArea({ ...coordinate, label: '현재 위치 주변' });
    } catch {
      if (requestId === locationRequest.current) {
        setLocationError('현재 위치를 확인하지 못했어요. 동네를 검색해서 선택해 주세요.');
        setLocating(false);
      }
    }
  };

  const closeStore = () =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete('store');
        return next;
      },
      { replace: true },
    );

  const openStore = (id: number) => {
    const store = query.data?.stores.find((item) => item.id === id);
    if (store === undefined) return;
    const size = mapStageRef.current?.getBoundingClientRect();
    setViewport(getMapFocusCenter(store, level, size?.width || 390, size?.height || 700));
    setMapMoved(false);
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('store', String(id));
      return next;
    });
    sheet.previewSheet();
  };

  return {
    isActive,
    markers,
    enter: (next: NeighborhoodArea, nextRadius: GoodPriceResult['radius']) => {
      locationRequest.current += 1;
      setArea(next);
      setViewport(next);
      setRadius(nextRadius);
      setLevel(nextRadius === 500 ? 5 : nextRadius === 1000 ? 6 : 7);
      setMapMoved(false);
      setLocating(false);
      setLocationError(null);
      sheet.closeSheet();
      try {
        window.sessionStorage.setItem(AREA_KEY, JSON.stringify(next));
      } catch {
        /* 탐색은 계속한다. */
      }
      setParams((previous) => {
        const nextParams = new URLSearchParams(previous);
        nextParams.set('mode', 'thrifty');
        nextParams.delete('store');
        return nextParams;
      });
    },
    exit: () => {
      locationRequest.current += 1;
      setLocating(false);
      sheet.closeSheet();
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        next.delete('mode');
        next.delete('store');
        return next;
      });
    },
    changeLevel: (next: number) => setLevel(next),
    area,
    viewport,
    radius,
    level,
    query,
    selectedStore,
    isLocating,
    locationError,
    sheet,
    mapStageRef,
    chooseArea,
    locate,
    openStore,
    closeStore,
    isMapMoved,
    selectRadius: (next: GoodPriceResult['radius']) => {
      setRadius(next);
      setLevel(next === 500 ? 5 : next === 1000 ? 6 : 7);
      closeStore();
      setViewport(area);
      setMapMoved(false);
      sheet.previewSheet();
    },
    moveMap: (latitude: number, longitude: number) => {
      const next = { latitude, longitude };
      if (coordinatesAreClose(viewport, next)) return;
      setViewport(next);
      setMapMoved(!coordinatesAreClose(area, next));
    },
    searchMap: () => {
      chooseArea({ ...viewport, label: '지도에서 선택한 위치' });
    },
  };
};

export default useGoodPriceMap;
