import type { Meta, StoryObj } from '@storybook/react-webpack5';
import type { ComponentProps } from 'react';
import { fn } from 'storybook/test';

import type { MapAddress, MapCategory } from '@/features/map/model/Map';
import { propertyQueryKeys } from '@/features/property/api/propertyQueryKeys';
import type { PropertyChecklistProgress, PropertyPage, PropertySummary } from '@/features/property/model/Property';

import useRecords from '../hooks/useRecords';
import useRecordsMapLayers from '../hooks/useRecordsMapLayers';
import RecordDistricts from '../ui/record-districts/RecordDistricts';
import RecordsDesktopMap from './RecordsDesktopMap';

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
  latitude: number | null,
  longitude: number | null,
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
  property(3, '이매동 오피스텔', 10_000_000, 700_000, '경기 성남시 분당구 이매동 125', 37.3955, 127.1275),
];

type PreviewArgs = {
  /** 처음 켜 둘 지도 겹(시설 종류 또는 거리 메모). 비우면(null) 기록만 보인다. */
  initialCategory: MapCategory | null;
  /** 동네 뱃지를 지도 위 모양(흰 바탕·그림자)으로 그릴지. */
  districtsOverMap: boolean;
  /** 지도 빈 곳을 눌러 메모·매물을 남기려 할 때 그 위치로 부른다. */
  onRegister: (location: MapAddress) => void;
};

/** 지도에 넘기는 기록·지도 겹 상태는 화면과 같은 Hook으로 만든다. 기록 목록은 `parameters.queryData`로 넣는다. */
const RecordsDesktopMapPreview = ({ initialCategory, districtsOverMap, onRegister }: PreviewArgs) => {
  const records = useRecords();
  const layers = useRecordsMapLayers(records, { initialCategory, onRegister });
  return (
    <RecordsDesktopMap
      records={records}
      layers={layers}
      districts={
        <RecordDistricts
          districts={records.districts}
          district={records.district}
          onSelect={records.selectDistrict}
          overMap={districtsOverMap}
        />
      }
    />
  );
};

type Args = PreviewArgs & ComponentProps<typeof RecordsDesktopMap>;

const meta: Meta<Args> = {
  title: '페이지/본 방 기록/데스크탑/RecordsDesktopMap',
  globals: { viewport: { value: 'desktop', isRotated: false } },
  component: RecordsDesktopMap,
  // 처음 값은 Hook 안의 상태로만 쓰이므로, 컨트롤을 바꾸면 key로 새로 그려 바로 반영한다.
  render: (args) => <RecordsDesktopMapPreview key={String(args.initialCategory)} {...args} />,
  args: {
    initialCategory: null,
    districtsOverMap: true,
    onRegister: fn(),
  },
  argTypes: {
    initialCategory: {
      control: 'select',
      options: [null, 'MEMO', 'HOSPITAL', 'TRANSPORT', 'SCHOOL', 'CONVENIENCE', 'AGENCY'],
      labels: { null: '없음' } as Record<string, string>,
    },
    records: { control: false, table: { disable: true } },
    layers: { control: false, table: { disable: true } },
    districts: { control: false, table: { disable: true } },
  },
  parameters: {
    layout: 'fullscreen',
    queryData: [[propertyQueryKeys.list(''), listData(properties)]],
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'grid', height: '100vh' }}>
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

export const WithoutLocation: Story = {
  parameters: {
    queryData: [
      [
        propertyQueryKeys.list(''),
        listData([
          ...properties,
          property(4, '주소만 적은 매물', 5_000_000, 500_000, '서울 관악구 신림동', null, null),
        ]),
      ],
    ],
  },
};
