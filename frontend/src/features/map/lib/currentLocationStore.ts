import { useSyncExternalStore } from 'react';

import type { MapCoordinate } from './mapLocation';

/**
 * 내 현재 위치. 어느 화면에서든 현재 위치를 한 번 받으면 여기에 담겨, 모든 지도가 같은 파란 점으로 보여 준다.
 * 지도(`MapCanvas`)가 이 값을 읽어 마커로 올리므로, 화면마다 따로 현재 위치 점을 만들지 않는다.
 */
let current: MapCoordinate | null = null;
const listeners = new Set<() => void>();

export const publishCurrentLocation = (coordinate: MapCoordinate) => {
  if (current?.latitude === coordinate.latitude && current?.longitude === coordinate.longitude) return;
  current = coordinate;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useCurrentLocation = (): MapCoordinate | null => useSyncExternalStore(subscribe, () => current);

export const readCurrentLocation = (): MapCoordinate | null => current;
