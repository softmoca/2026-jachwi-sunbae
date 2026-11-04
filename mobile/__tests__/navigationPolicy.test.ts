import {
  isAllowedOAuthUrl,
  isAllowedWebAppUrl,
  toWebAppUrl,
} from '../src/navigationPolicy';

describe('navigationPolicy', () => {
  it('서비스 웹 주소만 WebView 안에서 연다', () => {
    expect(isAllowedWebAppUrl('https://jachwi-sunbae.kr/properties')).toBe(
      true,
    );
    expect(isAllowedWebAppUrl('https://www.jachwi-sunbae.kr/privacy')).toBe(
      true,
    );
    expect(isAllowedWebAppUrl('https://dev.jachwi-sunbae.kr/login')).toBe(true);
    expect(isAllowedWebAppUrl('about:blank')).toBe(true);
    expect(isAllowedWebAppUrl('https://example.com')).toBe(false);
    expect(isAllowedWebAppUrl('http://jachwi-sunbae.kr')).toBe(false);
  });

  it('OAuth 제공자 화면과 백엔드 OAuth 경로만 WebView 안에 둔다', () => {
    for (const url of [
      'https://kauth.kakao.com/oauth/authorize?state=x',
      'https://accounts.kakao.com/login/?continue=https%3A%2F%2Fkauth.kakao.com',
      'https://appleid.apple.com/auth/authorize?response_mode=query',
      'https://dev-api.jachwi-sunbae.kr/api/auth/oauth/KAKAO/callback?code=c&state=s',
      'https://api.jachwi-sunbae.kr/api/auth/oauth/APPLE/callback?code=c&state=s',
    ]) {
      expect(isAllowedOAuthUrl(url)).toBe(true);
      expect(isAllowedWebAppUrl(url)).toBe(true);
    }
    for (const url of [
      // API의 다른 경로와 제공자 밖의 카카오, Apple 주소는 지금처럼 시스템 브라우저로 연다.
      'https://api.jachwi-sunbae.kr/swagger-ui/index.html',
      'https://api.jachwi-sunbae.kr/api/auth/login',
      'https://www.kakaocorp.com',
      'https://www.apple.com',
      'http://kauth.kakao.com/oauth/authorize',
      'https://user:pass@kauth.kakao.com/oauth/authorize',
      'https://kauth.kakao.com.evil.example/oauth/authorize',
      // 카카오톡 앱 로그인은 WebView 밖의 앱으로 나가므로 이번 흐름에 포함하지 않는다.
      'kakaotalk://kakaologin',
    ]) {
      expect(isAllowedOAuthUrl(url)).toBe(false);
      expect(isAllowedWebAppUrl(url)).toBe(false);
    }
  });

  it('앱 딥 링크를 운영 웹 경로로 변환한다', () => {
    expect(toWebAppUrl('jachwisunbae://properties/10?from=push#photo')).toBe(
      'https://www.jachwi-sunbae.kr/properties/10?from=push#photo',
    );
    expect(toWebAppUrl('https://jachwi-sunbae.kr/properties/10')).toBeNull();
    expect(toWebAppUrl('not-a-url')).toBeNull();
  });
});
