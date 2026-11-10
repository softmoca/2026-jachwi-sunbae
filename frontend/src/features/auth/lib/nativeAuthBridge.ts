import { postNativeAppMessage } from '@/shared/lib/native-app/nativeApp';

/**
 * 웹 ↔ 앱 로그인 브리지(#591, 앱 2.2.0). 앱은 Apple 로그인 시트나 카카오 SDK로 `id_token`만 받아 웹에 넘기고
 * 서버를 부르지 않는다. 계약은 `mobile/src/auth/policy.ts`와 같다.
 * - 웹 → 앱: `postMessage({ type: 'auth', action: 'login', requestId, provider, nonce })`
 * - 앱 → 웹: `jachwi-auth` CustomEvent. `detail`에 `requestId`와 결과
 */
export type NativeAuthProvider = 'apple' | 'kakao';

export type NativeLoginResult =
  | { status: 'success'; idToken: string; authorizationCode?: string; nonce: string }
  | { status: 'cancelled' }
  /**
   * - `unavailable`: 이 앱이나 플랫폼이 지원하지 않는다(Android에서 Apple 등).
   * - `not_configured`: 앱에 키가 없거나 카카오 OIDC가 꺼져 `id_token`이 없다.
   * - `failed`: 그 밖(진행 중 중복 요청 `busy` 포함).
   * - `timeout`: 시간 안에 답이 없었다. 앱이 아니라 웹이 정한다.
   */
  | { status: 'error'; code: 'unavailable' | 'not_configured' | 'failed' | 'timeout' };

const EVENT_NAME = 'jachwi-auth';
// 카카오톡으로 넘어갔다 돌아오는 시간을 넉넉히 잡는다. 앱의 잠금(10분)보다 짧다.
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1_000;
const ERROR_CODES = ['unavailable', 'not_configured', 'failed'] as const;

const createRequestId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** 앱 응답을 해석한다. 토큰 외 값(`message` 원인 코드 등)은 쓰지 않는다. 형식이 다르면 실패로 본다. */
export const parseNativeLoginReply = (detail: Record<string, unknown>, nonce: string): NativeLoginResult => {
  if (detail.status === 'cancelled') return { status: 'cancelled' };
  if (detail.status === 'success') {
    const { idToken, authorizationCode } = detail;
    // 앱은 받은 nonce를 그대로 돌려준다. 다르면 다른 요청의 토큰일 수 있어 쓰지 않는다.
    if (typeof idToken !== 'string' || idToken.length === 0 || detail.nonce !== nonce) {
      return { status: 'error', code: 'failed' };
    }
    return typeof authorizationCode === 'string' && authorizationCode.length > 0
      ? { status: 'success', idToken, authorizationCode, nonce }
      : { status: 'success', idToken, nonce };
  }
  if (detail.status === 'error') {
    const code = ERROR_CODES.find((value) => value === detail.code) ?? 'failed';
    return { status: 'error', code };
  }
  return { status: 'error', code: 'failed' };
};

type LoginOptions = {
  provider: NativeAuthProvider;
  nonce: string;
  timeoutMs?: number;
};

/** 앱에 네이티브 로그인을 요청하고 결과를 기다린다. 늘 결과로 답하고 reject하지 않는다. */
export const requestNativeLogin = ({
  provider,
  nonce,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: LoginOptions): Promise<NativeLoginResult> =>
  new Promise((resolve) => {
    const requestId = createRequestId();
    const finish = (result: NativeLoginResult) => {
      window.removeEventListener(EVENT_NAME, handleReply);
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => finish({ status: 'error', code: 'timeout' }), timeoutMs);

    function handleReply(event: Event) {
      const detail: unknown = (event as CustomEvent<unknown>).detail;
      if (typeof detail !== 'object' || detail === null) return;
      const reply = detail as Record<string, unknown>;
      if (reply.requestId !== requestId) return;
      finish(parseNativeLoginReply(reply, nonce));
    }

    window.addEventListener(EVENT_NAME, handleReply);
    if (!postNativeAppMessage({ type: 'auth', action: 'login', requestId, provider, nonce })) {
      finish({ status: 'error', code: 'unavailable' });
    }
  });
