/**
 * 웹 ↔ 앱 로그인 브리지 계약. 앱이 나간 뒤에는 바꿀 수 없으니 필드를 지우거나 뜻을 바꾸지 않는다.
 *
 * 웹 → 앱: {type:'auth', action:'login', requestId, provider:'apple'|'kakao', nonce}
 * 앱 → 웹: 'jachwi-auth' CustomEvent, detail에 requestId와 아래 중 하나
 *   {status:'success', provider, idToken, authorizationCode?, nonce}
 *   {status:'cancelled', provider}
 *   {status:'error', provider, code:'unavailable'|'not_configured'|'failed', message?}
 */
export type AuthProvider = 'apple' | 'kakao';
export type AuthErrorCode = 'unavailable' | 'not_configured' | 'failed';

export const AUTH_PROVIDERS: readonly AuthProvider[] = ['apple', 'kakao'];

export type AuthLoginRequest = {
  type: 'auth';
  action: 'login';
  requestId: string;
  provider: AuthProvider;
  nonce: string;
};

export type AuthReply =
  | {
      status: 'success';
      provider: AuthProvider;
      idToken: string;
      authorizationCode?: string;
      nonce: string;
    }
  | { status: 'cancelled'; provider: AuthProvider }
  | {
      status: 'error';
      provider: string;
      code: AuthErrorCode;
      message?: string;
    };

export type ParsedAuthMessage =
  | { kind: 'login'; request: AuthLoginRequest }
  | { kind: 'invalid'; requestId: string; reply: AuthReply };

const REQUEST_ID = /^[a-zA-Z0-9_-]{1,64}$/;
// nonce는 해시하지 않고 그대로 제공자에 넘긴다. 공백, 제어 문자 없는 ASCII만 받는다.
const NONCE = /^[\x21-\x7e]{1,256}$/;

export const isAuthProvider = (value: unknown): value is AuthProvider =>
  typeof value === 'string' &&
  (AUTH_PROVIDERS as readonly string[]).includes(value);

/**
 * auth 메시지가 아니거나 requestId가 없으면 null(답할 수 없으니 무시한다).
 * requestId는 있는데 나머지가 틀리면 웹이 기다리지 않도록 오류 응답을 만든다.
 */
export const parseAuthMessage = (raw: string): ParsedAuthMessage | null => {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { type, action, requestId, provider, nonce } = value as Record<
    string,
    unknown
  >;
  if (type !== 'auth') return null;
  if (typeof requestId !== 'string' || !REQUEST_ID.test(requestId)) return null;

  const echoedProvider =
    typeof provider === 'string' ? provider.slice(0, 32) : '';
  const invalid = (
    code: AuthErrorCode,
    message: string,
  ): ParsedAuthMessage => ({
    kind: 'invalid',
    requestId,
    reply: { status: 'error', provider: echoedProvider, code, message },
  });

  // 나중 웹이 이 앱 버전이 모르는 동작을 보내도 답은 한다.
  if (action !== 'login') return invalid('unavailable', 'unsupported_action');
  if (!isAuthProvider(provider))
    return invalid('unavailable', 'unsupported_provider');
  if (typeof nonce !== 'string' || !NONCE.test(nonce))
    return invalid('failed', 'invalid_nonce');

  return {
    kind: 'login',
    request: { type: 'auth', action: 'login', requestId, provider, nonce },
  };
};

/** 현재 페이지가 우리 서비스일 때만 응답을 넘긴다. 토큰이 다른 출처로 새지 않게 한다. */
export const createAuthReplyScript = (
  origin: string,
  requestId: string,
  reply: AuthReply,
): string =>
  `if (window.location.origin === ${JSON.stringify(origin)}) {
    window.dispatchEvent(new CustomEvent('jachwi-auth', { detail: ${JSON.stringify(
      { requestId, ...reply },
    )} }));
  } true;`;
