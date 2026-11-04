import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapLocationError } from '@/features/map/lib/mapLocation';
import { requestWeatherLocation, WEATHER_LOCATION_DEADLINE_MS } from '@/features/weather/lib/weatherLocation';

const SEOUL = { latitude: 37.5665, longitude: 126.978 };
const originalGeolocation = navigator.geolocation;

/** 부를 때마다 차례대로 응답한다. silent는 iOS kCLErrorLocationUnknown처럼 아무 답도 하지 않는다. */
const mockGeolocation = (...answers: ('success' | 'denied' | 'unavailable' | 'silent')[]) => {
  const calls: PositionOptions[] = [];
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (onSuccess: PositionCallback, onError: PositionErrorCallback, options: PositionOptions) => {
        calls.push(options);
        const answer = answers[calls.length - 1] ?? 'silent';
        if (answer === 'silent') return;
        if (answer === 'success') {
          onSuccess({ coords: { ...SEOUL, accuracy: 10 } } as GeolocationPosition);
          return;
        }
        onError({
          code: answer === 'denied' ? 1 : 2,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      },
    },
  });
  return calls;
};

const reasonOf = (error: unknown) => (error instanceof MapLocationError ? error.reason : error);

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: originalGeolocation });
});

describe('날씨 알림 위치 요청', () => {
  it('위치를 받으면 그 좌표를 돌려준다', async () => {
    mockGeolocation('success');
    await expect(requestWeatherLocation()).resolves.toEqual(SEOUL);
  });

  it('위치 권한을 거부하면 다시 묻지 않고 거부로 끝낸다', async () => {
    const calls = mockGeolocation('denied');
    await expect(requestWeatherLocation().catch(reasonOf)).resolves.toBe('denied');
    expect(calls).toHaveLength(1);
  });

  it('위치를 잠깐 못 잡으면 대략적인 위치로 한 번 더 묻는다', async () => {
    const calls = mockGeolocation('unavailable', 'success');
    await expect(requestWeatherLocation()).resolves.toEqual(SEOUL);
    expect(calls.map((options) => options.enableHighAccuracy)).toEqual([true, false]);
  });

  it('두 번 다 못 잡으면 일시 실패로 끝낸다', async () => {
    mockGeolocation('unavailable', 'unavailable');
    await expect(requestWeatherLocation().catch(reasonOf)).resolves.toBe('unavailable');
  });

  it('위치가 아무 답도 하지 않으면 기다림이 끝날 때 일시 실패로 끝낸다', async () => {
    vi.useFakeTimers();
    mockGeolocation('silent', 'silent');
    const result = requestWeatherLocation().catch(reasonOf);
    await vi.advanceTimersByTimeAsync(WEATHER_LOCATION_DEADLINE_MS - 1);
    let settled = false;
    void result.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('unavailable');
  });
});
