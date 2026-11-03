import type { MapCoordinate } from '@/features/map/lib/mapLocation';

/**
 * 이 확대 단계(작을수록 가까움) 이하로 다가가면 화면 안의 정류장, 부동산, 메모를 올린다. 축척 200~300m 화면 정도다.
 * 동네를 고르면 `areaFocusLevel`이 이 단계 안쪽으로 다가가므로 고르자마자 마커가 보인다.
 */
export const PLACES_SHOW_LEVEL = 6.5;
/**
 * 한 번 올린 마커는 이 단계보다 멀어져야 거둔다. 데스크탑 휠은 한 칸에 0.15단계씩 소수로 멈춰,
 * 올리고 거두는 기준이 같으면 6.36과 6.51을 오갈 때마다 공인중개사 탭과 마커가 꺼졌다 켜진다.
 * 반 단계(휠 세 칸) 여유를 둔다. 더 멀리 두면 화면이 조회 반경(최대 2km)보다 훨씬 넓어져 가장자리가 빈다.
 */
export const PLACES_HIDE_LEVEL = 7;

/**
 * 지도가 멈춘 확대 단계로 마커를 올릴지 정한다. 이미 올렸으면 `PLACES_HIDE_LEVEL`까지 유지한다.
 * 지도는 6.5로 옮겨도 6.4999999나 6.5000001로 멈추므로 소수 둘째 자리에서 반올림해 비교한다.
 */
export const nextPlacesVisible = (wasVisible: boolean, level: number) =>
  Math.round(level * 100) / 100 <= (wasVisible ? PLACES_HIDE_LEVEL : PLACES_SHOW_LEVEL);

/** 동네를 고를 때 가장 가까이 다가가는 단계(작을수록 가까움). 작은 동네도 이보다 다가가 골목만 보이게 하지 않는다. */
export const AREA_FOCUS_MIN_LEVEL = 5;
/** 동네를 고를 때 가장 멀리 두는 단계. 고르자마자 정류장과 부동산 마커가 보이도록 마커를 올리는 단계에 맞춘다. */
export const AREA_FOCUS_MAX_LEVEL = PLACES_SHOW_LEVEL;
/** 경계를 아직 받지 못한 동네를 고를 때의 단계. */
export const AREA_FOCUS_FALLBACK_LEVEL = 6;
/**
 * 동네 경계가 여백을 두고 들어가야 하는 지도 칸 크기(px). 휴대폰 390px에서 좌우 여백과 아래 시트를 뺀 칸과,
 * 데스크탑에서 정보 칸이 열려 좁아진 지도 칸 중 작은 쪽에 맞춘다.
 */
const AREA_FIT_SIZE = { width: 340, height: 300 } as const;
/** 확대 단계 0(Naver zoom 21)에서 적도의 1px이 덮는 거리(m). Naver 지도는 512px 타일을 쓴다. */
const METERS_PER_PIXEL_AT_LEVEL_ZERO = 156_543.03 / 2 ** 21;
const METERS_PER_LATITUDE = 111_320;
/** 데스크탑에서 출발 정류장을 고르면 다가가는 확대 단계. 주변 정류장·부동산 마커가 함께 보일 만큼 가깝다. */
export const STATION_FOCUS_LEVEL = 3;
/** 동네를 고르지 않은 결과 지도의 확대 단계. 결과 동네 전체가 보이도록 멀리 둔다. */
export const RESULT_OVERVIEW_LEVEL = 10;

/** Web Mercator의 픽셀 간격을 사용해 결과가 지도 중앙보다 48px 위에 보이게 한다. */
export const resultMapCenter = (point: MapCoordinate, level: number): MapCoordinate => {
  const latitude = (Math.max(-85, Math.min(85, point.latitude)) * Math.PI) / 180;
  const worldSize = 256 * 2 ** (20 - level);
  const y = (1 - Math.log(Math.tan(Math.PI / 4 + latitude / 2)) / Math.PI) / 2;
  const shiftedLatitude = (Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 48 / worldSize)))) * 180) / Math.PI;
  return { latitude: shiftedLatitude, longitude: point.longitude };
};

/**
 * 동네 경계 전체가 여백을 두고 보이는 확대 단계. 동네 크기와 상관없이 같은 단계로 다가가면 큰 동네는 한 귀퉁이만 보인다.
 * 너무 가깝거나 멀지 않게 `AREA_FOCUS_MIN_LEVEL`~`AREA_FOCUS_MAX_LEVEL` 안으로 자른다.
 */
export const areaFocusLevel = (polygons: readonly (readonly (readonly MapCoordinate[])[])[]): number => {
  const points = polygons.flatMap((polygon) => polygon[0] ?? []);
  if (!points.length) return AREA_FOCUS_FALLBACK_LEVEL;
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const cosine = Math.cos((((south + north) / 2) * Math.PI) / 180);
  const widthMeters = (Math.max(...longitudes) - Math.min(...longitudes)) * METERS_PER_LATITUDE * cosine;
  const heightMeters = (north - south) * METERS_PER_LATITUDE;
  const metersPerPixel = Math.max(widthMeters / AREA_FIT_SIZE.width, heightMeters / AREA_FIT_SIZE.height);
  // 확대 단계가 1 멀어질 때마다 1px이 덮는 거리가 두 배가 된다.
  const level = Math.log2(metersPerPixel / (METERS_PER_PIXEL_AT_LEVEL_ZERO * cosine));
  return Math.min(AREA_FOCUS_MAX_LEVEL, Math.max(AREA_FOCUS_MIN_LEVEL, level));
};
