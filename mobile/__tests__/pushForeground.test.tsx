import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, Platform } from 'react-native';
import type { RemoteMessage } from '@react-native-firebase/messaging';
import { usePushNotifications } from '../src/push/usePushNotifications';
import {
  PUSH_CHANNEL,
  createAndroidNotifier,
  registerBackgroundOpen,
} from '../src/push/foreground';

type Handler = (...args: unknown[]) => unknown;
const handlers: Record<string, Handler> = {};

jest.mock('@react-native-firebase/messaging', () => ({
  getInitialNotification: jest.fn(async () => null),
  onMessage: jest.fn((_: unknown, fn: Handler) => {
    handlers.message = fn;
    return () => {};
  }),
  onNotificationOpenedApp: jest.fn((_: unknown, fn: Handler) => {
    handlers.opened = fn;
    return () => {};
  }),
  onTokenRefresh: jest.fn(() => () => {}),
}));

jest.mock('../src/push/service', () => ({
  getConfiguredMessaging: () => ({}),
  createNativePush: () => ({ restore: jest.fn(async () => null) }),
}));

const mockNotifee = {
  createChannel: jest.fn(async (channel: { id: string }) => channel.id),
  displayNotification: jest.fn(async () => 'id'),
  onForegroundEvent: jest.fn((fn: Handler) => {
    handlers.notifeeForeground = fn;
    return () => {};
  }),
  onBackgroundEvent: jest.fn((fn: Handler) => {
    handlers.notifeeBackground = fn;
  }),
  getInitialNotification: jest.fn(async (): Promise<unknown> => null),
};

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: mockNotifee,
  AndroidImportance: { HIGH: 4 },
  EventType: { DISMISSED: 0, PRESS: 1 },
}));

const message = {
  messageId: 'm-1',
  notification: { title: '오늘 비 소식', body: '우산을 챙기세요' },
  data: { notificationId: '7', type: 'weather', url: '/weather' },
} as unknown as RemoteMessage;

const OPENED = 'notification_id=7&notification_type=weather';

const WEB = 'https://dev.jachwi-sunbae.kr';
const loadNotifee = () => require('@notifee/react-native');

const mount = async (os: 'ios' | 'android') => {
  jest.replaceProperty(Platform, 'OS', os);
  const navigate = jest.fn();
  const Probe = () => {
    usePushNotifications(navigate, jest.fn());
    return null;
  };
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = create(<Probe />);
  });
  return {
    navigate,
    unmount: () =>
      act(() => {
        tree?.unmount();
      }),
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('포그라운드 푸시', () => {
  it('iOS에서는 Alert를 띄우지 않고 OS 배너에 맡긴다', async () => {
    const { navigate, unmount } = await mount('ios');
    await act(async () => {
      handlers.message(message);
    });
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockNotifee.displayNotification).not.toHaveBeenCalled();
    // 배너를 누르면 기존 FCM 경로로 이동한다.
    await act(async () => {
      handlers.opened(message);
    });
    expect(navigate).toHaveBeenCalledWith(`${WEB}/weather?${OPENED}`);
    unmount();
  });

  it('Android에서는 알림 채널로 시스템 알림을 띄운다', async () => {
    const { unmount } = await mount('android');
    await act(async () => {
      handlers.message(message);
    });
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockNotifee.createChannel).toHaveBeenCalledWith({
      id: 'default',
      name: '알림',
      importance: 4,
    });
    expect(mockNotifee.displayNotification).toHaveBeenCalledWith({
      id: 'm-1',
      title: '오늘 비 소식',
      body: '우산을 챙기세요',
      data: { notificationId: '7', type: 'weather', url: '/weather' },
      android: {
        channelId: PUSH_CHANNEL.id,
        smallIcon: 'ic_notification',
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    });
    unmount();
  });

  it('Android에서는 앱이 켜질 때 채널을 먼저 만들어 백그라운드 알림도 같은 채널로 오게 한다', async () => {
    const { unmount } = await mount('android');
    expect(mockNotifee.createChannel).toHaveBeenCalledTimes(1);
    expect(require('../firebase.json')['react-native']).toMatchObject({
      messaging_android_notification_channel_id: PUSH_CHANNEL.id,
    });
    unmount();
  });

  it('notification이 없는 데이터 메시지는 띄우지 않는다', async () => {
    const { unmount } = await mount('android');
    await act(async () => {
      handlers.message({ data: { url: '/weather' } });
    });
    expect(mockNotifee.displayNotification).not.toHaveBeenCalled();
    unmount();
  });

  it('Android 포그라운드 알림을 누르면 서비스 안 주소로만 이동한다', async () => {
    const { navigate, unmount } = await mount('android');
    const emit = (type: number, id: string, url: string) =>
      act(async () => {
        handlers.notifeeForeground({
          type,
          detail: {
            notification: {
              id,
              data: { notificationId: id, type: 'weather', url },
            },
          },
        });
      });
    await emit(1, 'a', '/weather');
    expect(navigate).toHaveBeenCalledWith(
      `${WEB}/weather?notification_id=a&notification_type=weather`,
    );
    // 같은 알림을 다시 눌러도 한 번만 연다.
    await emit(1, 'a', '/weather');
    await emit(1, 'b', 'https://evil.example/');
    await emit(0, 'c', '/map');
    expect(navigate).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('Android 백그라운드에서 누른 알림은 앱이 켜질 때 한 번만 이동한다', async () => {
    registerBackgroundOpen('android', loadNotifee);
    const pressed = {
      id: 'bg',
      data: { notificationId: '7', type: 'weather', url: '/weather' },
    };
    await handlers.notifeeBackground({
      type: 1,
      detail: { notification: pressed },
    });
    // 같은 알림을 getInitialNotification도 돌려줄 수 있다.
    mockNotifee.getInitialNotification.mockResolvedValue({
      notification: pressed,
    });
    const { navigate, unmount } = await mount('android');
    await act(async () => {});
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(`${WEB}/weather?${OPENED}`);
    mockNotifee.getInitialNotification.mockResolvedValue(null);
    unmount();
  });

  it('꺼진 상태에서 누른 FCM 알림도 알림 ID를 붙여 연다', async () => {
    const messaging = require('@react-native-firebase/messaging');
    messaging.getInitialNotification.mockResolvedValueOnce(message);
    const { navigate, unmount } = await mount('ios');
    expect(navigate).toHaveBeenCalledWith(`${WEB}/weather?${OPENED}`);
    unmount();
  });

  it('iOS에서는 notifee를 불러오지 않는다', () => {
    const load = jest.fn(loadNotifee);
    registerBackgroundOpen('ios', load);
    expect(load).not.toHaveBeenCalled();
  });

  it('채널 생성이 실패하면 다음 알림에서 다시 만든다', async () => {
    const notifier = createAndroidNotifier(loadNotifee());
    mockNotifee.createChannel.mockRejectedValueOnce(new Error('fail'));
    await expect(notifier.show(message)).rejects.toThrow('fail');
    await notifier.show(message);
    expect(mockNotifee.createChannel).toHaveBeenCalledTimes(2);
    expect(mockNotifee.displayNotification).toHaveBeenCalledTimes(1);
  });
});
