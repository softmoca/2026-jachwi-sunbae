import { PRODUCTION_WEB_APP_URL } from './config';

const WEB_APP_HOSTS = new Set(['jachwi-sunbae.kr', 'www.jachwi-sunbae.kr', 'dev.jachwi-sunbae.kr']);

export const isAllowedWebAppUrl = (value: string): boolean => {
  if (value === 'about:blank') return true;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && WEB_APP_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
};

/** `jachwisunbae://properties/10`을 운영 웹의 같은 경로로 변환한다. */
export const toWebAppUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'jachwisunbae:') return null;

    const route = `/${url.hostname}${url.pathname}`.replace(/\/{2,}/g, '/');
    const destination = new URL(`${route || '/'}${url.search}${url.hash}`, PRODUCTION_WEB_APP_URL);
    return destination.toString();
  } catch {
    return null;
  }
};
