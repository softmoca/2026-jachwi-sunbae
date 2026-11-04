import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import AppRoutes from '@/app/router/AppRoutes';
import { getAuthenticationSnapshot } from '@/features/auth/model/authStore';
import { saveLinkedProvider } from '@/features/auth/model/oauthLink';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

import { server } from '../../server';

const config = { apiBaseUrl: 'http://localhost:8080', mapProviderMode: 'demo' } as const;
const success = (data: unknown) => HttpResponse.json({ code: 'SUCCESS', message: '요청에 성공했습니다.', data });

const CurrentPath = () => <output aria-label="현재 경로">{useLocation().pathname}</output>;

const renderMyPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      <PublicConfigProvider config={config}>
        <MemoryRouter initialEntries={['/me']}>
          <AppRoutes />
          <CurrentPath />
        </MemoryRouter>
      </PublicConfigProvider>
    </QueryClientProvider>,
  );

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
});

describe('마이 화면 계정 연결', () => {
  it('익명 회원에게 카카오와 Apple 연결을 보여 주고, 연결 전에 기록이 그 계정에 보관된다고 안내한다', async () => {
    const user = userEvent.setup();
    renderMyPage();

    expect(await screen.findByRole('heading', { name: '계정 연결' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '카카오로 계속하기' }));
    const dialog = screen.getByRole('dialog', { name: '카카오 계정을 연결할까요?' });
    expect(within(dialog).getByText(/다른 계정으로 옮길 수 없어요/)).toBeInTheDocument();
    expect(within(dialog).getByText(/지금 기록을 그쪽으로 합쳐요/)).toBeInTheDocument();
  });

  it('시작에 실패하면 지금 회원을 그대로 두고 실패를 안내한다', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/api/auth/oauth/:provider/start', () =>
        HttpResponse.json({ code: 'OAUTH_PROVIDER_UNAVAILABLE', message: '장애', errors: [] }, { status: 503 }),
      ),
    );
    renderMyPage();

    await user.click(await screen.findByRole('button', { name: 'Apple로 계속하기' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '연결하기' }));

    expect(await screen.findByRole('status', { name: '지금은 계정을 연결할 수 없어요' })).toBeInTheDocument();
    expect(getAuthenticationSnapshot().session?.memberId).toBe(1);
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('/me');
  });

  it('연결한 회원은 다른 계정으로 바꾸거나 이 기기에서만 로그아웃하고 새 익명 회원으로 홈에 간다', async () => {
    const user = userEvent.setup();
    saveLinkedProvider(1, 'KAKAO');
    let hasCookie = true;
    server.use(
      http.post('*/api/auth/logout', () => {
        hasCookie = false;
        return new HttpResponse(null, { status: 204 });
      }),
      http.post('*/api/auth/login', () =>
        success({
          accessToken: hasCookie ? 'linked-token' : 'anonymous-token',
          tokenType: 'Bearer',
          expiresIn: 900,
          member: { memberId: hasCookie ? 1 : 2 },
        }),
      ),
    );
    renderMyPage();

    expect(await screen.findByRole('heading', { name: '카카오 계정 연결됨' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '카카오로 계속하기' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apple 계정으로 바꾸기' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '로그아웃' }));
    const dialog = screen.getByRole('dialog', { name: '로그아웃할까요?' });
    expect(
      within(dialog).getByText(/카카오 계정으로 다시 인증하면 지금 기록으로 돌아올 수 있어요/),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '로그아웃' }));

    expect(await screen.findByLabelText('현재 경로')).toHaveTextContent(/^\/$/);
    expect(getAuthenticationSnapshot().session?.memberId).toBe(2);
  });

  it('인증 화면을 열 수 없는 예전 앱에서는 계정 연결을 보여 주지 않는다', async () => {
    window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 2 };
    renderMyPage();

    expect(await screen.findByRole('button', { name: /^초기화/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '계정 연결' })).not.toBeInTheDocument();
  });
});
