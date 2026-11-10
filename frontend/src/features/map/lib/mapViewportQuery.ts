import type { MapBounds } from '../model/Map';

export type MapSearchRadius = 500 | 1000 | 2000;
export type ViewportQuery = {
  center: { latitude: number; longitude: number };
  radius: MapSearchRadius;
  bounds: MapBounds;
};

const EARTH_RADIUS_METERS = 6_371_008.8;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const distanceMeters = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) => {
  const dLatitude = toRadians(to.latitude - from.latitude);
  const dLongitude = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLatitude / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLongitude / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
};

/** 좌표를 소수점 5자리(약 1m)로 맞춰 같은 화면을 다시 볼 때 같은 요청이 되게 한다. */
const round = (value: number) => Math.round(value * 100_000) / 100_000;

/** 병원처럼 촘촘한 시설을 나눠 조회하는 칸 한 변. 카카오는 한 번에 거리순 45개까지만 주어, 반경 500m 조회도 도심에서는 200m 안팎만 채운다. */
export const FACILITY_CELL_METERS = 400;
/**
 * 화면이 넓어 작은 칸이 너무 많아지면 칸을 키운다. 칸 가운데에서 그 반경으로 조회하면 칸 모서리(한 변 / √2)까지 덮는다.
 * 서버(`GET /api/maps/nearby`)는 화면 범위를 받지 못하고 가운데 좌표와 반경(500, 1000, 2000m)만 받아서, 칸마다 모서리를 덮는 반경으로 크게 받는다.
 */
const FACILITY_CELL_SIZES: { meters: number; radius: MapSearchRadius }[] = [
  { meters: FACILITY_CELL_METERS, radius: 500 },
  { meters: 1400, radius: 1000 },
  { meters: 2800, radius: 2000 },
];
/** 한 화면에서 조회하는 칸 수의 상한. 칸마다 카카오를 최대 세 번 부르므로, 이보다 많아지면 칸을 키우고, 가장 큰 칸으로도 넘으면 화면 가운데에 가까운 칸부터 이만큼만 조회한다. */
export const MAX_FACILITY_CELLS = 16;
const METERS_PER_LATITUDE = 111_320;

/** 화면을 지구 좌표에 맞춘 한 변 `meters`의 격자 칸으로 나눈다. 칸을 화면이 아니라 좌표에 맞춰, 지도를 조금 옮겨도 겹치는 칸은 같은 요청이 된다. */
const gridCells = (bounds: MapBounds, meters: number, radius: MapSearchRadius): ViewportQuery[] => {
  const latitudeStep = meters / METERS_PER_LATITUDE;
  const cells: ViewportQuery[] = [];
  for (let row = Math.floor(bounds.south / latitudeStep); row * latitudeStep < bounds.north; row++) {
    // 경도 칸 폭은 화면이 아니라 그 줄의 위도로 정해, 지도를 옮겨도 같은 자리는 같은 칸이 된다.
    const rowLatitude = (row + 0.5) * latitudeStep;
    const longitudeStep = meters / (METERS_PER_LATITUDE * Math.cos(toRadians(rowLatitude)));
    for (let column = Math.floor(bounds.west / longitudeStep); column * longitudeStep < bounds.east; column++) {
      const cell = {
        south: row * latitudeStep,
        north: (row + 1) * latitudeStep,
        west: column * longitudeStep,
        east: (column + 1) * longitudeStep,
      };
      cells.push({
        center: { latitude: round((cell.south + cell.north) / 2), longitude: round((cell.west + cell.east) / 2) },
        radius,
        bounds: cell,
      });
    }
  }
  return cells;
};

/**
 * 병원, 학교, 편의점, 중개사무소를 화면 가장자리까지 채우려고 화면을 격자 칸으로 나눈다.
 * 400m 칸(반경 500m)으로 화면을 다 덮을 수 있으면 그렇게 하고, 칸이 상한보다 많아질 만큼 화면이 넓으면 1.4km 칸(반경 1km), 2.8km 칸(반경 2km)으로 키운다.
 * 가장 큰 칸으로도 상한을 넘으면 화면 가운데에 가까운 칸부터 상한만큼만 조회한다.
 */
export const facilityCells = (bounds: MapBounds): ViewportQuery[] => {
  const middle = { latitude: (bounds.south + bounds.north) / 2, longitude: (bounds.west + bounds.east) / 2 };
  let cells: ViewportQuery[] = [];
  for (const size of FACILITY_CELL_SIZES) {
    cells = gridCells(bounds, size.meters, size.radius);
    if (cells.length <= MAX_FACILITY_CELLS) return cells;
  }
  return cells
    .sort((a, b) => distanceMeters(middle, a.center) - distanceMeters(middle, b.center))
    .slice(0, MAX_FACILITY_CELLS);
};

export const isInBounds = (point: { latitude: number; longitude: number }, bounds: MapBounds) =>
  point.latitude >= bounds.south &&
  point.latitude <= bounds.north &&
  point.longitude >= bounds.west &&
  point.longitude <= bounds.east;
