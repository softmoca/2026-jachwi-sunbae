import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import DelayedFallback from '@/shared/ui/delayed-fallback/DelayedFallback';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-30T00:00:00.000Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

const view = (isPending: boolean) => (
  <DelayedFallback
    isPending={isPending}
    fallback={<p role="status">불러오는 중이에요.</p>}
    placeholder={<div data-testid="placeholder" />}
  >
    {() => <p>내용</p>}
  </DelayedFallback>
);

it('300ms 안에 끝난 요청은 로딩 UI 없이 빈자리를 두었다가 바로 내용을 보여 준다', () => {
  const { rerender } = render(view(true));
  expect(screen.getByTestId('placeholder')).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();

  act(() => vi.advanceTimersByTime(299));
  rerender(view(false));
  act(() => vi.runOnlyPendingTimers());
  expect(screen.getByText('내용')).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('400ms에 끝난 요청은 로딩 UI를 550ms까지 유지한 뒤 내용으로 바꾼다', () => {
  const { rerender } = render(view(true));
  act(() => vi.advanceTimersByTime(300));
  expect(screen.getByRole('status')).toHaveTextContent('불러오는 중이에요.');

  act(() => vi.advanceTimersByTime(100));
  rerender(view(false));
  act(() => vi.advanceTimersByTime(149));
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.queryByText('내용')).not.toBeInTheDocument();

  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByText('내용')).toBeInTheDocument();
});

it('1200ms에 끝난 요청은 최소 노출 시간을 이미 넘겨 오자마자 내용으로 바꾼다', () => {
  const { rerender } = render(view(true));
  act(() => vi.advanceTimersByTime(1200));
  expect(screen.getByRole('status')).toBeInTheDocument();
  rerender(view(false));
  act(() => vi.advanceTimersByTime(0));
  expect(screen.getByText('내용')).toBeInTheDocument();
});

it('요청 중에는 내용을 만들지 않아 비어 있는 데이터를 읽지 않는다', () => {
  const children = vi.fn(() => <p>내용</p>);
  render(
    <DelayedFallback isPending fallback={null}>
      {children}
    </DelayedFallback>,
  );
  act(() => vi.advanceTimersByTime(1000));
  expect(children).not.toHaveBeenCalled();
});
