import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import TextAreaField from './TextAreaField';

const meta = {
  title: '공용/TextAreaField',
  component: TextAreaField,
  args: {
    label: '메모',
    value: '',
    placeholder: '그 외 내용을 자유롭게 적어보세요.',
    rows: 4,
    variant: 'underline',
    disabled: false,
    onChange: fn(),
  },
  argTypes: {
    label: { description: '입력칸 위 라벨' },
    value: { control: 'text', description: '입력한 내용. 입력하면 컨트롤 값도 함께 바뀐다.' },
    placeholder: { control: 'text' },
    rows: { control: { type: 'range', min: 2, max: 12, step: 1 }, description: '보이는 줄 수' },
    maxLength: { control: { type: 'number', min: 1 } },
    disabled: { control: 'boolean' },
    variant: {
      control: 'inline-radio',
      options: ['underline', 'box', 'inline'],
    },
    helpText: { control: 'text', description: '입력칸 아래 도움말' },
    error: { control: 'text', description: '오류 문구. 주면 입력칸을 오류 상태로 표시한다.' },
    fieldClassName: { control: false },
    onChange: { control: false },
  },
  // 입력한 값을 args에 되돌려 써서 컨트롤 패널과 입력칸이 같은 값을 보게 한다.
  render: function ControlledTextArea(args) {
    const [, updateArgs] = useArgs<typeof args>();
    return (
      <TextAreaField
        {...args}
        onChange={(event) => {
          args.onChange?.(event);
          updateArgs({ value: event.target.value });
        }}
      />
    );
  },
  decorators: [
    (Story) => (
      <div style={{ width: '24rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextAreaField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    value: '창문이 남향이라 낮에 밝음. 화장실 환풍기 소리가 조금 큼.',
  },
};

export const WithHelpAndError: Story = {
  args: {
    helpText: '2,000자 이하로 입력해 주세요.',
    error: '메모를 저장하지 못했어요.',
  },
};

export const Box: Story = {
  args: {
    variant: 'box',
  },
};

export const Inline: Story = {
  args: { variant: 'inline', placeholder: '메모 추가', rows: 1 },
};
