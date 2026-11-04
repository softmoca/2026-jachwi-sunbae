import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import {
  getInitialNotification,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { WEB_APP_URL } from '../config';
import { createForegroundNotifier, type PushOpen } from './foreground';
import { createNativePush, getConfiguredMessaging } from './service';
import {
  createPushReplyScript,
  parsePushRequest,
  resolvePushUrl,
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
  const promptShown = useRef(false);
  const enabledNotice = useCallback(async () => {
    if (!push) return;
    try {
      const token = await push.enable();
      if (!token)
        Alert.alert(
          '알림이 꺼져 있어요',
          '기기 설정에서 자취선배 알림을 허용해 주세요.',
        );
    } catch {
      Alert.alert(
        '알림 연결을 완료하지 못했어요',
        '네트워크를 확인한 뒤 다시 시도해 주세요.',
      );
    }
  }, [push]);

  const onLoad = useCallback(async () => {
    if (!push || promptShown.current || AppState.currentState !== 'active')
      return;
    promptShown.current = true;
    try {
      if (!(await push.shouldPrompt())) return;
      await push.defer();
      Alert.alert(
        '서비스 알림을 받아볼까요?',
        '자취선배의 서비스 안내를 알림으로 받을 수 있어요. 나중에 선택해도 계속 이용할 수 있어요.',
        [
          { text: '나중에', style: 'cancel' },
          {
            text: '알림 받기',
            onPress: () => {
              enabledNotice();
            },
          },
        ],
      );
    } catch {
      // 저장소/푸시 오류가 웹 서비스 이용을 막지 않도록 한다.
    }
  }, [push, enabledNotice]);

  useEffect(() => {
    const messaging = getConfiguredMessaging();
    if (!messaging || !push) return undefined;
    let active = true;
    const openUrl = (value: unknown) => {
      const url = resolvePushUrl(value, WEB_APP_URL);
      if (active && url) navigate(url);
    };
    const open = (message: RemoteMessage | null) => openUrl(message?.data?.url);
    const openPressed = (pressed: PushOpen | null) => {
      if (pressed) openUrl(pressed.url);
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
      } catch {
        reply({ ok: false, error: 'push-unavailable' });
      }
      return true;
    },
    [push, inject],
  );

  return { onLoad, onMessageFromWeb };
};
