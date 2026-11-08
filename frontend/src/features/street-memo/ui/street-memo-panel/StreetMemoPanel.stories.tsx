import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { fn } from 'storybook/test';

import type { StreetMemoLayer } from '../../hooks/useStreetMemoLayer';
import type { StreetMemo } from '../../model/StreetMemo';
import StreetMemoPanel from './StreetMemoPanel';

const likeMemo: StreetMemo = {
  id: 1,
  latitude: 37.4842,
  longitude: 126.9297,
  memo: '늦게까지 여는 세탁소가 있어요.\n골목이 밝아서 밤에도 다니기 괜찮아요.',
  preference: 'LIKE',
  isMine: true,
};

const dislikeMemo: StreetMemo = {
  id: 2,
  latitude: 37.4851,
  longitude: 126.9312,
  memo: '주말 밤에는 술집 소음이 커요.',
  preference: 'DISLIKE',
  isMine: false,
};

/** 화면이 Hook으로 만드는 메모 겹 상태를 표본으로 만든다. */
const makeLayer = (overrides: Partial<StreetMemoLayer>): StreetMemoLayer => ({
  markers: [],
  visibleMemos: [],
  isFailed: false,
  mode: null,
  selectedMemos: [],
  selectedMarkerId: null,
  isSubmitting: false,
  submitFailed: false,
  removingId: null,
  removeFailedId: null,
  memosOf: fn(() => []),
  isDongGroup: () => false,
  selectMarker: fn(() => false),
  startDraft: fn(),
  submit: fn(),
  remove: fn(),
  close: fn(),
  ...overrides,
});

const meta = {
  title: '기능/거리 메모/StreetMemoPanel',
  component: StreetMemoPanel,
  args: {
    layer: makeLayer({ mode: 'view', selectedMemos: [likeMemo] }),
    onCreated: fn(),
    showCloseButton: true,
  },
  argTypes: {
    layer: {
      control: false,
      description:
        '화면이 useStreetMemoLayer로 만드는 메모 겹 상태. mode가 view면 고른 메모를, compose면 쓰기 폼을 그린다. 안의 함수는 Actions 패널에 찍힌다.',
    },
    onCreated: { description: '새 메모를 남겼을 때. 만든 메모를 넘긴다.' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '24rem', background: 'var(--color-surface)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StreetMemoPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const View: Story = {};

export const Compose: Story = {
  args: {
    layer: makeLayer({ mode: 'compose' }),
  },
};

export const RemoveFailed: Story = {
  args: {
    layer: makeLayer({ mode: 'view', selectedMemos: [likeMemo], removeFailedId: likeMemo.id }),
    showCloseButton: false,
  },
};

export const OthersMemo: Story = {
  args: {
    layer: makeLayer({ mode: 'view', selectedMemos: [dislikeMemo] }),
  },
};

/** 겹친 말풍선을 누르면 그 자리 메모를 최신순으로 모두 보여 준다. */
export const Grouped: Story = {
  args: {
    layer: makeLayer({ mode: 'view', selectedMemos: [dislikeMemo, likeMemo] }),
  },
};
