import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import QueryState from '@/shared/ui/query-state/QueryState';

const baseQuery = { isPending: false, isError: false, error: null, data: undefined, refetch: vi.fn() };
const describeError = (error: unknown) =>
  error === 'missing'
    ? { title: '찾을 수 없어요.', canRetry: false }
    : { title: '불러오지 못했어요.', description: '잠시 후 다시 시도해 주세요.', canRetry: true };

describe('QueryState', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('성공하면 조회한 데이터로 화면을 그린다', () => {
    render(
      <QueryState query={{ ...baseQuery, data: '매물' }} loadingTitle="불러오는 중" describeError={describeError}>
        {(data) => <p>{data} 상세</p>}
      </QueryState>,
    );

    expect(screen.getByText('매물 상세')).toBeInTheDocument();
  });

  it('짧은 요청에는 로딩을 숨기고, 길어지면 로딩 안내를 보여 준다', () => {
    vi.useFakeTimers();
    render(
      <QueryState query={{ ...baseQuery, isPending: true }} loadingTitle="불러오는 중" describeError={describeError}>
        {() => <p>본문</p>}
      </QueryState>,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중');
  });

  it('다시 시도할 수 있는 오류는 재시도 버튼과 추가 동작을 보여 준다', async () => {
    const refetch = vi.fn();
    render(
      <QueryState
        query={{ ...baseQuery, isError: true, error: 'network', refetch }}
        loadingTitle="불러오는 중"
        describeError={describeError}
        errorAction={<a href="/properties">목록으로</a>}
      >
        {() => <p>본문</p>}
      </QueryState>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('불러오지 못했어요.');
    expect(screen.getByRole('link', { name: '목록으로' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('다시 시도해도 같은 오류에는 재시도 버튼을 숨긴다', () => {
    render(
      <QueryState
        query={{ ...baseQuery, isError: true, error: 'missing' }}
        loadingTitle="불러오는 중"
        describeError={describeError}
      >
        {() => <p>본문</p>}
      </QueryState>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('찾을 수 없어요.');
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
  });
});
