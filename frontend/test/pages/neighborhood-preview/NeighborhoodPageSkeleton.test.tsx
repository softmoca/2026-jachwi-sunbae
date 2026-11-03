import { render, screen } from '@testing-library/react';
import { lazy } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

import LazyRouteBoundary from '@/app/router/LazyRouteBoundary';
import NeighborhoodPageSkeleton from '@/pages/neighborhood-preview/NeighborhoodPageSkeleton';

const PendingPage = lazy(() => new Promise<{ default: () => null }>(() => undefined));

const renderPending = () =>
  render(
    <LazyRouteBoundary fallback={<NeighborhoodPageSkeleton />}>
      <PendingPage />
    </LazyRouteBoundary>,
  );

afterEach(() => {
  vi.restoreAllMocks();
});

it('휴대폰은 동네 찾기 코드를 받는 동안 진행 표시 대신 화면 전체의 지도 영역 뼈대를 바로 보여 준다', () => {
  renderPending();
  expect(screen.getByRole('status')).toHaveTextContent('동네 찾기를 불러오는 중이에요.');
  expect(screen.getByTestId('map-area-skeleton')).toBeInTheDocument();
  expect(screen.queryByTestId('list-area-skeleton')).not.toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});

it('데스크탑은 목록 영역과 지도 영역을 함께 두고 불러오는 중은 한 번만 알린다', () => {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: query === '(min-width: 1024px)',
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
  renderPending();
  expect(screen.getByRole('status')).toHaveTextContent('동네 찾기를 불러오는 중이에요.');
  expect(screen.getByTestId('list-area-skeleton')).toHaveAttribute('role', 'status');
  expect(screen.getByTestId('map-area-skeleton')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});
