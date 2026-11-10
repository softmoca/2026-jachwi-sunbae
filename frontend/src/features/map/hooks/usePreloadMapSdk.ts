import { useEffect } from 'react';

import { usePublicConfig } from '@/shared/config/PublicConfigContext';

import { preloadNaverSdk } from '../lib/naverMapEngine';

/**
 * 지도를 그릴 화면이면 지도보다 먼저 네이버 SDK 받기를 시작한다.
 * 기록 화면은 매물 목록이 올 때까지 뼈대만 그리고 지도를 붙이지 않아, 이것이 없으면 SDK가 목록 응답 뒤에야 출발한다.
 * 데모 지도나 Client ID가 없는 설정에서는 아무것도 받지 않는다.
 */
const usePreloadMapSdk = (enabled: boolean) => {
  const config = usePublicConfig();
  const clientId = config.mapProviderMode === 'naver' ? (config.naverMapClientId ?? '') : '';
  useEffect(() => {
    if (enabled) preloadNaverSdk(clientId);
  }, [enabled, clientId]);
};

export default usePreloadMapSdk;
