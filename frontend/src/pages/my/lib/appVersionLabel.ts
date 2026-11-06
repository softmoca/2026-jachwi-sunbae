import type { PublicConfig } from '@/shared/config/publicConfigTypes';

/**
 * 마이 화면 맨 아래에 보이는 앱 이름과 릴리스 버전. 버전은 빌드할 때 넣은 `__APP_VERSION__`(package.json 버전)을 쓴다.
 * 지도가 데모 모드면 실제 지도가 아니라는 것만 덧붙인다.
 */
export const formatAppVersionLabel = ({
  appVersion,
  mapProviderMode,
}: Pick<PublicConfig, 'appVersion' | 'mapProviderMode'>) => {
  const name = appVersion ? `자취선배 v${appVersion}` : '자취선배';
  return mapProviderMode === 'demo' ? `${name} (데모 지도)` : name;
};
