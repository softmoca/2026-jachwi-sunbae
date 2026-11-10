import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useRecentEdit } from '@/features/property/hooks/useRecentEdit';
import { rememberRecentEdit } from '@/features/property/lib/recentEdit';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

vi.mock('@/features/property/api/useProperties', () => ({
  getPropertyDetailQueryOptions: (_config: unknown, propertyId: number) => ({
    queryKey: ['property-detail', propertyId],
    queryFn: () => Promise.resolve({ name: `매물 ${propertyId}` }),
  }),
}));

const setup = (path = '/') => {
  const client = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <PublicConfigProvider config={{ apiBaseUrl: 'http://localhost:8080' }}>
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
      </PublicConfigProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useRecentEdit(), { wrapper });
};

describe('헤더의 이어서 보기', () => {
  afterEach(() => window.localStorage.clear());

  it('앱을 연 채로 고치고 돌아와도 다시 확인해 띄운다', async () => {
    const { result } = setup();
    expect(result.current).toBeNull();

    rememberRecentEdit(7, 'checklist');
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(result.current?.name).toBe('매물 7'));
    expect(result.current?.path).toBe('/properties/7?tab=checklist');
  });

  it('한 번 띄운 수정은 다시 그려도 띄우지 않는다', async () => {
    rememberRecentEdit(7, 'info');
    const first = setup();
    await waitFor(() => expect(first.result.current?.name).toBe('매물 7'));
    first.unmount();

    const second = setup();
    expect(second.result.current).toBeNull();
  });

  it('그 매물 화면에 있으면 띄우지 않는다', () => {
    rememberRecentEdit(7, 'info');
    const { result } = setup('/properties/7');
    expect(result.current).toBeNull();
  });
});
