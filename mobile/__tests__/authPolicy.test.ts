import {
  createAuthReplyScript,
  isAuthCallbackUrl,
  isServiceApiOrigin,
  parseAuthRequest,
} from '../src/auth/policy';

const persist = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: 'auth',
    action: 'persist-session',
    requestId: 'r1',
    origin: 'https://dev-api.jachwi-sunbae.kr',
    name: 'refresh_token',
    path: '/api/auth',
    maxAge: 31536000,
    ...overrides,
  });

describe('auth policy', () => {
  it('HTTPS 인증 주소를 여는 요청만 해석한다', () => {
    expect(
      parseAuthRequest(
        JSON.stringify({
          type: 'auth',
          action: 'open',
          requestId: 'abc-1',
          url: 'https://kauth.kakao.com/oauth/authorize?state=x',
        }),
      ),
    ).toEqual({
      type: 'auth',
      action: 'open',
      requestId: 'abc-1',
      url: 'https://kauth.kakao.com/oauth/authorize?state=x',
    });
    for (const url of [
      'http://kauth.kakao.com/oauth/authorize',
      // eslint-disable-next-line no-script-url -- 실행하지 않는 차단 검증용 입력이다.
      'javascript:alert(1)',
      'https://name:pass@kauth.kakao.com',
      'not a url',
    ]) {
      expect(
        parseAuthRequest(
          JSON.stringify({ type: 'auth', action: 'open', requestId: 'r', url }),
        ),
      ).toBeNull();
    }
    expect(parseAuthRequest('{"type":"push","action":"status"}')).toBeNull();
    expect(parseAuthRequest('not json')).toBeNull();
  });

  it('우리 API 도메인의 쿠키만 백업 요청으로 받는다', () => {
    expect(parseAuthRequest(persist())).toEqual({
      type: 'auth',
      action: 'persist-session',
      requestId: 'r1',
      origin: 'https://dev-api.jachwi-sunbae.kr',
      name: 'refresh_token',
      path: '/api/auth',
      maxAge: 31536000,
    });
    for (const overrides of [
      { origin: 'https://evil.example' },
      { origin: 'https://jachwi-sunbae.kr.evil.example' },
      { origin: 'http://api.jachwi-sunbae.kr' },
      { origin: 'https://api.jachwi-sunbae.kr/api' },
      { name: 'refresh token' },
      { path: 'api/auth' },
      { maxAge: 0 },
      { maxAge: 500 * 24 * 60 * 60 },
      { requestId: '../x' },
    ]) {
      expect(parseAuthRequest(persist(overrides))).toBeNull();
    }
  });

  it('API 출처는 서비스 도메인과 그 하위 도메인만 허용한다', () => {
    expect(isServiceApiOrigin('https://api.jachwi-sunbae.kr')).toBe(true);
    expect(isServiceApiOrigin('https://jachwi-sunbae.kr')).toBe(true);
    expect(isServiceApiOrigin('https://notjachwi-sunbae.kr')).toBe(false);
  });

  it('인증 콜백 딥링크를 일반 딥링크와 구분한다', () => {
    expect(
      isAuthCallbackUrl('jachwisunbae://auth/oauth/complete?code=one-time'),
    ).toBe(true);
    expect(isAuthCallbackUrl('jachwisunbae://properties/10')).toBe(false);
    expect(isAuthCallbackUrl('https://auth.jachwi-sunbae.kr')).toBe(false);
  });

  it('응답은 요청한 웹 출처에서만 이벤트로 전달한다', () => {
    const script = createAuthReplyScript('https://www.jachwi-sunbae.kr', {
      type: 'auth:response',
      requestId: 'r1',
      ok: true,
    });
    expect(script).toContain(
      'window.location.origin === "https://www.jachwi-sunbae.kr"',
    );
    expect(script).toContain("new CustomEvent('jachwi-auth'");
  });
});
