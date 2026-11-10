import {
  createPushReplyScript,
  parsePushRequest,
  resolvePushOpenUrl,
  resolvePushUrl,
} from '../src/push/policy';

const base = 'https://www.jachwi-sunbae.kr';
describe('push policy', () => {
  it('같은 운영 환경의 내부 경로만 연다', () => {
    expect(resolvePushUrl('/properties/1?from=push#memo', base)).toBe(
      `${base}/properties/1?from=push#memo`,
    );
    expect(resolvePushUrl(`${base}/map`, base)).toBe(`${base}/map`);
    for (const value of [
      undefined,
      {},
      '//evil.com',
      // eslint-disable-next-line no-script-url -- 실행하지 않는 차단 검증용 입력이다.
      'javascript:alert(1)',
      'https://evil.com',
      'https://www.jachwi-sunbae.kr.evil.com',
      'https://name:pass@www.jachwi-sunbae.kr',
      '/\\evil.com',
      'https://dev.jachwi-sunbae.kr/map',
      'about:blank',
    ]) {
      expect(resolvePushUrl(value, base)).toBeNull();
    }
  });
  it('열 주소에 알림 ID와 종류를 쿼리로 붙인다', () => {
    const id = '0b9a7c1e-2f7d-4b8e-9a51-6f0e1d2c3b4a';
    expect(
      resolvePushOpenUrl(
        {
          notificationId: id,
          type: 'delivery_coupon',
          url: '/cheap-meals?tab=delivery#top',
        },
        base,
      ),
    ).toBe(
      `${base}/cheap-meals?tab=delivery&notification_id=${id}&notification_type=delivery_coupon#top`,
    );
    // url이 없는 푸시는 기본 화면을 연다.
    expect(
      resolvePushOpenUrl({ notificationId: id, type: 'weather' }, base),
    ).toBe(`${base}/?notification_id=${id}&notification_type=weather`);
    // 형식에 맞지 않는 종류는 싣지 않는다.
    expect(
      resolvePushOpenUrl(
        { notificationId: id, type: 'Bad Type', url: '/me' },
        base,
      ),
    ).toBe(`${base}/me?notification_id=${id}`);
  });
  it('알림 ID가 없거나 서비스 밖 주소면 예전처럼 처리한다', () => {
    expect(resolvePushOpenUrl({ url: '/me' }, base)).toBe(`${base}/me`);
    expect(
      resolvePushOpenUrl({ notificationId: 'a b', url: '/me' }, base),
    ).toBe(`${base}/me`);
    expect(
      resolvePushOpenUrl(
        { notificationId: '7', url: 'https://evil.com' },
        base,
      ),
    ).toBeNull();
    expect(resolvePushOpenUrl({}, base)).toBeNull();
    expect(resolvePushOpenUrl(undefined, base)).toBeNull();
  });
  it('알려진 명령과 요청 ID만 해석한다', () => {
    expect(
      parsePushRequest('{"type":"push","action":"token","requestId":"a_1"}'),
    ).toEqual({
      type: 'push',
      action: 'token',
      requestId: 'a_1',
    });
    for (const value of [
      'null',
      '[]',
      'bad',
      '{"type":"route"}',
      '{"type":"push","action":"send","requestId":"a"}',
      '{"type":"push","action":"enable","requestId":"<script>"}',
      'x'.repeat(1025),
    ]) {
      expect(parsePushRequest(value)).toBeNull();
    }
  });
  it('응답 스크립트도 현재 origin을 검사하고 문자열을 이스케이프한다', () => {
    const script = createPushReplyScript(base, { token: '";alert(1);//' });
    expect(script).toContain(`window.location.origin === "${base}"`);
    expect(script).toContain('"token":"\\";alert(1);//"');
  });
});
