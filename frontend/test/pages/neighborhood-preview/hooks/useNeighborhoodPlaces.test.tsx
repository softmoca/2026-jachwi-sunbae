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

it('휠로 6.5 언저리를 오가도 한 번 올린 정류장과 부동산을 거뒀다 올렸다 하지 않는다', () => {
  const { result } = renderHook(useNeighborhoodPlaces, { initialProps: true });
  act(() => {
    result.current.rememberLevel(6.36);
    result.current.rememberBounds(bounds);
  });
  expect(result.current.isClose).toBe(true);

  // 데스크탑 휠 한 칸은 0.15단계라 6.36과 6.51을 오간다.
  for (const level of [6.51, 6.36, 6.51, 6.66, 6.95]) {
    act(() => result.current.rememberLevel(level));
    expect(result.current.isClose).toBe(true);
    expect(result.current.markers).toHaveLength(1);
  }

  act(() => result.current.rememberLevel(7.11));
  expect(result.current.isClose).toBe(false);
  // 거둔 뒤에는 다시 6.5 안쪽으로 다가가야 올린다.
  act(() => result.current.rememberLevel(6.95));
  expect(result.current.isClose).toBe(false);
  act(() => result.current.rememberLevel(6.5));
  expect(result.current.isClose).toBe(true);
});
