import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setAuthentication } from '@/features/auth/model/authStore';
import { useWeatherPushSync } from '@/features/weather/model/useWeatherPushSync';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

import { installNativePush } from '../../../helpers/nativePush';
import { server } from '../../../server';

const config = { apiBaseUrl: 'http://localhost:8080', mapProviderMode: 'demo' } as const;
const success = (data: unknown) => HttpResponse.json({ code: 'SUCCESS', message: '성공', data });
const login = (memberId: number) =>
  setAuthentication({ accessToken: `fake-${memberId}`, tokenType: 'Bearer', memberId, expiresIn: 900 });

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
  delete window.ReactNativeWebView;
  vi.restoreAllMocks();
});

describe('앱 전체 날씨 기기 동기화', () => {
  it('마이 밖에서도 토큰 갱신·앱 복귀·연결 복구에 등록하고 회원 변경 후 OFF를 유지한다', async () => {
    const native = installNativePush();
    const calls: { token: string; authorization: string | null }[] = [];
    let enabled = true;
    let revocations = 0;
    server.use(
      http.get('*/api/members/me/notification-settings', () => success({ enabled })),
      http.put('*/api/members/me/notification-devices/current', async ({ request }) => {
        const body = (await request.json()) as { installationId: string; token: string };
        calls.push({ token: body.token, authorization: request.headers.get('authorization') });
        return success({ installationId: body.installationId });
      }),
      http.delete('*/api/members/me/notification-devices/current', () => {
        revocations += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <PublicConfigProvider config={config}>{children}</PublicConfigProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useWeatherPushSync(true), { wrapper });
    expect(calls).toHaveLength(0);
    act(() => {
      login(1);
    });
    await waitFor(() => expect(result.current.data?.enabled).toBe(true));
    native.token = 'fake-refreshed-token';
    act(() => {
      window.dispatchEvent(new CustomEvent('jachwi-push', { detail: { type: 'push:token-changed' } }));
    });
    await waitFor(() => expect(calls.at(-1)?.token).toBe(native.token));
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    const before = calls.length;
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    act(() => {
      visibility.mockReturnValue('hidden');
      window.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => {
      visibility.mockReturnValue('visible');
      window.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(calls.length).toBeGreaterThan(before));
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    const beforeReconnect = calls.length;
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(calls.length).toBeGreaterThan(beforeReconnect));
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    enabled = false;
    act(() => {
      login(2);
    });
    await waitFor(() => expect(result.current.data?.enabled).toBe(false));
    expect(calls.at(-1)?.authorization).toBe('Bearer fake-2');
    expect(revocations).toBe(1);
    expect(
      JSON.stringify(client.getQueryData(['authentication', 'weather', 'notification-settings', 2])),
    ).not.toContain(native.token);
  });
});
