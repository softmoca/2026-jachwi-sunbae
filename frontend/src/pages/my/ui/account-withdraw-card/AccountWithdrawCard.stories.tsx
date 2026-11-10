import type { Meta, StoryObj } from '@storybook/react-webpack5';

import AccountWithdrawCard from './AccountWithdrawCard';

const meta = {
  title: '페이지/마이/공통/AccountWithdrawCard',
  component: AccountWithdrawCard,
  decorators: [
    (Story) => (
      <div style={{ width: '24rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AccountWithdrawCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ConfirmOpen: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /회원 탈퇴/ }));
  },
};
