/**
 * OAuth 계정 연결의 화면 상태. #570 콜백은 완료 주소(`OAUTH_SUCCESS_REDIRECT_URI`)로 303만 보내고
 * 결과(연결, 통합, 전환)나 연결 상태를 알려 주지 않는다. 그래서 인증을 시작할 때의 회원과 끝난 뒤의 회원을 비교해
 * 결과를 정하고, 이 기기에서 확인한 연결 상태를 기억해 둔다. 서버가 알려 주게 되면 그 값으로 바꾼다.
 *
 * #570 `AuthService.completeOAuth`의 규칙:
 * - 익명 회원 + 처음 쓰는 계정: 지금 회원에 연결만 한다. 회원 번호와 기록이 그대로다.
 * - 익명 회원 + 이미 연결된 계정: 그 회원으로 기록을 합친다(`mergeOwnedData`). 매물(사진, 메모, 체크 기록 포함),
 *   내가 만든 체크리스트, 거리 메모를 옮기고, 날씨 위치와 알림 설정, 체크리스트 단계 설정은 계정에 이미 있으면 그 값을 쓴다.
 * - 계정을 연결한 회원 + 다른 계정: 합치지 않고 그 계정의 회원으로 바꾼다. 화면은 이 전환을 열지 않는다.
 *   연결한 회원은 로그아웃해 새 익명 회원이 된 뒤 다시 연결한다.
 */
export type OAuthProvider = 'KAKAO' | 'APPLE';
export const OAUTH_PROVIDERS: readonly OAuthProvider[] = ['KAKAO', 'APPLE'];
export const OAUTH_PROVIDER_LABELS: Record<OAuthProvider, string> = { KAKAO: '카카오', APPLE: 'Apple' };

export type OAuthOutcome = 'linked' | 'merged' | 'completed';
/**
 * - `unfinished`: 제공자 화면으로 갔다가 완료 없이 돌아왔다. #570은 취소와 콜백 실패를 API 도메인의 JSON 오류로 끝내
 *   웹이 둘을 구분할 수 없다.
 * - `cancelled`: 앱 네이티브 로그인 화면에서 취소했다. 앱은 취소를 따로 알려 준다.
 * - `session`: 시작 API가 이 브라우저의 Refresh 쿠키를 확인하지 못했다(`401 OAUTH_AUTHENTICATION_FAILED`).
 * - `unavailable`: 제공자 설정 누락이나 장애, 네트워크(`503 OAUTH_PROVIDER_UNAVAILABLE`).
 */
export type OAuthFailure = 'unfinished' | 'cancelled' | 'session' | 'failed' | 'unavailable';

export type OAuthNotice = { title: string; description: string; tone: 'success' | 'error' };

const PENDING_KEY = 'jachwi:oauth-pending';
const LINK_KEY = 'jachwi:oauth-link';
// 제공자 화면에서 오래 머물다 돌아오거나, 돌아오지 않고 남은 기록은 쓰지 않는다.
const PENDING_TTL_MS = 30 * 60 * 1_000;

export type PendingOAuth = {
  provider: OAuthProvider;
  previousMemberId: number;
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
    typeof value.startedAt !== 'number' ||
    now - value.startedAt > PENDING_TTL_MS ||
    now < value.startedAt
  ) {
    return null;
  }
  return {
    provider: value.provider,
    previousMemberId: value.previousMemberId,
    startedAt: value.startedAt,
  };
};

const NOTICE_KEY = 'jachwi:oauth-notice';

/** 페이지를 새로 열기 전에 결과 안내를 남긴다. 새로 연 마이 화면이 한 번 읽어 보여 준다. */
export const stashOAuthNotice = (notice: OAuthNotice) => writeJson(session, NOTICE_KEY, notice);

/** 한 번 읽으면 지운다. 형식이 다르면 없는 것으로 본다. */
export const takeStashedOAuthNotice = (): OAuthNotice | null => {
  const value = readJson(session, NOTICE_KEY);
  removeItem(session, NOTICE_KEY);
  if (value === null) return null;
  const { title, description, tone } = value;
  return typeof title === 'string' && typeof description === 'string' && (tone === 'success' || tone === 'error')
    ? { title, description, tone }
    : null;
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
 * 인증 전후 회원으로 결과를 정한다(#570 `completeOAuth` 규칙을 따른다). 화면은 연결하지 않은 회원에게만 연결을 연다.
 * - 같은 회원: 익명 회원에 처음 연결했다. 기록은 그대로다.
 * - 다른 회원: 이미 연결된 회원으로 기록을 합쳤다.
 * 연결 상태는 이 기기의 기억이라, 다른 경로로 잃은 연결 회원이 다른 계정으로 인증하면 서버의 전환을 통합으로 잘못 볼 수 있다.
 * 서버가 결과를 주면 그 값으로 바꾼다.
 */
export const resolveOAuthOutcome = (pending: PendingOAuth | null, memberId: number): OAuthOutcome => {
  if (pending === null) return 'completed';
  return pending.previousMemberId === memberId ? 'linked' : 'merged';
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
        title: `${label} 계정으로 기록을 합쳤어요`,
        description:
          '이 기기에서 남긴 매물, 체크리스트, 거리 메모를 그 계정으로 옮겼어요. 날씨 위치와 알림 설정은 계정에 있던 설정을 써요.',
      };
    case 'completed':
      return { tone: 'success', title: `${label} 계정 인증을 마쳤어요`, description: '계정의 기록으로 이어서 써요.' };
  }
};

export const createOAuthFailureNotice = (failure: OAuthFailure): OAuthNotice => {
  switch (failure) {
    case 'unfinished':
      return {
        tone: 'error',
        title: '계정 연결을 마치지 못했어요',
        description: '취소했거나 인증에 실패했어요. 지금 기록은 그대로예요. 필요할 때 다시 연결해 주세요.',
      };
    case 'cancelled':
      return {
        tone: 'error',
        title: '계정 연결을 취소했어요',
        description: '지금 기록은 그대로예요. 필요할 때 다시 연결해 주세요.',
      };
    case 'session':
      return {
        tone: 'error',
        title: '이 브라우저의 접속 정보를 확인하지 못했어요',
        description: '지금 기록은 그대로예요. 화면을 새로 고친 뒤 다시 시도해 주세요.',
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
