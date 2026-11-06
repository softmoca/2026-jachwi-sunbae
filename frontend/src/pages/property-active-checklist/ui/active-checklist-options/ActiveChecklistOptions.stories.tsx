import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { fn } from 'storybook/test';

import type { ChecklistSummary } from '@/features/checklist/model/checklistTypes';

import { SYSTEM_DEFAULT_ID } from '../../hooks/useChecklistSelection';
import ActiveChecklistOptions from './ActiveChecklistOptions';

const checklists: ChecklistSummary[] = [
  {
    checklistId: 3,
    name: '원룸 현장 확인',
    stage: 'ON_SITE',
    itemCount: 12,
    assignedPropertyCount: 2,
    updatedAt: '2026-10-20T14:30:00',
  },
  {
    checklistId: 8,
    name: '야간 방문용',
    stage: 'ON_SITE',
    itemCount: 5,
    assignedPropertyCount: 0,
    updatedAt: '2026-10-27T21:40:00',
  },
];

const meta = {
  title: '페이지/체크리스트 진행/ActiveChecklistOptions',
  component: ActiveChecklistOptions,
  argTypes: {
    items: {
      control: 'object',
      description: '사용자가 만든 체크리스트 목록. 기본 체크리스트는 이 목록과 별개로 항상 맨 위에 보인다.',
    },
    selectedId: {
      control: 'select',
      options: [SYSTEM_DEFAULT_ID, 3, 8, null],
      description: `선택된 체크리스트 ID. ${SYSTEM_DEFAULT_ID}은 기본 체크리스트다.`,
    },
    newlyCreatedId: {
      control: 'select',
      options: [null, 3, 8],
      description: '방금 만든 체크리스트 ID. 해당 항목에 "방금 생성" 표시가 붙는다.',
    },
    isDisabled: { description: '저장 중처럼 선택을 막아야 할 때 켠다.' },
    onSelect: { description: '체크리스트를 고르면 그 ID로 부른다.' },
  },
  args: {
    items: checklists,
    selectedId: SYSTEM_DEFAULT_ID,
    currentId: SYSTEM_DEFAULT_ID,
    newlyCreatedId: null,
    isDisabled: false,
    onSelect: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '24rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActiveChecklistOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NewlyCreated: Story = {
  args: {
    selectedId: 8,
    newlyCreatedId: 8,
  },
};

export const NoCustomChecklist: Story = {
  args: {
    items: [],
  },
};

export const Disabled: Story = {
  args: {
    selectedId: 3,
    isDisabled: true,
  },
};
