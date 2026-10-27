import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '@/features/auth/api/apiClient';
import { readArray, readInteger, readNullableString, readRecord, readString } from '@/shared/api/responseParsers';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import type { GoodPriceResult, GoodPriceStore } from '../model/GoodPriceStore';
import { fetchGoodPriceServerData } from './goodPriceServerApi';

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
  return {
    center: { latitude: coordinate(center, 'latitude'), longitude: coordinate(center, 'longitude') },
    radius,
    count: readInteger(result, 'count'),
    dataAsOf: readNullableString(result, 'dataAsOf'),
    stores: readArray(result, 'stores').map(parseStore),
  };
};

export const fetchGoodPriceStores = async (
  config: PublicConfig,
  center: GoodPriceResult['center'],
  radius: GoodPriceResult['radius'],
  signal?: AbortSignal,
) => {
  const parameters = new URLSearchParams({
    latitude: String(center.latitude),
    longitude: String(center.longitude),
    radius: String(radius),
  });
  if (config.goodPriceApiBaseUrl !== undefined) {
    return parseGoodPriceResult(await fetchGoodPriceServerData(config.goodPriceApiBaseUrl, parameters, signal));
  }
  return apiRequest({
    config,
    path: `/api/maps/good-price-stores?latitude=${center.latitude}&longitude=${center.longitude}&radius=${radius}`,
    signal,
    parseData: parseGoodPriceResult,
  });
};

export const useGoodPriceStores = (center: GoodPriceResult['center'] | null, radius: GoodPriceResult['radius']) => {
  const config = usePublicConfig();
  return useQuery({
    queryKey: [
      'good-price-stores',
      config.goodPriceApiBaseUrl ?? config.apiBaseUrl,
      center?.latitude,
      center?.longitude,
      radius,
    ],
    enabled: center !== null,
    queryFn: ({ signal }) => {
      if (center === null) throw new Error('동네를 먼저 선택해 주세요.');
      return fetchGoodPriceStores(config, center, radius, signal);
    },
    staleTime: 60_000,
  });
};
