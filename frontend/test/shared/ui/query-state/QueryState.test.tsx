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

  it('페이지 전체를 그리는 조회라 기다리는 동안 늦추지 않고 Progress Circle을 바로 둔다', () => {
    render(
      <QueryState query={{ ...baseQuery, isPending: true }} loadingTitle="불러오는 중" describeError={describeError}>
        {() => <p>본문</p>}
      </QueryState>,
    );

    // 글자로만 된 로딩은 두지 않고, 뼈대가 없으면 Progress Circle(40)만 둔다.
    expect(screen.getByRole('progressbar', { name: '불러오는 중' })).toBeInTheDocument();
    expect(screen.queryByText('불러오는 중')).not.toBeInTheDocument();
  });

  it('뼈대를 주면 로딩 안내 대신 뼈대를 보여 주고, 받으면 내용으로 바로 바꾼다', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <QueryState
        query={{ ...baseQuery, isPending: true }}
        loadingTitle="불러오는 중"
        skeleton={<p>화면 뼈대</p>}
        describeError={describeError}
      >
        {(data) => <p>{String(data)} 본문</p>}
      </QueryState>,
    );

    expect(screen.getByText('화면 뼈대')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(300));
    // 안내는 읽기 프로그램에만 한 번 알린다.
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중');

    rerender(
      <QueryState
        query={{ ...baseQuery, data: '체크리스트' }}
        loadingTitle="불러오는 중"
        skeleton={<p>화면 뼈대</p>}
        describeError={describeError}
      >
        {(data) => <p>{String(data)} 본문</p>}
      </QueryState>,
    );

    // 뼈대에서 내용으로 바로 바뀌고, 로딩 안내를 잠깐 붙잡아 두지 않는다.
    expect(screen.getByText('체크리스트 본문')).toBeInTheDocument();
    expect(screen.queryByText('화면 뼈대')).not.toBeInTheDocument();
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
