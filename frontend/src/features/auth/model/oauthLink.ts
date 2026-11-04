/**
 * OAuth 계정 연결의 화면 상태. 서버 응답만으로는 연결 여부와 결과(연결, 통합, 전환)를 알 수 없어서
 * 인증을 시작할 때의 회원과 끝난 뒤의 회원을 비교해 결과를 정하고, 이 기기에서 확인한 연결 상태를 기억해 둔다.
 * 회원 조회 응답에 연결 상태가 생기면 `readLinkedProvider`는 그 값으로 바꾼다.
 */
export type OAuthProvider = 'KAKAO' | 'APPLE';
export const OAUTH_PROVIDERS: readonly OAuthProvider[] = ['KAKAO', 'APPLE'];
export const OAUTH_PROVIDER_LABELS: Record<OAuthProvider, string> = { KAKAO: '카카오', APPLE: 'Apple' };

export type OAuthOutcome = 'linked' | 'merged' | 'switched' | 'completed';
export type OAuthFailure = 'cancelled' | 'failed' | 'unavailable';

export type OAuthNotice = { title: string; description: string; tone: 'success' | 'error' };

const PENDING_KEY = 'jachwi:oauth-pending';
const LINK_KEY = 'jachwi:oauth-link';
// 제공자 화면에서 오래 머물다 돌아오거나, 돌아오지 않고 남은 기록은 쓰지 않는다.
const PENDING_TTL_MS = 30 * 60 * 1_000;

export type PendingOAuth = {
  provider: OAuthProvider;
  previousMemberId: number;
  previousProvider: OAuthProvider | null;
  startedAt: number;
};

const isProvider = (value: unknown): value is OAuthProvider => value === 'KAKAO' || value === 'APPLE';
const isMemberId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const readJson = (storage: () => Storage, key: string): Record<string, unknown> | null => {
  try {
    const raw = storage().getItem(key);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const writeJson = (storage: () => Storage, key: string, value: unknown) => {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    // 저장소를 쓸 수 없으면 결과 안내만 덜 자세해진다. 인증 흐름은 막지 않는다.
  }
};

const removeItem = (storage: () => Storage, key: string) => {
  try {
    storage().removeItem(key);
  } catch {
    // 위와 같다.
  }
};

const session = () => window.sessionStorage;
const local = () => window.localStorage;

/** 제공자 화면으로 떠나기 전에 남긴다. 같은 탭으로 돌아오면 복귀 화면이 읽는다. */
export const savePendingOAuth = (pending: Omit<PendingOAuth, 'startedAt'>, now = Date.now()) =>
  writeJson(session, PENDING_KEY, { ...pending, startedAt: now });

/** 한 번 읽으면 지운다. 오래됐거나 형식이 다르면 없는 것으로 본다. */
export const takePendingOAuth = (now = Date.now()): PendingOAuth | null => {
  const value = readJson(session, PENDING_KEY);
  removeItem(session, PENDING_KEY);
  if (
    value === null ||
    !isProvider(value.provider) ||
    !isMemberId(value.previousMemberId) ||
    !(value.previousProvider === null || isProvider(value.previousProvider)) ||
    typeof value.startedAt !== 'number' ||
    now - value.startedAt > PENDING_TTL_MS ||
    now < value.startedAt
  ) {
    return null;
  }
  return {
    provider: value.provider,
    previousMemberId: value.previousMemberId,
    previousProvider: value.previousProvider,
    startedAt: value.startedAt,
  };
};

/** 이 기기에서 확인한 지금 회원의 연결 계정. 다른 회원으로 바뀌었으면 연결하지 않은 것으로 본다. */
export const readLinkedProvider = (memberId: number): OAuthProvider | null => {
  const value = readJson(local, LINK_KEY);
  if (value === null || value.memberId !== memberId || !isProvider(value.provider)) return null;
  return value.provider;
};

export const saveLinkedProvider = (memberId: number, provider: OAuthProvider) =>
  writeJson(local, LINK_KEY, { memberId, provider });

/**
 * 인증 전후 회원으로 결과를 정한다. 서버가 결과를 알려 주면 그 값을 쓴다.
 * - 같은 회원: 처음 연결해 지금 기록을 그대로 쓴다.
 * - 다른 회원, 이전에 연결된 계정이 있었음: 다른 계정으로 전환했다. 기록은 합치지 않는다.
 * - 다른 회원, 익명이었음: 이미 연결된 회원으로 돌아가며 이 기기의 기록을 합쳤다.
 */
export const resolveOAuthOutcome = (
  pending: PendingOAuth | null,
  memberId: number,
  serverOutcome?: string | null,
): OAuthOutcome => {
  if (serverOutcome === 'linked' || serverOutcome === 'merged' || serverOutcome === 'switched') return serverOutcome;
  if (pending === null) return 'completed';
  if (pending.previousMemberId === memberId) return 'linked';
  return pending.previousProvider === null ? 'merged' : 'switched';
};

export const parseOAuthFailure = (value: string | null): OAuthFailure | null => {
  if (value === null) return null;
  if (value === 'cancelled' || value === 'access_denied') return 'cancelled';
  if (value === 'unavailable') return 'unavailable';
  return 'failed';
};

export const createOAuthSuccessNotice = (outcome: OAuthOutcome, provider: OAuthProvider | null): OAuthNotice => {
  const label = provider === null ? '외부' : OAUTH_PROVIDER_LABELS[provider];
  switch (outcome) {
    case 'linked':
      return {
        tone: 'success',
        title: `${label} 계정을 연결했어요`,
        description: '지금까지의 기록은 그대로예요. 다른 기기에서도 같은 계정으로 이어서 쓸 수 있어요.',
      };
    case 'merged':
      return {
        tone: 'success',
        title: `${label} 계정의 기록을 불러왔어요`,
        description: '이 기기에서 남긴 기록도 함께 옮겼어요. 이제 같은 계정의 기록으로 이어서 써요.',
      };
    case 'switched':
      return {
        tone: 'success',
        title: `${label} 계정으로 바꿨어요`,
        description: '이전 계정의 기록은 합치지 않고 그 계정에 그대로 남아 있어요.',
      };
    case 'completed':
      return { tone: 'success', title: `${label} 계정 인증을 마쳤어요`, description: '계정의 기록으로 이어서 써요.' };
  }
};

export const createOAuthFailureNotice = (failure: OAuthFailure): OAuthNotice => {
  switch (failure) {
    case 'cancelled':
      return {
        tone: 'error',
        title: '계정 연결을 취소했어요',
        description: '지금 기록은 그대로예요. 필요할 때 다시 연결해 주세요.',
      };
    case 'unavailable':
      return {
        tone: 'error',
        title: '지금은 계정을 연결할 수 없어요',
        description: '지금 기록은 그대로예요. 잠시 후 다시 시도해 주세요.',
      };
    case 'failed':
      return {
        tone: 'error',
        title: '계정을 연결하지 못했어요',
        description: '지금 기록은 그대로예요. 잠시 후 다시 시도해 주세요.',
      };
  }
};
