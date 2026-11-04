/**
 * 웹(frontend)과 주고받는 메시지 약속.
 * 웹 쪽은 `frontend/src/app/layouts/property-app-layout/useNativeTabBar.ts`에 있다.
 */

/** 앱이 웹에 알려 주는 네이티브 기능. 웹은 이 목록을 보고 자기 하단바를 숨긴다. */
export type NativeAppFeature = 'tab-bar' | 'push' | 'auth';

export type RouteMessage = {
  type: 'route';
  activeTab: string | null;
  isTabBarVisible: boolean;
};

export const createNativeContextScript = (platform: string, features: readonly NativeAppFeature[]) => `
  window.__JACHWI_NATIVE_APP__ = Object.freeze({
    platform: ${JSON.stringify(platform)},
    version: 2,
    features: Object.freeze(${JSON.stringify(features)})
  });
  window.dispatchEvent(new CustomEvent('jachwi-native-ready', {
    detail: window.__JACHWI_NATIVE_APP__
  }));
  true;
`;

/** 웹이 보낸 문자열을 해석한다. 모르는 메시지는 무시한다. */
export const parseWebMessage = (data: string): RouteMessage | null => {
  try {
    const message: unknown = JSON.parse(data);
    if (typeof message !== 'object' || message === null || !('type' in message) || message.type !== 'route') {
      return null;
    }
    const { activeTab, isTabBarVisible } = message as Record<string, unknown>;
    return {
      type: 'route',
      activeTab: typeof activeTab === 'string' ? activeTab : null,
      isTabBarVisible: isTabBarVisible === true,
    };
  } catch {
    return null;
  }
};

/** 페이지를 다시 불러오지 않고 웹 라우터로만 탭을 바꾼다. 조회 캐시가 유지된다. */
export const createSelectTabScript = (key: string) =>
  `window.__JACHWI_BRIDGE__ && window.__JACHWI_BRIDGE__.selectTab(${JSON.stringify(key)}); true;`;

/** 웹의 하단 여백과 떠 있는 버튼 위치가 탭바 높이를 기준으로 삼도록 알린다. */
export const createTabBarHeightScript = (height: number) =>
  `document.documentElement.style.setProperty('--native-tab-bar-height', '${Math.round(height)}px'); true;`;
