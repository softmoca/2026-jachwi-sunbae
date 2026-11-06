import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import TopNavigationMenu from '@/shared/ui/top-navigation-menu/TopNavigationMenu';

it('메뉴 내부 클릭은 처리하고 바깥 클릭과 Escape로 더보기 메뉴를 닫는다', async () => {
  const onDelete = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <TopNavigationMenu>
        <button onClick={onDelete}>삭제</button>
      </TopNavigationMenu>
      <button>바깥</button>
    </>,
  );
  const toggle = screen.getByLabelText('페이지 메뉴 열기');
  const menu = toggle.closest('details');
  await user.click(toggle);
  expect(menu).toHaveAttribute('open');
  await user.click(screen.getByRole('button', { name: '삭제' }));
  expect(onDelete).toHaveBeenCalledOnce();
  expect(menu).toHaveAttribute('open');
  await user.click(screen.getByRole('button', { name: '바깥' }));
  expect(menu).not.toHaveAttribute('open');
  await user.click(toggle);
  await user.keyboard('{Escape}');
  expect(menu).not.toHaveAttribute('open');
});
