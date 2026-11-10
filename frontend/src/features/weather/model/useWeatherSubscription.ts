import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { reverseGeocode } from '@/features/map/api/mapApi';
import type { MapCoordinate } from '@/features/map/lib/mapLocation';
import { MapLocationError } from '@/features/map/lib/mapLocation';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import { isRunningInNativeApp } from '@/shared/lib/native-app/nativeApp';
import { NativePushError, openNativeSettings, supportsNativePush } from '@/shared/lib/native-app/nativePush';

import { fetchWeatherForecast, syncWeatherLocation } from '../api/weatherApi';
import { readLastWeatherCoordinate, writeLastWeatherCoordinate } from '../lib/lastWeatherCoordinate';
import { requestWeatherLocation } from '../lib/weatherLocation';
import { readWeatherLocationChoice, writeWeatherLocationEnabled } from '../lib/weatherLocationPreference';
import { toPlaceName } from '../lib/weatherPlaceName';
import { useWeatherPushSync } from './useWeatherPushSync';
import { changeWeatherPush } from './weatherPush';
import { weatherQueryKeys } from './weatherQueryKeys';

export type WeatherLocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable';

type WeatherLocationState = {
  status: WeatherLocationStatus;
  coordinate: MapCoordinate | null;
  /** 현재 위치를 못 잡아 마지막 위치를 쓰는 중인지 */
  isStale: boolean;
};

/**
 * 마이의 생활 날씨 카드 상태. 날씨·배달 할인 공통 수신 동의는 서버에, 날씨 알림 위치는 기기 GPS로 구해 서버에 저장한다.
 * 알림을 켜 둔 채 화면을 열 때마다 위치를 다시 저장한다. 서버는 마지막으로 저장한 위치로 알림을 보내기 때문이다.
 */
export const useWeatherSubscription = () => {
  const config = usePublicConfig();
  const queryClient = useQueryClient();
  const platform = isRunningInNativeApp() ? 'app' : 'web';
  const hasSyncedRef = useRef(false);
  // 카드에는 위치 토글이 없다. 직접 끈 적이 없으면 알림과 함께 현재 위치도 쓴다.
  const [isLocationOn, setIsLocationOn] = useState(() => readWeatherLocationChoice() !== 'off');
  const [location, setLocation] = useState<WeatherLocationState>(() => ({
    status: 'idle',
    coordinate: readWeatherLocationChoice() !== 'off' ? readLastWeatherCoordinate() : null,
    isStale: false,
  }));

  const settings = useWeatherPushSync();
  const memberId = settings.memberId;
  const isEnabled = settings.data?.enabled ?? false;

  // 사파리는 누른 순간에만 위치 권한 창을 띄우므로, 위치 요청은 await 없이 바로 시작한다.
  const locate = useCallback(
    (persist = true): Promise<MapCoordinate | null> => {
      hasSyncedRef.current = true;
      setLocation((current) => ({ ...current, status: 'locating' }));
      return requestWeatherLocation().then(
        async (coordinate) => {
          writeLastWeatherCoordinate(coordinate);
          setLocation({ status: 'ready', coordinate, isStale: false });
          if (persist && memberId !== null) await syncWeatherLocation(config, coordinate, memberId);
          return coordinate;
        },
        (error: unknown) => {
          const last = readLastWeatherCoordinate();
          const denied = error instanceof MapLocationError && error.reason === 'denied';
          setLocation({ status: denied ? 'denied' : 'unavailable', coordinate: last, isStale: last !== null });
          return last;
        },
      );
    },
    [config, memberId],
  );

  const [hasLocationFailed, setHasLocationFailed] = useState(false);
  useEffect(() => {
    hasSyncedRef.current = false;
  }, [memberId]);

  useEffect(() => {
    if (isEnabled && isLocationOn && !hasSyncedRef.current) void locate().catch(() => setHasLocationFailed(true));
  }, [isEnabled, isLocationOn, locate]);

  const toggle = useMutation({
    mutationFn: async ({
      enabled,
      locating,
      memberId,
    }: {
      enabled: boolean;
      locating: Promise<MapCoordinate | null> | null;
      memberId: number;
    }) => {
      // 위치를 몰라도 공통 알림은 켠다. 위치는 날씨 알림에만 쓰이고, 위치 토글이 켜져 있을 때만 함께 받는다.
      const coordinate = locating === null ? null : await locating;
      return changeWeatherPush(config, memberId, enabled, coordinate);
    },
    onSuccess: (data, variables) => queryClient.setQueryData(weatherQueryKeys.settings(variables.memberId), data),
  });

  const pushMessage = !supportsNativePush()
    ? platform === 'web'
      ? '알림은 앱에서 받을 수 있어요.'
      : '알림을 받으려면 앱을 최신 버전으로 업데이트해 주세요.'
    : settings.data?.problem === 'permission'
      ? '기기 설정에서 자취선배 알림을 허용한 뒤 다시 켜 주세요.'
      : settings.data?.problem === 'cleanup'
        ? '알림은 꺼졌지만 기기 연결 정리가 필요해요. 다시 시도해 주세요.'
        : settings.isError
          ? '기기 알림 연결을 확인하지 못했어요. 다시 시도해 주세요.'
          : toggle.error instanceof NativePushError
            ? '기기 알림 연결을 확인하지 못했어요. 다시 시도해 주세요.'
            : null;

  const forecast = useQuery({
    queryKey: location.coordinate === null ? ['weather', 'forecast'] : weatherQueryKeys.forecast(location.coordinate),
    queryFn: ({ signal }) => fetchWeatherForecast(config, location.coordinate as MapCoordinate, signal),
    enabled: isEnabled && location.coordinate !== null,
  });

  const place = useQuery({
    queryKey: location.coordinate === null ? ['weather', 'place'] : weatherQueryKeys.place(location.coordinate),
    queryFn: async () => {
      const coordinate = location.coordinate as MapCoordinate;
      const address = await reverseGeocode(config, coordinate.latitude, coordinate.longitude);
      return toPlaceName(address.jibunAddress ?? address.address);
    },
    enabled: isEnabled && location.coordinate !== null,
    staleTime: Infinity,
  });

  return {
    platform,
    isEnabled,
    isLoading: settings.isPending,
    isUpdating: toggle.isPending || settings.isFetching || location.status === 'locating',
    // 토글을 누른 뒤 위치를 기다리는 중. 토글이 잠긴 까닭을 진행 표시로 알린다.
    isLocating: toggle.isPending && location.status === 'locating',
    hasUpdateFailed: toggle.isError || hasLocationFailed,
    pushMessage,
    canRetry: settings.isError || settings.data?.problem === 'cleanup',
    // 알림은 켰지만 앱 안에서 위치 권한을 거부해 날씨를 보낼 위치가 없을 때만 시스템 설정으로 바로 보낸다.
    // 브라우저는 문구로만 안내한다.
    canOpenSettings:
      supportsNativePush() && isLocationOn && location.status === 'denied' && location.coordinate === null,
    openSettings: () => {
      void openNativeSettings().catch(() => undefined);
    },
    retry: () => {
      void settings.refetch();
    },
    location,
    // 위치 토글. 권한을 거부한 상태에서는 켜진 것으로 보이지 않는다.
    isLocationOn: isLocationOn && location.status !== 'denied',
    isLocationBusy: location.status === 'locating',
    isLocationDenied: location.status === 'denied',
    toggleLocation: () => {
      if (location.status === 'locating') return;
      const next = !(isLocationOn && location.status !== 'denied');
      writeWeatherLocationEnabled(next);
      setIsLocationOn(next);
      if (next) {
        hasSyncedRef.current = false;
        void locate(isEnabled).catch(() => setHasLocationFailed(true));
      } else {
        // 끄면 이 기기에서는 현재 위치를 날씨에 쓰지 않는다. 서버에 저장된 마지막 위치는 알림이 계속 쓴다.
        setLocation({ status: 'idle', coordinate: null, isStale: false });
      }
    },
    placeName: place.data ?? null,
    forecast,
    toggle: () => {
      if (memberId === null || toggle.isPending) return;
      setHasLocationFailed(false);
      toggle.mutate({
        enabled: !isEnabled,
        locating: isEnabled || !supportsNativePush() || !isLocationOn ? null : locate(false),
        memberId,
      });
    },
  };
};
