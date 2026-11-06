import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { PropsWithChildren } from 'react';
import { beforeEach, expect, it } from 'vitest';

import { propertyChecklistHandlers } from '@/app/mocks/handlers/propertyChecklistHandlers';
import { propertyHandlers } from '@/app/mocks/handlers/propertyHandlers';
import { getMockProperties, propertyListItemResponse, resetMockStore, success } from '@/app/mocks/mockStore';
import { setAuthentication } from '@/features/auth/model/authStore';
import { propertyQueryKeys } from '@/features/property/api/propertyQueryKeys';
import {
  usePropertyChecklistDetail,
  usePropertyChecklistOverview,
  usePropertyList,
} from '@/features/property/api/useProperties';
import {
  usePropertyChecklistItemMemoMutation,
  usePropertyChecklistItemStatusMutation,
} from '@/features/property/api/usePropertyChecklistItemMutations';
import { queryClient } from '@/shared/api/queryClient';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

import { server } from '../../../server';

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>
    <PublicConfigProvider config={{ apiBaseUrl: 'http://localhost:8080' }}>{children}</PublicConfigProvider>
  </QueryClientProvider>
);

beforeEach(() => {
  resetMockStore();
  setAuthentication({ accessToken: 'valid-token', tokenType: 'Bearer', expiresIn: 60 });
  server.use(...propertyHandlers, ...propertyChecklistHandlers);
});

it('평가 변경과 선택 해제마다 열려 있는 매물 목록과 상세 진행률을 함께 갱신한다', async () => {
  const { result } = renderHook(
    () => ({
      list: usePropertyList(),
      overview: usePropertyChecklistOverview(10),
      detail: usePropertyChecklistDetail(10, 51),
      status: usePropertyChecklistItemStatusMutation(10, 51),
    }),
    { wrapper },
  );
  const progress = () =>
    result.current.list.data?.pages[0].content
      .find((item) => item.propertyId === 10)
      ?.stages.find((stage) => stage.stage === 'ON_SITE')?.progress;
  await waitFor(() => expect(progress()?.completedCount).toBe(2));
  for (const status of ['GOOD', 'CAUTION', 'UNCONFIRMED'] as const) {
    await act(async () => {
      await result.current.status.mutateAsync({ itemId: 803, status });
    });
    const expected =
      status === 'GOOD'
        ? { completedCount: 3, goodCount: 2, cautionCount: 1 }
        : status === 'CAUTION'
          ? { completedCount: 3, goodCount: 1, cautionCount: 2 }
          : { completedCount: 2, goodCount: 1, cautionCount: 1 };
    await waitFor(() => expect(progress()).toMatchObject(expected));
    expect(result.current.overview.data?.stages.find((stage) => stage.stage === 'ON_SITE')?.progress).toMatchObject(
      expected,
    );
    expect(result.current.detail.data?.items.find((item) => item.itemId === 803)?.status).toBe(status);
  }
});

it('목록을 닫은 상태에서 평가해도 다음 목록 진입 시 최신 진행률을 조회한다', async () => {
  const list = renderHook(() => usePropertyList(), { wrapper });
  await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
  list.unmount();
  const mutation = renderHook(() => usePropertyChecklistItemStatusMutation(10, 51), { wrapper });
  await act(async () => {
    await mutation.result.current.mutateAsync({ itemId: 803, status: 'GOOD' });
  });
  expect(queryClient.getQueryState(propertyQueryKeys.list(''))?.isInvalidated).toBe(true);
  const reopened = renderHook(() => usePropertyList(), { wrapper });
  await waitFor(() =>
    expect(
      reopened.result.current.data?.pages[0].content
        .find((item) => item.propertyId === 10)
        ?.stages.find((stage) => stage.stage === 'ON_SITE')?.progress.completedCount,
    ).toBe(3),
  );
});

it('메모 저장도 목록을 다시 조회하고 저장 실패 시에는 진행률을 바꾸지 않는다', async () => {
  let listReads = 0;
  server.use(
    http.get('*/api/properties', () => {
      listReads += 1;
      const properties = getMockProperties();
      return success({ totalCount: properties.length, items: properties.map(propertyListItemResponse) });
    }),
  );
  const { result } = renderHook(
    () => ({
      list: usePropertyList(),
      memo: usePropertyChecklistItemMemoMutation(10, 51),
      status: usePropertyChecklistItemStatusMutation(10, 51),
    }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
  expect(listReads).toBe(1);
  await act(async () => {
    await result.current.memo.mutateAsync({ itemId: 803, memo: '주차 확인 필요' });
  });
  expect(listReads).toBe(2);
  server.use(
    http.patch('*/api/properties/10/checklists/51/items/803/status', () =>
      HttpResponse.json({ code: 'INTERNAL_SERVER_ERROR', message: '실패', data: null }, { status: 500 }),
    ),
  );
  await act(async () => {
    await expect(result.current.status.mutateAsync({ itemId: 803, status: 'GOOD' })).rejects.toThrow();
  });
  expect(listReads).toBe(2);
  expect(
    result.current.list.data?.pages[0].content
      .find((item) => item.propertyId === 10)
      ?.stages.find((stage) => stage.stage === 'ON_SITE')?.progress.completedCount,
  ).toBe(2);
});
