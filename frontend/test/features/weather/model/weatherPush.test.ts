import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setAuthentication } from '@/features/auth/model/authStore';
import { getWeatherInstallation } from '@/features/weather/lib/weatherInstallation';
import { changeWeatherPush, synchronizeWeatherPush } from '@/features/weather/model/weatherPush';

import { installNativePush } from '../../../helpers/nativePush';
import { server } from '../../../server';

const config = { apiBaseUrl: 'http://localhost:8080', mapProviderMode: 'demo' } as const;
const coordinate = { latitude: 37.5665, longitude: 126.978 };
const login = (memberId = 1) =>
  setAuthentication({ accessToken: `fake-member-${memberId}`, tokenType: 'Bearer', expiresIn: 900, memberId });
const success = (data: unknown) => HttpResponse.json({ code: 'SUCCESS', message: '성공', data });
const failure = () => HttpResponse.json({ code: 'INTERNAL_ERROR', message: '실패', errors: [] }, { status: 500 });

const mockServer = (enabled = false) => {
  const state = {
    enabled,
    calls: [] as string[],
    registrations: [] as { installationId: string; installationSecret: string; token: string }[],
    failRegister: false,
    failRevoke: false,
  };
  server.use(
    http.get('*/api/members/me/weather-notification-settings', () => success({ enabled: state.enabled })),
    http.put('*/api/members/me/weather-location', () => {
      state.calls.push('location');
      return success({ available: true });
    }),
    http.put('*/api/members/me/weather-devices/current', async ({ request }) => {
      state.calls.push('register');
      if (state.failRegister) return failure();
      const body = (await request.json()) as (typeof state.registrations)[number];
      state.registrations.push(body);
      return success({ installationId: body.installationId });
    }),
    http.delete('*/api/members/me/weather-devices/current', () => {
      state.calls.push('revoke');
      return state.failRevoke ? failure() : new HttpResponse(null, { status: 204 });
    }),
    http.put('*/api/members/me/weather-notification-settings', async ({ request }) => {
      state.enabled = ((await request.json()) as { enabled: boolean }).enabled;
      state.calls.push(state.enabled ? 'on' : 'off');
      return success({ enabled: state.enabled });
    }),
  );
  return state;
};

let native: ReturnType<typeof installNativePush>;
beforeEach(() => {
  login();
  native = installNativePush();
});
afterEach(() => {
  delete window.__JACHWI_NATIVE_APP__;
  delete window.ReactNativeWebView;
  vi.restoreAllMocks();
});

describe('생활 날씨 기기 등록', () => {
  it('위치와 기기를 등록한 뒤 동의를 켜고, 토큰을 영구 저장하지 않는다', async () => {
    const state = mockServer();
    expect(await changeWeatherPush(config, 1, true, coordinate)).toEqual({ enabled: true, problem: null });
    expect(state.calls).toEqual(['location', 'register', 'on']);
    const registration = state.registrations[0];
    expect(registration.installationSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(registration.token).toBe(native.token);
    expect(JSON.stringify(localStorage)).not.toContain(native.token);
  });

  it('기기 등록 실패 시 동의를 켜지 않는다', async () => {
    const state = mockServer();
    state.failRegister = true;
    await expect(changeWeatherPush(config, 1, true, coordinate)).rejects.toThrow();
    expect(state.enabled).toBe(false);
    expect(state.calls).toEqual(['location', 'register']);
  });

  it('권한 거절 시 토큰을 요청하지 않고 서버 동의와 등록을 해제한다', async () => {
    const state = mockServer(true);
    native.permissionGranted = false;
    expect(await changeWeatherPush(config, 1, true, coordinate)).toEqual({ enabled: false, problem: 'permission' });
    expect(state.calls).toEqual(['off', 'revoke']);
    expect(native.actions).not.toContain('token');
  });

  it('OS에서 권한을 철회하고 복귀하면 서버에서도 끈다', async () => {
    const state = mockServer(true);
    native.permissionGranted = false;
    expect(await synchronizeWeatherPush(config, 1)).toMatchObject({ enabled: false, problem: 'permission' });
    expect(state.calls).toEqual(['off', 'revoke']);
  });

  it('OFF 저장 후 토큰 정리가 실패해도 OFF로 유지하고 재진입 때 정리한다', async () => {
    const state = mockServer(true);
    state.failRevoke = true;
    expect(await changeWeatherPush(config, 1, false, null)).toEqual({ enabled: false, problem: 'cleanup' });
    expect(state.calls).toEqual(['off', 'revoke']);
    state.failRevoke = false;
    expect(await synchronizeWeatherPush(config, 1)).toEqual({ enabled: false, problem: null });
    expect(state.calls.at(-1)).toBe('revoke');
  });

  it('토큰 갱신과 회원 변경에도 같은 설치 소유 증명을 유지하고 새 회원의 동의는 켜지 않는다', async () => {
    const state = mockServer(true);
    await synchronizeWeatherPush(config, 1);
    const first = state.registrations[0];
    native.token = 'fake-rotated-token';
    await synchronizeWeatherPush(config, 1);
    login(2);
    state.enabled = false;
    await synchronizeWeatherPush(config, 2);
    expect(state.registrations).toHaveLength(3);
    expect(state.registrations[2]).toEqual({ ...first, token: native.token });
    expect(state.calls).not.toContain('on');
    expect(state.calls.at(-1)).toBe('revoke');
  });

  it('권한 응답을 기다리는 동안 회원이 바뀌면 새 회원에게 이전 ON을 적용하지 않는다', async () => {
    const state = mockServer();
    native.paused = true;
    const result = changeWeatherPush(config, 1, true, coordinate);
    const rejection = expect(result).rejects.toMatchObject({ kind: 'authentication-ended' });
    await waitFor(() => expect(native.replies).toHaveLength(1));
    login(2);
    native.paused = false;
    native.replies.shift()?.();
    await rejection;
    expect(state.calls).toEqual([]);
  });

  it('ON 중 OFF 요청이 들어오면 마지막 의도인 OFF로 끝난다', async () => {
    const state = mockServer();
    await Promise.all([changeWeatherPush(config, 1, true, coordinate), changeWeatherPush(config, 1, false, null)]);
    expect(state.calls).toEqual(['location', 'register', 'on', 'off', 'revoke']);
    expect(state.enabled).toBe(false);
  });

  it('저장소를 쓸 수 없으면 임시 설치 ID로 서버에 등록하지 않는다', async () => {
    const state = mockServer();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    await expect(changeWeatherPush(config, 1, true, coordinate)).rejects.toThrow('기기 등록 정보');
    expect(state.registrations).toEqual([]);
    expect(state.enabled).toBe(false);
  });

  it('손상된 소유 증명을 조용히 새 ID로 덮어쓰지 않는다', () => {
    localStorage.setItem('jachwi-weather-installation-v1', '{broken');
    expect(getWeatherInstallation).toThrow('기기 등록 정보');
    expect(localStorage.getItem('jachwi-weather-installation-v1')).toBe('{broken');
  });

  it('위치를 하나도 모르면 권한을 묻거나 서버에 보내지 않고 위치 문제로 끝낸다', async () => {
    const state = mockServer();
    expect(await changeWeatherPush(config, 1, true, null)).toEqual({ enabled: false, problem: 'location' });
    expect(native.actions).toEqual([]);
    expect(state.calls).toEqual([]);
  });

  it('브리지가 없는 웹·이전 앱은 ON 요청을 서버에 보내지 않는다', async () => {
    const state = mockServer();
    delete window.ReactNativeWebView;
    await expect(changeWeatherPush(config, 1, true, coordinate)).rejects.toMatchObject({ reason: 'unsupported' });
    expect(state.calls).toEqual([]);
  });

  it('설치 소유 충돌이면 이전 회원에게 남은 토큰을 네이티브에서 폐기한다', async () => {
    mockServer();
    server.use(
      http.put('*/api/members/me/weather-devices/current', () =>
        HttpResponse.json({ code: 'WEATHER_DEVICE_CONFLICT', message: '충돌', errors: [] }, { status: 400 }),
      ),
    );
    await expect(changeWeatherPush(config, 1, true, coordinate)).rejects.toMatchObject({
      code: 'WEATHER_DEVICE_CONFLICT',
    });
    expect(native.actions.at(-1)).toBe('disable');
  });
});
