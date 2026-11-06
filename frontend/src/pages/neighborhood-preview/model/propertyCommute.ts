import type { PropertyCommuteTime } from '@/features/property/model/Property';

/** 매물 한 줄의 통근 시간. 서버는 정해 둔 시간과 환승 안에서만 시간을 구한다. */
export const propertyCommuteLabel = (commute: PropertyCommuteTime, maxMinutes: number) => {
  if (commute.status === 'NO_LOCATION') return '위치 없음';
  if (commute.status === 'UNREACHABLE') return `${maxMinutes}분 넘게`;
  return `${commute.commuteMinutes}분`;
};

/** 가까운 매물부터, 못 가는 매물, 위치 없는 매물, 아직 시간을 모르는 매물 순으로 둔다. */
export const propertyCommuteOrder = (commute: PropertyCommuteTime | null) =>
  commute === null
    ? 30_000
    : commute.status === 'REACHABLE'
      ? (commute.commuteMinutes ?? 0)
      : commute.status === 'UNREACHABLE'
        ? 10_000
        : 20_000;

/** 목록의 거리. 1km 아래는 m, 그 위는 소수 한 자리 km로 적는다. */
export const distanceLabel = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
