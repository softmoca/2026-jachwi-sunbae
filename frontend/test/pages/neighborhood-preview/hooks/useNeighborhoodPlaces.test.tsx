import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import useNeighborhoodPlaces from '@/pages/neighborhood-preview/hooks/useNeighborhoodPlaces';

vi.mock('@/features/map/api/useViewportPlaces', () => ({
  useViewportPlaces: () => ({
    busStops: [{ nodeId: 'stop-1', name: '정류장', latitude: 37.5, longitude: 127 }],
    agencies: [],
    agenciesFailed: false,
    busStopsFailed: false,
  }),
}));

const bounds = { south: 37.49, west: 126.99, north: 37.51, east: 127.01 };

it('결과 지도를 떠났다 돌아오면 지도가 다시 멈추기 전까지 예전 확대 단계로 마커를 올리지 않는다', () => {
  const { result, rerender } = renderHook(useNeighborhoodPlaces, { initialProps: true });
  act(() => {
    result.current.rememberLevel(5);
    result.current.rememberBounds(bounds);
  });
  expect(result.current.isClose).toBe(true);
  expect(result.current.markers).toHaveLength(1);

  rerender(false);
  rerender(true);
  expect(result.current.isClose).toBe(false);
  expect(result.current.markers).toHaveLength(0);
  expect(result.current.bounds).toBeNull();

  act(() => {
    result.current.rememberLevel(5);
    result.current.rememberBounds(bounds);
  });
  expect(result.current.isClose).toBe(true);
});
