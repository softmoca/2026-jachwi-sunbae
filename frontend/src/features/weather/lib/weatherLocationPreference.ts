import { readLastWeatherCoordinate } from './lastWeatherCoordinate';

const STORAGE_KEY = 'jachwi-weather-location-enabled';

/** 사용자가 위치 토글을 직접 고른 값. 고른 적이 없으면 null. */
export const readWeatherLocationChoice = (storage: Storage = window.localStorage): 'on' | 'off' | null => {
  try {
    const value = storage.getItem(STORAGE_KEY);
    return value === 'on' || value === 'off' ? value : null;
  } catch {
    return null;
  }
};

/**
 * 날씨에 현재 위치를 쓸지. 알림 설정과 따로 고른다.
 * 고른 적이 없으면 예전처럼 마지막 위치가 있는 사람은 켜진 것으로 본다.
 */
export const readWeatherLocationEnabled = (storage: Storage = window.localStorage): boolean => {
  try {
    const value = storage.getItem(STORAGE_KEY);
    if (value === 'on') return true;
    if (value === 'off') return false;
  } catch {
    // 저장소를 못 읽으면 아래 기본값을 쓴다.
  }
  return readLastWeatherCoordinate(storage) !== null;
};

export const writeWeatherLocationEnabled = (enabled: boolean, storage: Storage = window.localStorage) => {
  try {
    storage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // 저장소를 못 쓰는 브라우저에서는 이번 화면에서만 적용된다.
  }
};
