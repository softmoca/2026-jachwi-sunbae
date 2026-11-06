import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { fn } from 'storybook/test';

import type { MapAddress } from '@/features/map/model/Map';

import PropertyLocationPicker from './PropertyLocationPicker';

const selectedAddress: MapAddress = {
  address: '서울 관악구 신림로 123',
  roadAddress: '서울 관악구 신림로 123',
  jibunAddress: '서울 관악구 신림동 1422-5',
  latitude: 37.4842,
  longitude: 126.9297,
};

const searchResults: MapAddress[] = [
  selectedAddress,
  {
    address: '서울 관악구 신림로 59',
    roadAddress: '서울 관악구 신림로 59',
    jibunAddress: '서울 관악구 신림동 1640-27',
    latitude: 37.4781,
    longitude: 126.9289,
  },
];

const location = {
  selected: selectedAddress,
  status: 'ready' as const,
  onCenterChange: fn().mockName('location.onCenterChange'),
  onMoveToCurrentLocation: fn().mockName('location.onMoveToCurrentLocation'),
};

const search = {
  query: '',
  results: [],
  status: 'idle' as const,
  onQueryChange: fn().mockName('search.onQueryChange'),
  onSubmit: fn().mockName('search.onSubmit'),
  onClear: fn().mockName('search.onClear'),
  onSelect: fn().mockName('search.onSelect'),
};

const meta = {
  title: '기능/매물/PropertyLocationPicker',
  component: PropertyLocationPicker,
  argTypes: {
    location: {
      control: false,
      description: '지도 가운데에 고른 주소와 주소 변환 상태(ready·loading·error), 지도 이동 콜백.',
    },
    search: {
      control: false,
      description: '주소 검색어·결과·검색 상태(idle·loading·error)와 검색 콜백.',
    },
  },
  args: {
    location,
    search,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '24rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PropertyLocationPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSearchResults: Story = {
  args: {
    search: { ...search, query: '신림로', results: searchResults },
  },
};

export const Resolving: Story = {
  args: {
    location: { ...location, status: 'loading' },
    search: { ...search, query: '신림로', status: 'loading' },
  },
};

export const WithError: Story = {
  args: {
    location: {
      ...location,
      selected: { ...selectedAddress, address: null, roadAddress: null, jibunAddress: null },
      status: 'error',
    },
    search: { ...search, query: '없는주소 999', status: 'error' },
  },
};
