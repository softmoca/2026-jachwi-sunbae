import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMessage } from './message.mjs';
const input = {
  environment: 'development',
  title: '서비스 안내',
  body: '내용',
  path: '/properties',
};
test('개발·운영 토픽과 URL을 분리한다', () => {
  assert.equal(buildMessage(input).topic, 'jachwi-service-dev');
  const message = buildMessage({ ...input, environment: 'production' });
  assert.equal(message.topic, 'jachwi-service-prod');
  assert.equal(message.data.url, 'https://www.jachwi-sunbae.kr/properties');
});
test('개별 토큰 발송은 토픽과 동시에 사용하지 않는다', () => {
  const message = buildMessage({ ...input, token: 'private-token' });
  assert.equal(message.token, 'private-token');
  assert.equal(message.topic, undefined);
});
test('외부 링크·빈 본문·잘못된 환경을 거절한다', () => {
  for (const patch of [
    { environment: 'staging' },
    { title: '' },
    { body: '' },
    { token: '' },
    { path: '//evil.com' },
    { path: '/\\evil.com' },
    { path: 'https://evil.com' },
  ]) {
    assert.throws(() => buildMessage({ ...input, ...patch }));
  }
});
