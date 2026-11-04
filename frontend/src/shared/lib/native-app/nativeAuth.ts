import { hasNativeAppFeature } from './nativeApp';

/**
 * 앱 셸의 인증 브리지(`mobile/src/auth`). 앱은 받은 주소를 시스템 인증 화면(iOS ASWebAuthenticationSession,
 * Android Custom Tabs)으로 열고, `jachwisunbae://` 콜백 주소를 그대로 돌려줄 뿐이다.
 * 어떤 API를 부르고 콜백을 어떻게 해석할지는 웹이 정한다. 그래서 API나 정책이 바뀌어도 앱을 다시 내지 않는다.
 */
export const NATIVE_AUTH_FEATURE = 'auth';
const NATIVE_AUTH_EVENT = 'jachwi-auth';

export type NativeAuthError = 'cancelled' | 'busy' | 'unavailable' | 'invalid-request';

export type NativeAuthResult = { ok: true; callbackUrl: string } | { ok: false; error: NativeAuthError };

type NativeAuthReply = { type: 'auth:response'; requestId: string } & NativeAuthResult;

const isNativeAuthReply = (value: unknown): value is NativeAuthReply => {
  if (typeof value !== 'object' || value === null) return false;
  const reply = value as Record<string, unknown>;
  if (reply.type !== 'auth:response' || typeof reply.requestId !== 'string') return false;
  return reply.ok === true ? typeof reply.callbackUrl === 'string' : typeof reply.error === 'string';
};

export const isNativeAuthAvailable = (): boolean => hasNativeAppFeature(NATIVE_AUTH_FEATURE);

const createRequestId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** 서버가 내려 주는 Refresh 쿠키(`RefreshTokenCookie`). 앱은 이 쿠키만 기기 저장소에 백업한다. */
const REFRESH_COOKIE = { name: 'refresh_token', path: '/api/auth', maxAge: 365 * 24 * 60 * 60 } as const;

/**
 * 앱에 지금 WebView의 Refresh 쿠키를 기기 저장소(iOS Keychain, Android 앱 전용 저장소)에 백업해 달라고 한다.
 * WebView 쿠키는 앱을 강제로 끝내거나 저장 공간을 정리할 때 사라질 수 있어서, 앱이 시작할 때 이 백업으로 되살린다.
 * 로그인 응답으로 쿠키가 정해질 때마다 부른다(자동 로그인, OAuth 복귀 뒤 로그인, 로그아웃과 초기화 뒤 새 회원).
 * 쿠키 값은 JS가 읽지 않고 앱이 WebView 쿠키 저장소에서 직접 읽는다. 결과는 기다리지 않는다.
 */
export const persistNativeSession = (apiOrigin: string) => {
  if (!isNativeAuthAvailable()) return;
  const bridge = window.ReactNativeWebView;
  if (bridge === undefined) return;
  try {
    bridge.postMessage(
      JSON.stringify({
        type: 'auth',
        action: 'persist-session',
        requestId: createRequestId(),
        origin: apiOrigin,
        ...REFRESH_COOKIE,
      }),
    );
  } catch {
    // 백업은 보조 수단이다. 실패해도 이번 인증은 그대로 쓴다.
  }
};

/**
 * 앱에 인증 화면을 열어 달라고 하고, 사용자가 끝내거나 닫을 때까지 기다린다.
 * 앱이 응답하지 않는 경우를 대비해 제한 시간이 지나면 `unavailable`로 끝낸다.
 */
export const openNativeAuthSession = (url: string, timeoutMs = 10 * 60 * 1_000): Promise<NativeAuthResult> =>
  new Promise((resolve) => {
    const bridge = window.ReactNativeWebView;
    if (!isNativeAuthAvailable() || bridge === undefined) {
      resolve({ ok: false, error: 'unavailable' });
      return;
    }

    const requestId = createRequestId();
    const handleReply = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isNativeAuthReply(detail) || detail.requestId !== requestId) return;
      finish(detail.ok ? { ok: true, callbackUrl: detail.callbackUrl } : { ok: false, error: detail.error });
    };
    const timer = setTimeout(() => finish({ ok: false, error: 'unavailable' }), timeoutMs);
    const finish = (result: NativeAuthResult) => {
      window.removeEventListener(NATIVE_AUTH_EVENT, handleReply);
      clearTimeout(timer);
      resolve(result);
    };

    window.addEventListener(NATIVE_AUTH_EVENT, handleReply);
    bridge.postMessage(JSON.stringify({ type: 'auth', action: 'open', requestId, url }));
  });
