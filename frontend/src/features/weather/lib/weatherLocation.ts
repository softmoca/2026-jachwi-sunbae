import type { MapCoordinate } from '@/features/map/lib/mapLocation';
import { MapLocationError, requestCurrentMapLocation } from '@/features/map/lib/mapLocation';

/**
 * 날씨 알림 토글이 위치를 기다리는 최대 시간.
 * iOS는 위치를 잠깐 못 잡으면(kCLErrorLocationUnknown) 웹에 실패를 알리지 않고 계속 찾는다.
 * 그동안 토글이 잠겨 멈춘 것처럼 보이지 않게, 정확한 위치(8초)와 대략적인 위치를 한 번 더 물어볼 시간만 기다린다.
 */
export const WEATHER_LOCATION_DEADLINE_MS = 12_000;

/**
 * 현재 위치를 받되, 정해진 시간 안에 답이 없으면 잠깐 못 잡은 것(`unavailable`)으로 끝낸다.
 * 권한 거부(`denied`)는 그대로 전한다. 사파리 권한 창 때문에 클릭 처리기 안에서 곧바로 불러야 한다.
 */
export const requestWeatherLocation = (deadlineMs = WEATHER_LOCATION_DEADLINE_MS): Promise<MapCoordinate> => {
  let timer: number | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = window.setTimeout(
      () => reject(new MapLocationError('unavailable', '현재 위치를 확인하지 못했습니다.')),
      deadlineMs,
    );
  });
  return Promise.race([requestCurrentMapLocation(), deadline]).finally(() => window.clearTimeout(timer));
};
