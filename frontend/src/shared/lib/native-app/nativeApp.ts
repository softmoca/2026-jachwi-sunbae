type NativeAppContext = {
  platform: string;
  version: number;
  /** 앱이 웹에 알려 주는 네이티브 기능(`mobile/src/webBridge.ts`의 `NativeAppFeature`). */
  features?: readonly string[];
  /** 키까지 갖춰 지금 쓸 수 있는 네이티브 로그인 제공자(예: `['apple', 'kakao']`). 앱 2.2.0부터 알린다. */
  authProviders?: readonly string[];
  /** 설치된 앱 버전과 빌드 번호. 못 읽으면 `null`이다. 앱 2.2.0부터 알린다. */
  appVersion?: string | null;
  appBuild?: string | null;
};

declare global {
  interface Window {
    __JACHWI_NATIVE_APP__?: NativeAppContext;
    /** react-native-webview가 넣는 앱으로 보내는 통로. */
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

export const isRunningInNativeApp = (): boolean =>
  typeof window !== 'undefined' &&
  (window.__JACHWI_NATIVE_APP__ !== undefined || navigator.userAgent.includes('JachwiSunbae/'));

/** 앱이 그 기능을 알렸는지 본다. 기능 목록이 없는 앱은 아무 기능도 없다고 본다. */
export const hasNativeAppFeature = (feature: string): boolean =>
  typeof window !== 'undefined' && window.__JACHWI_NATIVE_APP__?.features?.includes(feature) === true;

/** 앱이 알린 네이티브 로그인 제공자. 목록이 없거나 형식이 다르면 빈 목록이다. */
export const getNativeAuthProviders = (): readonly string[] => {
  if (typeof window === 'undefined') return [];
  const providers: unknown = window.__JACHWI_NATIVE_APP__?.authProviders;
  return Array.isArray(providers) ? providers.filter((value): value is string => typeof value === 'string') : [];
};

/** 앱으로 메시지를 보낸다. 앱 WebView가 아니거나 보내지 못하면 `false`다. */
export const postNativeAppMessage = (message: unknown): boolean => {
  const target = typeof window === 'undefined' ? undefined : window.ReactNativeWebView;
  if (target === undefined || typeof target.postMessage !== 'function') return false;
  try {
    target.postMessage(JSON.stringify(message));
    return true;
  } catch {
    return false;
  }
};
