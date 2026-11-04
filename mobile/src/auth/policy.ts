/**
 * 웹과 주고받는 인증 브리지 약속. 앱은 웹이 준 주소를 시스템 인증 화면으로 열고,
 * `jachwisunbae://`로 돌아온 주소를 그대로 돌려줄 뿐이다. 어떤 API를 부르고 돌아온 주소를 어떻게 해석할지는 웹이 정한다.
 * 그래서 백엔드 계약이 정해지거나 바뀌어도 앱을 다시 내지 않는다.
 */
export const AUTH_CALLBACK_SCHEME = 'jachwisunbae';

export type AuthOpenRequest = {
  type: 'auth';
  action: 'open';
  requestId: string;
  url: string;
};

/** 웹에 돌려주는 실패 종류. 사용자가 닫았는지, 이미 열려 있는지, 그 밖의 실패인지만 나눈다. */
export type AuthSessionError = 'cancelled' | 'busy' | 'failed';

const REQUEST_ID = /^[a-zA-Z0-9_-]{1,64}$/;

const isHttpsUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 4096) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

export const parseAuthRequest = (raw: string): AuthOpenRequest | null => {
  if (raw.length > 8192) return null;
  try {
    const value = JSON.parse(raw);
    if (
      !value ||
      value.type !== 'auth' ||
      value.action !== 'open' ||
      typeof value.requestId !== 'string' ||
      !REQUEST_ID.test(value.requestId) ||
      !isHttpsUrl(value.url)
    )
      return null;
    return {
      type: 'auth',
      action: 'open',
      requestId: value.requestId,
      url: value.url,
    };
  } catch {
    return null;
  }
};

export const isAuthCallbackUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === `${AUTH_CALLBACK_SCHEME}:`;
  } catch {
    return false;
  }
};

export const toAuthSessionError = (error: unknown): AuthSessionError => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code: unknown }).code
      : null;
  return code === 'cancelled' || code === 'busy' ? code : 'failed';
};

export const createAuthReplyScript = (origin: string, reply: object): string =>
  `if (window.location.origin === ${JSON.stringify(origin)}) {
    window.dispatchEvent(new CustomEvent('jachwi-auth', { detail: ${JSON.stringify(
      reply,
    )} }));
  } true;`;
