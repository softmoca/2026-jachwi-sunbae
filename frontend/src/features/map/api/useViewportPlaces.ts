import { keepPreviousData, useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { usePublicConfig } from '@/shared/config/PublicConfigContext';

import { facilityCells, isInBounds } from '../lib/mapViewportQuery';
import type { MapBounds, NearbyAgenciesResult, NearbyAgency } from '../model/Map';
import { fetchNearbyAgencies } from './agencyApi';
import { useViewportBusStops } from './useViewportBusStops';

/**
 * 지도 화면 안의 공인중개사와 버스정류장. 화면을 지구 좌표에 맞춘 격자 칸(`facilityCells`)으로 나눠 칸마다 조회하고,
 * 칸 단위 쿼리 키라 지도를 조금 옮기면 이미 받은 칸은 캐시를 다시 쓰고 새로 들어온 칸만 받는다.
 * 켠 것만 받는다(`agencies`, `busStops`). 키가 바뀌어 쓰이지 않게 된 요청은 React Query가 취소한다(신호를 넘긴다).
 * 지도를 옮기는 동안에는 새 결과가 올 때까지 이전 결과를 그대로 둔다.
 */
export const useViewportPlaces = (
  bounds: MapBounds | null,
  { agencies: loadsAgencies, busStops: loadsBusStops }: { agencies: boolean; busStops: boolean },
) => {
  const config = usePublicConfig();
  const cells = useMemo(
    () => (bounds && (loadsAgencies || loadsBusStops) ? facilityCells(bounds) : []),
    [bounds, loadsAgencies, loadsBusStops],
  );
  const combineAgencies = useCallback((results: UseQueryResult<NearbyAgenciesResult>[]) => {
    const byId = new Map<string, NearbyAgency>();
    for (const result of results)
      for (const agency of result.data?.agencies ?? []) byId.set(agency.providerPlaceId, agency);
    return {
      agencies: [...byId.values()],
      isError: results.some((result) => result.isError),
      isFetching: results.some((result) => result.isFetching),
    };
  }, []);
  const agencies = useQueries({
    queries: (loadsAgencies ? cells : []).map((cell) => ({
      queryKey: ['viewport-agencies', config.apiBaseUrl, cell.center.latitude, cell.center.longitude, cell.radius],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchNearbyAgencies(config, cell.center.latitude, cell.center.longitude, cell.radius, signal),
      staleTime: 5 * 60 * 1000,
      retry: false,
      placeholderData: keepPreviousData,
    })),
    combine: combineAgencies,
  });
  const busStops = useViewportBusStops(loadsBusStops ? cells : [], bounds, loadsBusStops);
  const visibleAgencies = useMemo(
    () => (bounds ? agencies.agencies.filter((agency) => isInBounds(agency, bounds)) : []),
    [agencies.agencies, bounds],
  );
  return {
    agencies: visibleAgencies,
    busStops: busStops.busStops,
    isAgenciesLoading: agencies.isFetching,
    agenciesFailed: agencies.isError && !agencies.isFetching,
    busStopsFailed: busStops.isError,
  };
};
