import { useEffect } from 'react';

import { readGeolocationPermission } from '@/features/map/lib/mapLocation';
import { isRunningInNativeApp } from '@/shared/lib/native-app/nativeApp';

import { readLastWeatherCoordinate, writeLastWeatherCoordinate } from '../lib/lastWeatherCoordinate';
import { requestWeatherLocation } from '../lib/weatherLocation';
import { readWeatherLocationChoice, writeWeatherLocationEnabled } from '../lib/weatherLocationPreference';

const ASKED_KEY = 'jachwi-location-asked';

const hasAsked = (): boolean => {
  try {
    return window.localStorage.getItem(ASKED_KEY) === 'true';
  } catch {
    return true;
  }
};

const markAsked = () => {
  try {
    window.localStorage.setItem(ASKED_KEY, 'true');
  } catch {
    // 저장소를 못 쓰면 다음 진입에 한 번 더 묻는다.
  }
};

/**
 * 앱(웹)에 들어올 때 현재 위치를 받는다. 받은 위치는 지도 파란 점과 헤더 날씨가 함께 쓴다.
 * - 권한을 이미 허용했으면 창 없이 조용히 받는다.
 * - 처음 들어왔으면(권한을 물은 적이 없으면) 이때 한 번만 묻는다. 거절하면 다시 묻지 않는다.
 * - 앱 WebView는 기기에서 허용해도 권한 API가 `prompt`로 답하곤 해서, 전에 받은 위치가 있으면 허용된 것으로 보고 받는다.
 * - 마이에서 위치를 끈 사람은 받지 않는다.
 */
export const useEntryLocation = () => {
  useEffect(() => {
    if (readWeatherLocationChoice() === 'off') return;
    void readGeolocationPermission().then((permission) => {
      if (permission === 'denied') return;
      const isQuiet = permission === 'granted' || (isRunningInNativeApp() && readLastWeatherCoordinate() !== null);
      if (!isQuiet && hasAsked()) return;
      markAsked();
      requestWeatherLocation()
        .then((coordinate) => {
          writeWeatherLocationEnabled(true);
          writeLastWeatherCoordinate(coordinate);
        })
        .catch(() => undefined);
    });
  }, []);
};
