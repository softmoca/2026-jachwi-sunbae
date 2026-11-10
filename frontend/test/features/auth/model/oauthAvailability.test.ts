import { afterEach, describe, expect, it, vi } from 'vitest';

import { isOAuthLinkAvailable } from '@/features/auth/model/oauthAvailability';

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
});

describe('OAuth 계정 연결 노출', () => {
  it('브라우저에서는 보인다', () => {
    expect(isOAuthLinkAvailable()).toBe(true);
  });

  it('앱 WebView에서는 숨긴다', () => {
    window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 2 };
    expect(isOAuthLinkAvailable()).toBe(false);

    window.__JACHWI_NATIVE_APP__ = { platform: 'android', version: 2, features: ['push'] };
    expect(isOAuthLinkAvailable()).toBe(false);
  });

  it('앱 컨텍스트가 늦게 주입돼도 앱 User-Agent면 숨긴다', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 JachwiSunbae/2.1.1 ios');
    expect(isOAuthLinkAvailable()).toBe(false);
  });

  it('네이티브 로그인을 지원하는 앱이 features에 auth를 알리면 보인다', () => {
    window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 2, features: ['push', 'auth'] };
    expect(isOAuthLinkAvailable()).toBe(true);
  });
});
