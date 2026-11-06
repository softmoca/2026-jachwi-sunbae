import type { Meta, StoryObj } from '@storybook/react-webpack5';

import type { Member } from '@/features/auth/model/Member';
import type { WeatherForecastResponse, WeatherHour } from '@/features/weather/model/weather';
import { weatherQueryKeys } from '@/features/weather/model/weatherQueryKeys';
import { currentMemberQueryKey } from '@/shared/api/queryClient';

import MyDesktopPage from './MyDesktopPage';

const member: Member = { memberId: 1024 };
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

/**
 * 데스크탑 마이. 앱에서는 회원 조회 캐시에서 회원을 읽으므로, 스토리도 같은 캐시에 회원을 넣는다.
 * 날씨 카드는 알림 설정·예보 캐시로 채운다.
 */
const meta = {
  title: '페이지/마이/데스크탑/MyDesktopPage',
  component: MyDesktopPage,
  globals: { viewport: { value: 'desktop', isRotated: false } },
  parameters: {
    layout: 'fullscreen',
    route: '/my',
  },
} satisfies Meta<typeof MyDesktopPage>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 날씨 알림을 켜 두어 마지막 위치의 오늘 예보가 보인다. */
export const Default: Story = {
  parameters: {
    queryData: [
      [currentMemberQueryKey, member],
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

/** 날씨 알림을 꺼 두었다. */
export const NotificationOff: Story = {
  parameters: {
    queryData: [
      [currentMemberQueryKey, member],
      [weatherQueryKeys.settings(null), { enabled: false }],
    ],
  },
};
