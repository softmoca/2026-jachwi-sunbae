import { expect, it } from 'vitest';

import { pinchLevelDelta } from '@/features/map/lib/mapPinchZoom';

it('손가락을 2배 벌린 핀치(deltaY -100 ln 2)는 확대 단계를 1 가까이 옮긴다', () => {
  expect(pinchLevelDelta(-100 * Math.LN2)).toBeCloseTo(-1, 5);
  expect(pinchLevelDelta(100 * Math.LN2)).toBeCloseTo(1, 5);
});

it('줄 단위 휠은 한 줄을 16px로 보고, 이벤트 하나는 1단계까지로 자른다', () => {
  expect(pinchLevelDelta(-1, 1)).toBeCloseTo(-16 / (100 * Math.LN2), 5);
  expect(pinchLevelDelta(-500)).toBe(-1);
  expect(pinchLevelDelta(500)).toBe(1);
});
