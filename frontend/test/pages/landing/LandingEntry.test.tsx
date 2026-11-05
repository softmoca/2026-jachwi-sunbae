import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, StrictMode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AppRoutes from '@/app/router/AppRoutes';
import HomeFooter from '@/pages/design-home/ui/HomeFooter';
import LandingPage from '@/pages/landing/LandingPage';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';
import { readLandingEntryState } from '@/shared/lib/navigation/appPaths';

const { trackEvent } = vi.hoisted(() => ({
  trackEvent: vi.fn((_name: string, _properties?: Record<string, unknown>) => true),
}));
vi.mock('@/shared/lib/analytics/posthog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/analytics/posthog')>()),
  trackPostHogEvent: trackEvent,
}));

const config = { apiBaseUrl: 'http://localhost:8080', mapProviderMode: 'demo' } as const;

const CurrentPath = () => <output aria-label="현재 경로">{useLocation().pathname}</output>;

const renderWithProviders = (ui: ReactNode, path: string) =>
  render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <PublicConfigProvider config={config}>
          <MemoryRouter initialEntries={[path]}>
            {ui}
            <CurrentPath />
          </MemoryRouter>
        </PublicConfigProvider>
      </QueryClientProvider>
    </StrictMode>,
  );

const landingViews = () =>
  trackEvent.mock.calls.filter(([name]) => name === 'landing_viewed').map(([, properties]) => properties);

beforeEach(() => {
  trackEvent.mockClear();
});

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
});

describe('서비스 안에서 랜딩으로 가는 길', () => {
  it('홈 푸터의 자취선배 소개로 랜딩에 가면 돌아가기가 홈으로 잇는다', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/" element={<HomeFooter />} />
        <Route path="/landing" element={<LandingPage />} />
      </Routes>,
      '/',
    );

    await user.click(screen.getByRole('link', { name: '자취선배 소개' }));

    expect(await screen.findByRole('heading', { level: 1, name: /자취할 동네를 찾고/ })).toBeInTheDocument();
    // 주소에 진입 위치를 붙이지 않아 페이지뷰 경로는 광고 유입과 같다.
    expect(screen.getByRole('status', { name: '현재 경로' })).toHaveTextContent(/^\/landing$/);
    expect(landingViews()).toEqual([expect.objectContaining({ entry: 'home_footer' })]);
    // 첫 화면과 마지막 화면의 웹 바로가기가 모두 돌아가기로 바뀐다.
    expect(screen.queryByRole('link', { name: '웹에서 바로 시작하기' })).not.toBeInTheDocument();
    const [goBack] = screen.getAllByRole('link', { name: '서비스로 돌아가기' });
    expect(goBack).toHaveAttribute('href', '/');

    await user.click(goBack);
    expect(await screen.findByRole('link', { name: '자취선배 소개' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '현재 경로' })).toHaveTextContent(/^\/$/);
  });

  it('광고나 주소로 바로 들어오면 진입 위치는 direct이고 웹 바로가기를 그대로 둔다', async () => {
    renderWithProviders(<AppRoutes />, '/landing?utm_source=instagram');

    expect(await screen.findByRole('heading', { level: 1, name: /자취할 동네를 찾고/ })).toBeInTheDocument();
    expect(landingViews()).toEqual([expect.objectContaining({ entry: 'direct' })]);
    expect(screen.getAllByRole('link', { name: '웹에서 바로 시작하기' })[0]).toHaveAttribute(
      'href',
      '/?utm_source=instagram',
    );
    expect(screen.queryByRole('link', { name: '서비스로 돌아가기' })).not.toBeInTheDocument();
  });

  it('앱 안에서는 이미 설치했으므로 스토어 배지를 숨긴다', async () => {
    window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 1 };
    renderWithProviders(<AppRoutes />, '/landing');

    expect(await screen.findByRole('heading', { level: 1, name: /자취할 동네를 찾고/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /App Store/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Google Play/ })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('link', { name: '웹에서 바로 시작하기' }).length).toBe(2));
  });
});

describe('랜딩 진입 state 읽기', () => {
  it.each([
    [{ landingEntry: 'my', returnTo: '/me' }, null],
    [
      { landingEntry: 'home_footer', returnTo: '/' },
      { landingEntry: 'home_footer', returnTo: '/' },
    ],
    [{ landingEntry: 'home_footer', returnTo: 'https://example.com' }, null],
    [{ landingEntry: 'home_footer', returnTo: '//example.com' }, null],
    [{ landingEntry: 'ad', returnTo: '/' }, null],
    [null, null],
    ['home_footer', null],
  ])('%j는 %j로 읽는다', (state, expected) => {
    expect(readLandingEntryState(state)).toEqual(expected);
  });
});
