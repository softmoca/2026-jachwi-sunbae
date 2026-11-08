import { useEffect, useRef } from 'react';

import { trackPostHogEvent } from '@/shared/lib/analytics/posthog';

/** 날씨 알림 퍼널(`push_opened` → `weather_card_viewed`)의 목표 행동. 위치나 예보 값은 싣지 않는다. */
export const WEATHER_EVENTS = {
  /** 마이의 생활 날씨 카드가 오늘 예보를 실제로 그렸을 때. 카드가 마운트될 때마다 한 번. */
  cardViewed: 'weather_card_viewed',
} as const;

export const useWeatherCardViewed = (showsWeather: boolean): void => {
  const tracked = useRef(false);
  useEffect(() => {
    if (!showsWeather || tracked.current) return;
    tracked.current = true;
    trackPostHogEvent(WEATHER_EVENTS.cardViewed);
  }, [showsWeather]);
};
