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
