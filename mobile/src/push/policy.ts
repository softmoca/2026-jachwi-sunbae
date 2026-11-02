/** 알림은 현재 앱 환경의 서비스 내부 경로만 열 수 있다. */
export const resolvePushUrl = (
  value: unknown,
  baseUrl: string,
): string | null => {
  if (typeof value !== 'string' || value.length > 2048 || value.includes('\\'))
    return null;
  if (!value.startsWith('/') && !value.startsWith('https://')) return null;
  if (value.startsWith('//')) return null;
  try {
    const base = new URL(baseUrl);
    const url = new URL(value, base);
    return url.origin === base.origin && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
};

export type PushAction = 'status' | 'enable' | 'disable' | 'token' | 'settings';
export type PushRequest = {
  type: 'push';
  action: PushAction;
  requestId: string;
};

export const parsePushRequest = (raw: string): PushRequest | null => {
  if (raw.length > 1024) return null;
  try {
    const value = JSON.parse(raw);
    if (
      !value ||
      value.type !== 'push' ||
      !['status', 'enable', 'disable', 'token', 'settings'].includes(
        value.action,
      ) ||
      typeof value.requestId !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(value.requestId)
    )
      return null;
    return value;
  } catch {
    return null;
  }
};

export const createPushReplyScript = (origin: string, reply: object): string =>
  `if (window.location.origin === ${JSON.stringify(origin)}) {
    window.dispatchEvent(new CustomEvent('jachwi-push', { detail: ${JSON.stringify(
      reply,
    )} }));
  } true;`;
