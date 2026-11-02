import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import RouteLoading, { ROUTE_LOADING_DELAY_MS } from '@/app/router/RouteLoading';

it('처음 여는 화면의 로딩은 투명하게 시작해 300ms 뒤에야 보이도록 CSS로 늦춘다', () => {
  render(<RouteLoading />);
  const loading = screen.getByRole('progressbar').parentElement as HTMLElement;
  const style = getComputedStyle(loading);
  expect(style.opacity).toBe('0');
  expect(style.animation).toContain(`${ROUTE_LOADING_DELAY_MS}ms`);
  expect(style.animation).toContain('forwards');
});
