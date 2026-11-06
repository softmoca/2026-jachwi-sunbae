import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, expect, it } from 'vitest';

import { errorEnvelope } from '@/app/mocks/fixtures/propertyFixtures';
import { propertyChecklistHandlers } from '@/app/mocks/handlers/propertyChecklistHandlers';
import { propertyHandlers } from '@/app/mocks/handlers/propertyHandlers';
import { resetMockStore } from '@/app/mocks/mockStore';
import PropertyDetailPage from '@/pages/property-detail/PropertyDetailPage';
import { resetAuthenticationForTests, setAuthentication } from '@/features/auth/model/authStore';
import { queryClient } from '@/shared/api/queryClient';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

import { server } from '../../server';

beforeEach(() => {
  resetMockStore();
  setAuthentication({ accessToken: 'valid-token', tokenType: 'Bearer', expiresIn: 60 });
  server.use(...propertyHandlers, ...propertyChecklistHandlers);
});
afterEach(() => {
  resetAuthenticationForTests();
  queryClient.clear();
  sessionStorage.clear();
});

const renderDetail = (search = '') => {
  const router = createMemoryRouter([{ path: '/properties/:propertyId', element: <PropertyDetailPage /> }], {
    initialEntries: [{ pathname: '/properties/10', search, state: { returnTo: '/properties' } }],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <PublicConfigProvider config={{ apiBaseUrl: 'http://localhost:8080' }}>
        <RouterProvider router={router} />
      </PublicConfigProvider>
    </QueryClientProvider>,
  );
  return router;
};

it('주소에 체크리스트 탭이 있으면 체크리스트 탭으로 연다', async () => {
  renderDetail('?tab=checklist');
  expect(await screen.findByRole('tab', { name: '체크리스트' })).toHaveAttribute('aria-selected', 'true');
});

it('고른 탭을 들어온 화면 정보와 함께 주소에 남긴다', async () => {
  const user = userEvent.setup();
  const router = renderDetail();
  await user.click(await screen.findByRole('tab', { name: '체크리스트' }));

  expect(router.state.location.search).toBe('?tab=checklist');
  expect(router.state.location.state).toEqual({ returnTo: '/properties' });
  expect(router.state.historyAction).toBe('REPLACE');

  await user.click(screen.getByRole('tab', { name: '정보' }));
  expect(router.state.location.search).toBe('?tab=details');
});

it('주소에 탭이 없으면 마지막으로 본 탭으로 연다', async () => {
  const user = userEvent.setup();
  renderDetail();
  await user.click(await screen.findByRole('tab', { name: '체크리스트' }));
  cleanup();

  renderDetail();
  expect(await screen.findByRole('tab', { name: '체크리스트' })).toHaveAttribute('aria-selected', 'true');
});

it('탭 제목에 매물 이름과 지금 탭을 담는다', async () => {
  renderDetail('?tab=checklist');
  await screen.findByRole('tab', { name: '체크리스트' });
  await waitFor(() => expect(document.title).toBe('신림역 원룸 체크리스트 | 자취선배'));
});

it('항목을 평가해도 포커스가 누른 버튼에 남고, 바뀐 평가 개수를 알린다', async () => {
  const user = userEvent.setup();
  renderDetail('?tab=checklist');
  const group = await screen.findByRole('group', { name: '주차가 가능한가요?' });
  const good = within(group).getByRole('button', { name: '괜찮음' });

  await user.click(good);

  await waitFor(() => expect(good).toHaveAttribute('aria-pressed', 'true'));
  expect(good).toHaveFocus();
  expect(screen.getByRole('status')).toHaveTextContent('3개 중 3개 평가');
});

it('항목 바로 아래 메모를 입력하고 벗어나면 저장하며 다시 열어도 유지한다', async () => {
  const user = userEvent.setup();
  renderDetail('?tab=checklist');
  const memo = await screen.findByRole('textbox', { name: '주차가 가능한가요? 메모' });
  expect(memo).toHaveAttribute('placeholder', '메모 추가');
  await user.type(memo, '기계식 주차 1대');
  await user.tab();
  await waitFor(() => expect(memo).not.toHaveAttribute('readonly'));
  cleanup();
  renderDetail('?tab=checklist');
  expect(await screen.findByRole('textbox', { name: '주차가 가능한가요? 메모' })).toHaveValue('기계식 주차 1대');
});

it('정보 탭의 값 버튼은 라벨과 화면에 보이는 값을 함께 읽는다', async () => {
  renderDetail('?tab=info');
  expect(await screen.findByRole('button', { name: '매물 이름 신림역 원룸, 수정' })).toBeInTheDocument();
});

it('메모 저장 실패 시 입력을 유지하고 다시 저장하면 다음 조회에도 반영한다', async () => {
  server.use(
    http.patch('*/api/properties/10/checklists/:checklistId/items/:itemId/memo', () =>
      HttpResponse.json(errorEnvelope('INTERNAL_SERVER_ERROR'), { status: 500 }),
    ),
  );
  const user = userEvent.setup();
  renderDetail('?tab=checklist');
  const memo = await screen.findByRole('textbox', { name: '주차가 가능한가요? 메모' });
  await user.type(memo, '주차 자리 재확인');
  await user.tab();
  const retry = await screen.findByRole('button', { name: '메모 다시 저장' });
  expect(memo).toHaveValue('주차 자리 재확인');
  server.use(...propertyChecklistHandlers);
  await user.click(retry);
  await waitFor(() => expect(screen.queryByRole('button', { name: '메모 다시 저장' })).not.toBeInTheDocument());
  cleanup();
  renderDetail('?tab=checklist');
  expect(await screen.findByRole('textbox', { name: '주차가 가능한가요? 메모' })).toHaveValue('주차 자리 재확인');
});

it('작성 중 Escape를 누르면 기존 메모로 돌아가며 저장 요청을 보내지 않는다', async () => {
  let saveCount = 0;
  server.use(
    http.patch('*/api/properties/10/checklists/:checklistId/items/:itemId/memo', () => {
      saveCount += 1;
      return HttpResponse.json(errorEnvelope('INTERNAL_SERVER_ERROR'), { status: 500 });
    }),
  );
  const user = userEvent.setup();
  renderDetail('?tab=checklist');
  const memo = await screen.findByRole('textbox', { name: '주차가 가능한가요? 메모' });
  await user.type(memo, '취소할 메모');
  await user.keyboard('{Escape}');
  await user.tab();
  expect(memo).toHaveValue('');
  expect(saveCount).toBe(0);
});
