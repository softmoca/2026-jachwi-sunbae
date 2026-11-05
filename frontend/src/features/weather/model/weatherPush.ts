import { ApiError } from '@/features/auth/api/apiClient';
import { getAuthenticationSnapshot } from '@/features/auth/model/authStore';
import type { MapCoordinate } from '@/features/map/lib/mapLocation';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';
import {
  disableNativePush,
  NativePushError,
  readNativePushStatus,
  readNativePushToken,
  supportsNativePush,
} from '@/shared/lib/native-app/nativePush';

import {
  fetchWeatherNotificationSettings,
  registerWeatherDevice,
  revokeWeatherDevice,
  syncWeatherLocation,
  updateWeatherNotificationSettings,
} from '../api/weatherApi';
import { getWeatherInstallation } from '../lib/weatherInstallation';

/**
 * - permission: 기기 알림 권한이 꺼져 있다.
 * - cleanup: 동의는 껐지만 기기 연결 정리에 실패했다.
 * - location: 알림을 보낼 위치를 하나도 몰라 켜지 못했다.
 */
export type WeatherPushState = { enabled: boolean; problem: 'permission' | 'cleanup' | 'location' | null };

// ON/OFF와 백그라운드 동기화가 역순으로 서버에 도착하지 않게 한다.
let queue: Promise<unknown> = Promise.resolve();
const serial = async <T>(memberId: number, work: () => Promise<T>): Promise<T> => {
  const next = queue.then(() => {
    if (getAuthenticationSnapshot().session?.memberId !== memberId) {
      throw new ApiError({ kind: 'authentication-ended' });
    }
    return work();
  });
  queue = next.catch(() => undefined);
  return next;
};

const register = async (config: PublicConfig, memberId: number) => {
  const token = await readNativePushToken();
  try {
    await registerWeatherDevice(config, memberId, { ...getWeatherInstallation(), token });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'WEATHER_DEVICE_CONFLICT') {
      // 소유 증명을 잃은 토큰이 이전 회원에 남아 있으면 그 토큰 자체를 폐기한다.
      await disableNativePush();
    }
    throw error;
  }
};

const disable = async (config: PublicConfig, memberId: number): Promise<WeatherPushState> => {
  await updateWeatherNotificationSettings(config, false, memberId);
  try {
    await revokeWeatherDevice(config, memberId);
    return { enabled: false, problem: null };
  } catch {
    // 동의 OFF는 이미 저장됐다. 토큰 정리가 실패해도 화면을 ON으로 되돌리지 않는다.
    return { enabled: false, problem: 'cleanup' };
  }
};

export const synchronizeWeatherPush = (config: PublicConfig, memberId: number) =>
  serial(memberId, async (): Promise<WeatherPushState> => {
    const settings = await fetchWeatherNotificationSettings(config, undefined, memberId);
    if (!supportsNativePush()) return { ...settings, problem: null };
    const status = await readNativePushStatus();
    if (!status.enabled || !status.permissionGranted) {
      if (settings.enabled) {
        const result = await disable(config, memberId);
        return { ...result, problem: result.problem ?? 'permission' };
      }
      await revokeWeatherDevice(config, memberId);
      return { enabled: false, problem: null };
    }
    // 새 회원이 OFF여도 같은 설치 소유 증명으로 이전 회원의 토큰 연결부터 옮겨 끊는다.
    // 새 회원에게 이전 회원의 수신 동의를 복사하지 않는다.
    await register(config, memberId);
    if (!settings.enabled) await revokeWeatherDevice(config, memberId);
    return { ...settings, problem: null };
  });

export const changeWeatherPush = (
  config: PublicConfig,
  memberId: number,
  enabled: boolean,
  coordinate: MapCoordinate | null,
) =>
  serial(memberId, async (): Promise<WeatherPushState> => {
    if (!enabled) return disable(config, memberId);
    if (!supportsNativePush()) throw new NativePushError('unsupported');
    // 알림은 저장된 위치로 보내므로, 위치를 하나도 모르면 켜지 않고 그 이유를 돌려준다.
    if (coordinate === null) return { enabled: false, problem: 'location' };
    const status = await readNativePushStatus('enable');
    if (!status.enabled || !status.permissionGranted) {
      const result = await disable(config, memberId);
      return { ...result, problem: result.problem ?? 'permission' };
    }
    // 위치·기기 등록을 모두 성공한 다음에만 수신 동의를 켠다.
    await syncWeatherLocation(config, coordinate, memberId);
    await register(config, memberId);
    const settings = await updateWeatherNotificationSettings(config, true, memberId);
    return { ...settings, problem: null };
  });
