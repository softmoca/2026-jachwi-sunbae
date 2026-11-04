import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, AppState, Platform } from 'react-native';
import type { RemoteMessage } from '@react-native-firebase/messaging';
import { usePushNotifications } from '../src/push/usePushNotifications';

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

const message = {
  messageId: 'm-1',
  notification: { title: '오늘 비 소식', body: '우산을 챙기세요' },
  data: { notificationId: '7', url: '/weather' },
} as unknown as RemoteMessage;

const WEB = 'https://dev.jachwi-sunbae.kr';

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
  // jest 프리셋은 currentState를 함수로 두므로 실제 앱처럼 문자열 상태를 넣는다.
  (AppState as { currentState: unknown }).currentState = 'active';
});

describe('포그라운드 푸시', () => {
  it('iOS에서는 Alert를 띄우지 않고 OS 배너에 맡긴다', async () => {
    const { navigate, unmount } = await mount('ios');
    await act(async () => {
      handlers.message(message);
    });
    expect(Alert.alert).not.toHaveBeenCalled();
    // 배너를 누르면 기존 FCM 경로로 이동한다.
    await act(async () => {
      handlers.opened(message);
    });
    expect(navigate).toHaveBeenCalledWith(`${WEB}/weather`);
    unmount();
  });

  it('Android에서는 지금처럼 Alert를 띄우고 확인을 누르면 이동한다', async () => {
    const { navigate, unmount } = await mount('android');
    await act(async () => {
      handlers.message(message);
    });
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const [title, body, buttons] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toBe('오늘 비 소식');
    expect(body).toBe('우산을 챙기세요');
    const confirm = buttons.find(
      (button: { text: string }) => button.text === '확인',
    );
    act(() => confirm.onPress());
    expect(navigate).toHaveBeenCalledWith(`${WEB}/weather`);
    unmount();
  });
});
