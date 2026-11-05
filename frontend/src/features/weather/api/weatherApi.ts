import { apiRequest } from '@/features/auth/api/apiClient';
import type { MapCoordinate } from '@/features/map/lib/mapLocation';
import { readArray, readBoolean, readRecord, readString } from '@/shared/api/responseParsers';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import type { WeatherForecastResponse, WeatherHour, WeatherNotificationSettingsResponse } from '../model/weather';

const SETTINGS_PATH = '/api/members/me/notification-settings';

const readNullableNumber = (record: Record<string, unknown>, key: string): number | null => {
  const value = record[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} 숫자 응답이 올바르지 않습니다.`);
  return value;
};

const readNullableText = (record: Record<string, unknown>, key: string): string | null =>
  record[key] === null || record[key] === undefined ? null : readString(record, key);

const parseHour = (value: unknown): WeatherHour => {
  const record = readRecord(value);
  return {
    forecastAt: readString(record, 'forecastAt'),
    publishedAt: readNullableText(record, 'publishedAt'),
    tmp: readNullableNumber(record, 'tmp'),
    sky: readNullableNumber(record, 'sky'),
    pty: readNullableNumber(record, 'pty'),
    pop: readNullableNumber(record, 'pop'),
    pcp: readNullableNumber(record, 'pcp'),
    sno: readNullableNumber(record, 'sno'),
    reh: readNullableNumber(record, 'reh'),
    wsd: readNullableNumber(record, 'wsd'),
  };
};

export const parseWeatherForecast = (value: unknown): WeatherForecastResponse => {
  const record = readRecord(value);
  return {
    gridX: readNullableNumber(record, 'gridX') ?? 0,
    gridY: readNullableNumber(record, 'gridY') ?? 0,
    date: readString(record, 'date'),
    timeZone: 'Asia/Seoul',
    hourly: readArray(record, 'hourly').map(parseHour),
    tmn: readNullableNumber(record, 'tmn'),
    tmx: readNullableNumber(record, 'tmx'),
    tmnPublishedAt: readNullableText(record, 'tmnPublishedAt'),
    tmxPublishedAt: readNullableText(record, 'tmxPublishedAt'),
  };
};

const parseSettings = (value: unknown): WeatherNotificationSettingsResponse => ({
  enabled: readBoolean(readRecord(value), 'enabled'),
});

/** 위경도의 기상청 격자에서 오늘(한국 시간) 00–23시 예보를 조회한다. */
export const fetchWeatherForecast = (config: PublicConfig, coordinate: MapCoordinate, signal?: AbortSignal) =>
  apiRequest({
    config,
    path: `/api/weather/forecasts?latitude=${coordinate.latitude}&longitude=${coordinate.longitude}`,
    signal,
    parseData: parseWeatherForecast,
  });

export const fetchWeatherNotificationSettings = (
  config: PublicConfig,
  signal?: AbortSignal,
  expectedMemberId?: number,
) => apiRequest({ config, path: SETTINGS_PATH, signal, expectedMemberId, parseData: parseSettings });

export const updateWeatherNotificationSettings = (config: PublicConfig, enabled: boolean, expectedMemberId?: number) =>
  apiRequest({
    config,
    path: SETTINGS_PATH,
    method: 'PUT',
    body: { enabled },
    expectedMemberId,
    parseData: parseSettings,
  });

/** 알림을 보낼 위치를 저장한다. 서버는 정확한 위경도 대신 격자만 저장하고, 이 위치로 알림을 보낸다. */
export const syncWeatherLocation = (config: PublicConfig, coordinate: MapCoordinate, expectedMemberId?: number) =>
  apiRequest({
    config,
    path: '/api/members/me/weather-location',
    method: 'PUT',
    body: coordinate,
    expectedMemberId,
    parseData: (value) => ({ available: readBoolean(readRecord(value), 'available') }),
  });

const DEVICE_PATH = '/api/members/me/notification-devices/current';

export const registerWeatherDevice = (
  config: PublicConfig,
  expectedMemberId: number,
  body: { installationId: string; installationSecret: string; token: string },
) =>
  apiRequest({
    config,
    path: DEVICE_PATH,
    method: 'PUT',
    expectedMemberId,
    body,
    // 등록 응답에서 토큰을 읽거나 Query 캐시에 보관하지 않는다.
    parseData: (value) => ({ installationId: readString(readRecord(value), 'installationId') }),
  });

/** 등록된 내 기기로 고정 문구 테스트 알림을 바로 보낸다. 운영 서버에는 이 API가 없다. */
export const submitWeatherTestPush = (config: PublicConfig, expectedMemberId: number) =>
  apiRequest({
    config,
    path: '/api/members/me/weather-notifications/test',
    method: 'POST',
    expectedMemberId,
    parseData: (value: unknown) =>
      typeof value === 'object' && value !== null && (value as { sent?: unknown }).sent === true,
  });

export const revokeWeatherDevice = (config: PublicConfig, expectedMemberId: number) =>
  apiRequest({ config, path: DEVICE_PATH, method: 'DELETE', expectedMemberId, parseData: () => undefined });
