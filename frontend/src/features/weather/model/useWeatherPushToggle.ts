import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';

import type { MapCoordinate } from '@/features/map/lib/mapLocation';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';

import type { WeatherPushEntrypoint } from '../lib/weatherAnalytics';
import { trackWeatherPushToggled, trackWeatherPushToggleFailed } from '../lib/weatherAnalytics';
import { weatherQueryKeys } from './weatherQueryKeys';

/** 마이 토글과 헤더 안내가 같은 키를 써서, 한쪽에서 바꾸는 동안 다른 쪽도 잠근다. */
const WEATHER_PUSH_TOGGLE_KEY = ['weather', 'push-toggle'] as const;

type ToggleVariables = {
  enabled: boolean;
  /** 날씨 알림에 쓸 위치. 모르면 null로 두고 공통 알림만 켠다. */
  locating: Promise<MapCoordinate | null> | null;
  memberId: number;
};

/**
 * 공통 알림 수신 동의를 켜고 끈다. 마이의 토글과 헤더의 `알림 받기`가 함께 쓴다.
 * 성공하면 설정 쿼리를 바로 고쳐 두 화면이 같은 상태를 보고, 누른 곳(`entrypoint`)을 붙여 기록한다.
 */
export const useWeatherPushToggle = (entrypoint: WeatherPushEntrypoint) => {
  const config = usePublicConfig();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: WEATHER_PUSH_TOGGLE_KEY,
    mutationFn: async ({ enabled, locating, memberId }: ToggleVariables) => {
      // 위치를 몰라도 공통 알림은 켠다. 위치는 날씨 알림에만 쓰인다.
      const coordinate = locating === null ? null : await locating;
      // 헤더는 모든 화면에 있으므로 기기 연결 코드는 누를 때 받는다(useWeatherPushSync와 같은 청크).
      const { changeWeatherPush } = await import('./weatherPush');
      return changeWeatherPush(config, memberId, enabled, coordinate);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(weatherQueryKeys.settings(variables.memberId), data);
      trackWeatherPushToggled({ entrypoint, requested: variables.enabled, state: data });
    },
    onError: (_error, variables) => trackWeatherPushToggleFailed({ entrypoint, requested: variables.enabled }),
  });
  const isBusy = useIsMutating({ mutationKey: WEATHER_PUSH_TOGGLE_KEY }) > 0;
  return { ...mutation, isBusy };
};
