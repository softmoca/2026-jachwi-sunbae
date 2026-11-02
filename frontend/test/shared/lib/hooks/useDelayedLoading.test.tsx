import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useDelayedLoading from '@/shared/lib/hooks/useDelayedLoading';

describe('useDelayedLoading', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('지연 시간 안에 끝난 요청에는 로딩을 표시하지 않는다', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ isLoading }) => useDelayedLoading(isLoading), {
      initialProps: { isLoading: true },
    });

    act(() => vi.advanceTimersByTime(299));
    rerender({ isLoading: false });
    act(() => vi.runOnlyPendingTimers());

    expect(result.current).toBe(false);
  });

  it('표시된 로딩은 최소 노출 시간을 지킨다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-27T00:00:00.000Z'));
    const { result, rerender } = renderHook(({ isLoading }) => useDelayedLoading(isLoading), {
      initialProps: { isLoading: true },
    });

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(true);

    rerender({ isLoading: false });
    act(() => vi.advanceTimersByTime(249));
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });
});
