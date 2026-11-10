import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import {
  getInitialNotification,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { WEB_APP_URL } from '../config';
import { classifyPushError, PUSH_BRIDGE_ERROR } from './errors';
import { createForegroundNotifier, type PushOpen } from './foreground';
import { createNativePush, getConfiguredMessaging } from './service';
import {
  createPushReplyScript,
  parsePushRequest,
  resolvePushOpenUrl,
} from './policy';

const ORIGIN = new URL(WEB_APP_URL).origin;

export const usePushNotifications = (
  navigate: (url: string) => void,
  inject: (script: string) => void,
) => {
  const [push] = useState(createNativePush);
  const [notifier] = useState(() =>
    push ? createForegroundNotifier(Platform.OS) : null,
  );
  useEffect(() => {
    const messaging = getConfiguredMessaging();
    if (!messaging || !push) return undefined;
    let active = true;
    const openData = (data: unknown) => {
      const url = resolvePushOpenUrl(data, WEB_APP_URL);
      if (active && url) navigate(url);
    };
    const open = (message: RemoteMessage | null) => {
      if (message) openData(message.data);
    };
    const openPressed = (pressed: PushOpen | null) => {
      if (pressed) openData(pressed.data);
    };
    const takeOpened = () => {
      notifier
        ?.takeOpened()
        .then(openPressed)
        .catch(() => undefined);
    };
    // 토큰 자체나 알림 본문을 로그/분석에 남기지 않는다.
    push.restore().catch(() => undefined);
    notifier?.prepare().catch(() => undefined);
    getInitialNotification(messaging)
      .then(open)
      .catch(() => undefined);
    const opened = onNotificationOpenedApp(messaging, open);
    takeOpened();
    const pressed = notifier?.onOpen(openPressed);
    const refreshed = onTokenRefresh(messaging, () => {
      push
        .restore()
        .then(() => {
          if (active)
            inject(
              createPushReplyScript(ORIGIN, { type: 'push:token-changed' }),
            );
        })
        .catch(() => undefined);
    });
    const received = onMessage(messaging, message => {
      // iOS는 firebase.json의 포그라운드 표시 옵션으로 OS가 배너를 띄우고,
      // 배너를 누르면 onNotificationOpenedApp으로 이동한다.
      if (!active || !message.notification) return;
      notifier?.show(message).catch(() => undefined);
    });
    const foreground = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      push.restore().catch(() => undefined);
      takeOpened();
    });
    return () => {
      active = false;
      opened();
      refreshed();
      received();
      pressed?.();
      foreground.remove();
    };
  }, [push, notifier, navigate, inject]);

  const onMessageFromWeb = useCallback(
    async (raw: string, sourceUrl: string): Promise<boolean> => {
      const request = parsePushRequest(raw);
      if (!request) return false;
      try {
        if (new URL(sourceUrl).origin !== ORIGIN) return true;
      } catch {
        return true;
      }
      const reply = (value: object) =>
        inject(
          createPushReplyScript(ORIGIN, {
            type: 'push:response',
            requestId: request.requestId,
            ...value,
          }),
        );
      if (!push) {
        reply({ ok: false, error: 'not-configured' });
        return true;
      }
      try {
        switch (request.action) {
          case 'enable':
            await push.enable();
            break;
          case 'disable':
            await push.disable();
            break;
          case 'settings':
            await Linking.openSettings();
            break;
          case 'token':
            reply({ ok: true, token: await push.token() });
            return true;
        }
        reply({ ok: true, ...(await push.status()) });
      } catch (error) {
        reply({
          ok: false,
          error: PUSH_BRIDGE_ERROR[classifyPushError(error)],
        });
      }
      return true;
    },
    [push, inject],
  );

  return { onMessageFromWeb };
};
