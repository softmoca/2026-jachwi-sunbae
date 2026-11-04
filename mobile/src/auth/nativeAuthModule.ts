import { NativeModules } from 'react-native';
import type { SessionCookie } from './policy';

/**
 * 네이티브 인증 모듈(iOS `ios/JachwiNativeUI/Sources/JachwiAuthModule.m`,
 * Android `android/app/src/main/java/com/jachwisunbae/app/auth/JachwiAuthModule.kt`).
 * - openAuthSession: iOS는 ASWebAuthenticationSession, Android는 Custom Tabs로 연다.
 *   iOS는 콜백 주소로 끝나고, Android는 앱으로 돌아온 딥링크를 `completeAuthSession`으로 넘겨 끝낸다.
 * - saveSession: WebView 쿠키 저장소에서 쿠키를 읽어 기기 저장소(iOS Keychain, Android 앱 전용 저장소)에 백업한다.
 *   쿠키가 없으면 백업을 지운다. 쿠키 값은 JS로 돌려주지 않는다.
 * - restoreSession: WebView 쿠키 저장소에 그 쿠키가 없을 때만 백업으로 되살린다.
 */
type JachwiAuthNativeModule = {
  openAuthSession(url: string, callbackScheme: string): Promise<string>;
  completeAuthSession?(callbackUrl: string): void;
  saveSession(cookie: SessionCookie): Promise<boolean>;
  restoreSession(): Promise<boolean>;
};

const nativeModule = NativeModules.JachwiAuth as
  | JachwiAuthNativeModule
  | undefined;

export const getNativeAuthModule = (): JachwiAuthNativeModule | null =>
  nativeModule ?? null;

/** 네이티브가 거절할 때 쓰는 오류 코드. 웹에 그대로 전달한다. */
export type AuthSessionError = 'cancelled' | 'busy' | 'unavailable';

export const toAuthSessionError = (error: unknown): AuthSessionError => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code: unknown }).code
      : null;
  return code === 'cancelled' || code === 'busy' ? code : 'unavailable';
};
