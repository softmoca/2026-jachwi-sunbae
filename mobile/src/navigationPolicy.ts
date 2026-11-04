import { PRODUCTION_WEB_APP_URL } from './config';

const WEB_APP_HOSTS = new Set([
  'jachwi-sunbae.kr',
  'www.jachwi-sunbae.kr',
  'dev.jachwi-sunbae.kr',
]);

/**
 * OAuth 계정 연결은 WebView 안에서 제공자 화면까지 갔다가 돌아와야 한다.
 * 백엔드 콜백이 인증을 시작한 기기의 Refresh 쿠키를 요구하는데, 시스템 브라우저는 WebView와 쿠키를 함께 쓰지 않는다.
 * 그래서 제공자 인증 화면과 백엔드 OAuth 콜백만 WebView 안에 두고, 그 밖의 외부 링크는 지금처럼 시스템 브라우저로 연다.
 */
const OAUTH_PROVIDER_HOSTS = new Set([
  'kauth.kakao.com',
  'accounts.kakao.com',
  'appleid.apple.com',
]);
const API_HOSTS = new Set(['dev-api.jachwi-sunbae.kr', 'api.jachwi-sunbae.kr']);
const OAUTH_API_PATH_PREFIX = '/api/auth/oauth/';

const parseHttpsUrl = (value: string): URL | null => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url
      : null;
  } catch {
    return null;
  }
};

export const isAllowedOAuthUrl = (value: string): boolean => {
  const url = parseHttpsUrl(value);
  if (url === null) return false;
  if (OAUTH_PROVIDER_HOSTS.has(url.hostname)) return true;
  return (
    API_HOSTS.has(url.hostname) &&
    url.pathname.startsWith(OAUTH_API_PATH_PREFIX)
  );
};

/** WebView 안에서 열 주소. 서비스 웹과 OAuth 인증 경로만 허용한다. */
export const isAllowedWebAppUrl = (value: string): boolean => {
  if (value === 'about:blank') return true;

  const url = parseHttpsUrl(value);
  if (url === null) return false;
  return WEB_APP_HOSTS.has(url.hostname) || isAllowedOAuthUrl(value);
};

/** `jachwisunbae://properties/10`을 운영 웹의 같은 경로로 변환한다. */
export const toWebAppUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'jachwisunbae:') return null;

    const route = `/${url.hostname}${url.pathname}`.replace(/\/{2,}/g, '/');
    const destination = new URL(
      `${route || '/'}${url.search}${url.hash}`,
      PRODUCTION_WEB_APP_URL,
    );
    return destination.toString();
  } catch {
    return null;
  }
};
