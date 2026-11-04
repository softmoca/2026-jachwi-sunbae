import { keepPreviousData, useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { usePublicConfig } from '@/shared/config/PublicConfigContext';

import { isInBounds, type ViewportQuery } from '../lib/mapViewportQuery';
import type { MapBounds, NearbyCategory, NearbyPlace, NearbyResult } from '../model/Map';
import { fetchNearby } from './mapApi';

/**
 * 지도 화면 안의 한 시설 카테고리. 화면을 덮는 격자 칸(`facilityCells`)마다 그 카테고리만 조회해 장소 ID로 합치고 화면 안의 것만 남긴다.
 * 카카오는 한 번에 거리순 45개까지만 주어, 화면 가운데에서 한 번만 조회하면 도심에서는 가운데 200m 안팎만 채워진다.
 * 지도를 옮겨 새 칸을 조회하는 동안에는 이전 시설을 그대로 둔다.
 */
export const useViewportFacilities = (
  cells: ViewportQuery[],
  bounds: MapBounds | null,
  category: NearbyCategory | null,
) => {
  const config = usePublicConfig();
  const combine = useCallback((results: UseQueryResult<NearbyResult>[]) => {
    return {
      places: results.flatMap((result) => result.data?.places ?? []),
      isFetching: results.some((result) => result.isFetching),
      isError: results.some((result) => result.isError),
    };
  }, []);
  const combined = useQueries({
    queries: cells.map((cell) => ({
      queryKey: ['viewport-facilities', config.apiBaseUrl, category, cell.center.latitude, cell.center.longitude],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchNearby(
          config,
          cell.center.latitude,
          cell.center.longitude,
          cell.radius,
          category ? [category] : [],
          signal,
        ),
      enabled: category !== null,
      staleTime: 5 * 60 * 1000,
      retry: false,
      placeholderData: keepPreviousData,
    })),
    combine,
  });
  const { places } = combined;
  // 화면 안의 것만 남긴 뒤 장소 ID로 합친다. 칸이 겹쳐 같은 장소가 여러 번 와도 하나만 올린다.
  const visiblePlaces = useMemo(() => {
    if (category === null || !bounds) return [];
    const byId = new Map<string, NearbyPlace>();
    for (const place of places) if (isInBounds(place, bounds)) byId.set(place.providerPlaceId, place);
    return [...byId.values()];
  }, [category, bounds, places]);
  return { places: visiblePlaces, isError: combined.isError && !combined.isFetching };
};
