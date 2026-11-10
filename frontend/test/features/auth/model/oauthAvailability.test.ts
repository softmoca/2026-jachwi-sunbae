import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getAvailableOAuthProviders,
  isOAuthLinkAvailable,
  markNativeOAuthServerUnsupported,
} from '@/features/auth/model/oauthAvailability';

const APPLE_APP = { platform: 'ios', version: 2, features: ['auth'], authProviders: ['apple'] } as const;

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
  vi.unstubAllGlobals();
});

describe('OAuth 계정 연결 노출', () => {
  it('브라우저에서는 카카오와 Apple을 모두 보여 준다', () => {
    expect(isOAuthLinkAvailable()).toBe(true);
    expect(getAvailableOAuthProviders()).toEqual(['KAKAO', 'APPLE']);
  });

  it('네이티브 로그인 브리지가 없는 앱 WebView에서는 숨긴다', () => {
    window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 2 };
    expect(isOAuthLinkAvailable()).toBe(false);

    window.__JACHWI_NATIVE_APP__ = { platform: 'android', version: 2, features: ['push'] };
    expect(isOAuthLinkAvailable()).toBe(false);
  });

  it('앱 컨텍스트가 늦게 주입돼도 앱 User-Agent면 숨긴다', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 JachwiSunbae/2.1.1 ios');
    expect(isOAuthLinkAvailable()).toBe(false);
  });

  it('auth를 알려도 키를 갖춘 제공자가 없으면 숨긴다', () => {
    window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 2, features: ['push', 'auth'], authProviders: [] };
    expect(isOAuthLinkAvailable()).toBe(false);

    window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 2, features: ['auth'] };
    expect(isOAuthLinkAvailable()).toBe(false);
  });

  it('auth와 authProviders를 알린 앱에서는 그 제공자만 보여 준다', () => {
    window.__JACHWI_NATIVE_APP__ = {
      platform: 'android',
      version: 2,
      features: ['push', 'auth'],
      authProviders: ['kakao', 'unknown'],
      appVersion: '2.2.0',
    };
    expect(getAvailableOAuthProviders()).toEqual(['KAKAO']);

    window.__JACHWI_NATIVE_APP__ = {
      platform: 'ios',
      version: 2,
      features: ['auth'],
      authProviders: ['apple', 'kakao'],
    };
    expect(getAvailableOAuthProviders()).toEqual(['KAKAO', 'APPLE']);
  });

  it('서버에 네이티브 로그인 API가 없다고 확인하면 하루 동안 앱에서 숨기고, 브라우저는 그대로 보여 준다', () => {
    const now = Date.now();
    markNativeOAuthServerUnsupported(now);
    expect(isOAuthLinkAvailable()).toBe(true);

    window.__JACHWI_NATIVE_APP__ = { ...APPLE_APP };
    expect(isOAuthLinkAvailable()).toBe(false);

    vi.spyOn(Date, 'now').mockReturnValue(now + 24 * 60 * 60 * 1_000 + 1);
    expect(isOAuthLinkAvailable()).toBe(true);
    vi.restoreAllMocks();
  });
});
