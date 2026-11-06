import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import CompareLoadState from '@/pages/property-compare/ui/compare-load-state/CompareLoadState';
import type { usePropertyList } from '@/features/property/api/useProperties';

type PropertyListQuery = ReturnType<typeof usePropertyList>;

const query = (overrides: Partial<Record<keyof PropertyListQuery, unknown>>) =>
  ({ isPending: false, isError: false, error: null, refetch: vi.fn(), ...overrides }) as unknown as PropertyListQuery;

it('새로 연 비교 화면의 본문 전체라 매물을 기다리는 동안 글자 없이 Progress Circle을 바로 둔다', () => {
  render(<CompareLoadState properties={query({ isPending: true })}>{() => <p>비교 내용</p>}</CompareLoadState>);

  expect(screen.getByRole('progressbar', { name: '매물을 불러오는 중이에요.' })).toBeInTheDocument();
  expect(screen.queryByText('매물을 불러오는 중이에요.')).not.toBeInTheDocument();
  expect(screen.queryByText('비교 내용')).not.toBeInTheDocument();
});

it('매물을 받으면 비교 내용을 그리고, 실패하면 다시 시도를 보여 준다', () => {
  const { rerender } = render(<CompareLoadState properties={query({})}>{() => <p>비교 내용</p>}</CompareLoadState>);
  expect(screen.getByText('비교 내용')).toBeInTheDocument();

  rerender(
    <CompareLoadState properties={query({ isError: true, error: new Error('x') })}>
      {() => <p>비교 내용</p>}
    </CompareLoadState>,
  );
  expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
});
