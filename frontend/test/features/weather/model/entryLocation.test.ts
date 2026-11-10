import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readLastWeatherCoordinate, writeLastWeatherCoordinate } from '@/features/weather/lib/lastWeatherCoordinate';
import { writeWeatherLocationEnabled } from '@/features/weather/lib/weatherLocationPreference';
import { requestEntryLocation } from '@/features/weather/model/entryLocation';

import { installNativePush } from '../../../helpers/nativePush';

const SEOUL = { latitude: 37.5665, longitude: 126.978 };
const originalGeolocation = navigator.geolocation;
const originalPermissions = navigator.permissions;
let requests = 0;

const setPermission = (state: PermissionState) =>
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: () => Promise.resolve({ state }) },
  });

/** 들어올 때의 위치 받기를 실행하고 끝날 때까지 기다린다. */
const enter = () => requestEntryLocation();

beforeEach(() => {
  localStorage.clear();
  requests = 0;
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (onSuccess: PositionCallback) => {
        requests += 1;
        onSuccess({ coords: { ...SEOUL, accuracy: 10 } } as GeolocationPosition);
      },
    },
  });
});

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
  delete window.ReactNativeWebView;
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: originalGeolocation });
  Object.defineProperty(navigator, 'permissions', { configurable: true, value: originalPermissions });
});

describe('진입할 때 현재 위치 받기', () => {
  it('처음 들어오면 한 번 위치를 묻고, 다음 진입에는 다시 묻지 않는다', async () => {
    setPermission('prompt');
    await enter();
    await waitFor(() => expect(readLastWeatherCoordinate()).toEqual(SEOUL));
    expect(requests).toBe(1);

    await enter();
    expect(requests).toBe(1);
  });

  it('권한을 이미 허용했으면 들어올 때마다 조용히 받는다', async () => {
    setPermission('granted');
    await enter();
    await enter();
    expect(requests).toBe(2);
  });

  it('권한을 거부했으면 묻지 않는다', async () => {
    setPermission('denied');
    await enter();
    expect(requests).toBe(0);
  });

  it('마이에서 위치를 끄면 받지 않는다', async () => {
    setPermission('granted');
    writeWeatherLocationEnabled(false);
    await enter();
    expect(requests).toBe(0);
  });

  it('앱에서 전에 받은 위치가 있으면 권한 API가 prompt여도 받는다', async () => {
    installNativePush();
    setPermission('prompt');
    localStorage.setItem('jachwi-location-asked', 'true');
    writeLastWeatherCoordinate(SEOUL);
    await enter();
    expect(requests).toBe(1);
  });
});
