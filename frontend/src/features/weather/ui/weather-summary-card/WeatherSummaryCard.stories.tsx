import type { Meta, StoryObj } from '@storybook/react-webpack5';

import type { WeatherForecastResponse, WeatherHour } from '../../model/weather';
import { weatherQueryKeys } from '../../model/weatherQueryKeys';
import WeatherSummaryCard from './WeatherSummaryCard';

const coordinate = { latitude: 37.4842, longitude: 126.9297 };
const LAST_COORDINATE_KEY = 'jachwi-weather-last-coordinate';

const hourly: WeatherHour[] = Array.from({ length: 24 }, (_, hour) => ({
  forecastAt: `2026-10-28T${String(hour).padStart(2, '0')}:00:00+09:00`,
  publishedAt: '2026-10-28T05:00:00+09:00',
  tmp: hour < 6 ? 8 : hour < 15 ? 8 + hour - 6 : 17 - (hour - 15),
  sky: hour < 12 ? 1 : 3,
  pty: 0,
  pop: hour < 12 ? 10 : 30,
  pcp: null,
  sno: null,
  reh: 55,
  wsd: 2.1,
}));

const forecast: WeatherForecastResponse = {
  gridX: 59,
  gridY: 125,
  date: '2026-10-28',
  timeZone: 'Asia/Seoul',
  hourly,
  tmn: 7,
  tmx: 17,
  tmnPublishedAt: '2026-10-27T23:00:00+09:00',
  tmxPublishedAt: '2026-10-28T05:00:00+09:00',
};

const meta = {
  title: '기능/날씨/WeatherSummaryCard',
  component: WeatherSummaryCard,
  decorators: [
    (Story) => (
      <div style={{ width: '22rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WeatherSummaryCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NotificationOff: Story = {
  parameters: {
    queryData: [[weatherQueryKeys.settings(null), { enabled: false }]],
  },
};

/** 마지막으로 저장한 위치의 예보를 캐시에 넣어 둔다. 스토리북에서는 위치 권한이 없어 마지막 위치 기준으로 그린다. */
export const WithForecast: Story = {
  parameters: {
    queryData: [
      [weatherQueryKeys.settings(null), { enabled: true }],
      [weatherQueryKeys.forecast(coordinate), forecast],
      [weatherQueryKeys.place(coordinate), '관악구 신림동'],
    ],
  },
  decorators: [
    (Story) => {
      try {
        window.localStorage.setItem(LAST_COORDINATE_KEY, JSON.stringify(coordinate));
      } catch {
        // 저장소를 못 쓰면 위치 없이 그린다.
      }
      return <Story />;
    },
  ],
};
