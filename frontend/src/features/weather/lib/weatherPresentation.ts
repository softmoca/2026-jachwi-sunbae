import type { WeatherHour } from '../model/weather';

const WEATHER_TIME_ZONE = 'Asia/Seoul';

export const forecastHour = (at: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: WEATHER_TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(
    new Date(at),
  );

export const weatherValue = (value: number | null, unit: string) => (value === null ? '정보 없음' : `${value}${unit}`);

const skyLabel = (sky: number | null) => ({ 1: '맑음', 3: '구름 많음', 4: '흐림' })[sky ?? -1] ?? '정보 없음';
const precipitationLabel = (pty: number | null) =>
  ({ 0: '없음', 1: '비', 2: '비/눈', 3: '눈', 4: '소나기' })[pty ?? -1] ?? '정보 없음';
export const weatherLabel = (hour: WeatherHour) =>
  hour.pty !== null && hour.pty !== 0 ? precipitationLabel(hour.pty) : skyLabel(hour.sky);

/** 오늘 하루 중 비나 눈이 올 가능성. 가장 높은 강수 확률이 30% 이상일 때만 알린다. */
export const todayPrecipitation = (hourly: WeatherHour[]): { label: string; pop: number } | null => {
  const pop = Math.max(0, ...hourly.map((hour) => hour.pop ?? 0));
  if (pop < 30) return null;
  const hasSnow = hourly.some((hour) => hour.pty === 2 || hour.pty === 3);
  const hasRain = hourly.some((hour) => hour.pty === 1 || hour.pty === 2 || hour.pty === 4);
  return { label: hasSnow && !hasRain ? '눈' : hasSnow ? '비/눈' : '비', pop };
};
