export const PRODUCTION_WEB_APP_URL = 'https://www.jachwi-sunbae.kr';
export const DEVELOPMENT_WEB_APP_URL = 'https://dev.jachwi-sunbae.kr';

export type AppEnv = 'dev' | 'prod';

declare const process: { env: { JACHWI_APP_ENV?: string } };

/** 값이 없거나 모르는 값이면 Debug 번들은 dev, 나머지는 prod로 본다. */
export const resolveAppEnv = (
  bundled: string | undefined,
  isDevBundle: boolean,
): AppEnv => {
  if (bundled === 'dev' || bundled === 'prod') return bundled;
  return isDevBundle ? 'dev' : 'prod';
};

/**
 * 번들 때 정해지는 앱 환경. iOS는 Debug와 Staging이 dev, Release가 prod다.
 * Android는 debug와 staging이 dev, release가 prod다.
 */
export const APP_ENV = resolveAppEnv(process.env.JACHWI_APP_ENV, __DEV__);

/** dev 환경은 dev 웹을, prod 환경(App Store 빌드)은 운영 웹을 연다. */
export const WEB_APP_URL =
  APP_ENV === 'dev' ? DEVELOPMENT_WEB_APP_URL : PRODUCTION_WEB_APP_URL;
