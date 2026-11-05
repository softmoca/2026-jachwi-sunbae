import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { fn } from 'storybook/test';

import type { NearbyAgency } from '@/features/map/model/Map';

import type { NeighborhoodPreviewContext } from '../../hooks/useNeighborhoodPreview';
import AreaPlacesSheet from './AreaPlacesSheet';

type Area = NonNullable<NeighborhoodPreviewContext['selected']>;

const area: Area = {
  adminDongCode: '1144069000',
  name: '망원1동',
  fullName: '서울특별시 마포구 망원1동',
  commuteMinutes: 32,
  center: { latitude: 37.5559, longitude: 126.9019 },
  polygons: [],
  simplifiedPolygons: undefined,
  stations: [
    {
      stopId: 'BS_TAGO_11440001',
      stopName: '망원역',
      travelMinutes: 32,
      direction: null,
      latitude: 37.5561,
      longitude: 126.9101,
    },
    {
      stopId: 'BS_TAGO_11440002',
      stopName: '망원시장',
      travelMinutes: 36,
      direction: null,
      latitude: 37.5563,
      longitude: 126.9058,
    },
  ],
  rent: { monthlyRentKrw: 620000, depositKrw: 10000000, transactionCount: 27, legalDongNames: ['망원동'] },
};

const agencies: NearbyAgency[] = [
  {
    providerPlaceId: 'kakao:1',
    name: '망원역 공인중개사',
    address: '서울 마포구 망원로 12',
    latitude: 37.5558,
    longitude: 126.9095,
    distanceMeters: 80,
    phone: '02-333-1201',
    placeUrl: null,
  },
  {
    providerPlaceId: 'kakao:2',
    name: '시장 앞 부동산',
    address: '서울 마포구 포은로 8',
    latitude: 37.5565,
    longitude: 126.9061,
    distanceMeters: 210,
    phone: null,
    placeUrl: null,
  },
];

const meta = {
  title: '페이지/동네 찾기/휴대폰/AreaPlacesSheet',
  component: AreaPlacesSheet,
  globals: { viewport: { value: 'mobile', isRotated: false } },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    area: { control: 'object', description: '고른 동네. 이 동네의 출발 정류장을 보여 준다.' },
    onSelectStation: { description: '출발 정류장 고르기' },
    place: {
      control: 'object',
      description: '고른 정류장이나 지도에서 누른 공인중개사. 있으면 시트 안에서 그 정보로 넘어가고 뒤로가기를 둔다.',
    },
    preview: { control: 'object', description: '목적지·통근 조건(정류장 경로), 시세 기간, 다방 열기 기록' },
    onBack: { description: '정보에서 목록으로 돌아가기' },
    peekSignal: { control: 'number', description: '값을 바꾸면 시트를 제목만 보이게 내린다' },
    onClose: { description: '끌어 내려 닫고 동네 선택 풀기' },
  },
  args: {
    area,
    onSelectStation: fn(),
    place: null,
    preview: {
      destination: { latitude: 37.5559, longitude: 126.9101, name: '망원역', address: '서울 마포구' },
      maxMinutes: 40,
      maxTransfers: 1,
      rentPeriod: { startDate: '2026-04-09', endDate: '2026-10-09' },
      openListing: () => true,
      maxRent: 0,
    },
    onBack: fn(),
    peekSignal: 0,
    onClose: fn(),
  },
} satisfies Meta<typeof AreaPlacesSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Stations: Story = {};

/** 월세 조건 밖(지도의 회색) 동네를 고르면 시세 아래에 조건보다 비싸다고 알린다. */
export const OverRent: Story = {
  args: { preview: { ...meta.args.preview, maxRent: 50 } },
};

/** 지도에서 공인중개사 마커를 누르면 시트 안에서 정보로 넘어가고, 제목 왼쪽 뒤로가기로 목록에 돌아온다. */
export const AgencySelected: Story = {
  args: { place: { kind: 'agency', agency: agencies[0] } },
};
