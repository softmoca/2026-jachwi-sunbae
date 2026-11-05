import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  deleteToken,
  getAPNSToken,
  getMessaging,
  getToken,
  hasPermission,
  registerDeviceForRemoteMessages,
  requestPermission,
  setAutoInitEnabled,
  subscribeToTopic,
  unsubscribeFromTopic,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import { APP_ENV } from '../config';
import { createPushController } from './controller';
import { waitForApnsToken } from './errors';

const CHOICE_KEY = '@jachwi/push/choice-v1';
const REGISTERED_KEY = '@jachwi/push/registered-v1';
// 공개 서비스 안내만 허용한다. 개인 정보·개인 매물 알림에는 토픽을 사용하지 않는다.
export const PUSH_TOPIC =
  APP_ENV === 'dev' ? 'jachwi-service-dev' : 'jachwi-service-prod';
export const getConfiguredMessaging = () =>
  getApps().length ? getMessaging() : null;

export const createNativePush = () => {
  const messaging = getConfiguredMessaging();
  if (!messaging) return null;
  const checkPermission = async () => {
    if (Platform.OS === 'android') {
      return (
        Number(Platform.Version) < 33 ||
        PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        )
      );
    }
    const permission = await hasPermission(messaging);
    return (
      permission === AuthorizationStatus.AUTHORIZED ||
      permission === AuthorizationStatus.PROVISIONAL
    );
  };
  return createPushController({
    getChoice: () => AsyncStorage.getItem(CHOICE_KEY),
    setChoice: value => AsyncStorage.setItem(CHOICE_KEY, value),
    hasPermission: checkPermission,
    requestPermission: async () => {
      if (Platform.OS === 'android') {
        return (
          Number(Platform.Version) < 33 ||
          (await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          )) === PermissionsAndroid.RESULTS.GRANTED
        );
      }
      await requestPermission(messaging, {
        alert: true,
        badge: true,
        sound: true,
      });
      return checkPermission();
    },
    register: async () => {
      await setAutoInitEnabled(messaging, true);
      if (Platform.OS === 'ios') {
        // 이미 등록된 앱도 실행마다 다시 등록해야 이번 실행에서 APNs 토큰이 온다.
        // 등록 호출이 실패하면 아래 대기가 apns_timeout으로 알려 준다.
        if (!(await getAPNSToken(messaging).catch(() => null))) {
          await registerDeviceForRemoteMessages(messaging).catch(
            () => undefined,
          );
        }
        // APNs 토큰은 등록 직후 비동기로 온다. 오기 전에 FCM 토큰을 요청하면 실패하므로 기다린다.
        await waitForApnsToken(() => getAPNSToken(messaging));
      }
      const token = await getToken(messaging);
      await AsyncStorage.setItem(REGISTERED_KEY, 'yes');
      return token;
    },
    subscribe: () => subscribeToTopic(messaging, PUSH_TOPIC),
    unregister: async () => {
      await setAutoInitEnabled(messaging, false);
      // 동의한 적 없는 최초 실행에서는 토큰을 새로 만들지 않는다.
      if ((await AsyncStorage.getItem(REGISTERED_KEY)) === 'yes') {
        await unsubscribeFromTopic(messaging, PUSH_TOPIC);
        await deleteToken(messaging);
        await AsyncStorage.removeItem(REGISTERED_KEY);
      }
    },
  });
};
