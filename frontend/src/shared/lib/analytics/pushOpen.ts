import { trackPostHogEvent } from './posthog';

/** 앱이 푸시로 화면을 열 때 붙이는 쿼리. mobile의 `PUSH_OPEN_PARAMS`와 같아야 한다. */
export const PUSH_OPEN_PARAMS = ['notification_id', 'notification_type'] as const;

const RETRY_DELAY_MS = 500;
const MAX_ATTEMPTS = 20;

// 이 모듈은 라우터보다 먼저 실행되어 수집이 아직 초기화되지 않았다. 초기화될 때까지 잠시 다시 시도하고, 수집이 꺼져 있으면 포기한다.
const sendPushOpened = (properties: Record<string, string>, attempt = 1): void => {
  if (trackPostHogEvent('push_opened', properties) || attempt >= MAX_ATTEMPTS) return;
  window.setTimeout(() => sendPushOpened(properties, attempt + 1), RETRY_DELAY_MS);
};

/**
 * 푸시 쿼리를 주소에서 지우고 `push_opened`를 한 번 보낸다. 화면 경로(`screen_route`)는 수집 계층이 붙인다.
 * 라우터가 주소를 읽기 전에 지우므로 페이지뷰 경로에 남지 않고, 새로고침이나 뒤로 가기로 다시 열어도 또 기록하지 않는다.
 * 형식에 맞지 않는 값은 지우기만 하고 싣지 않는다.
 */
export const takePushOpenFromLocation = (): void => {
  const url = new URL(window.location.href);
  const [id, type] = PUSH_OPEN_PARAMS.map((key) => url.searchParams.get(key));
  if (id === null && type === null) return;
  PUSH_OPEN_PARAMS.forEach((key) => url.searchParams.delete(key));
  window.history.replaceState(window.history.state, '', url);
  if (!id || !/^[\w-]{1,64}$/.test(id)) return;
  sendPushOpened({
    notification_id: id,
    ...(type && /^[a-z_]{1,32}$/.test(type) && { notification_type: type }),
  });
};

// main.tsx가 푸시 쿼리가 있을 때만 이 모듈을 불러온다.
takePushOpenFromLocation();
