import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createMockWeatherForecast } from '@/app/mocks/handlers/weatherHandlers';
import { publishCurrentLocation } from '@/features/map/lib/currentLocationStore';
import { writeLastWeatherCoordinate } from '@/features/weather/lib/lastWeatherCoordinate';
import { writeWeatherLocationEnabled } from '@/features/weather/lib/weatherLocationPreference';
import { useHeaderWeather } from '@/features/weather/model/useHeaderWeather';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

import { installNativePush } from '../../../helpers/nativePush';
import { server } from '../../../server';

const config = { apiBaseUrl: 'http://localhost:8080', mapProviderMode: 'demo' } as const;
const success = (data: unknown) => HttpResponse.json({ code: 'SUCCESS', message: '성공', data });
const SEOUL = { latitude: 37.5665, longitude: 126.978 };
const originalGeolocation = navigator.geolocation;
const originalPermissions = navigator.permissions;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
    <PublicConfigProvider config={config}>{children}</PublicConfigProvider>
  </QueryClientProvider>
);

beforeEach(() => {
  localStorage.clear();
  server.use(
    http.get('*/api/weather/forecasts', () => success(createMockWeatherForecast('2026-10-26'))),
    http.get('*/api/maps/reverse-geocode', () =>
      success({ roadAddress: '서울 중구 세종대로 110', jibunAddress: '서울 중구 태평로1가 31', ...SEOUL }),
    ),
  );
  // 앱 WebView처럼 위치를 내주면서도 권한 API는 `prompt`로 답한다.
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: {
      query: () => Promise.resolve({ state: 'prompt', addEventListener: () => {}, removeEventListener: () => {} }),
    },
  });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (onSuccess: PositionCallback) =>
        onSuccess({ coords: { ...SEOUL, accuracy: 10 } } as GeolocationPosition),
    },
  });
});

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
  delete window.ReactNativeWebView;
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: originalGeolocation });
  Object.defineProperty(navigator, 'permissions', { configurable: true, value: originalPermissions });
});

describe('헤더 날씨의 위치', () => {
  it('헤더에서는 위치를 묻지 않는다', async () => {
    let requests = 0;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: () => (requests += 1) },
    });
    const { result } = renderHook(() => useHeaderWeather(), { wrapper });
    await waitFor(() => expect(result.current.isAllowed).toBe(false));
    expect(result.current.hour).toBeNull();
    expect(requests).toBe(0);
  });

  it('웹 브라우저에서 권한이 prompt면 전에 받은 위치가 있어도 날씨를 보이지 않는다', async () => {
    writeLastWeatherCoordinate(SEOUL);
    const { result } = renderHook(() => useHeaderWeather(), { wrapper });
    await act(() => Promise.resolve());
    expect(result.current.isAllowed).toBe(false);
  });

  it('앱에서 전에 받은 위치가 있으면 권한 API가 prompt여도 날씨를 보인다', async () => {
    installNativePush();
    writeLastWeatherCoordinate(SEOUL);
    const { result } = renderHook(() => useHeaderWeather(), { wrapper });
    await waitFor(() => expect(result.current.isAllowed).toBe(true));
    await waitFor(() => expect(result.current.hour).not.toBeNull());
  });

  it('마이에서 위치를 끄면 날씨를 보이지 않는다', async () => {
    installNativePush();
    writeLastWeatherCoordinate(SEOUL);
    writeWeatherLocationEnabled(false);
    const { result } = renderHook(() => useHeaderWeather(), { wrapper });
    await act(() => Promise.resolve());
    expect(result.current.isAllowed).toBe(false);
  });

  // 현재 위치는 모듈에 남으므로 마지막에 둔다.
  it('진입할 때 받은 현재 위치가 있으면 권한 API가 prompt여도 날씨를 보인다', async () => {
    const { result } = renderHook(() => useHeaderWeather(), { wrapper });
    expect(result.current.isAllowed).toBe(false);

    act(() => publishCurrentLocation(SEOUL));

    expect(result.current.isAllowed).toBe(true);
    await waitFor(() => expect(result.current.hour).not.toBeNull());
  });
});
