import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { reverseGeocode } from '@/features/map/api/mapApi';
import type { MapCoordinate } from '@/features/map/lib/mapLocation';
import { MapLocationError, requestCurrentMapLocation } from '@/features/map/lib/mapLocation';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import { isRunningInNativeApp } from '@/shared/lib/native-app/nativeApp';
import { NativePushError, openNativeSettings, supportsNativePush } from '@/shared/lib/native-app/nativePush';

import { fetchWeatherForecast, syncWeatherLocation } from '../api/weatherApi';
import { readLastWeatherCoordinate, writeLastWeatherCoordinate } from '../lib/lastWeatherCoordinate';
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

/** 지번 주소에서 시·도를 뺀 구·동 정도만 남긴다. 예: "서울 중구 태평로1가 31" → "중구 태평로1가" */
const toPlaceName = (address: string | null): string | null => {
  const words = (address ?? '').split(' ').filter((word) => word.length > 0 && !/^\d/.test(word));
  return words.length > 1 ? words.slice(1, 3).join(' ') : null;
};

/**
 * 마이의 생활 날씨 카드 상태. 수신 동의는 서버에, 알림 위치는 기기 GPS로 구해 서버에 저장한다.
 * 알림을 켜 둔 채 화면을 열 때마다 위치를 다시 저장한다. 서버는 마지막으로 저장한 위치로 알림을 보내기 때문이다.
 */
export const useWeatherSubscription = () => {
  const config = usePublicConfig();
  const queryClient = useQueryClient();
  const platform = isRunningInNativeApp() ? 'app' : 'web';
  const hasSyncedRef = useRef(false);
  const [location, setLocation] = useState<WeatherLocationState>(() => ({
    status: 'idle',
    coordinate: readLastWeatherCoordinate(),
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
      return requestCurrentMapLocation().then(
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
    if (isEnabled && !hasSyncedRef.current) void locate().catch(() => setHasLocationFailed(true));
  }, [isEnabled, locate]);

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
      // 알림은 저장된 위치가 있어야 발송되므로, 위치를 하나도 모르면 켜지 않는다.
      const coordinate = locating === null ? null : await locating;
      return changeWeatherPush(config, memberId, enabled, coordinate);
    },
    onSuccess: (data, variables) => queryClient.setQueryData(weatherQueryKeys.settings(variables.memberId), data),
  });

  const pushMessage = !supportsNativePush()
    ? platform === 'web'
      ? '알림은 앱에서 받을 수 있어요.'
      : '알림을 받으려면 앱을 최신 버전으로 업데이트해 주세요.'
    : settings.data?.problem === 'location'
      ? location.status === 'denied'
        ? '위치 권한이 꺼져 있어 날씨 알림을 켤 수 없어요. 설정에서 위치 권한을 허용해 주세요.'
        : '지금 위치를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
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
    hasUpdateFailed: toggle.isError || hasLocationFailed,
    pushMessage,
    canRetry: settings.isError || settings.data?.problem === 'cleanup',
    // 앱 안에서 위치 권한을 거부했을 때만 시스템 설정으로 바로 보낸다. 브라우저는 문구로만 안내한다.
    canOpenSettings: supportsNativePush() && settings.data?.problem === 'location' && location.status === 'denied',
    openSettings: () => {
      void openNativeSettings().catch(() => undefined);
    },
    retry: () => {
      void settings.refetch();
    },
    location,
    placeName: place.data ?? null,
    forecast,
    toggle: () => {
      if (memberId === null || toggle.isPending) return;
      setHasLocationFailed(false);
      toggle.mutate({
        enabled: !isEnabled,
        locating: isEnabled || !supportsNativePush() ? null : locate(false),
        memberId,
      });
    },
  };
};
