import { render, screen } from '@testing-library/react';
import { lazy } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';

import LazyRouteBoundary from '@/app/router/LazyRouteBoundary';
import RecordsPageSkeleton from '@/pages/design-records/RecordsPageSkeleton';

const PendingPage = lazy(() => new Promise<{ default: () => null }>(() => undefined));

const renderPending = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LazyRouteBoundary fallback={<RecordsPageSkeleton />}>
        <PendingPage />
      </LazyRouteBoundary>
    </MemoryRouter>,
  );

const useDesktopViewport = () =>
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: query === '(min-width: 1024px)',
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

it('기록 화면 코드를 받는 동안 진행 표시 대신 헤더와 목록 영역 뼈대를 바로 보여 준다', () => {
  renderPending('/properties?view=list');
  expect(screen.getByRole('status')).toHaveTextContent('기록을 불러오는 중이에요.');
  expect(screen.getByRole('navigation', { name: '기록 보기 방식' })).toBeInTheDocument();
  expect(screen.getByTestId('list-area-skeleton')).toBeInTheDocument();
  expect(screen.queryByTestId('map-area-skeleton')).not.toBeInTheDocument();
  // 개수를 모르는 카드와 동네 칩 모양은 그리지 않는다.
  expect(screen.queryByRole('list', { hidden: true })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /전체/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});

it('휴대폰 지도 보기로 열면 지도 영역 하나만 뼈대로 채운다', () => {
  renderPending('/properties?view=map');
  expect(screen.getByRole('status')).toHaveTextContent('기록을 불러오는 중이에요.');
  expect(screen.getByTestId('map-area-skeleton')).toBeInTheDocument();
  expect(screen.queryByTestId('list-area-skeleton')).not.toBeInTheDocument();
});

it('주소에 보기 방식이 없으면 마지막으로 고른 보기의 영역을 뼈대로 채운다', () => {
  sessionStorage.setItem('jachwi:records-view', 'list');
  renderPending('/properties');
  expect(screen.getByTestId('list-area-skeleton')).toBeInTheDocument();
  expect(screen.queryByTestId('map-area-skeleton')).not.toBeInTheDocument();
});

it('데스크탑은 실제 화면과 같은 배치로 목록 영역과 지도 영역을 함께 두고 불러오는 중은 한 번만 알린다', () => {
  useDesktopViewport();
  renderPending('/properties?view=list');
  expect(screen.getByRole('status')).toHaveTextContent('기록을 불러오는 중이에요.');
  expect(screen.getByTestId('list-area-skeleton')).toHaveAttribute('role', 'status');
  expect(screen.getByTestId('map-area-skeleton')).toHaveAttribute('aria-hidden', 'true');
});
