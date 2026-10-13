import { expect, it } from 'vitest';

import { demoMapCoordinate, demoMapOffset, demoRadiusDiameter } from '@/features/map/lib/mapDemoProjection';
import { getMapFocusCenter } from '@/features/map/lib/mapViewportFocus';

it('반경 경계의 가게와 반경 원을 같은 축척으로 표시한다', () => {
  const center = { latitude: 0, longitude: 0 };
  const east = { latitude: 0, longitude: (1000 * 180) / (Math.PI * 6_378_137) };
  for (const level of [5, 6, 7]) {
    const offset = demoMapOffset(east, center, level);
    expect(offset.x).toBeCloseTo(demoRadiusDiameter(1000, center.latitude, level) / 2, 5);
    expect(offset.y).toBeCloseTo(0);
  }
});

it('선택한 핀을 하단 시트 위에 표시하며 그 위치를 클릭해도 같은 좌표를 얻는다', () => {
  const store = { latitude: 37.5665, longitude: 126.978 };
  const center = getMapFocusCenter(store, 6, 390, 844);
  const offset = demoMapOffset(store, center, 6);
  expect(offset.x).toBeCloseTo(-390 * 0.08, 5);
  expect(offset.y).toBeCloseTo(-844 * 0.1, 5);
  const picked = demoMapCoordinate(center, 6, offset.x, offset.y);
  expect(picked.latitude).toBeCloseTo(store.latitude, 6);
  expect(picked.longitude).toBeCloseTo(store.longitude, 6);
});
