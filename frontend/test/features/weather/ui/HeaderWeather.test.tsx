import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setAuthentication } from '@/features/auth/model/authStore';
import HeaderWeather from '@/features/weather/ui/header-weather/HeaderWeather';
import WeatherSummaryCard from '@/features/weather/ui/weather-summary-card/WeatherSummaryCard';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';
import { trackPostHogEvent } from '@/shared/lib/analytics/posthog';

import { installNativePush } from '../../../helpers/nativePush';
import { server } from '../../../server';

vi.mock('@/shared/lib/analytics/posthog', () => ({ trackPostHogEvent: vi.fn(() => true) }));
// 날씨 안내를 빼고 알림 안내만 남겨, 번갈아 보이지 않고 늘 보이게 한다.
vi.mock('@/features/weather/model/useHeaderWeather', () => ({
  useHeaderWeather: () => ({
    isAllowed: true,
    placeName: null,
    hour: null,
    precipitation: null,
  }),
}));

const config = { apiBaseUrl: 'http://localhost:8080', mapProviderMode: 'demo' } as const;
const success = (data: unknown) => HttpResponse.json({ code: 'SUCCESS', message: '성공', data });

const useNotificationServer = ({ failUpdate = false } = {}) => {
  const state = { enabled: false, updates: [] as boolean[] };
  server.use(
    http.get('*/api/members/me/notification-settings', () => success({ enabled: state.enabled })),
    http.put('*/api/members/me/notification-devices/current', async ({ request }) => {
      const body = (await request.json()) as { installationId: string };
      return success({ installationId: body.installationId });
    }),
    http.delete('*/api/members/me/notification-devices/current', () => new HttpResponse(null, { status: 204 })),
    http.put('*/api/members/me/notification-settings', async ({ request }) => {
      const body = (await request.json()) as { enabled: boolean };
      state.updates.push(body.enabled);
      if (failUpdate)
        return HttpResponse.json({ code: 'INTERNAL_ERROR', message: '실패', errors: [] }, { status: 500 });
      state.enabled = body.enabled;
      return success({ enabled: state.enabled });
    }),
  );
  return state;
};

const renderHeader = ({ withMyCard = false } = {}) => {
  setAuthentication({ accessToken: 'fake-header-member', tokenType: 'Bearer', memberId: 1, expiresIn: 900 });
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
      }
    >
      <PublicConfigProvider config={config}>
        <MemoryRouter initialEntries={['/']}>
          <HeaderWeather />
          {withMyCard && <WeatherSummaryCard />}
        </MemoryRouter>
      </PublicConfigProvider>
    </QueryClientProvider>,
  );
};

beforeEach(() => vi.mocked(trackPostHogEvent).mockClear());

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
  delete window.ReactNativeWebView;
});

describe('헤더의 알림 받기', () => {
  it('누르면 마이로 가지 않고 그 자리에서 켜며, 헤더 안내가 사라지고 마이 토글도 켜진다', async () => {
    const user = userEvent.setup();
    installNativePush();
    const notifications = useNotificationServer();
    renderHeader({ withMyCard: true });

    const button = await screen.findByRole('button', { name: /알림 받기/ });
    expect(screen.queryByRole('link', { name: /알림 받기/ })).not.toBeInTheDocument();
    // 위치가 없어도 헤더에서는 위치를 묻지 않고 알림 받기 안내만 보인다.
    expect(screen.queryByText(/위치를 허용하면/)).not.toBeInTheDocument();
    await user.click(button);

    await waitFor(() => expect(screen.queryByRole('button', { name: /알림 받기/ })).not.toBeInTheDocument());
    expect(notifications.updates).toEqual([true]);
    expect(screen.getByRole('switch', { name: '알림 받기' })).toHaveAttribute('aria-checked', 'true');
    expect(trackPostHogEvent).toHaveBeenCalledWith('notification_toggled', {
      entrypoint: 'header',
      enabled: true,
      outcome: 'enabled',
    });
  });

  it('켜는 동안에는 잠가 다시 눌러도 한 번만 요청한다', async () => {
    const user = userEvent.setup();
    const native = installNativePush();
    const notifications = useNotificationServer();
    renderHeader();

    const button = await screen.findByRole('button', { name: /알림 받기/ });
    native.paused = true;
    await user.click(button);
    expect(button).toBeDisabled();
    await user.click(button);
    native.paused = false;
    native.replies.splice(0).forEach((reply) => reply());

    await waitFor(() => expect(notifications.updates).toEqual([true]));
    await waitFor(() => expect(screen.queryByRole('button', { name: /알림 받기/ })).not.toBeInTheDocument());
  });

  it('기기 알림 권한을 거부하면 알림 받기를 누르면 기기 설정을 연다', async () => {
    const user = userEvent.setup();
    const native = installNativePush();
    native.permissionGranted = false;
    const notifications = useNotificationServer();
    renderHeader();

    await user.click(await screen.findByRole('button', { name: /알림 받기/ }));
    const allow = await screen.findByRole('button', { name: /알림 받기/ });
    expect(notifications.updates).not.toContain(true);
    expect(trackPostHogEvent).toHaveBeenCalledWith('notification_toggled', {
      entrypoint: 'header',
      enabled: true,
      outcome: 'permission_denied',
    });

    await user.click(allow);
    await waitFor(() => expect(native.actions).toContain('settings'));
  });

  it('켜지 못하면 헤더 안내를 그대로 두고 다시 시도하라고 알린다', async () => {
    const user = userEvent.setup();
    installNativePush();
    useNotificationServer({ failUpdate: true });
    renderHeader();

    await user.click(await screen.findByRole('button', { name: /알림 받기/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('알림을 켜지 못했어요. 다시 시도해 주세요.');
    expect(screen.getByRole('button', { name: /알림 받기/ })).toBeEnabled();
    expect(trackPostHogEvent).toHaveBeenCalledWith('notification_toggle_failed', {
      entrypoint: 'header',
      enabled: true,
    });
  });

  it('마이 토글은 같은 이벤트 이름에 누른 곳만 마이로 남긴다', async () => {
    const user = userEvent.setup();
    installNativePush();
    useNotificationServer();
    renderHeader({ withMyCard: true });

    const toggle = await screen.findByRole('switch', { name: '알림 받기' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
    expect(screen.queryByRole('button', { name: /알림 받기/ })).not.toBeInTheDocument();
    expect(trackPostHogEvent).toHaveBeenCalledWith('notification_toggled', {
      entrypoint: 'my',
      enabled: true,
      outcome: 'enabled',
    });
  });

  it('웹 브라우저에서는 알림 안내를 보이지 않는다', async () => {
    useNotificationServer();
    renderHeader();
    await waitFor(() => expect(screen.queryByText(/알림/)).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /알림 받기/ })).not.toBeInTheDocument();
  });
});
