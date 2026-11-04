type NativeAppContext = {
  platform: string;
  version: number;
  features?: readonly string[];
};

declare global {
  interface Window {
    __JACHWI_NATIVE_APP__?: NativeAppContext;
    ReactNativeWebView?: { postMessage(message: string): void };
  }
}

export const isRunningInNativeApp = (): boolean =>
  typeof window !== 'undefined' &&
  (window.__JACHWI_NATIVE_APP__ !== undefined || navigator.userAgent.includes('JachwiSunbae/'));

/** 앱이 광고한 네이티브 기능이 있는지 본다. 기능 목록이 없는 예전 앱은 아무 기능도 없다고 본다. */
export const hasNativeAppFeature = (feature: string): boolean =>
  typeof window !== 'undefined' &&
  window.__JACHWI_NATIVE_APP__?.features?.includes(feature) === true &&
  window.ReactNativeWebView !== undefined;
