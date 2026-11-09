import { publishCurrentLocation } from './currentLocationStore';
export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export const SEOUL_MAP_CENTER: MapCoordinate = { latitude: 37.5665, longitude: 126.978 };
export const PANGYO_MAP_CENTER: MapCoordinate = { latitude: 37.3948, longitude: 127.1119 };
export const DEFAULT_MAP_CENTER: MapCoordinate = PANGYO_MAP_CENTER;

/**
 * 서비스가 다루는 범위는 남한뿐이다. 마라도(남)·백령도(서)·독도(동)·고성(북)을 담고 여유를 조금 뒀다.
 * 지도를 이 밖으로 옮기거나, 이 밖의 좌표를 지도 중심으로 삼지 않는다.
 */
export const SOUTH_KOREA_BOUNDS = {
  south: 32.9,
  west: 124.5,
  north: 38.65,
  east: 132.0,
} as const;

export const isInSouthKorea = (coordinate: MapCoordinate): boolean =>
  coordinate.latitude >= SOUTH_KOREA_BOUNDS.south &&
  coordinate.latitude <= SOUTH_KOREA_BOUNDS.north &&
  coordinate.longitude >= SOUTH_KOREA_BOUNDS.west &&
  coordinate.longitude <= SOUTH_KOREA_BOUNDS.east;

const clampNumber = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const clampToSouthKorea = (coordinate: MapCoordinate): MapCoordinate => ({
  latitude: clampNumber(coordinate.latitude, SOUTH_KOREA_BOUNDS.south, SOUTH_KOREA_BOUNDS.north),
  longitude: clampNumber(coordinate.longitude, SOUTH_KOREA_BOUNDS.west, SOUTH_KOREA_BOUNDS.east),
});

const LAST_MAP_CENTER_KEY = 'jachwi-sunbae.lastMapCenter';

const isCoordinate = (value: unknown): value is MapCoordinate => {
  if (typeof value !== 'object' || value === null) return false;
  const coordinate = value as Partial<MapCoordinate>;
  return (
    typeof coordinate.latitude === 'number' &&
    Number.isFinite(coordinate.latitude) &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    typeof coordinate.longitude === 'number' &&
    Number.isFinite(coordinate.longitude) &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180
  );
};

export const readLastMapCenter = (storage: Storage = window.sessionStorage): MapCoordinate | null => {
  try {
    const stored = storage.getItem(LAST_MAP_CENTER_KEY);
    if (stored === null) return null;
    const parsed: unknown = JSON.parse(stored);
    // 남한 밖 좌표가 저장돼 있으면 기본 중심으로 돌아가도록 없는 값처럼 다룬다.
    return isCoordinate(parsed) && isInSouthKorea(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeLastMapCenter = (coordinate: MapCoordinate, storage: Storage = window.sessionStorage): void => {
  try {
    storage.setItem(LAST_MAP_CENTER_KEY, JSON.stringify(coordinate));
  } catch {
    // 브라우저 저장소를 사용할 수 없어도 지도 탐색은 계속한다.
  }
};

/** 위치를 못 받은 까닭. 안내 문구와 다시 시도 여부가 달라진다. */
export type MapLocationFailure = 'insecure' | 'denied' | 'unavailable';

export class MapLocationError extends Error {
  readonly reason: MapLocationFailure;

  constructor(reason: MapLocationFailure, message: string) {
    super(message);
    this.name = 'MapLocationError';
    this.reason = reason;
  }
}

/** 브라우저는 localhost도 보안 출처로 본다. jsdom은 이를 반영하지 않아 직접 따진다. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const isSecureOrigin = (): boolean =>
  window.isSecureContext || window.location.protocol === 'https:' || LOCAL_HOSTS.has(window.location.hostname);

/**
 * 사파리는 권한 창을 사용자가 누른 그 순간에만 띄운다.
 * 그래서 이 함수는 클릭 처리기 안에서 곧바로 불러야 하고, 중간에 await를 두면 안 된다.
 */
export const requestCurrentMapLocation = (): Promise<MapCoordinate> =>
  new Promise((resolve, reject) => {
    // 사파리는 https가 아니면 권한 창을 아예 띄우지 않고 조용히 실패한다.
    if (!isSecureOrigin()) {
      reject(new MapLocationError('insecure', 'https 주소에서만 현재 위치를 쓸 수 있습니다.'));
      return;
    }

    if (!('geolocation' in navigator)) {
      reject(new MapLocationError('unavailable', '현재 위치를 사용할 수 없습니다.'));
      return;
    }

    const succeed = (position: GeolocationPosition) => {
      const coordinate = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      // 남한 밖에서는 보여 줄 매물도 지도도 없다. 위치를 못 받은 것과 같게 다룬다.
      if (!isInSouthKorea(coordinate)) {
        reject(new MapLocationError('unavailable', '남한 안에서만 현재 위치를 쓸 수 있습니다.'));
        return;
      }
      publishCurrentLocation(coordinate);
      resolve(coordinate);
    };
    const toFailure = (error: GeolocationPositionError): MapLocationFailure =>
      error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable';

    navigator.geolocation.getCurrentPosition(
      succeed,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new MapLocationError('denied', '위치 권한이 꺼져 있습니다.'));
          return;
        }

        // 정확한 위치는 실내에서 자주 시간을 넘긴다. 대략적인 위치로 한 번 더 물어본다.
        navigator.geolocation.getCurrentPosition(
          succeed,
          (retryError) => reject(new MapLocationError(toFailure(retryError), '현재 위치를 확인하지 못했습니다.')),
          { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
        );
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 120_000 },
    );
  });

/** 권한이 이미 거부돼 있으면 눌러도 창이 뜨지 않는다. 그때는 설정 안내를 대신 보여 준다. */
export const readGeolocationPermission = async (): Promise<PermissionState | 'unknown'> => {
  if (navigator.permissions === undefined) return 'unknown';
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state;
  } catch {
    return 'unknown';
  }
};

export const coordinatesAreClose = (first: MapCoordinate, second: MapCoordinate, tolerance = 0.000_01): boolean =>
  Math.abs(first.latitude - second.latitude) < tolerance && Math.abs(first.longitude - second.longitude) < tolerance;
