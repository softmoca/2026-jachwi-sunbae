import { isAllowedWebAppUrl, toWebAppUrl } from '../src/navigationPolicy';

describe('navigationPolicy', () => {
  it('서비스 웹 주소만 WebView 안에서 연다', () => {
    expect(isAllowedWebAppUrl('https://jachwi-sunbae.kr/properties')).toBe(true);
    expect(isAllowedWebAppUrl('https://www.jachwi-sunbae.kr/privacy')).toBe(true);
    expect(isAllowedWebAppUrl('https://dev.jachwi-sunbae.kr/login')).toBe(true);
    expect(isAllowedWebAppUrl('about:blank')).toBe(true);
    expect(isAllowedWebAppUrl('https://example.com')).toBe(false);
    expect(isAllowedWebAppUrl('http://jachwi-sunbae.kr')).toBe(false);
  });

  it('앱 딥 링크를 운영 웹 경로로 변환한다', () => {
    expect(toWebAppUrl('jachwisunbae://properties/10?from=push#photo')).toBe(
      'https://www.jachwi-sunbae.kr/properties/10?from=push#photo',
    );
    expect(toWebAppUrl('https://jachwi-sunbae.kr/properties/10')).toBeNull();
    expect(toWebAppUrl('not-a-url')).toBeNull();
  });
});
