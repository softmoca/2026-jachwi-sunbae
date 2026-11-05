import type { Metric } from 'web-vitals';

import { getAnalyticsScreenRoute, getCurrentAnalyticsScreenRoute } from '../screenRoute';
import { getPostHogEventProperties, runPostHogAction } from './runtime';

export const WEB_VITAL_EVENT = 'web_vital';

let started = false;

/**
 * 지표 하나를 이벤트 하나로 보낸다. 플랫폼과 트래픽 구분은 `before_send`가 붙인다.
 * `screen_route`는 지표가 잰 화면(처음 연 화면)이고, `report_screen_route`는 값이 확정된 때의 화면이다.
 * CLS와 INP는 화면을 숨길 때 확정되므로 그사이 다른 화면으로 옮겼을 수 있다.
 */
export const reportPostHogWebVital = (
  metric: Pick<Metric, 'name' | 'value' | 'rating' | 'navigationType'>,
  screenRoute: string,
): boolean => {
  const properties = getPostHogEventProperties({
    metric_name: metric.name,
    // CLS는 0.0x 단위라 소수 넷째 자리까지 남기고, 나머지는 밀리초다.
    metric_value: Math.round(metric.value * 10_000) / 10_000,
    metric_rating: metric.rating,
    navigation_type: metric.navigationType,
    screen_route: screenRoute,
    report_screen_route: getCurrentAnalyticsScreenRoute() ?? screenRoute,
  });
  // CLS와 INP는 화면을 숨길 때 보고되므로 배치 대기 없이 Beacon으로 보낸다.
  return runPostHogAction((client) =>
    client.capture(WEB_VITAL_EVENT, properties, { send_instantly: true, transport: 'sendBeacon' }),
  );
};

/**
 * 첫 화면을 연 뒤 한 번만 측정을 시작한다. 측정 코드는 따로 받아 초기 번들을 늘리지 않는다.
 * 관찰자는 버퍼된 성능 기록을 읽으므로 늦게 시작해도 LCP, FCP, TTFB를 놓치지 않는다.
 */
export const startPostHogWebVitals = (): void => {
  if (started || typeof window === 'undefined') return;
  started = true;
  const screenRoute = getAnalyticsScreenRoute(window.location.pathname);
  import(/* webpackChunkName: "web-vitals" */ 'web-vitals')
    .then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      const report = (metric: Metric) => {
        reportPostHogWebVital(metric, screenRoute);
      };
      [onCLS, onFCP, onINP, onLCP, onTTFB].forEach((observe) => observe(report));
    })
    .catch(() => {
      // 측정 코드를 받지 못해도 서비스 이용에는 영향이 없다. 다시 호출하면 다시 받는다.
      started = false;
    });
};

export const resetPostHogWebVitalsForTests = (): void => {
  started = false;
};
