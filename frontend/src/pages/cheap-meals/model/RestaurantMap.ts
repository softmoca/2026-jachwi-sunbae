import type { MapCoordinate } from '@/features/map/lib/mapLocation';

export const RESTAURANT_SEARCH_RADIUS = 2000 as const;
/** 지도 이동이 멈춘 뒤 그 자리를 다시 찾기까지 기다리는 시간. 잠깐 멈췄다 다시 끄는 동안 요청을 아낀다. */
export const MAP_SEARCH_DELAY_MS = 400;

export type RestaurantArea = MapCoordinate & { label: string };
