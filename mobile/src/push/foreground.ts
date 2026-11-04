import type { RemoteMessage } from '@react-native-firebase/messaging';
import type { Event, Notification } from '@notifee/react-native';

type NotifeeModule = typeof import('@notifee/react-native');

/**
 * 포그라운드와 백그라운드 알림이 함께 쓰는 Android 채널.
 * firebase.json의 messaging_android_notification_channel_id와 같아야 한다.
 */
export const PUSH_CHANNEL = { id: 'default', name: '알림' } as const;

export type PushOpen = { id: string | undefined; url: unknown };

/**
 * 앱이 켜져 있을 때 받은 푸시를 시스템 알림으로 띄우고, 그 알림을 누른 것을 알려 준다.
 * iOS는 firebase.json의 포그라운드 표시 옵션으로 OS가 배너를 띄우므로 쓰지 않는다.
 */
export type ForegroundNotifier = {
  /** 백그라운드 FCM 알림도 이 채널로 오도록 앱이 켜질 때 미리 만든다. */
  prepare: () => Promise<void>;
  show: (message: RemoteMessage) => Promise<void>;
  onOpen: (listener: (open: PushOpen) => void) => () => void;
  /** 백그라운드나 종료 상태에서 누른 알림을 꺼내 준다. 이미 처리한 알림은 다시 주지 않는다. */
  takeOpened: () => Promise<PushOpen | null>;
};

const toOpen = (notification: Notification | undefined): PushOpen | null =>
  notification ? { id: notification.id, url: notification.data?.url } : null;

const pressedOpen = (
  { type, detail }: Event,
  EventType: NotifeeModule['EventType'],
): PushOpen | null =>
  type === EventType.PRESS ? toOpen(detail.notification) : null;

// onBackgroundEvent는 index.js에서 등록되므로 훅과 모듈 변수로 주고받는다.
let backgroundOpen: PushOpen | null = null;

export const createAndroidNotifier = ({
  default: notifee,
  AndroidImportance,
  EventType,
}: NotifeeModule): ForegroundNotifier => {
  let channel: Promise<string> | null = null;
  const handled = new Set<string>();
  // 같은 알림이 백그라운드 이벤트와 getInitialNotification으로 두 번 올 수 있다.
  const once = (open: PushOpen | null) => {
    if (!open) return null;
    if (open.id) {
      if (handled.has(open.id)) return null;
      handled.add(open.id);
    }
    return open;
  };
  const ensureChannel = () => {
    channel ??= notifee
      .createChannel({
        id: PUSH_CHANNEL.id,
        name: PUSH_CHANNEL.name,
        importance: AndroidImportance.HIGH,
      })
      .catch(error => {
        channel = null;
        throw error;
      });
    return channel;
  };
  return {
    prepare: async () => {
      await ensureChannel();
    },
    show: async message => {
      if (!message.notification) return;
      const channelId = await ensureChannel();
      await notifee.displayNotification({
        id: message.messageId,
        title: message.notification.title || '자취선배',
        body: message.notification.body || '',
        data: message.data,
        android: {
          channelId,
          smallIcon: 'ic_notification',
          pressAction: { id: 'default', launchActivity: 'default' },
        },
      });
    },
    onOpen: listener =>
      notifee.onForegroundEvent(event => {
        const open = once(pressedOpen(event, EventType));
        if (open) listener(open);
      }),
    takeOpened: async () => {
      const pending = once(backgroundOpen);
      backgroundOpen = null;
      if (pending) return pending;
      return once(
        toOpen((await notifee.getInitialNotification())?.notification),
      );
    },
  };
};

// iOS에는 notifee 네이티브 모듈을 링크하지 않으므로(react-native.config.js) Android에서만 불러온다.
const loadNotifee = (): NotifeeModule => require('@notifee/react-native');

export const createForegroundNotifier = (
  os: string,
  load: () => NotifeeModule = loadNotifee,
): ForegroundNotifier | null =>
  os === 'android' ? createAndroidNotifier(load()) : null;

/**
 * 앱이 백그라운드일 때 누른 notifee 알림은 onBackgroundEvent로만 온다.
 * 앱이 다시 켜지면 usePushNotifications가 takeOpened로 꺼내 이동한다.
 */
export const registerBackgroundOpen = (
  os: string,
  load: () => NotifeeModule = loadNotifee,
) => {
  if (os !== 'android') return;
  const { default: notifee, EventType } = load();
  notifee.onBackgroundEvent(async event => {
    const open = pressedOpen(event, EventType);
    if (open) backgroundOpen = open;
  });
};
