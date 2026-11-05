import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiRequest } from '@/features/auth/api/apiClient';
import { readArray, readInteger, readNullableString, readRecord, readString } from '@/shared/api/responseParsers';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import type { GoodPriceResult, GoodPriceStore } from '../model/GoodPriceStore';

const coordinate = (record: Record<string, unknown>, key: string): number => {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('업소 좌표가 올바르지 않습니다.');
  return value;
};

const parseStore = (value: unknown): GoodPriceStore => {
  const store = readRecord(value);
  return {
    id: readInteger(store, 'id'),
    name: readString(store, 'name'),
    businessType: readString(store, 'businessType'),
    phone: readNullableString(store, 'phone'),
    address: readString(store, 'address'),
    latitude: coordinate(store, 'latitude'),
    longitude: coordinate(store, 'longitude'),
    distanceMeters: readInteger(store, 'distanceMeters'),
    menus: readArray(store, 'menus').map((value) => {
      const menu = readRecord(value);
      return { name: readString(menu, 'name'), price: readNullableString(menu, 'price') };
    }),
  };
};

export const parseGoodPriceResult = (value: unknown): GoodPriceResult => {
  const result = readRecord(value);
  const center = readRecord(result.center);
  const radius = readInteger(result, 'radius');
  if (radius !== 500 && radius !== 1000 && radius !== 2000) throw new Error('조회 반경이 올바르지 않습니다.');
  const stores = readArray(result, 'stores').map(parseStore);
  const count = readInteger(result, 'count');
  if (count !== stores.length) throw new Error('업소 개수가 응답과 일치하지 않습니다.');
  return {
    center: { latitude: coordinate(center, 'latitude'), longitude: coordinate(center, 'longitude') },
    radius,
    count,
    dataAsOf: readNullableString(result, 'dataAsOf'),
    stores,
  };
};

export const fetchGoodPriceStores = (
  config: PublicConfig,
  center: GoodPriceResult['center'],
  radius: GoodPriceResult['radius'],
  signal?: AbortSignal,
) =>
  apiRequest({
    config,
    path: `/api/maps/good-price-stores?latitude=${center.latitude}&longitude=${center.longitude}&radius=${radius}`,
    signal,
    parseData: parseGoodPriceResult,
  });

export const useGoodPriceStores = (
  center: GoodPriceResult['center'] | null,
  radius: GoodPriceResult['radius'],
  isActive = true,
) => {
  const config = usePublicConfig();
  return useQuery({
    queryKey: ['good-price-stores', config.apiBaseUrl, center?.latitude, center?.longitude, radius],
    enabled: isActive && center !== null,
    queryFn: ({ signal }) => {
      if (center === null) throw new Error('동네를 먼저 선택해 주세요.');
      return fetchGoodPriceStores(config, center, radius, signal);
    },
    staleTime: 60_000,
    // 기준 위치를 옮겨 다시 찾는 동안 지도 마커와 목록을 비우지 않고 이전 결과를 둔다.
    placeholderData: keepPreviousData,
  });
};
