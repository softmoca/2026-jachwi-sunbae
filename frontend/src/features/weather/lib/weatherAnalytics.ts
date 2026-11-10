import { useEffect, useRef } from 'react';

import { trackPostHogEvent } from '@/shared/lib/analytics/posthog';

import type { WeatherPushState } from '../model/weatherPush';

/** 날씨 알림 퍼널(`push_opened` → `weather_card_viewed`)의 목표 행동. 위치나 예보 값은 싣지 않는다. */
export const WEATHER_EVENTS = {
  /** 마이의 생활 날씨 카드가 오늘 예보를 실제로 그렸을 때. 카드가 마운트될 때마다 한 번. */
  cardViewed: 'weather_card_viewed',
  /** 공통 알림 수신 동의를 켜거나 끈 결과. 마이 토글과 헤더 안내가 같은 이름을 쓰고 `entrypoint`로 나눈다. */
  pushToggled: 'notification_toggled',
  /** 수신 동의 변경 요청이 실패했을 때(네트워크, 서버, 기기 연결 오류) */
  pushToggleFailed: 'notification_toggle_failed',
} as const;

export const useWeatherCardViewed = (showsWeather: boolean): void => {
  const tracked = useRef(false);
  useEffect(() => {
    if (!showsWeather || tracked.current) return;
    tracked.current = true;
    trackPostHogEvent(WEATHER_EVENTS.cardViewed);
  }, [showsWeather]);
};

/** 알림을 켜고 끈 곳. 마이의 생활 날씨 카드 토글(`my`), 헤더 가운데 안내의 `알림 받기`(`header`). */
export type WeatherPushEntrypoint = 'my' | 'header';

type PushToggleOutcome = 'enabled' | 'disabled' | 'permission_denied' | 'cleanup_failed';

const toOutcome = ({ enabled, problem }: WeatherPushState): PushToggleOutcome =>
  enabled
    ? 'enabled'
    : problem === 'permission'
      ? 'permission_denied'
      : problem === 'cleanup'
        ? 'cleanup_failed'
        : 'disabled';

/** 서버에 수신 동의 변경을 마친 뒤 남긴다. 기기 권한을 거부해 켜지 못한 경우도 `outcome`으로 구분한다. */
export const trackWeatherPushToggled = ({
  entrypoint,
  requested,
  state,
}: {
  entrypoint: WeatherPushEntrypoint;
  requested: boolean;
  state: WeatherPushState;
}) => trackPostHogEvent(WEATHER_EVENTS.pushToggled, { entrypoint, enabled: requested, outcome: toOutcome(state) });

export const trackWeatherPushToggleFailed = ({
  entrypoint,
  requested,
}: {
  entrypoint: WeatherPushEntrypoint;
  requested: boolean;
}) => trackPostHogEvent(WEATHER_EVENTS.pushToggleFailed, { entrypoint, enabled: requested });
