import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PostHogTracker from '@/app/analytics/PostHogTracker';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';
import { resetPostHogForTests, trackPostHogEvent } from '@/shared/lib/analytics/posthog';
import { takePushOpenFromLocation } from '@/shared/lib/analytics/pushOpen';
const { sdk } = vi.hoisted(() => ({
  sdk: {
    init: vi.fn(),
    capture: vi.fn(),
    register: vi.fn(),
    reset: vi.fn(),
    get_property: vi.fn(),
    identify: vi.fn(),
  },
}));
vi.mock('posthog-js', () => ({ default: sdk }));
const config: PublicConfig = {
  apiBaseUrl: 'http://localhost:8080',
  posthogProjectToken: 'phc_test',
  posthogHost: 'https://us.i.posthog.com',
  appVersion: '1.1.0',
  appEnvironment: 'development',
};
const InitialPageEvent = () => {
  useEffect(() => {
    trackPostHogEvent('property_detail_viewed', { property_id: 1 });
  }, []);
  return null;
};
describe('PostHogTracker 초기 수집 수명주기', () => {
  afterEach(() => {
    resetPostHogForTests();
    vi.resetAllMocks();
  });
  it('페이지의 첫 effect보다 먼저 초기화해 익명 첫 이벤트에도 환경 속성을 등록한다', async () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PublicConfigProvider config={config}>
            <InitialPageEvent />
            <PostHogTracker />
          </PublicConfigProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await vi.waitFor(() =>
      expect(sdk.capture).toHaveBeenCalledWith('property_detail_viewed', {
        property_id: 1,
        environment: 'development',
        app_version: '1.1.0',
        platform: 'web',
        auth_status: 'anonymous',
        traffic_type: 'development',
        device_category: 'desktop',
        operating_system: 'other',
        native_app_version: null,
      }),
    );
    expect(sdk.register).toHaveBeenCalledWith({
      environment: 'development',
      app_version: '1.1.0',
      platform: 'web',
      device_category: 'desktop',
      operating_system: 'other',
      native_app_version: null,
    });
    expect(sdk.register.mock.invocationCallOrder[0]).toBeLessThan(sdk.capture.mock.invocationCallOrder[0]);
    expect(sdk.reset).not.toHaveBeenCalled();
  });
  it('라우터보다 먼저 받은 push_opened도 수집이 초기화된 뒤 공통 속성과 함께 한 번 남긴다', async () => {
    window.history.replaceState(null, '', '/me?notification_id=n-1&notification_type=weather');
    takePushOpenFromLocation();
    render(
      <StrictMode>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <PublicConfigProvider config={config}>
              <PostHogTracker />
            </PublicConfigProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    );
    await vi.waitFor(() =>
      expect(sdk.capture).toHaveBeenCalledWith(
        'push_opened',
        expect.objectContaining({
          notification_id: 'n-1',
          notification_type: 'weather',
          app_version: '1.1.0',
          auth_status: 'anonymous',
        }),
      ),
    );
    expect(sdk.capture.mock.calls.filter(([name]) => name === 'push_opened')).toHaveLength(1);
    expect(window.location.search).toBe('');
    window.history.replaceState(null, '', '/');
  });
  it('StrictMode 재마운트에서도 익명 ID와 동일 경로 페이지뷰를 유지한다', async () => {
    const client = new QueryClient();
    render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/privacy']}>
            <PublicConfigProvider config={config}>
              <PostHogTracker />
            </PublicConfigProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    );
    await vi.waitFor(() =>
      expect(sdk.capture).toHaveBeenCalledWith('$pageview', {
        path: '/privacy',
        environment: 'development',
        app_version: '1.1.0',
        platform: 'web',
        auth_status: 'anonymous',
        traffic_type: 'development',
        device_category: 'desktop',
        operating_system: 'other',
        native_app_version: null,
      }),
    );
    expect(sdk.init).toHaveBeenCalledOnce();
    expect(sdk.capture).toHaveBeenCalledOnce();
    expect(sdk.reset).not.toHaveBeenCalled();
  });
  it('설정이 늦게 활성화되어도 같은 경로와 공통 속성을 수집한다', async () => {
    const client = new QueryClient();
    const view = (value: PublicConfig) => (
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PublicConfigProvider config={value}>
            <PostHogTracker />
          </PublicConfigProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
    const rendered = render(view({ ...config, posthogProjectToken: '' }));
    expect(sdk.capture).not.toHaveBeenCalled();
    rendered.rerender(view(config));
    await vi.waitFor(() =>
      expect(sdk.capture).toHaveBeenCalledWith('$pageview', {
        path: '/',
        environment: 'development',
        app_version: '1.1.0',
        platform: 'web',
        auth_status: 'anonymous',
        traffic_type: 'development',
        device_category: 'desktop',
        operating_system: 'other',
        native_app_version: null,
      }),
    );
    expect(sdk.register).toHaveBeenCalledWith({
      environment: 'development',
      app_version: '1.1.0',
      platform: 'web',
      device_category: 'desktop',
      operating_system: 'other',
      native_app_version: null,
    });
  });
});
