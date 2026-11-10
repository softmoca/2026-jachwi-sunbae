import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { fn } from 'storybook/test';

import type { PropertyChecklistProgress, PropertySummary } from '@/features/property/model/Property';

import { recordPresentation } from '../../model/recordPresentation';
import RecordList from './RecordList';

const progress = (completedCount: number, totalCount: number): PropertyChecklistProgress => ({
  totalCount,
  completedCount,
  goodCount: completedCount,
  cautionCount: 0,
  unconfirmedCount: totalCount - completedCount,
  progressRate: totalCount === 0 ? 0 : Math.floor((completedCount / totalCount) * 100),
});

const property = (
  propertyId: number,
  name: string,
  depositAmount: number,
  monthlyRentAmount: number,
  address: string | null,
  onSite: [number, number] | null,
): PropertySummary => ({
  propertyId,
  name,
  depositAmount,
  monthlyRentAmount,
  discoverySource: { type: 'TEXT', value: '네이버 부동산' },
  location: { address, latitude: null, longitude: null },
  representativePhoto: null,
  progress: onSite ? progress(onSite[0], onSite[1]) : progress(0, 0),
  stages: [
    {
      stage: 'ON_SITE',
      applied: onSite !== null,
      propertyChecklistId: onSite ? propertyId * 10 : null,
      checklistName: onSite ? '현장 체크리스트' : null,
      sourceChecklistId: onSite ? 1 : null,
      progress: onSite ? progress(onSite[0], onSite[1]) : progress(0, 0),
    },
    {
      stage: 'PRE_CONTRACT',
      applied: false,
      propertyChecklistId: null,
      checklistName: null,
      sourceChecklistId: null,
      progress: progress(0, 0),
    },
  ],
  photoCount: 0,
});

const records = [
  property(1, '역삼역 햇살 원룸', 10_000_000, 650_000, '서울 강남구 역삼동 823-12', [8, 12]),
  property(2, '홍대 투룸 복층', 20_000_000, 850_000, '서울 마포구 서교동 395-7', [12, 12]),
  property(3, '신림 오피스텔', 10_000_000, 650_000, '서울 관악구 신림동 1422-5', null),
].map(recordPresentation);

const meta = {
  title: '페이지/본 방 기록/공통/RecordList',
  component: RecordList,
  args: {
    records,
    district: '전체',
    onNotice: fn(),
  },
  argTypes: {
    records: { control: false },
    district: { description: '고른 동네. 빈 목록 안내 문구에 쓴다.' },
    onNotice: { description: '삭제 등 안내 문구를 띄울 때 부른다.' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '26rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecordList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DistrictFiltered: Story = {
  args: {
    records: records.filter((record) => record.district === '서교동'),
    district: '서교동',
  },
};

export const OpensInPlace: Story = {
  args: {
    onOpen: fn(),
  },
};
