import type { PostHogConfig } from 'posthog-js';

import { getAnalyticsDeviceContext } from '../deviceContext';
import { getCurrentAnalyticsScreenRoute } from '../screenRoute';
import { getAnalyticsTrafficContext } from '../trafficContext';
import { classifyPostHogException } from './errorClassification';
import type { PostHogAuthStatus, PostHogSessionContext } from './types';
export const isValidPostHogConfiguration = (projectToken: string, host: string): boolean => {
  if (projectToken.trim().length === 0) return false;
  try {
    const url = new URL(host);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};
export const getPostHogOptions = (
  host: string,
  getContext: () => PostHogSessionContext | null,
  isEnabled: () => boolean = () => true,
  getAuthStatus: () => PostHogAuthStatus | undefined = () => undefined,
): Partial<PostHogConfig> => ({
  api_host: host,
  autocapture: true,
  capture_exceptions: { capture_unhandled_errors: true, capture_unhandled_rejections: true },
  before_send: (event) => {
    if (event === null || !isEnabled()) return null;
    const context = getContext();
    // 수동 이벤트는 발생 당시 값을 보존한다. 자동 이벤트만 현재 상태로 보강한다.
    const authStatus =
      event.properties.auth_status === 'anonymous' || event.properties.auth_status === 'authenticated'
        ? event.properties.auth_status
        : getAuthStatus();
    const trafficType = event.properties.traffic_type;
    // 성능 이벤트처럼 잰 화면을 직접 넘긴 값은 지킨다. 나머지는 지금 화면의 라우트 패턴을 붙인다.
    const screenRoute =
      typeof event.properties.screen_route === 'string'
        ? event.properties.screen_route
        : getCurrentAnalyticsScreenRoute();
    const properties = {
      ...event.properties,
      ...context,
      ...getAnalyticsDeviceContext(),
      ...getAnalyticsTrafficContext(context?.environment ?? event.properties.environment),
      ...(['test', 'development', 'external'].includes(trafficType) ? { traffic_type: trafficType } : {}),
      ...(authStatus ? { auth_status: authStatus } : {}),
      ...(screenRoute === undefined ? {} : { screen_route: screenRoute }),
    };
    return {
      ...event,
      properties: event.event === '$exception' ? classifyPostHogException(undefined, properties) : properties,
    };
  },
  capture_pageview: false,
  disable_session_recording: false,
  session_recording: {
    // 콘솔에서 네트워크 녹화를 켜더라도 기기 토큰·설치 비밀키 요청은 수집하지 않는다.
    maskCapturedNetworkRequestFn: (request) =>
      request.name.includes('/api/members/me/notification-devices/') ? null : request,
  },
  mask_all_text: true,
  mask_all_element_attributes: true,
});
