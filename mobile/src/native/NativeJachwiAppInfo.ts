import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * 설치된 앱의 실제 버전과 빌드 번호. JS 번들에 박힌 값이 아니라 네이티브가 읽는다.
 * - iOS: CFBundleShortVersionString, CFBundleVersion
 * - Android: PackageInfo.versionName, versionCode
 */
export type NativeAppInfo = {
  appVersion: string;
  appBuild: string;
};

export interface Spec extends TurboModule {
  getAppInfo(): NativeAppInfo;
}

export default TurboModuleRegistry.get<Spec>('JachwiAppInfo');
