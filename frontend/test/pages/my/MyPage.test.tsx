import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { StrictMode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createMockWeatherForecast } from '@/app/mocks/handlers/weatherHandlers';
import AppRoutes from '@/app/router/AppRoutes';
import { getAuthenticationSnapshot } from '@/features/auth/model/authStore';
import WeatherSummaryCard from '@/features/weather/ui/weather-summary-card/WeatherSummaryCard';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

import { server } from '../../server';

const config = { apiBaseUrl: 'http://localhost:8080', mapProviderMode: 'demo' } as const;
const success = (data: unknown) => HttpResponse.json({ code: 'SUCCESS', message: '요청에 성공했습니다.', data });
const SEOUL = { latitude: 37.5665, longitude: 126.978 };

/** 서버 수신 동의를 기억하고, 위치 저장·수신 동의 변경 요청을 기록하는 날씨 API */
const useWeatherServer = ({
  enabled = false,
  failUpdate = false,
  forecast = createMockWeatherForecast('2026-10-26'),
}: { enabled?: boolean; failUpdate?: boolean; forecast?: unknown } = {}) => {
  const state = { enabled, savedLocations: [] as unknown[], updates: [] as boolean[] };
  server.use(
    http.get('*/api/members/me/weather-notification-settings', () => success({ enabled: state.enabled })),
    http.put('*/api/members/me/weather-notification-settings', async ({ request }) => {
      const body = (await request.json()) as { enabled: boolean };
      state.updates.push(body.enabled);
      if (failUpdate)
        return HttpResponse.json({ code: 'INTERNAL_ERROR', message: '실패', errors: [] }, { status: 500 });
      state.enabled = body.enabled;
      return success({ enabled: state.enabled });
    }),
    http.put('*/api/members/me/weather-location', async ({ request }) => {
      state.savedLocations.push(await request.json());
      return success({ available: true, gridX: 60, gridY: 127, updatedAt: '2026-10-26T00:00:00Z' });
    }),
    http.get('*/api/weather/forecasts', () => success(forecast)),
    http.get('*/api/maps/reverse-geocode', () =>
      success({ roadAddress: '서울 중구 세종대로 110', jibunAddress: '서울 중구 태평로1가 31', ...SEOUL }),
    ),
  );
  return state;
};

const originalGeolocation = navigator.geolocation;
const mockGeolocation = (result: 'allowed' | 'denied' | 'unavailable') => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (onSuccess: PositionCallback, onError: PositionErrorCallback) => {
        if (result === 'allowed') {
          onSuccess({ coords: { ...SEOUL, accuracy: 10 } } as GeolocationPosition);
          return;
        }
        onError({
          code: result === 'denied' ? 1 : 2,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      },
    },
  });
};

const CurrentPath = () => <output aria-label="현재 경로">{useLocation().pathname}</output>;

const renderMyPage = () =>
  render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <PublicConfigProvider config={config}>
          <MemoryRouter initialEntries={['/me']}>
            <AppRoutes />
            <CurrentPath />
          </MemoryRouter>
        </PublicConfigProvider>
      </QueryClientProvider>
    </StrictMode>,
  );

const renderWeatherCard = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
      }
    >
      <PublicConfigProvider config={config}>
        <WeatherSummaryCard />
      </PublicConfigProvider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 2 };
});

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: originalGeolocation });
});

describe('마이 화면', () => {
  it('생활 날씨, 개인정보 처리방침, 초기화만 두고, 알림을 켜면 현재 위치를 저장하고 그 위치의 날씨를 보인다', async () => {
    const user = userEvent.setup();
    const weather = useWeatherServer();
    mockGeolocation('allowed');
    renderMyPage();
    expect(await screen.findByText('생활 날씨 알림이 꺼져 있어요')).toBeInTheDocument();
    // 홈의 빠른 메뉴와 겹치는 기록 메뉴나 날씨 상세·설정으로 가는 길은 두지 않는다.
    expect(screen.queryByRole('navigation', { name: '내 기록' })).not.toBeInTheDocument();
    expect(screen.queryByText(/프로토타입|샘플|시연/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /개인정보 처리방침/ })).toHaveAttribute('href', '/privacy');

    // 계정과 데이터를 완전히 지우는 것은 초기화 아래 링크로, 회원 번호가 채워진 메일을 연다.
    expect(screen.getByRole('button', { name: /^초기화/ })).toBeInTheDocument();
    const mailLink = screen.getByRole('link', { name: '계정과 데이터를 완전히 지우려면 메일로 요청해 주세요' });
    expect(mailLink.getAttribute('href')).toMatch(/^mailto:.+%ED%9A%8C%EC%9B%90%20%EB%B2%88%ED%98%B8%3A%201/);

    const toggle = screen.getByRole('switch', { name: '알림 받기' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
    expect(weather.savedLocations).toEqual([SEOUL]);
    expect(weather.updates).toEqual([true]);
    // 권한은 OS가 직접 묻으므로 웹은 별도 안내 창이나 토스트를 띄우지 않는다.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText(/^\d{2}시 예보$/)).toBeInTheDocument();
    expect(await screen.findByText('중구 태평로1가')).toBeInTheDocument();

    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
    expect(weather.updates).toEqual([true, false]);
    expect(screen.getByText('생활 날씨 알림이 꺼져 있어요')).toBeInTheDocument();
  });
});

describe('마이 화면의 초기화', () => {
  /** 탈퇴 요청 수를 세고, 성공하면 이어지는 로그인에서 2번 새 회원을 돌려주는 인증 API */
  const useResetServer = (result: 'success' | 'failure') => {
    const state = { resetCalls: 0, isDeleted: false };
    server.use(
      http.delete('*/api/members/me', () => {
        state.resetCalls += 1;
        if (result === 'failure') {
          return HttpResponse.json({ code: 'INTERNAL_ERROR', message: '실패', errors: [] }, { status: 500 });
        }
        state.isDeleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
      // 탈퇴로 Refresh 쿠키가 만료된 뒤의 로그인만 새 회원을 만든다.
      http.post('*/api/auth/login', () =>
        success({
          accessToken: state.isDeleted ? 'reset-member-token' : 'test-auto-login-token',
          tokenType: 'Bearer',
          expiresIn: 900,
          newMember: state.isDeleted,
          member: { memberId: state.isDeleted ? 2 : 1 },
        }),
      ),
    );
    return state;
  };

  const openResetDialog = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole('button', { name: /^초기화/ }));
    const dialog = screen.getByRole('dialog', { name: '초기화할까요?' });
    expect(dialog).toHaveTextContent(
      '새 아이디로 다시 시작해요. 지금까지의 기록은 더 이상 볼 수 없고, 90일 뒤 파기돼요.',
    );
    return dialog;
  };

  it('확인하면 새 회원으로 바꾸고 홈으로 간다', async () => {
    const user = userEvent.setup();
    useWeatherServer();
    const reset = useResetServer('success');
    renderMyPage();
    const dialog = await openResetDialog(user);

    await user.click(within(dialog).getByRole('button', { name: '초기화' }));

    await waitFor(() => expect(screen.getByRole('status', { name: '현재 경로' })).toHaveTextContent(/^\/$/));
    expect(reset.resetCalls).toBe(1);
    expect(getAuthenticationSnapshot().session).toMatchObject({ accessToken: 'reset-member-token', memberId: 2 });
  });

  it('실패하면 대화상자에 안내하고 지금 회원과 화면을 그대로 둔다', async () => {
    const user = userEvent.setup();
    useWeatherServer();
    const reset = useResetServer('failure');
    renderMyPage();
    const dialog = await openResetDialog(user);

    await user.click(within(dialog).getByRole('button', { name: '초기화' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      '초기화하지 못했어요. 지금 아이디와 기록은 그대로예요.',
    );
    expect(reset.resetCalls).toBe(1);
    expect(screen.getByRole('status', { name: '현재 경로' })).toHaveTextContent('/me');
    expect(getAuthenticationSnapshot()).toMatchObject({ terminationReason: null, session: { memberId: 1 } });
  });

  it('취소하면 초기화 요청을 보내지 않는다', async () => {
    const user = userEvent.setup();
    useWeatherServer();
    const reset = useResetServer('success');
    renderMyPage();
    const dialog = await openResetDialog(user);

    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(reset.resetCalls).toBe(0);
    expect(getAuthenticationSnapshot().session?.memberId).toBe(1);
    expect(screen.getByRole('status', { name: '현재 경로' })).toHaveTextContent('/me');
  });
});

describe('생활 날씨 카드의 알림 받기', () => {
  it('알림을 켜 둔 채 열면 현재 위치를 다시 저장한다', async () => {
    const weather = useWeatherServer({ enabled: true });
    mockGeolocation('allowed');
    renderWeatherCard();
    expect(await screen.findByText(/^\d{2}시 예보$/)).toBeInTheDocument();
    expect(weather.savedLocations).toEqual([SEOUL]);
    expect(weather.updates).toEqual([]);
  });

  it('위치 권한을 거부하고 마지막 위치도 없으면 켜지 않고 이유를 알린다', async () => {
    const user = userEvent.setup();
    const weather = useWeatherServer();
    mockGeolocation('denied');
    renderWeatherCard();
    const toggle = await screen.findByRole('switch', { name: '알림 받기' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await user.click(toggle);
    expect(await screen.findByText('위치 권한을 허용해야 알림을 받을 수 있어요.')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(weather.updates).toEqual([]);
  });

  it('현재 위치를 못 잡으면 마지막 위치로 켜고 마지막 위치 기준임을 표시한다', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('jachwi-weather-last-coordinate', JSON.stringify(SEOUL));
    const weather = useWeatherServer();
    mockGeolocation('unavailable');
    renderWeatherCard();
    const toggle = await screen.findByRole('switch', { name: '알림 받기' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
    expect(weather.updates).toEqual([true]);
    expect(screen.getByText('마지막 위치 기준')).toBeInTheDocument();
  });

  it('웹 브라우저에서는 알림은 앱에서 받을 수 있다고 안내한다', async () => {
    delete window.__JACHWI_NATIVE_APP__;
    useWeatherServer();
    renderWeatherCard();
    expect(await screen.findByText('알림은 앱에서 받을 수 있어요.')).toBeInTheDocument();
  });

  it('수신 동의 저장에 실패하면 꺼진 상태로 두고 다시 시도하라고 알린다', async () => {
    const user = userEvent.setup();
    useWeatherServer({ failUpdate: true });
    mockGeolocation('allowed');
    renderWeatherCard();
    const toggle = await screen.findByRole('switch', { name: '알림 받기' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await user.click(toggle);
    expect(await screen.findByText('알림 설정을 바꾸지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('알림이 켜져 있어도 예보가 없으면 예보 준비 안내를 보인다', async () => {
    const raw = createMockWeatherForecast('2026-10-26');
    useWeatherServer({
      enabled: true,
      forecast: { ...raw, hourly: raw.hourly.map((hour) => ({ ...hour, tmp: null })) },
    });
    mockGeolocation('allowed');
    renderWeatherCard();
    expect(await screen.findByText('아직 예보 정보가 없어요')).toBeInTheDocument();
  });
});
