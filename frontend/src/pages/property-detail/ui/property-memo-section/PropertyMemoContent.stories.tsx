import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { fn } from 'storybook/test';

import type { usePropertyMemo } from '@/features/property/api/useProperties';

import PropertyMemoContent from './PropertyMemoContent';

type PropertyMemoQuery = ReturnType<typeof usePropertyMemo>;

/** 화면이 읽는 조회 상태만 채운 표본 메모 쿼리. */
const createMemoQuery = (overrides: Partial<Record<keyof PropertyMemoQuery, unknown>>): PropertyMemoQuery =>
  ({
    data: { propertyId: 10, freeMemo: '창문이 남향이라 낮에 밝음. 화장실 환풍기 소리가 조금 큼.' },
    isPending: false,
    isError: false,
    error: null,
    refetch: fn(() => Promise.resolve()).mockName('memo.refetch'),
    ...overrides,
  }) as unknown as PropertyMemoQuery;

const meta = {
  title: '페이지/매물 상세/PropertyMemoContent',
  component: PropertyMemoContent,
  argTypes: {
    memo: {
      control: false,
      description: '메모 조회 결과(usePropertyMemo). 불러오는 중·실패·빈 메모·메모 있음 상태를 나눠 그린다.',
    },
    onEdit: { description: '메모 수정 버튼을 누르면 부른다.' },
  },
  args: {
    memo: createMemoQuery({}),
    onEdit: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '24rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PropertyMemoContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    memo: createMemoQuery({ data: { propertyId: 10, freeMemo: '' } }),
  },
};

export const Loading: Story = {
  args: {
    memo: createMemoQuery({ data: undefined, isPending: true }),
  },
};

export const WithError: Story = {
  args: {
    memo: createMemoQuery({ data: undefined, isError: true, error: new Error('Network Error') }),
  },
};
