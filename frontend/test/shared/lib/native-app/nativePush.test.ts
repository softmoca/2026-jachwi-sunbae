import { afterEach, describe, expect, it, vi } from 'vitest';

import { openNativeSettings, readNativePushStatus, readNativePushToken } from '@/shared/lib/native-app/nativePush';

import { installNativePush } from '../../../helpers/nativePush';

afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
  delete window.ReactNativeWebView;
  vi.useRealTimers();
});

describe('스토어 앱 푸시 브리지', () => {
  it('status와 token 응답을 각각 해석하고 다른 요청 ID의 응답은 무시한다', async () => {
    const native = installNativePush();
    native.paused = true;
    let completed = false;
    const pending = readNativePushStatus().then((status) => {
      completed = true;
      return status;
    });
    window.dispatchEvent(
      new CustomEvent('jachwi-push', {
        detail: { type: 'push:response', requestId: 'wrong-id', ok: true, enabled: false, permissionGranted: false },
      }),
    );
    await Promise.resolve();
    expect(completed).toBe(false);
    native.replies.shift()?.();
    expect(await pending).toEqual({ enabled: true, permissionGranted: true });
    native.paused = false;
    expect(await readNativePushToken()).toBe(native.token);
  });

  it('설정 열기는 앱에 settings 요청을 보낸다', async () => {
    const native = installNativePush();
    await openNativeSettings();
    expect(native.actions).toEqual(['settings']);
  });

  it('응답이 없으면 안전한 오류로 끝내고 리스너를 제거한다', async () => {
    vi.useFakeTimers();
    const native = installNativePush();
    native.paused = true;
    const remove = vi.spyOn(window, 'removeEventListener');
    const pending = expect(readNativePushStatus()).rejects.toMatchObject({ reason: 'unavailable' });
    await vi.advanceTimersByTimeAsync(15_000);
    await pending;
    expect(remove).toHaveBeenCalledWith('jachwi-push', expect.any(Function));
    native.replies.shift()?.();
    remove.mockRestore();
  });
});
