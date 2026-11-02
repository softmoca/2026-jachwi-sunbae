import type { Meta, StoryObj } from '@storybook/react-webpack5';

import AccountResetCard from './AccountResetCard';

const meta = {
  title: '페이지/마이/공통/AccountResetCard',
  component: AccountResetCard,
  args: {
    memberId: 1024,
  },
  argTypes: {
    memberId: { description: '완전 삭제 요청 메일 본문에 채워 넣는 회원 번호' },
  },
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
