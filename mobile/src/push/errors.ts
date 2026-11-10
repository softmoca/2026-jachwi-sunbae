/** 푸시 연결 실패 종류. 화면 문구와 웹 브리지 오류 코드를 이 값으로 정한다. */
export type PushFailure = 'apns_timeout' | 'network' | 'unknown';

/** APNs 토큰이 정해진 시간 안에 오지 않았을 때 던진다. */
export class ApnsTimeoutError extends Error {
  readonly code = 'apns_timeout';
  constructor() {
    super('APNs 토큰을 기다리다 시간이 지났습니다.');
  }
}

const sleepFor = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * iOS는 registerForRemoteNotifications 뒤 APNs 토큰이 비동기로 온다.
 * 토큰 없이 FCM 토큰을 요청하면 실패하므로, 값이 생길 때까지 짧은 간격으로 다시 읽는다.
 * 아직 등록 중이면 읽기가 실패할 수도 있어 그 경우도 다시 읽는다.
 */
export const waitForApnsToken = async (
  read: () => Promise<string | null>,
  {
    intervalMs = 400,
    timeoutMs = 10_000,
    sleep = sleepFor,
  }: {
    intervalMs?: number;
    timeoutMs?: number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<void> => {
  for (let waited = 0; ; waited += intervalMs) {
    const token = await read().catch(() => null);
    if (token) return;
    if (waited + intervalMs > timeoutMs) throw new ApnsTimeoutError();
    await sleep(intervalMs);
  }
};

const NETWORK_PATTERN =
  /network|offline|internet connection|timed out|NSURLErrorDomain|SERVICE_NOT_AVAILABLE/i;

/** 네이티브 오류를 화면 문구용 종류로 나눈다. 오류 원문은 화면이나 로그에 쓰지 않는다. */
export const classifyPushError = (error: unknown): PushFailure => {
  if (error instanceof ApnsTimeoutError) return 'apns_timeout';
  if (typeof error === 'object' && error !== null) {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (code === 'apns_timeout') return 'apns_timeout';
    const text = `${typeof code === 'string' ? code : ''} ${
      typeof message === 'string' ? message : ''
    }`;
    if (NETWORK_PATTERN.test(text)) return 'network';
  }
  return 'unknown';
};

/** 웹 브리지 push:response의 error 값. 웹은 ok가 false면 종류와 관계없이 실패로 본다. */
export const PUSH_BRIDGE_ERROR: Record<PushFailure, string> = {
  apns_timeout: 'apns-timeout',
  network: 'network',
  unknown: 'push-unavailable',
};
