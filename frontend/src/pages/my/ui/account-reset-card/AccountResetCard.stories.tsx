import type { Meta, StoryObj } from '@storybook/react-webpack5';

import AccountResetCard from './AccountResetCard';

const meta = {
  title: '페이지/마이/공통/AccountResetCard',
  component: AccountResetCard,
  decorators: [
    (Story) => (
      <div style={{ width: '24rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AccountResetCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ConfirmOpen: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /초기화/ }));
  },
};
