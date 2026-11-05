import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import DesktopHeader from '@/shared/ui/desktop-header/DesktopHeader';
import DesktopHeaderSlot, { DesktopHeaderSlotProvider } from '@/shared/ui/desktop-header/DesktopHeaderSlot';

/** 헤더 가운데 자리에 동네 찾기처럼 검색창을 넣어 그린다. */
const renderHeaderWithSearch = () =>
  render(
    <MemoryRouter>
      <DesktopHeaderSlotProvider>
        <DesktopHeader />
        <DesktopHeaderSlot>
          <input aria-label="출퇴근 장소" />
        </DesktopHeaderSlot>
      </DesktopHeaderSlotProvider>
    </MemoryRouter>,
  );

describe('DesktopHeader', () => {
  // 검색창 유무에 따라 헤더 높이가 바뀌면 아래 지도가 크기를 다시 잡으며 한 번 깜빡인다(#515).
  it('가운데 자리는 들어온 요소와 상관없이 로고와 같은 높이로 고정한다', () => {
    renderHeaderWithSearch();

    const slot = screen.getByRole('textbox', { name: '출퇴근 장소' }).parentElement;
    expect(slot).not.toBeNull();
    expect(getComputedStyle(slot as HTMLElement).height).toBe('2.5em');
  });

  it('좁은 화면에서 검색창이 들어와도 메뉴는 줄어들거나 두 줄로 접히지 않는다', () => {
    renderHeaderWithSearch();

    const nav = screen.getByRole('navigation', { name: '주요 화면' });
    expect(getComputedStyle(nav).flexShrink).toBe('0');
    for (const link of screen.getAllByRole('link').filter((element) => nav.contains(element))) {
      expect(getComputedStyle(link).whiteSpace).toBe('nowrap');
    }
  });
});
