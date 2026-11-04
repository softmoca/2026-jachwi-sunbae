// @vitest-environment node
import { expect, it } from 'vitest';

import {
  distanceMeters,
  facilityCells,
  isInBounds,
  MAX_FACILITY_CELLS,
  viewportQuery,
  viewportTiles,
} from '@/features/map/lib/mapViewportQuery';

const around = (halfLatitude: number, halfLongitude: number) => ({
  south: 37.5 - halfLatitude,
  north: 37.5 + halfLatitude,
  west: 127 - halfLongitude,
  east: 127 + halfLongitude,
});

it('화면 가운데를 중심으로 모서리까지 덮는 가장 작은 지원 반경을 고른다', () => {
  // 모서리까지 약 300m, 630m, 1.3km
  expect(viewportQuery(around(0.002, 0.0025)).radius).toBe(500);
  expect(viewportQuery(around(0.004, 0.005)).radius).toBe(1000);
  expect(viewportQuery(around(0.008, 0.01)).radius).toBe(2000);
  expect(viewportQuery(around(0.004, 0.005)).center).toEqual({ latitude: 37.5, longitude: 127 });
});

it('화면이 2km보다 넓으면 가운데 2km만 요청한다', () => {
  expect(viewportQuery(around(0.05, 0.06)).radius).toBe(2000);
});

it('거리와 화면 포함 여부를 계산한다', () => {
  expect(distanceMeters({ latitude: 37.5, longitude: 127 }, { latitude: 37.509, longitude: 127 })).toBeCloseTo(
    1001,
    -1,
  );
  const bounds = around(0.004, 0.005);
  expect(isInBounds({ latitude: 37.5, longitude: 127.005 }, bounds)).toBe(true);
  expect(isInBounds({ latitude: 37.5, longitude: 127.0051 }, bounds)).toBe(false);
});

it('정류장 조회는 화면이 2km 안이면 한 번, 넘으면 네 칸으로 나눠 가장자리까지 조회한다', () => {
  expect(viewportTiles(around(0.008, 0.01))).toEqual([viewportQuery(around(0.008, 0.01))]);
  // 모서리까지 약 3km인 화면: 칸마다 모서리까지 1.5km라 네 칸이 화면을 다 덮는다.
  const tiles = viewportTiles(around(0.018, 0.022));
  expect(tiles).toHaveLength(4);
  expect(tiles.map((tile) => tile.radius)).toEqual([2000, 2000, 2000, 2000]);
  expect(tiles.map((tile) => [tile.center.latitude > 37.5, tile.center.longitude > 127])).toEqual([
    [true, false],
    [true, true],
    [false, false],
    [false, true],
  ]);
});

it('시설은 화면을 고정 격자 칸으로 나눠, 칸 가운데에서 반경 500m로 칸 모서리까지 덮는다', () => {
  // 약 670m x 440m 화면이라 400m 칸이 가로 2~3개, 세로 2~3개 걸친다.
  const bounds = around(0.002, 0.0038);
  const cells = facilityCells(bounds);
  expect(cells.length).toBeGreaterThanOrEqual(4);
  expect(cells.length).toBeLessThanOrEqual(MAX_FACILITY_CELLS);
  for (const cell of cells) {
    expect(cell.radius).toBe(500);
    expect(distanceMeters(cell.center, { latitude: cell.bounds.north, longitude: cell.bounds.east })).toBeLessThan(500);
  }
  // 화면 네 모서리가 모두 어느 칸 안에 든다.
  for (const corner of [
    { latitude: bounds.south, longitude: bounds.west },
    { latitude: bounds.north, longitude: bounds.east },
    { latitude: bounds.south, longitude: bounds.east },
    { latitude: bounds.north, longitude: bounds.west },
  ])
    expect(cells.some((cell) => isInBounds(corner, cell.bounds))).toBe(true);
});

it('지도를 조금 옮겨도 겹치는 칸은 같은 가운데로 조회해 캐시를 다시 쓴다', () => {
  const before = facilityCells(around(0.002, 0.0038)).map((cell) => cell.center);
  const moved = facilityCells({ south: 37.4981, north: 37.5021, west: 126.9963, east: 127.0039 }).map(
    (cell) => cell.center,
  );
  expect(
    moved.filter((center) =>
      before.some((other) => other.latitude === center.latitude && other.longitude === center.longitude),
    ).length,
  ).toBeGreaterThan(0);
});

const corners = (bounds: ReturnType<typeof around>) => [
  { latitude: bounds.south, longitude: bounds.west },
  { latitude: bounds.north, longitude: bounds.east },
  { latitude: bounds.south, longitude: bounds.east },
  { latitude: bounds.north, longitude: bounds.west },
];

it('400m 칸이 상한보다 많아질 만큼 화면이 넓으면 칸을 키워 화면 모서리까지 모두 덮는다', () => {
  // 약 4.4km 정사각형 화면. 400m 칸이면 100칸이 넘는다.
  const bounds = around(0.02, 0.025);
  const cells = facilityCells(bounds);
  expect(cells.length).toBeLessThanOrEqual(MAX_FACILITY_CELLS);
  expect(cells.every((cell) => cell.radius > 500)).toBe(true);
  for (const cell of cells)
    expect(distanceMeters(cell.center, { latitude: cell.bounds.north, longitude: cell.bounds.east })).toBeLessThan(
      cell.radius,
    );
  for (const corner of corners(bounds)) expect(cells.some((cell) => isInBounds(corner, cell.bounds))).toBe(true);
});

it('가장 큰 칸으로도 상한을 넘으면 가운데에 가까운 칸부터 상한만큼만 조회한다', () => {
  const cells = facilityCells(around(0.2, 0.25));
  expect(cells).toHaveLength(MAX_FACILITY_CELLS);
  expect(cells.every((cell) => cell.radius === 2000)).toBe(true);
  expect(cells.every((cell) => distanceMeters({ latitude: 37.5, longitude: 127 }, cell.center) < 8000)).toBe(true);
});
