import type { Meta, StoryObj } from '@storybook/react-webpack5';
import type { ComponentProps, ComponentType } from 'react';
import { fn } from 'storybook/test';

import NeighborhoodMapSearch from './NeighborhoodMapSearch';

/** `preview`에 든 값을 하나씩 컨트롤로 바꿔 보도록 펼쳐 둔다. 화면에는 다시 `preview`로 묶어 넘긴다. */
type StoryArgs = ComponentProps<typeof NeighborhoodMapSearch>['preview'];

const meta = {
  title: '페이지/동네 찾기/공통/NeighborhoodMapSearch',
  // 컨트롤은 preview를 펼친 값으로 받아 render에서 다시 묶는다. props 모양이 달라 타입만 맞춰 주고, 문서는 실제 컴포넌트에서 읽는다.
  component: NeighborhoodMapSearch as unknown as ComponentType<StoryArgs>,
  parameters: {
    layout: 'fullscreen',
    controls: { exclude: ['preview', 'className', 'ref'] },
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: '10rem', maxWidth: '26rem', background: '#e9ece8' }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => <NeighborhoodMapSearch preview={args} />,
  argTypes: {
    query: { description: '검색창에 든 출퇴근 장소 검색어' },
    shouldFocusMapSearch: { description: '처음 그릴 때 검색창에 바로 커서를 둘지' },
    leave: { description: '뒤로 가기' },
    changeQuery: { description: '검색어 입력' },
    searchDestination: { description: '검색 실행' },
  },
  args: {
    leave: fn(),
    query: '',
    hasChosenMapPoint: false,
    addressResults: [],
    isSearching: false,
    searchError: null,
    selectAddress: fn(),
    changeQuery: fn(),
    searchDestination: fn(() => Promise.resolve()),
    shouldFocusMapSearch: false,
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithQuery: Story = {
  args: {
    query: '서울특별시청',
  },
};
