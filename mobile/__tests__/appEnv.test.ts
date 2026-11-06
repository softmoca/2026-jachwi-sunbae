import { resolveAppEnv } from '../src/config';

describe('resolveAppEnv', () => {
  it('번들에 박힌 환경 값을 그대로 쓴다', () => {
    expect(resolveAppEnv('dev', false)).toBe('dev');
    expect(resolveAppEnv('prod', true)).toBe('prod');
  });

  it('값이 없거나 모르는 값이면 Debug 번들인지로 정한다', () => {
    expect(resolveAppEnv(undefined, true)).toBe('dev');
    expect(resolveAppEnv(undefined, false)).toBe('prod');
    expect(resolveAppEnv('staging', false)).toBe('prod');
  });
});
