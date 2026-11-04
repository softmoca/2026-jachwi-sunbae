import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { queryClient as defaultQueryClient } from '@/shared/api/queryClient';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import type { PropertyPage } from '../model/Property';
import { fetchProperties } from './propertyApi';
import { propertyQueryKeys } from './propertyQueryKeys';

/**
 * 분석 이벤트에 싣는 지금 회원의 매물 수. 목록 캐시가 있으면 그 값을 쓰고, 없으면 목록을 한 번 받아 센다.
 * 받지 못하면 `undefined`다. 모르는 값을 0으로 추정하지 않는다.
 */
export const readPropertyCount = async (
  config: PublicConfig,
  client: QueryClient = defaultQueryClient,
): Promise<number | undefined> => {
  const cached = client.getQueryData<InfiniteData<PropertyPage>>(propertyQueryKeys.list(''))?.pages[0]?.totalElements;
  if (cached !== undefined) return cached;
  try {
    return (await fetchProperties(config, { query: '', page: 0, size: 20 })).totalElements;
  } catch {
    return undefined;
  }
};
