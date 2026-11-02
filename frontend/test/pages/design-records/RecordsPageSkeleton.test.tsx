import { render, screen } from '@testing-library/react';
import { lazy } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';

import LazyRouteBoundary from '@/app/router/LazyRouteBoundary';
import RecordsPageSkeleton from '@/pages/design-records/RecordsPageSkeleton';

it('기록 화면 코드를 받는 동안 진행 표시 대신 헤더와 리스트 뼈대를 바로 보여 준다', () => {
  const PendingPage = lazy(() => new Promise<{ default: () => null }>(() => undefined));
  render(
    <MemoryRouter initialEntries={['/properties']}>
      <LazyRouteBoundary fallback={<RecordsPageSkeleton />}>
        <PendingPage />
      </LazyRouteBoundary>
    </MemoryRouter>,
  );
  expect(screen.getByRole('status')).toHaveTextContent('기록을 불러오는 중이에요.');
  expect(screen.getByRole('navigation', { name: '기록 보기 방식' })).toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});
