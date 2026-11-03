import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useAuthentication } from '@/features/auth/model/useAuthentication';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import { supportsNativePush } from '@/shared/lib/native-app/nativePush';

import { weatherQueryKeys } from './weatherQueryKeys';

/** 앱의 어느 화면에 있어도 로그인·재진입·토큰 갱신 때 현재 회원의 기기를 동기화한다. */
export const useWeatherPushSync = (backgroundOnly = false) => {
  const config = usePublicConfig();
  const client = useQueryClient();
  const { session } = useAuthentication();
  const memberId = session?.memberId ?? null;
  const [hasNativePush, setHasNativePush] = useState(supportsNativePush);
  const query = useQuery({
    queryKey: weatherQueryKeys.settings(memberId),
    queryFn: async () => {
      const { synchronizeWeatherPush } = await import('./weatherPush');
      return synchronizeWeatherPush(config, memberId as number);
    },
    enabled: memberId !== null && (!backgroundOnly || hasNativePush),
    staleTime: Infinity,
    retry: false,
    // 앱 복귀·네트워크 복구 감시는 기존 QueryClient의 이벤트 처리를 재사용한다.
    refetchOnWindowFocus: backgroundOnly && hasNativePush ? 'always' : false,
    refetchOnReconnect: backgroundOnly && hasNativePush ? 'always' : false,
  });

  useEffect(() => {
    if (!backgroundOnly) return;
    const sync = () => {
      setHasNativePush(supportsNativePush());
      if (memberId !== null && supportsNativePush() && document.visibilityState !== 'hidden') {
        void client.invalidateQueries({ queryKey: weatherQueryKeys.settings(memberId) });
      }
    };
    const changed = (event: Event) => {
      if ((event as CustomEvent<{ type?: string }>).detail?.type === 'push:token-changed') sync();
    };
    window.addEventListener('jachwi-native-ready', sync);
    window.addEventListener('jachwi-push', changed);
    return () => {
      window.removeEventListener('jachwi-native-ready', sync);
      window.removeEventListener('jachwi-push', changed);
    };
  }, [client, memberId, backgroundOnly]);

  return { ...query, memberId };
};
