import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { fn } from 'storybook/test';

import { RECORDS_PATH } from '@/shared/lib/navigation/appPaths';

import PageAction from './PageAction';

// to/onClick 유니언 props라 satisfies 대신 타입을 직접 지정한다.
const meta: Meta<typeof PageAction> = {
  title: '공용/PageAction',
  component: PageAction,
  args: {
    children: '매물 추가',
    icon: 'plus',
    placement: 'floating',
    onClick: fn(),
  },
  argTypes: {
    children: { control: 'text', description: '버튼 문구' },
    icon: { control: 'inline-radio', options: ['plus', 'map', 'close'], description: '문구 앞 아이콘' },
    placement: {
      control: 'inline-radio',
      options: ['floating', 'inline'],
      description: '`floating`은 하단 탭 위 오른쪽에 떠 있고, `inline`은 문서 흐름에 놓인다.',
    },
    to: { control: 'text', description: '이동할 주소. 주면 링크로, 비우고 `onClick`을 주면 버튼으로 그린다.' },
    onClick: { control: false },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof PageAction>;

export const FloatingLink: Story = {
  args: {
    to: RECORDS_PATH,
    onClick: undefined,
  },
};

export const InlineButton: Story = {
  args: {
    children: '지도에서 추가',
    placement: 'inline',
    icon: 'map',
  },
};

export const CloseButton: Story = {
  args: {
    children: '닫기',
    placement: 'inline',
    icon: 'close',
  },
};
