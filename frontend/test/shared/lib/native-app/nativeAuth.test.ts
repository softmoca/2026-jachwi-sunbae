import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authenticate } from '@/features/auth/api/apiClient';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import { server } from '../../../server';

const config: PublicConfig = { apiBaseUrl: 'https://dev-api.jachwi-sunbae.kr' };
const success = (data: unknown) => HttpResponse.json({ code: 'SUCCESS', message: '요청에 성공했습니다.', data });

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
  delete window.ReactNativeWebView;
});

describe('앱의 Refresh 쿠키 백업', () => {
  const useLogin = () =>
    server.use(
      http.post(`${config.apiBaseUrl}/api/auth/login`, () =>
        success({ accessToken: 'access-token', tokenType: 'Bearer', expiresIn: 900, member: { memberId: 7 } }),
      ),
    );

  it('앱에서 로그인하면 쿠키 값 없이 API 출처와 쿠키 이름만 보내 백업을 요청한다', async () => {
    const postMessage = vi.fn();
    window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 2, features: ['push', 'auth'] };
    window.ReactNativeWebView = { postMessage };
    useLogin();

    await authenticate(config);

    expect(postMessage).toHaveBeenCalledTimes(1);
    const message = JSON.parse(postMessage.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(message).toMatchObject({
      type: 'auth',
      action: 'persist-session',
      origin: 'https://dev-api.jachwi-sunbae.kr',
      name: 'refresh_token',
      path: '/api/auth',
      maxAge: 365 * 24 * 60 * 60,
    });
    expect(JSON.stringify(message)).not.toContain('access-token');
  });

  it('인증 기능이 없는 예전 앱과 웹 브라우저에서는 아무것도 보내지 않는다', async () => {
    const postMessage = vi.fn();
    window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 2, features: ['push'] };
    window.ReactNativeWebView = { postMessage };
    useLogin();

    await authenticate(config);

    expect(postMessage).not.toHaveBeenCalled();
  });
});
