import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { fn } from 'storybook/test';

import LocationMapControls from './LocationMapControls';

const meta = {
  title: '페이지/위치 선택/LocationMapControls',
  component: LocationMapControls,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: '12rem', maxWidth: '24rem', background: '#eef0ea' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    isLocating: { description: '현재 위치를 찾는 중인지. 찾는 동안 위치 버튼을 막는다.' },
    onMoveToCurrentLocation: { description: '현재 위치로 지도 옮기기' },
  },
  args: {
    isLocating: false,
    onMoveToCurrentLocation: fn(),
  },
} satisfies Meta<typeof LocationMapControls>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Locating: Story = {
  args: {
    isLocating: true,
  },
};
