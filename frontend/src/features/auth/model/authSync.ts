import { clearAuthentication, getAuthenticationSnapshot } from './authStore';

/**
 * 같은 브라우저의 다른 탭에 회원이 바뀐 것을 알린다.
 * Refresh 쿠키는 탭끼리 함께 쓰므로, 한 탭이 OAuth 인증이나 로그아웃으로 쿠키를 바꾸면 다른 탭도 그 회원을 따라야 한다.
 * 알림을 받은 탭은 이전 회원의 Access Token과 캐시를 바로 버리고(늦게 온 응답도 버려진다), 화면을 새로 열어 쿠키로 다시 인증한다.
 */
const CHANNEL_NAME = 'jachwi-auth';

type MemberChangedMessage = { type: 'member-changed'; memberId: number };

const isMemberChangedMessage = (value: unknown): value is MemberChangedMessage =>
  typeof value === 'object' &&
  value !== null &&
  (value as Record<string, unknown>).type === 'member-changed' &&
  typeof (value as Record<string, unknown>).memberId === 'number';

let channel: BroadcastChannel | null = null;

const getChannel = (): BroadcastChannel | null => {
  if (channel !== null) return channel;
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
  // Node(테스트)의 BroadcastChannel은 열려 있으면 프로세스를 끝내지 못하게 한다. 브라우저에는 없는 메서드다.
  (channel as BroadcastChannel & { unref?: () => void }).unref?.();
  return channel;
};

/** 로그인으로 회원이 정해질 때마다 부른다. 같은 회원이면 받는 탭이 무시한다. */
export const announceMember = (memberId: number) => {
  try {
    getChannel()?.postMessage({ type: 'member-changed', memberId } satisfies MemberChangedMessage);
  } catch {
    // 탭 동기화는 보조 수단이다. 실패해도 이 탭의 인증은 그대로 이어간다.
  }
};

type SyncOptions = {
  /** 회원이 바뀐 뒤 화면을 다시 여는 방법. 테스트에서 바꾼다. */
  reload?: () => void;
};

/**
 * 다른 탭의 회원 변경을 듣는다. 이 탭에 아직 회원이 없거나 같은 회원이면 아무것도 하지 않는다.
 * 숨은 탭은 다시 보일 때 새로 연다. 다른 탭을 보는 동안 뒤에서 새로 고치지 않기 위해서다.
 */
export const startAuthenticationSync = ({ reload = () => window.location.reload() }: SyncOptions = {}) => {
  const current = getChannel();
  if (current === null) return () => undefined;

  let isReloadScheduled = false;
  const reloadWhenVisible = () => {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', reloadWhenVisible);
    reload();
  };

  const handleMessage = (event: MessageEvent<unknown>) => {
    if (!isMemberChangedMessage(event.data)) return;
    const memberId = getAuthenticationSnapshot().session?.memberId ?? null;
    if (memberId === null || memberId === event.data.memberId) return;

    // 세션만 비우고 오류 화면은 띄우지 않는다. 다음 요청은 바뀐 쿠키로 새 회원을 받는다.
    clearAuthentication(null);
    if (isReloadScheduled) return;
    isReloadScheduled = true;
    if (document.visibilityState === 'visible') {
      reload();
      return;
    }
    document.addEventListener('visibilitychange', reloadWhenVisible);
  };

  current.addEventListener('message', handleMessage);
  return () => {
    current.removeEventListener('message', handleMessage);
    document.removeEventListener('visibilitychange', reloadWhenVisible);
  };
};

export const closeAuthenticationSyncForTests = () => {
  channel?.close();
  channel = null;
};
