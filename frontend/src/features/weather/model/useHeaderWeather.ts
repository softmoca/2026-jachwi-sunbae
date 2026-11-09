import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { reverseGeocode } from '@/features/map/api/mapApi';
import type { MapCoordinate } from '@/features/map/lib/mapLocation';
import { MapLocationError } from '@/features/map/lib/mapLocation';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import { openNativeSettings, supportsNativePush } from '@/shared/lib/native-app/nativePush';

import { fetchWeatherForecast } from '../api/weatherApi';
import { readLastWeatherCoordinate, writeLastWeatherCoordinate } from '../lib/lastWeatherCoordinate';
import { requestWeatherLocation } from '../lib/weatherLocation';
import { readWeatherLocationChoice, writeWeatherLocationEnabled } from '../lib/weatherLocationPreference';
import { toPlaceName } from '../lib/weatherPlaceName';
import { forecastHour, todayPrecipitation } from '../lib/weatherPresentation';
import { weatherQueryKeys } from './weatherQueryKeys';

type PermissionState = 'granted' | 'other' | 'unknown';

/** 위치 권한을 읽고 바뀔 때마다 알린다. 권한 API가 없는 브라우저는 알 수 없음(`unknown`)이다. */
const useLocationPermission = (): PermissionState => {
  const [state, setState] = useState<PermissionState>('unknown');
  useEffect(() => {
    let status: PermissionStatus | null = null;
    let isActive = true;
    const update = () => {
      if (isActive && status !== null) setState(status.state === 'granted' ? 'granted' : 'other');
    };
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((result) => {
        status = result;
        update();
        result.addEventListener('change', update);
      })
      .catch(() => undefined);
    return () => {
      isActive = false;
      status?.removeEventListener('change', update);
    };
  }, []);
  return state;
};

/**
 * 헤더에 띄우는 현재 위치와 날씨. 알림 설정과 상관없이 읽기만 한다.
 * 위치 권한을 허용했고 마이에서 위치를 끄지 않았을 때만 날씨를 읽는다. 아니면 `isAllowed`가 거짓이고, 눌러서 권한을 받는 `requestPermission`을 준다.
 */
export const useHeaderWeather = () => {
  const config = usePublicConfig();
  const permission = useLocationPermission();
  const [coordinate, setCoordinate] = useState<MapCoordinate | null>(() => readLastWeatherCoordinate());

  const isAllowed =
    readWeatherLocationChoice() !== 'off' &&
    (permission === 'granted' || (permission === 'unknown' && coordinate !== null));

  const locate = useCallback(
    () =>
      requestWeatherLocation()
        .then((next) => {
          writeWeatherLocationEnabled(true);
          writeLastWeatherCoordinate(next);
          setCoordinate(next);
        })
        .catch(() => undefined),
    [],
  );

  // 권한을 이미 허용했으면 묻는 창 없이 현재 위치를 새로 받는다.
  useEffect(() => {
    if (permission === 'granted' && readWeatherLocationChoice() !== 'off') void locate();
  }, [permission, locate]);

  const forecast = useQuery({
    queryKey: coordinate === null ? ['weather', 'forecast'] : weatherQueryKeys.forecast(coordinate),
    queryFn: ({ signal }) => fetchWeatherForecast(config, coordinate as MapCoordinate, signal),
    enabled: isAllowed && coordinate !== null,
    staleTime: 10 * 60 * 1000,
  });

  const place = useQuery({
    queryKey: coordinate === null ? ['weather', 'place'] : weatherQueryKeys.place(coordinate),
    queryFn: async () => {
      const { latitude, longitude } = coordinate as MapCoordinate;
      const address = await reverseGeocode(config, latitude, longitude);
      return toPlaceName(address.jibunAddress ?? address.address);
    },
    enabled: isAllowed && coordinate !== null,
    staleTime: Infinity,
  });

  // 눌렀을 때 위치 권한을 묻는다. 이미 거부했다면 앱은 기기 설정 화면으로 보낸다(브라우저는 다시 묻지 못한다).
  const requestPermission = useCallback(async () => {
    writeWeatherLocationEnabled(true);
    try {
      const next = await requestWeatherLocation();
      writeLastWeatherCoordinate(next);
      setCoordinate(next);
    } catch (error) {
      if (error instanceof MapLocationError && error.reason === 'denied' && supportsNativePush()) {
        void openNativeSettings().catch(() => undefined);
      }
    }
  }, []);

  const hour = forecast.data?.hourly[Number(forecastHour(new Date().toISOString()))];

  return {
    isAllowed,
    requestPermission,
    placeName: place.data ?? null,
    hour: isAllowed && hour !== undefined && hour.tmp !== null ? hour : null,
    precipitation: forecast.data === undefined ? null : todayPrecipitation(forecast.data.hourly),
  };
};
