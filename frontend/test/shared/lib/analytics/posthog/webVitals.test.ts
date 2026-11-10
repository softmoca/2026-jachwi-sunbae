import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockPostHog, observers } = vi.hoisted(() => ({
  mockPostHog: {
    capture: vi.fn(),
    captureException: vi.fn(),
    register: vi.fn(),
    init: vi.fn(),
  },
  observers: {
    onCLS: vi.fn(),
    onFCP: vi.fn(),
    onINP: vi.fn(),
    onLCP: vi.fn(),
    onTTFB: vi.fn(),
  },
}));

vi.mock('posthog-js', () => ({ default: mockPostHog }));
vi.mock('web-vitals', () => observers);

import { capturePostHogException, initPostHog, resetPostHogForTests } from '@/shared/lib/analytics/posthog';
import {
  resetPostHogWebVitalsForTests,
  startPostHogWebVitals,
  WEB_VITAL_EVENT,
} from '@/shared/lib/analytics/posthog/webVitals';

const getBeforeSend = async () => {
  await vi.waitFor(() => expect(mockPostHog.init).toHaveBeenCalledOnce());
  return mockPostHog.init.mock.calls[0][1].before_send;
};

describe('Web Vitals와 오류의 플랫폼, 화면 경로', () => {
  afterEach(() => {
    resetPostHogForTests();
    resetPostHogWebVitalsForTests();
    delete window.__JACHWI_NATIVE_APP__;
    window.history.replaceState(null, '', '/');
    vi.clearAllMocks();
  });

  it('처음 연 화면의 라우트 패턴으로 다섯 지표를 한 번만 관찰해 Beacon으로 보낸다', async () => {
    window.history.replaceState(null, '', '/properties/12?lat=37.5&lng=127.0');
    initPostHog('phc_test', 'https://us.i.posthog.com');
    startPostHogWebVitals();
    startPostHogWebVitals();

    await vi.waitFor(() => expect(observers.onLCP).toHaveBeenCalledOnce());
    for (const observe of Object.values(observers)) expect(observe).toHaveBeenCalledOnce();

    window.history.replaceState(null, '', '/properties/12/memo');
    const report = observers.onCLS.mock.calls[0][0];
    report({ name: 'CLS', value: 0.123456, rating: 'needs-improvement', navigationType: 'navigate' });

    await vi.waitFor(() =>
      expect(mockPostHog.capture).toHaveBeenCalledWith(
        WEB_VITAL_EVENT,
        {
          metric_name: 'CLS',
          metric_value: 0.1235,
          metric_rating: 'needs-improvement',
          navigation_type: 'navigate',
          screen_route: '/properties/:propertyId',
          report_screen_route: '/properties/:propertyId/memo',
        },
        { send_instantly: true, transport: 'sendBeacon' },
      ),
    );
  });

  it('성능 이벤트는 잰 화면을 지키고 앱 WebView 플랫폼과 트래픽 구분을 붙인다', async () => {
    window.__JACHWI_NATIVE_APP__ = { platform: 'android', version: 1 };
    window.history.replaceState(null, '', '/me');
    initPostHog('phc_test', 'https://us.i.posthog.com');
    const beforeSend = await getBeforeSend();

    const { properties } = beforeSend({
      event: WEB_VITAL_EVENT,
      properties: { metric_name: 'LCP', metric_value: 2400, screen_route: '/' },
    });

    expect(properties).toMatchObject({
      platform: 'android_webview',
      operating_system: 'android',
      traffic_type: 'external',
      screen_route: '/',
    });
  });

  it('자동 수집과 수동 수집 예외 모두 지금 화면의 라우트 패턴과 플랫폼을 싣는다', async () => {
    window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 1 };
    window.history.replaceState(null, '', '/neighborhoods/areas/1168064000?lat=37.5');
    initPostHog('phc_test', 'https://us.i.posthog.com');
    const beforeSend = await getBeforeSend();

    const automatic = beforeSend({ event: '$exception', properties: {} }).properties;
    expect(automatic).toMatchObject({
      platform: 'ios_webview',
      screen_route: '/neighborhoods/areas/:adminDongCode',
      error_category: 'uncaught',
    });

    const error = new Error('render failed');
    capturePostHogException(error, { error_category: 'render', severity: 'P0' });
    await vi.waitFor(() => expect(mockPostHog.captureException).toHaveBeenCalled());
    const manual = beforeSend({ event: '$exception', properties: mockPostHog.captureException.mock.calls[0][1] });
    expect(manual.properties).toMatchObject({
      platform: 'ios_webview',
      screen_route: '/neighborhoods/areas/:adminDongCode',
      error_category: 'render',
    });
    expect(JSON.stringify(manual.properties)).not.toContain('1168064000');
  });
});
