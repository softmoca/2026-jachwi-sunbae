import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PostHogTracker from '@/app/analytics/PostHogTracker';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';
import * as posthogModule from '@/shared/lib/analytics/posthog';

const testConfig: PublicConfig = {
  apiBaseUrl: 'http://localhost:8080',
  mapProviderMode: 'demo',
  naverMapClientId: '',
  posthogProjectToken: 'phc_test_token',
  posthogHost: 'https://us.i.posthog.com',
};

describe('PostHogTracker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.__JACHWI_NATIVE_APP__;
  });

  it('토큰과 호스트가 주어지면 초기화하고 현재 경로를 추적한다', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const initSpy = vi.spyOn(posthogModule, 'initPostHog');
    const trackSpy = vi.spyOn(posthogModule, 'trackPostHogPageView');

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/properties?page=1']}>
          <PublicConfigProvider config={testConfig}>
            <PostHogTracker />
          </PublicConfigProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(initSpy).toHaveBeenCalledWith('phc_test_token', 'https://us.i.posthog.com');
    expect(trackSpy).toHaveBeenCalledWith('/properties?page=1');
  });

  it('네이티브 앱 WebView에서도 제품 이용 경로를 추적한다', () => {
    window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 1 };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const initSpy = vi.spyOn(posthogModule, 'initPostHog');
    const trackSpy = vi.spyOn(posthogModule, 'trackPostHogPageView');

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/map']}>
          <PublicConfigProvider config={testConfig}>
            <PostHogTracker />
          </PublicConfigProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(initSpy).toHaveBeenCalledWith('phc_test_token', 'https://us.i.posthog.com');
    expect(trackSpy).toHaveBeenCalledWith('/map');
  });

  it.each([
    ['설정이 있으면', testConfig, 1],
    ['토큰이 없으면', { ...testConfig, posthogProjectToken: '' }, 0],
  ])('%s Web Vitals 측정 시작 여부를 정한다', (_, config, calls) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const startSpy = vi.spyOn(posthogModule, 'startPostHogWebVitals').mockImplementation(() => undefined);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <PublicConfigProvider config={config}>
            <PostHogTracker />
          </PublicConfigProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(startSpy).toHaveBeenCalledTimes(calls);
  });
});
