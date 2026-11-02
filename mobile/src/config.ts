export const PRODUCTION_WEB_APP_URL = 'https://www.jachwi-sunbae.kr';
export const DEVELOPMENT_WEB_APP_URL = 'https://dev.jachwi-sunbae.kr';

/** Debug 빌드는 dev 웹을, TestFlight·App Store 빌드는 운영 웹을 연다. */
export const WEB_APP_URL = __DEV__ ? DEVELOPMENT_WEB_APP_URL : PRODUCTION_WEB_APP_URL;
