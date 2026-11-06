import { keepPreviousData, useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { usePublicConfig } from '@/shared/config/PublicConfigContext';

import { isInBounds, type ViewportQuery } from '../lib/mapViewportQuery';
import type { MapBounds } from '../model/Map';
import { fetchBusStops } from './busStopApi';

type BusStopResult = Awaited<ReturnType<typeof fetchBusStops>>;
type BusStop = BusStopResult['busStops'][number];

/**
 * 지도 화면 안의 버스정류장. 화면을 덮는 격자 칸(`facilityCells`)마다 조회해 겹치는 정류장은 하나로 합치고 화면 안의 것만 남긴다.
 * 지도를 옮겨 새 칸을 조회하는 동안에는 이전 정류장을 그대로 둬, 정류장이 사라졌다 나타나지 않게 한다.
 */
export const useViewportBusStops = (tiles: ViewportQuery[], bounds: MapBounds | null, enabled = true) => {
  const config = usePublicConfig();
  // 칸마다 받은 정류장을 정류장 ID로 합친다.
  const combine = useCallback((results: UseQueryResult<BusStopResult>[]) => {
    const byId = new Map<string, BusStop>();
    for (const result of results) for (const stop of result.data?.busStops ?? []) byId.set(stop.nodeId, stop);
    return {
      stops: [...byId.values()],
      isFetching: results.some((result) => result.isFetching),
      isError: results.some((result) => result.isError),
      refetch: () => Promise.all(results.map((result) => result.refetch())),
    };
  }, []);
  const combined = useQueries({
    queries: tiles.map((tile) => ({
      queryKey: ['viewport-bus-stops', config.apiBaseUrl, tile.center.latitude, tile.center.longitude, tile.radius],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchBusStops(config, tile.center.latitude, tile.center.longitude, tile.radius, signal),
      enabled,
      staleTime: 5 * 60 * 1000,
      retry: false,
      placeholderData: keepPreviousData,
    })),
    combine,
  });
  const { stops } = combined;
  const busStops = useMemo(
    () => (enabled && bounds ? stops.filter((stop) => isInBounds(stop, bounds)) : []),
    [enabled, bounds, stops],
  );
  return {
    busStops,
    isFetching: combined.isFetching,
    isError: combined.isError && !combined.isFetching,
    refetch: combined.refetch,
  };
};
