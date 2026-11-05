import type { NativeAuthResult } from '../native/NativeJachwiAuth';
import type {
  AuthErrorCode,
  AuthLoginRequest,
  AuthProvider,
  AuthReply,
} from './policy';

export type AuthPort = {
  /** 이 플랫폼이 지원하는 제공자(키가 없어도 포함). */
  supported: readonly AuthProvider[];
  /** 키까지 갖춰 지금 바로 쓸 수 있는 제공자. */
  configured: readonly AuthProvider[];
  login(provider: AuthProvider, nonce: string): Promise<NativeAuthResult>;
};

type Options = {
  now?: () => number;
  /**
   * 네이티브가 끝내 답하지 않을 때 잠금을 푸는 시간. 웹의 시간 제한보다 길게 둔다.
   * 카카오톡으로 넘어갔다 오는 동안 잠금이 풀리지 않을 만큼 넉넉하게 잡는다.
   */
  lockTimeoutMs?: number;
};

const ERROR_CODES: readonly AuthErrorCode[] = [
  'unavailable',
  'not_configured',
  'failed',
];

const error = (
  provider: string,
  code: AuthErrorCode,
  message?: string,
): AuthReply => ({
  status: 'error',
  provider,
  code,
  ...(message ? { message } : {}),
});

const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/** 네이티브 결과를 브리지 계약 모양으로 맞춘다. 모르는 값은 failed로 본다. */
export const toAuthReply = (
  request: AuthLoginRequest,
  result: NativeAuthResult | null | undefined,
): AuthReply => {
  const { provider, nonce } = request;
  if (!result || typeof result !== 'object')
    return error(provider, 'failed', 'invalid_result');
  if (result.status === 'cancelled') return { status: 'cancelled', provider };
  if (result.status === 'success') {
    if (!nonEmpty(result.idToken))
      return error(provider, 'failed', 'missing_id_token');
    // 백엔드가 탈퇴 때 Apple 토큰을 철회하려면 authorization code가 꼭 있어야 한다.
    if (provider === 'apple' && !nonEmpty(result.authorizationCode))
      return error(provider, 'failed', 'missing_authorization_code');
    return {
      status: 'success',
      provider,
      idToken: result.idToken,
      ...(nonEmpty(result.authorizationCode)
        ? { authorizationCode: result.authorizationCode }
        : {}),
      // 웹이 준 원문을 그대로 돌려준다. 해시 여부는 백엔드와 나중에 정한다.
      nonce,
    };
  }
  if (result.status === 'error') {
    const code = (ERROR_CODES as readonly string[]).includes(result.code ?? '')
      ? (result.code as AuthErrorCode)
      : 'failed';
    const message = nonEmpty(result.message)
      ? result.message.slice(0, 120)
      : undefined;
    return error(provider, code, message);
  }
  return error(provider, 'failed', 'invalid_result');
};

/** 로그인 요청을 한 번에 하나만 처리한다. 실패해도 항상 응답을 만든다. */
export const createAuthController = (
  port: AuthPort | null,
  { now = Date.now, lockTimeoutMs = 10 * 60_000 }: Options = {},
) => {
  let current: { startedAt: number } | null = null;

  const handle = async (request: AuthLoginRequest): Promise<AuthReply> => {
    const { provider, nonce } = request;
    if (!port) return error(provider, 'unavailable', 'module_missing');
    if (!port.supported.includes(provider))
      return error(provider, 'unavailable', 'unsupported_provider');
    if (!port.configured.includes(provider))
      return error(provider, 'not_configured');
    if (current && now() - current.startedAt < lockTimeoutMs)
      return error(provider, 'failed', 'busy');

    const lock = { startedAt: now() };
    current = lock;
    try {
      return toAuthReply(request, await port.login(provider, nonce));
    } catch {
      return error(provider, 'failed', 'native_error');
    } finally {
      // 시간 제한으로 다음 요청이 잠금을 가져갔다면 그 잠금은 건드리지 않는다.
      if (current === lock) current = null;
    }
  };

  return { handle };
};
