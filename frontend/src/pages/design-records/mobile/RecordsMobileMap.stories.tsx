import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';

import type { MapAddress } from '@/features/map/model/Map';
import { propertyQueryKeys } from '@/features/property/api/propertyQueryKeys';
import type { PropertyChecklistProgress, PropertyPage, PropertySummary } from '@/features/property/model/Property';

import useRecords from '../hooks/useRecords';
import useRecordsMapLayers from '../hooks/useRecordsMapLayers';
import RecordsMobileMap from './RecordsMobileMap';

const emptyProgress: PropertyChecklistProgress = {
  totalCount: 0,
  completedCount: 0,
  goodCount: 0,
  cautionCount: 0,
  unconfirmedCount: 0,
  progressRate: 0,
};

const property = (
  propertyId: number,
  name: string,
  depositAmount: number,
  monthlyRentAmount: number,
  address: string,
  latitude: number,
  longitude: number,
): PropertySummary => ({
  propertyId,
  name,
  depositAmount,
  monthlyRentAmount,
  discoverySource: { type: 'TEXT', value: '직방' },
  location: { address, latitude, longitude },
  representativePhoto: null,
  progress: emptyProgress,
  stages: [],
  photoCount: 0,
});

const listData = (content: PropertySummary[]): { pages: PropertyPage[]; pageParams: number[] } => ({
  pages: [
    {
      content,
      page: 0,
      size: 20,
      totalElements: content.length,
      totalPages: content.length === 0 ? 0 : 1,
      hasNext: false,
    },
  ],
  pageParams: [0],
});

const properties = [
  property(1, '삼평동 판교역 원룸', 10_000_000, 700_000, '경기 성남시 분당구 삼평동 680', 37.3948, 127.1112),
  property(2, '백현동 투룸', 20_000_000, 900_000, '경기 성남시 분당구 백현동 541', 37.3896, 127.1076),
  // 같은 건물의 매물 둘. 지도에서는 개수 핀 하나로 묶이고, 누르면 바텀시트에 함께 늘어놓는다.
  property(3, '판교역 오피스텔 12층', 15_000_000, 800_000, '경기 성남시 분당구 삼평동 681', 37.3921, 127.1101),
  property(4, '판교역 오피스텔 7층', 12_000_000, 750_000, '경기 성남시 분당구 삼평동 681', 37.3921, 127.1101),
];

type PreviewArgs = {
  /** 처음부터 골라 둘 기록 번호. 고르면 아래쪽 바텀시트에 뜬다. */
  initialSelectedId: string | null;
  /** 빈 곳을 찍은 말풍선에서 매물 등록을 고르면 그 주소로 부른다. */
  onRegister: (address: MapAddress) => void;
};

/** 지도에 넘기는 기록·지도 겹 상태는 화면과 같은 Hook으로 만든다. 기록 목록은 `parameters.queryData`로 넣는다. */
const RecordsMobileMapPreview = ({ initialSelectedId, onRegister }: PreviewArgs) => {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const records = useRecords({ selectedId, setSelectedId });
  const layers = useRecordsMapLayers(records, { onRegister });
  return <RecordsMobileMap records={records} layers={layers} />;
};

type Args = PreviewArgs & ComponentProps<typeof RecordsMobileMap>;

const meta: Meta<Args> = {
  title: '페이지/본 방 기록/휴대폰/RecordsMobileMap',
  globals: { viewport: { value: 'mobile', isRotated: false } },
  component: RecordsMobileMap,
  // 처음 값은 Hook 안의 상태로만 쓰이므로, 컨트롤을 바꾸면 key로 새로 그려 바로 반영한다.
  render: (args) => <RecordsMobileMapPreview key={String(args.initialSelectedId)} {...args} />,
  args: {
    initialSelectedId: null,
    onRegister: fn(),
  },
  argTypes: {
    initialSelectedId: {
      control: 'select',
      options: [null, '1', '2'],
      labels: { null: '고르지 않음', 1: '1 · 삼평동 판교역 원룸', 2: '2 · 백현동 투룸' } as Record<string, string>,
    },
    records: { control: false, table: { disable: true } },
    layers: { control: false, table: { disable: true } },
  },
  parameters: {
    layout: 'fullscreen',
    queryData: [[propertyQueryKeys.list(''), listData(properties)]],
  },
  decorators: [
    (Story) => (
      // 휴대폰 화면 크기의 세로 칸 안에 지도를 채운다.
      <div style={{ display: 'flex', flexDirection: 'column', width: '24rem', height: '44rem' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<Args>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: {
    queryData: [[propertyQueryKeys.list(''), listData([])]],
  },
};

export const WithSelectedRecord: Story = {
  args: {
    initialSelectedId: '1',
  },
};
