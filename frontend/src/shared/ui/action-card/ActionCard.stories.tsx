import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { fn } from 'storybook/test';

import iconHome from '@/shared/assets/illustrations/icon-home.webp';
import iconMap from '@/shared/assets/illustrations/icon-map.webp';
import { LOGO_DUCK } from '@/shared/assets/imageAssets';

import ActionCard, { ActionCardIllustration } from './ActionCard';

const { src: goose, src2x: goose2x } = LOGO_DUCK;

/** 컨트롤에서 고르는 그림. 값은 이름으로 두고 그릴 때 그림으로 바꾼다. */
const illustrations = {
  '지도 (모서리)': <ActionCardIllustration src={iconMap} width={192} height={192} />,
  '집 (모서리)': <ActionCardIllustration src={iconHome} width={192} height={192} />,
  '거위 (고개 내밀기)': <ActionCardIllustration src={goose} src2x={goose2x} width={64} height={64} placement="peek" />,
  없음: undefined,
};

// to/onClick 유니언 props라 satisfies 대신 타입을 직접 지정한다.
const meta: Meta<typeof ActionCard> = {
  title: '공용/ActionCard',
  component: ActionCard,
  decorators: [
    (Story) => (
      <div style={{ display: 'grid', width: '11rem', height: '11rem' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    title: '인프라 지도',
    description: '주변 교통과 편의시설을 살펴봐요',
    tone: 'neutral',
    size: 'medium',
    to: '/neighborhoods',
    illustration: '지도 (모서리)',
  },
  argTypes: {
    title: { control: 'text', description: '카드 제목' },
    description: { control: 'text', description: '제목 아래 작은 설명. 비우면 제목만 둔다.' },
    tone: { control: 'inline-radio', options: ['neutral', 'brand', 'informative'] },
    size: { control: 'inline-radio', options: ['medium', 'large'] },
    illustration: {
      control: 'select',
      options: Object.keys(illustrations),
      mapping: illustrations,
    },
    to: { control: 'text', description: '이동할 주소. 주면 링크로, 비우고 `onClick`을 주면 버튼으로 그린다.' },
    onClick: { control: false, description: '카드를 눌렀을 때 할 동작(버튼일 때)' },
  },
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof ActionCard>;

export const Neutral: Story = {};
export const Brand: Story = {
  args: { tone: 'brand', size: 'large', title: '매물 기록하기', description: '직접 본 매물을 기록해요' },
};
export const InformativePeek: Story = {
  args: {
    tone: 'informative',
    title: '사용방법 알아보기',
    description: undefined,
    illustration: '거위 (고개 내밀기)',
  },
};
/** `to` 없이 `onClick`만 주면 버튼으로 그린다. 누르면 Actions 패널에 찍힌다. */
export const AsButton: Story = {
  args: { to: undefined, onClick: fn(), title: '내 위치 다시 찾기', illustration: '집 (모서리)' },
};
