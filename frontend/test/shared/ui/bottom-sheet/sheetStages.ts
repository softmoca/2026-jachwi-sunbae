import { within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { expect } from 'vitest';

/**
 * 공용 바텀시트를 쓰는 화면이 끌기 네 단계(제목만, 처음, 크게, 페이지)를 모두 오가는지 확인한다.
 * jsdom에는 레이아웃이 없어 손잡이의 위·아래 화살표로 한 단계씩 옮기고, 페이지에서는 헤더의 뒤로가기로 돌아온다.
 */
export const expectSheetStages = async (user: UserEvent, sheet: HTMLElement) => {
  expect(sheet).toHaveAttribute('data-mode', 'default');
  within(sheet).getByRole('button', { name: '상세 패널 높이 조절' }).focus();
  await user.keyboard('{ArrowDown}');
  expect(sheet).toHaveAttribute('data-mode', 'peek');
  await user.keyboard('{ArrowUp}');
  expect(sheet).toHaveAttribute('data-mode', 'default');
  await user.keyboard('{ArrowUp}');
  expect(sheet).toHaveAttribute('data-mode', 'expanded');
  await user.keyboard('{ArrowUp}');
  expect(sheet).toHaveAttribute('data-mode', 'full');
  expect(within(sheet).queryByRole('button', { name: '상세 패널 높이 조절' })).not.toBeInTheDocument();
  await user.click(within(sheet).getByRole('button', { name: '뒤로 가기' }));
  expect(sheet).toHaveAttribute('data-mode', 'default');
};
