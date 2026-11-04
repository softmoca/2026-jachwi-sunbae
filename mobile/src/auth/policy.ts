/**
 * 웹과 주고받는 인증 브리지 약속. 웹 쪽은 `frontend/src/shared/lib/native-app/nativeAuth.ts`에 있다.
 * 앱은 "주소 열기와 결과 전달", "쿠키 백업과 복원"만 한다. 어떤 API를 부르고 언제 저장할지는 웹이 정해서,
 * API 주소나 인증 정책이 바뀌어도 앱을 다시 내지 않는다.
 */
export const AUTH_CALLBACK_SCHEME = 'jachwisunbae';

/** 쿠키를 백업할 수 있는 API 도메인. 우리 서비스 도메인 아래만 허용한다. */
const SERVICE_DOMAIN = 'jachwi-sunbae.kr';
const MAX_COOKIE_AGE_SECONDS = 400 * 24 * 60 * 60;

export type SessionCookie = {
  origin: string;
  name: string;
  path: string;
  maxAge: number;
};

export type AuthRequest =
  | { type: 'auth'; action: 'open'; requestId: string; url: string }
  | ({
      type: 'auth';
      action: 'persist-session';
      requestId: string;
    } & SessionCookie);

const REQUEST_ID = /^[a-zA-Z0-9_-]{1,64}$/;
const COOKIE_NAME = /^[A-Za-z0-9_-]{1,64}$/;

const isHttpsUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 4096) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

export const isServiceApiOrigin = (value: unknown): value is string => {
  if (!isHttpsUrl(value)) return false;
  const url = new URL(value);
  const isServiceHost =
    url.hostname === SERVICE_DOMAIN ||
    url.hostname.endsWith(`.${SERVICE_DOMAIN}`);
  return isServiceHost && url.origin === value;
};

const isSessionCookie = (value: Record<string, unknown>): boolean =>
  isServiceApiOrigin(value.origin) &&
  typeof value.name === 'string' &&
  COOKIE_NAME.test(value.name) &&
  typeof value.path === 'string' &&
  /^\/[A-Za-z0-9/_-]{0,128}$/.test(value.path) &&
  typeof value.maxAge === 'number' &&
  Number.isInteger(value.maxAge) &&
  value.maxAge > 0 &&
  value.maxAge <= MAX_COOKIE_AGE_SECONDS;

export const parseAuthRequest = (raw: string): AuthRequest | null => {
  if (raw.length > 8192) return null;
  try {
    const value = JSON.parse(raw);
    if (
      !value ||
      value.type !== 'auth' ||
      typeof value.requestId !== 'string' ||
      !REQUEST_ID.test(value.requestId)
    )
      return null;
    if (value.action === 'open') {
      return isHttpsUrl(value.url)
        ? {
            type: 'auth',
            action: 'open',
            requestId: value.requestId,
            url: value.url,
          }
        : null;
    }
    if (value.action === 'persist-session' && isSessionCookie(value)) {
      return {
        type: 'auth',
        action: 'persist-session',
        requestId: value.requestId,
        origin: value.origin,
        name: value.name,
        path: value.path,
        maxAge: value.maxAge,
      };
    }
    return null;
  } catch {
    return null;
  }
};

/** 인증 화면이 앱으로 돌려준 주소. 딥링크로 들어와도 웹 화면으로 열지 않는다. */
export const isAuthCallbackUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      url.protocol === `${AUTH_CALLBACK_SCHEME}:` && url.hostname === 'auth'
    );
  } catch {
    return false;
  }
};

export const createAuthReplyScript = (origin: string, reply: object): string =>
  `if (window.location.origin === ${JSON.stringify(origin)}) {
    window.dispatchEvent(new CustomEvent('jachwi-auth', { detail: ${JSON.stringify(
      reply,
    )} }));
  } true;`;
