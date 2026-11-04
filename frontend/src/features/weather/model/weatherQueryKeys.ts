import type { MapCoordinate } from '@/features/map/lib/mapLocation';
import { authenticationQueryKey } from '@/shared/api/queryClient';

export const weatherQueryKeys = {
  settings: (memberId: number | null) =>
    [...authenticationQueryKey, 'weather', 'notification-settings', memberId] as const,
  // 같은 동네에서 위치가 조금씩 흔들려도 다시 조회하지 않도록 소수 셋째 자리(약 100m)로 묶는다.
  forecast: (coordinate: MapCoordinate) =>
    ['weather', 'forecast', coordinate.latitude.toFixed(3), coordinate.longitude.toFixed(3)] as const,
  place: (coordinate: MapCoordinate) =>
    ['weather', 'place', coordinate.latitude.toFixed(3), coordinate.longitude.toFixed(3)] as const,
};
