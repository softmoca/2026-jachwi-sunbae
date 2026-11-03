// @vitest-environment node
import { expect, it } from 'vitest';

import {
  AREA_FOCUS_FALLBACK_LEVEL,
  AREA_FOCUS_MAX_LEVEL,
  AREA_FOCUS_MIN_LEVEL,
  areaFocusLevel,
  nextPlacesVisible,
  PLACES_HIDE_LEVEL,
  PLACES_SHOW_LEVEL,
  resultMapCenter,
} from '@/pages/neighborhood-preview/model/resultMapView';

it('지도 중심은 남쪽으로 옮겨 결과 위치가 중앙보다 위에 표시된다', () => {
  const point = { latitude: 37.5, longitude: 127 };
  expect(resultMapCenter(point, 7).latitude).toBeLessThan(point.latitude);
  expect(resultMapCenter(point, 7).longitude).toBe(point.longitude);
});
it('확대율이 달라도 동일한 픽셀 간격만큼 조정한다', () => {
  const point = { latitude: 37.5, longitude: 127 };
  const delta = (level: number) => {
    const y = (lat: number) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
    return (y(resultMapCenter(point, level).latitude) - y(point.latitude)) * 256 * 2 ** (20 - level);
  };
  expect(delta(7)).toBeCloseTo(48);
  expect(delta(10)).toBeCloseTo(48);
});

/** 위도 37.5, 경도 127을 가운데로 가로세로 `meters`m인 네모 동네 경계. */
const squareArea = (meters: number) => {
  const latitudeSpan = meters / 111_320;
  const longitudeSpan = meters / (111_320 * Math.cos((37.5 * Math.PI) / 180));
  const [south, north] = [37.5 - latitudeSpan / 2, 37.5 + latitudeSpan / 2];
  const [west, east] = [127 - longitudeSpan / 2, 127 + longitudeSpan / 2];
  return [
    [
      [
        { latitude: south, longitude: west },
        { latitude: north, longitude: west },
        { latitude: north, longitude: east },
        { latitude: south, longitude: east },
      ],
    ],
  ];
};
/** Naver 지도에서 확대 단계 `level`일 때 위도 37.5의 1px이 덮는 거리(m). 실제 지도에서 단계 5가 약 1.9m였다. */
const metersPerPixel = (level: number) => ((156_543.03 * Math.cos((37.5 * Math.PI) / 180)) / 2 ** 21) * 2 ** level;

it('동네를 고르면 동네 크기에 맞춰 경계 전체가 340x300px 안에 들어가는 단계로 다가간다', () => {
  const level = areaFocusLevel(squareArea(1000));
  expect(level).toBeGreaterThan(AREA_FOCUS_MIN_LEVEL);
  expect(level).toBeLessThan(AREA_FOCUS_MAX_LEVEL);
  // 1km 동네는 세로 300px에 꼭 맞는다.
  expect(1000 / metersPerPixel(level)).toBeCloseTo(300, 0);
  expect(areaFocusLevel(squareArea(800))).toBeLessThan(level);
});
it('작은 동네도 예전 단계(5)보다 가까이 가지 않고, 큰 동네도 마커가 보이는 단계보다 멀리 가지 않는다', () => {
  expect(areaFocusLevel(squareArea(200))).toBe(AREA_FOCUS_MIN_LEVEL);
  expect(areaFocusLevel(squareArea(5000))).toBe(AREA_FOCUS_MAX_LEVEL);
  // 동네를 고르자마자 정류장과 부동산 마커가 올라와야 한다.
  expect(nextPlacesVisible(false, areaFocusLevel(squareArea(5000)))).toBe(true);
});
it('경계를 아직 받지 못한 동네는 정해 둔 단계로 다가간다', () => {
  expect(areaFocusLevel([])).toBe(AREA_FOCUS_FALLBACK_LEVEL);
  expect(nextPlacesVisible(false, AREA_FOCUS_FALLBACK_LEVEL)).toBe(true);
});
it('마커는 6.5 이하에서 올리고, 올린 뒤에는 7을 넘어야 거둔다', () => {
  expect(nextPlacesVisible(false, 6.51)).toBe(false);
  expect(nextPlacesVisible(false, PLACES_SHOW_LEVEL)).toBe(true);
  // 지도가 6.5로 옮겨 6.5000001에 멈춰도 올린다.
  expect(nextPlacesVisible(false, PLACES_SHOW_LEVEL + 1e-7)).toBe(true);
  expect(nextPlacesVisible(true, PLACES_HIDE_LEVEL)).toBe(true);
  expect(nextPlacesVisible(true, 7.11)).toBe(false);
});
