import { apiBlobRequest, ApiError, apiRequest } from '@/features/auth/api/apiClient';
import { readInteger, readRecord, readString } from '@/shared/api/responseParsers';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import {
  dismissExampleProperty,
  exampleDetail,
  exampleOverview,
  getExampleProperty,
  isExampleProperty,
  updateExampleCheck,
  updateExampleProperty,
  withExampleProperty,
} from '../model/exampleProperty';
import type {
  CreatedProperty,
  PropertyBasicInfo,
  PropertyChecklistDetail,
  PropertyChecklistItemStatus,
  PropertyChecklistOverview,
  PropertyCommuteTimes,
  PropertyDetail,
  PropertyMemoDocument,
  PropertyPage,
} from '../model/Property';
import type {
  PropertyInputDto,
  SavePropertyMemoDocumentRequestDto,
  UpdatePropertyRequestDto,
} from './dtos/PropertyDto';
import {
  parseCreatedProperty,
  parseNoContent,
  parsePropertyBasicInfo,
  parsePropertyChecklistDetail,
  parsePropertyChecklistOverview,
  parsePropertyCommuteTimes,
  parsePropertyDetail,
  parsePropertyMemoDocument,
  parsePropertyPage,
} from './propertyParsers';

export type PropertySearch = {
  query: string;
  page: number;
  size?: number;
};

export const fetchProperties = (
  config: PublicConfig,
  { query }: PropertySearch,
  signal?: AbortSignal,
): Promise<PropertyPage> => {
  const trimmedQuery = query.trim();
  return apiRequest({ config, path: '/api/properties', signal, parseData: parsePropertyPage }).then((result) => {
    const page = withExampleProperty(config, result);
    if (trimmedQuery.length === 0) return page;
    const content = page.content.filter((property) => property.name.includes(trimmedQuery));
    return {
      ...page,
      content,
      size: Math.max(1, content.length),
      totalElements: content.length,
      totalPages: content.length === 0 ? 0 : 1,
    };
  });
};

/** 내 매물마다 목적지까지 대중교통 통근 시간. 서버가 최대 60분·환승 2회로 고정해 계산한다. */
export const fetchPropertyCommuteTimes = (
  config: PublicConfig,
  destination: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<PropertyCommuteTimes> =>
  apiRequest({
    config,
    path: `/api/properties/commute-times?${new URLSearchParams({
      latitude: String(destination.latitude),
      longitude: String(destination.longitude),
    })}`,
    signal,
    parseData: parsePropertyCommuteTimes,
  });

export const fetchPropertyCsv = (config: PublicConfig, signal?: AbortSignal): Promise<Blob> =>
  apiBlobRequest({ config, path: '/api/properties/export.csv', acceptedContentTypes: ['text/csv'], signal });

export const fetchPropertyComparisonPdf = (
  config: PublicConfig,
  propertyIds: number[],
  signal?: AbortSignal,
): Promise<Blob> =>
  propertyIds.some(isExampleProperty)
    ? Promise.reject(new ApiError({ kind: 'server', status: 400, code: 'INVALID_REQUEST' }))
    : apiBlobRequest({
        config,
        path: '/api/properties/export.pdf',
        method: 'POST',
        body: { propertyIds },
        acceptedContentTypes: ['application/pdf'],
        signal,
      });

export const recordPropertyComparisonView = (config: PublicConfig): Promise<undefined> =>
  apiRequest({
    config,
    path: '/api/properties/comparison-views',
    method: 'POST',
    parseData: parseNoContent,
  });

export const createProperty = (config: PublicConfig, request: PropertyInputDto): Promise<CreatedProperty> =>
  apiRequest({
    config,
    path: '/api/properties',
    method: 'POST',
    body: request,
    parseData: parseCreatedProperty,
  }).then((created) => {
    dismissExampleProperty(config);
    return created;
  });

export const fetchPropertyDetail = (
  config: PublicConfig,
  propertyId: number,
  signal?: AbortSignal,
): Promise<PropertyDetail> =>
  isExampleProperty(propertyId)
    ? Promise.resolve().then(() => exampleDetail(config))
    : apiRequest({ config, path: `/api/properties/${propertyId}`, signal, parseData: parsePropertyDetail });

export const updateProperty = (
  config: PublicConfig,
  propertyId: number,
  request: UpdatePropertyRequestDto,
): Promise<PropertyBasicInfo> =>
  isExampleProperty(propertyId)
    ? Promise.resolve().then(() => updateExampleProperty(config, request))
    : apiRequest({
        config,
        path: `/api/properties/${propertyId}`,
        method: 'PUT',
        body: request,
        parseData: parsePropertyBasicInfo,
      });

export const fetchPropertyMemo = (
  config: PublicConfig,
  propertyId: number,
  signal?: AbortSignal,
): Promise<PropertyMemoDocument> =>
  isExampleProperty(propertyId)
    ? Promise.resolve().then(() => ({ propertyId, freeMemo: getExampleProperty(config).memo }))
    : apiRequest({
        config,
        path: `/api/properties/${propertyId}/memo`,
        signal,
        parseData: parsePropertyMemoDocument,
      });

export const savePropertyMemoDocument = (
  config: PublicConfig,
  propertyId: number,
  request: SavePropertyMemoDocumentRequestDto,
): Promise<PropertyMemoDocument> =>
  isExampleProperty(propertyId)
    ? Promise.resolve().then(() => ({ propertyId, freeMemo: (getExampleProperty(config).memo = request.freeMemo) }))
    : apiRequest({
        config,
        path: `/api/properties/${propertyId}/memo`,
        method: 'PUT',
        body: request,
        parseData: parsePropertyMemoDocument,
      });

export const fetchPropertyChecklistOverview = (
  config: PublicConfig,
  propertyId: number,
  signal?: AbortSignal,
): Promise<PropertyChecklistOverview> =>
  isExampleProperty(propertyId)
    ? Promise.resolve().then(() => exampleOverview(config))
    : apiRequest({
        config,
        path: `/api/properties/${propertyId}/checklists`,
        signal,
        parseData: parsePropertyChecklistOverview,
      });

export const fetchPropertyChecklistDetail = (
  config: PublicConfig,
  propertyId: number,
  propertyChecklistId: number,
  signal?: AbortSignal,
): Promise<PropertyChecklistDetail> =>
  isExampleProperty(propertyId)
    ? Promise.resolve().then(() => structuredClone(getExampleProperty(config).checklist))
    : apiRequest({
        config,
        path: `/api/properties/${propertyId}/checklists/${propertyChecklistId}`,
        signal,
        parseData: (value) => {
          const result = parsePropertyChecklistDetail(value);
          if (result.propertyId !== propertyId || result.propertyChecklistId !== propertyChecklistId) {
            throw new Error('매물 체크리스트 응답이 요청과 다릅니다.');
          }
          return result;
        },
      });

export const updatePropertyChecklistItemStatus = (
  config: PublicConfig,
  propertyId: number,
  propertyChecklistId: number,
  itemId: number,
  status: PropertyChecklistItemStatus,
): Promise<{ itemId: number; status: PropertyChecklistItemStatus }> =>
  isExampleProperty(propertyId)
    ? Promise.resolve().then(() => ({ itemId, status: updateExampleCheck(config, itemId, { status }).status }))
    : apiRequest({
        config,
        path: `/api/properties/${propertyId}/checklists/${propertyChecklistId}/items/${itemId}/status`,
        method: 'PATCH',
        body: { status },
        parseData: (value) => {
          const record = readRecord(value);
          const item = readRecord(record.item);
          const resultStatus = readString(item, 'status');
          if (resultStatus !== 'UNCONFIRMED' && resultStatus !== 'GOOD' && resultStatus !== 'CAUTION') {
            throw new Error('체크리스트 항목 상태 응답이 올바르지 않습니다.');
          }
          return { itemId: readInteger(item, 'id', 1), status: resultStatus };
        },
      });

export const updatePropertyChecklistItemMemo = (
  config: PublicConfig,
  propertyId: number,
  propertyChecklistId: number,
  itemId: number,
  memo: string,
): Promise<{ itemId: number; memo: string }> =>
  isExampleProperty(propertyId)
    ? Promise.resolve().then(() => ({ itemId, memo: updateExampleCheck(config, itemId, { memo }).memo }))
    : apiRequest({
        config,
        path: `/api/properties/${propertyId}/checklists/${propertyChecklistId}/items/${itemId}/memo`,
        method: 'PATCH',
        body: { memo },
        parseData: (value) => {
          const record = readRecord(value);
          const item = readRecord(record.item);
          return {
            itemId: readInteger(item, 'id', 1),
            memo: readString(item, 'memo', { allowEmpty: true, maximumCodePoints: 500 }),
          };
        },
      });

export const removeProperty = (config: PublicConfig, propertyId: number): Promise<undefined> =>
  isExampleProperty(propertyId)
    ? Promise.resolve().then(() => {
        dismissExampleProperty(config);
        return undefined;
      })
    : apiRequest({
        config,
        path: `/api/properties/${propertyId}`,
        method: 'DELETE',
        parseData: parseNoContent,
      });
