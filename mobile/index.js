/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { getConfiguredMessaging } from './src/push/service';
import App from './App';
import { name as appName } from './app.json';

const messaging = getConfiguredMessaging();
if (messaging) {
  // notification payload는 OS가 표시한다. 여기서 재표시하거나 웹을 열지 않는다.
  setBackgroundMessageHandler(messaging, async () => {});
}
AppRegistry.registerComponent(appName, () => App);
