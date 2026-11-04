/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import { setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { registerBackgroundOpen } from './src/push/foreground';
import { getConfiguredMessaging } from './src/push/service';
import App from './App';
import { name as appName } from './app.json';

const messaging = getConfiguredMessaging();
if (messaging) {
  // notification payload는 OS가 표시한다. 여기서 재표시하거나 웹을 열지 않는다.
  setBackgroundMessageHandler(messaging, async () => {});
  // Android에서 앱이 켜져 있을 때 띄운 notifee 알림을 백그라운드에서 누른 경우를 받는다.
  registerBackgroundOpen(Platform.OS);
}
AppRegistry.registerComponent(appName, () => App);
