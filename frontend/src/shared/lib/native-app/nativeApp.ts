type NativeAppContext = {
  platform: string;
  version: number;
  /** 앱이 웹에 알려 주는 네이티브 기능(`mobile/src/webBridge.ts`의 `NativeAppFeature`). */
  features?: readonly string[];
};

declare global {
  interface Window {
    __JACHWI_NATIVE_APP__?: NativeAppContext;
  }
}

export const isRunningInNativeApp = (): boolean =>
  typeof window !== 'undefined' &&
  (window.__JACHWI_NATIVE_APP__ !== undefined || navigator.userAgent.includes('JachwiSunbae/'));

/** 앱이 그 기능을 알렸는지 본다. 기능 목록이 없는 앱은 아무 기능도 없다고 본다. */
export const hasNativeAppFeature = (feature: string): boolean =>
  typeof window !== 'undefined' && window.__JACHWI_NATIVE_APP__?.features?.includes(feature) === true;
