import { toAppInfo } from '../src/appInfo';
import type { Spec } from '../src/native/NativeJachwiAppInfo';

const nativeModule = (getAppInfo: () => unknown) =>
  ({ getAppInfo } as unknown as Spec);

describe('앱 버전과 빌드 번호', () => {
  it('네이티브가 읽은 버전과 빌드 번호를 그대로 쓴다', () => {
    expect(
      toAppInfo(nativeModule(() => ({ appVersion: '2.2.0', appBuild: '9' }))),
    ).toEqual({ appVersion: '2.2.0', appBuild: '9' });
    expect(
      toAppInfo(
        nativeModule(() => ({ appVersion: ' 2.2.0-beta.1 ', appBuild: '120' })),
      ),
    ).toEqual({ appVersion: '2.2.0-beta.1', appBuild: '120' });
  });

  it('모듈이 없으면 null로 둔다', () => {
    expect(toAppInfo(null)).toEqual({ appVersion: null, appBuild: null });
    expect(toAppInfo(undefined)).toEqual({ appVersion: null, appBuild: null });
  });

  it('네이티브가 예외를 던지거나 이상한 값을 주면 그 값만 null로 둔다', () => {
    expect(
      toAppInfo(
        nativeModule(() => {
          throw new Error('boom');
        }),
      ),
    ).toEqual({ appVersion: null, appBuild: null });
    expect(toAppInfo(nativeModule(() => null))).toEqual({
      appVersion: null,
      appBuild: null,
    });
    expect(
      toAppInfo(nativeModule(() => ({ appVersion: '', appBuild: 9 }))),
    ).toEqual({ appVersion: null, appBuild: null });
    expect(
      toAppInfo(
        nativeModule(() => ({ appVersion: '2.2.0"</script>', appBuild: '9' })),
      ),
    ).toEqual({ appVersion: null, appBuild: '9' });
    expect(
      toAppInfo(
        nativeModule(() => ({ appVersion: '1'.repeat(33), appBuild: '9' })),
      ),
    ).toEqual({ appVersion: null, appBuild: '9' });
  });
});
