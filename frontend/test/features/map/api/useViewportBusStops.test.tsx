import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';

import { fetchBusStops } from '@/features/map/api/busStopApi';
import { useViewportBusStops } from '@/features/map/api/useViewportBusStops';
import { facilityCells, isInBounds } from '@/features/map/lib/mapViewportQuery';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

vi.mock('@/features/map/api/busStopApi', () => ({ fetchBusStops: vi.fn() }));

const stop = (nodeId: string, latitude: number, longitude: number) => ({
  nodeId,
  name: nodeId,
  latitude,
  longitude,
  distanceMeters: 100,
});

it('네 칸에서 받은 정류장을 하나로 합치고 겹치는 정류장은 한 번만, 화면 밖 정류장은 빼고 보여 준다', async () => {
  vi.mocked(fetchBusStops).mockImplementation(async (_config, latitude, longitude, radius) => ({
    center: { latitude, longitude },
    radius,
    count: 2,
    // 칸마다 자기 가운데 정류장과, 모든 칸이 함께 받는 화면 가운데 정류장, 화면 밖 정류장을 돌려준다.
    busStops: [stop(`${latitude},${longitude}`, latitude, longitude), stop('middle', 37.5, 127), stop('far', 38, 127)],
  }));
  const bounds = { south: 37.482, north: 37.518, west: 126.978, east: 127.022 };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <PublicConfigProvider config={{ apiBaseUrl: 'http://localhost', commuteDataSource: 'mock' }}>
        {children}
      </PublicConfigProvider>
    </QueryClientProvider>
  );
  const cells = facilityCells(bounds);
  const { result } = renderHook(() => useViewportBusStops(cells, bounds), { wrapper });
  // 칸 가운데가 화면 밖이면 그 칸의 정류장은 빠지므로, 화면 안 칸 가운데 수와 화면 가운데 정류장 하나를 센다.
  const inside = cells.filter((cell) => isInBounds(cell.center, bounds)).length;
  await waitFor(() => expect(result.current.busStops).toHaveLength(inside + 1));
  expect(fetchBusStops).toHaveBeenCalledTimes(cells.length);
  expect(result.current.busStops.filter((busStop) => busStop.nodeId === 'middle')).toHaveLength(1);
  expect(result.current.busStops.some((busStop) => busStop.nodeId === 'far')).toBe(false);
});
