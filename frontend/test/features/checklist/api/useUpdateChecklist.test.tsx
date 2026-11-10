import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, expect, it } from 'vitest';

import { handlers } from '@/app/mocks/handlers';
import { getMockAppliedByProperty, resetMockStore } from '@/app/mocks/mockStore';
import { resetAuthenticationForTests, setAuthentication } from '@/features/auth/model/authStore';
import { getChecklistErrorMessage } from '@/features/checklist/api/checklistErrorMessages';
import { useUpdateChecklist } from '@/features/checklist/api/useChecklistMutations';
import type { ChecklistEditorProvidedItem } from '@/features/checklist/model/ChecklistEditor';
import { queryClient } from '@/shared/api/queryClient';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

import { server } from '../../../server';

const provided = (sourceCheckItemId: number): ChecklistEditorProvidedItem => ({
  clientKey: `provided-${sourceCheckItemId}`,
  checklistItemId: null,
  question: '',
  itemType: 'CORE',
  active: true,
  origin: 'PROVIDED',
  sourceCheckItemId,
  guide: null,
});

const setup = () => {
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <PublicConfigProvider config={{ apiBaseUrl: 'http://localhost:8080' }}>{children}</PublicConfigProvider>
    </QueryClientProvider>
  );
  // 목 데이터에서 매물 10의 현장 확인 체크리스트는 사용자 체크리스트 7(101, 102, 103)에서 떠 왔다.
  return renderHook(() => useUpdateChecklist(7), { wrapper });
};

const appliedRequests: string[] = [];
const trackApply = ({ request }: { request: Request }) => {
  const { pathname } = new URL(request.url);
  if (request.method === 'PUT' && pathname.startsWith('/api/properties/')) appliedRequests.push(pathname);
};

beforeEach(() => {
  resetMockStore();
  appliedRequests.length = 0;
  setAuthentication({ accessToken: 'valid-token', tokenType: 'Bearer', expiresIn: 60 });
  server.use(...handlers);
  server.events.on('request:start', trackApply);
});
afterEach(() => {
  server.events.removeListener('request:start', trackApply);
  resetAuthenticationForTests();
  queryClient.clear();
});

it('체크리스트를 고치면 그 체크리스트를 쓰는 매물에 다시 적용해 바뀐 항목을 보이고, 같은 항목의 체크 값과 메모는 이어 간다', async () => {
  const { result } = setup();
  await act(async () => {
    await result.current.mutateAsync({
      name: '전화 문의 기본 목록',
      items: [provided(101), provided(102), provided(201)],
    });
  });

  // 체크리스트 7을 쓰는 매물 10에만 다시 적용한다.
  expect(appliedRequests).toEqual(['/api/properties/10/checklists/ON_SITE']);
  const applied = getMockAppliedByProperty().get(10)?.get('ON_SITE');
  expect(applied?.items.map((item) => [item.question, item.status, item.memo])).toEqual([
    ['관리비에 포함된 항목은 무엇인가요?', 'GOOD', '수도 요금 포함'],
    ['입주 가능한 날짜는 언제인가요?', 'CAUTION', '날짜 재확인 필요'],
    ['수압이 충분한가요?', 'UNCONFIRMED', ''],
  ]);
});

it('매물에 다시 적용하지 못하면 체크리스트는 저장한 채로 몇 곳에 적용하지 못했는지 알린다', async () => {
  server.use(http.put('*/api/properties/:propertyId/checklists/:stage', () => new HttpResponse(null, { status: 500 })));
  const { result } = setup();
  let caught: unknown;
  await act(async () => {
    await result.current.mutateAsync({ name: '바꾼 이름', items: [provided(101)] }).catch((error: unknown) => {
      caught = error;
    });
  });
  expect(getChecklistErrorMessage(caught)).toBe(
    '체크리스트는 저장했지만 매물 1곳에 바로 적용하지 못했어요. 다시 저장해 주세요.',
  );
  // 저장한 원본은 남는다. 매물 사본은 예전 그대로다.
  expect(getMockAppliedByProperty().get(10)?.get('ON_SITE')?.items).toHaveLength(3);
});
