import {
  createPushReplyScript,
  parsePushRequest,
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
