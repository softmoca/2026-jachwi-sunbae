export type NativePushStatus = { enabled: boolean; permissionGranted: boolean };

export class NativePushError extends Error {
  constructor(readonly reason: 'unsupported' | 'unavailable' | 'permission') {
    super('기기 알림 연결을 확인하지 못했습니다.');
  }
}

export const supportsNativePush = () =>
  window.__JACHWI_NATIVE_APP__?.features?.includes('push') === true &&
  typeof window.ReactNativeWebView?.postMessage === 'function';

/** 응답은 메모리에서만 사용한다. 네이티브 오류 원문·토큰을 로그나 분석으로 보내지 않는다. */
const request = (action: 'status' | 'enable' | 'disable' | 'token'): Promise<Record<string, unknown>> => {
  if (!supportsNativePush()) return Promise.reject(new NativePushError('unsupported'));
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const finish = (value?: Record<string, unknown>) => {
      window.clearTimeout(timeout);
      window.removeEventListener('jachwi-push', receive);
      if (value?.ok === true) resolve(value);
      else reject(new NativePushError('unavailable'));
    };
    const receive = (event: Event) => {
      const value: unknown = (event as CustomEvent<unknown>).detail;
      if (typeof value !== 'object' || value === null) return;
      const reply = value as Record<string, unknown>;
      if (reply.type === 'push:response' && reply.requestId === requestId) finish(reply);
    };
    // 권한 창에서 사용자가 선택할 시간을 준다. 늦게 온 응답은 리스너 제거로 무시한다.
    const timeout = window.setTimeout(() => finish(), action === 'enable' ? 60_000 : 15_000);
    window.addEventListener('jachwi-push', receive);
    try {
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'push', action, requestId }));
    } catch {
      finish();
    }
  });
};

export const readNativePushStatus = async (action: 'status' | 'enable' = 'status'): Promise<NativePushStatus> => {
  const value = await request(action);
  if (typeof value.enabled !== 'boolean' || typeof value.permissionGranted !== 'boolean') {
    throw new NativePushError('unavailable');
  }
  return { enabled: value.enabled, permissionGranted: value.permissionGranted };
};

export const readNativePushToken = async (): Promise<string> => {
  const value = await request('token');
  if (typeof value.token !== 'string' || value.token.length === 0 || value.token.length > 4096) {
    throw new NativePushError('unavailable');
  }
  return value.token;
};

export const disableNativePush = async (): Promise<void> => {
  await request('disable');
};
