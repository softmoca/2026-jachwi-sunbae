import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useAuthentication } from '@/features/auth/model/useAuthentication';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import { supportsNativePush } from '@/shared/lib/native-app/nativePush';

import { submitWeatherTestPush } from '../api/weatherApi';

/** 홈 화면으로 나갈 시간. 앱이 켜져 있으면 시스템 배너 대신 앱 안 안내창이 뜨기 때문이다. */
export const WEATHER_TEST_PUSH_DELAY_SECONDS = 5;

export type WeatherTestPushStatus = 'idle' | 'waiting' | 'sending' | 'sent' | 'not-sent' | 'failed';

/**
 * dev 서버에서만 등록된 내 기기로 테스트 푸시 알림을 보낸다.
 * 기다리는 동안 화면이 숨겨지면 바로 보낸다. 백그라운드에서는 WebView 타이머가 멈출 수 있다.
 */
export const useWeatherTestPush = (isEnabled: boolean) => {
  const config = usePublicConfig();
  const memberId = useAuthentication().session?.memberId ?? null;
  const [isWaiting, setIsWaiting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WEATHER_TEST_PUSH_DELAY_SECONDS);
  const cancelRef = useRef<(() => void) | null>(null);

  const submit = useMutation({
    mutationFn: (expectedMemberId: number) => submitWeatherTestPush(config, expectedMemberId),
  });

  useEffect(() => () => cancelRef.current?.(), []);

  const canSend = config.appEnvironment === 'development' && isEnabled && memberId !== null && supportsNativePush();

  const send = () => {
    if (!canSend || memberId === null || isWaiting || submit.isPending) return;
    const expectedMemberId = memberId;
    let remaining = WEATHER_TEST_PUSH_DELAY_SECONDS;

    const stop = () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancelRef.current = null;
    };
    const fire = () => {
      stop();
      setIsWaiting(false);
      submit.mutate(expectedMemberId);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') fire();
    };
    const timer = window.setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) fire();
    }, 1000);

    document.addEventListener('visibilitychange', onVisibilityChange);
    cancelRef.current = stop;
    submit.reset();
    setSecondsLeft(WEATHER_TEST_PUSH_DELAY_SECONDS);
    setIsWaiting(true);
  };

  const status: WeatherTestPushStatus = isWaiting
    ? 'waiting'
    : submit.isPending
      ? 'sending'
      : submit.isError
        ? 'failed'
        : submit.isSuccess
          ? submit.data
            ? 'sent'
            : 'not-sent'
          : 'idle';

  return { canSend, status, secondsLeft, send };
};
