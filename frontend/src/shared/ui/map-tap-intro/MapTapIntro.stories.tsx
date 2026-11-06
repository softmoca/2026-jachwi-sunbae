import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { fn } from 'storybook/test';

import MapTapIntro from './MapTapIntro';

const meta = {
  title: '공용/MapTapIntro',
  component: MapTapIntro,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    title: '지도를 눌러 보세요',
    description: '누른 자리에 거리 메모를 남기거나 본 방을 기록할 수 있어요',
    onSkip: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: '24rem', maxWidth: '26rem', background: '#e9ece8' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MapTapIntro>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 건너뛰기 없이 띄우는 안내. */
export const WithoutSkip: Story = { args: { onSkip: undefined } };
