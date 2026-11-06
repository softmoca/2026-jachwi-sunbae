import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { RECORDS_PATH } from '@/shared/lib/navigation/appPaths';
import { ButtonLink } from '@/shared/ui/button/Button';
import Icon, { type IconName } from '@/shared/ui/icon/Icon';

import EmptyState from './EmptyState';

const iconNames: IconName[] = [
  'inbox',
  'home',
  'map',
  'search',
  'checklist',
  'image',
  'info',
  'user',
  'link',
  'locate',
  'target',
  'edit',
  'trash',
  'plus',
];

/** 안내 아래 행동 버튼. 값은 이름으로 두고 그릴 때 요소로 바꾼다. */
const actions = {
  없음: undefined,
  '등록 버튼': (
    <ButtonLink to={RECORDS_PATH}>
      <Icon name="plus" size={15} />첫 매물 등록하기
    </ButtonLink>
  ),
};

const meta = {
  title: '공용/EmptyState',
  component: EmptyState,
  args: {
    title: '저장한 매물이 없어요',
    description: '관심 있는 매물을 등록하면 이곳에서 비교할 수 있어요.',
    icon: 'home',
    variant: 'card',
    action: '없음',
  },
  argTypes: {
    title: { description: '빈 상태 제목' },
    description: { description: '제목 아래 설명' },
    variant: {
      control: 'inline-radio',
      options: ['card', 'plain'],
      description: '`card`는 테두리 있는 상자, `plain`은 목록 안에 넣는 배경 없는 모양',
    },
    icon: { control: 'select', options: iconNames, description: '동그라미 안 아이콘' },
    action: { control: 'inline-radio', options: Object.keys(actions), mapping: actions },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Card: Story = {};

export const Plain: Story = {
  args: {
    variant: 'plain',
  },
};

export const WithAction: Story = {
  args: {
    action: '등록 버튼',
  },
};
