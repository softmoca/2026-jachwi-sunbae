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

/** 웹이 push_opened를 남기고 지우는 쿼리 이름. frontend의 pushOpen.ts와 같아야 한다. */
export const PUSH_OPEN_PARAMS = {
  id: 'notification_id',
  type: 'notification_type',
} as const;

const PUSH_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const PUSH_TYPE_PATTERN = /^[a-z_]{1,32}$/;

const pick = (data: unknown, key: string): unknown =>
  data && typeof data === 'object'
    ? (data as Record<string, unknown>)[key]
    : undefined;

/**
 * 푸시 data로 열 주소를 정하고, 웹이 퍼널을 이을 수 있게 알림 ID와 종류를 쿼리로 붙인다.
 * url이 없으면 기본 화면을 연다. url이 있지만 서비스 밖 주소면 열지 않는다.
 */
export const resolvePushOpenUrl = (
  data: unknown,
  baseUrl: string,
): string | null => {
  const id = pick(data, 'notificationId');
  const type = pick(data, 'type');
  const hasId = typeof id === 'string' && PUSH_ID_PATTERN.test(id);
  const rawUrl = pick(data, 'url');
  const hasUrl = rawUrl !== undefined && rawUrl !== null && rawUrl !== '';
  // 알림 ID도 url도 없는 메시지는 예전처럼 지금 화면을 그대로 둔다.
  if (!hasUrl && !hasId) return null;
  const resolved = hasUrl
    ? resolvePushUrl(rawUrl, baseUrl)
    : new URL(baseUrl).href;
  if (!resolved || !hasId) return resolved;
  const url = new URL(resolved);
  url.searchParams.set(PUSH_OPEN_PARAMS.id, id);
  if (typeof type === 'string' && PUSH_TYPE_PATTERN.test(type))
    url.searchParams.set(PUSH_OPEN_PARAMS.type, type);
  return url.href;
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
