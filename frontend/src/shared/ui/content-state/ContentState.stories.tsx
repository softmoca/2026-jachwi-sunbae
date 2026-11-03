import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Link } from 'react-router-dom';
import { fn } from 'storybook/test';

import ContentState from './ContentState';

/** 상태에 딸린 추가 동작. 값은 이름으로 두고 그릴 때 요소로 바꾼다. */
const extras = {
  없음: undefined,
  '홈 링크': (
    <Link to="/" className="inline-button">
      홈으로 돌아가기
    </Link>
  ),
};

const meta = {
  title: '공용/ContentState',
  component: ContentState,
  args: {
    page: true,
    tone: 'info',
    retryLabel: '다시 시도',
    children: '없음',
  },
  argTypes: {
    tone: {
      control: 'inline-radio',
      options: ['info', 'error'],
      description: '`error`는 마스코트 그림과 함께 경고로 읽어 준다.',
    },
    title: { description: '안내 제목' },
    description: { control: 'text', description: '제목 아래 설명' },
    retryLabel: { description: '다시 시도 버튼 문구. `onRetry`가 있을 때만 보인다.' },
    onRetry: { control: false, description: '주면 다시 시도 버튼을 그린다.' },
    children: { control: 'inline-radio', options: Object.keys(extras), mapping: extras },
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ContentState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithError: Story = {
  args: {
    tone: 'error',
    title: '매물 정보를 불러오지 못했어요.',
    description: '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
    onRetry: fn(),
  },
};

export const Info: Story = {
  args: {
    title: '주소가 올바르지 않아요.',
    description: '홈에서 다시 매물을 선택해 주세요.',
  },
};

export const Inline: Story = {
  args: {
    page: false,
    tone: 'error',
    title: '체크리스트를 불러오지 못했어요.',
    description: '잠시 후 다시 시도해 주세요.',
    onRetry: fn(),
  },
  parameters: {
    layout: 'padded',
  },
};
