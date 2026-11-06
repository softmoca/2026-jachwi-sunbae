import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  checkItemPageFixture,
  checklistPageFixture,
  checklistSummaryFixture,
  onlineItemFixture,
  secondChecklistSummaryFixture,
  secondOnlineItemFixture,
} from '@/app/mocks/fixtures/checklistFixtures';
import { propertyDetailResponseFixture, successEnvelope } from '@/app/mocks/fixtures/propertyFixtures';
import AppRoutes from '@/app/router/AppRoutes';
import { setAuthentication } from '@/features/auth/model/authStore';
import { readLastSelectedChecklist } from '@/features/checklist/model/lastChecklistStore';
import { queryClient } from '@/shared/api/queryClient';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import { server } from '../../server';

const config: PublicConfig = {
  apiBaseUrl: 'http://localhost:8080',
};

type TestEntry = string | { pathname: string; state?: unknown };

const renderAuthenticated = (entry: TestEntry) => {
  setAuthentication({ accessToken: 'memory-token', tokenType: 'Bearer', expiresIn: 60 });
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[entry]}>
          <PublicConfigProvider config={config}>
            <AppRoutes />
          </PublicConfigProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
};

const onSiteChecklistSummary = { ...checklistSummaryFixture, stage: 'ON_SITE' };
const secondOnSiteChecklistSummary = { ...secondChecklistSummaryFixture, stage: 'ON_SITE' };
const onSiteItemFixture = { ...onlineItemFixture, stage: 'ON_SITE' };
const secondOnSiteItemFixture = { ...secondOnlineItemFixture, stage: 'ON_SITE' };

const finalChecklistDetail = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  name: '전화 문의 기본 목록',
  stage: 'ON_SITE',
  itemCount: 2,
  items: [
    {
      id: 701,
      systemCheckItemId: 101,
      itemType: 'CORE',
      question: onlineItemFixture.question,
      displayOrder: 1,
      active: true,
    },
    {
      id: 702,
      systemCheckItemId: 102,
      itemType: 'OPTIONAL',
      question: secondOnlineItemFixture.question,
      displayOrder: 2,
      active: true,
    },
  ],
  ...overrides,
});

const emptyStageProgress = (stage: 'ON_SITE' | 'PRE_CONTRACT') => ({
  stage,
  applied: false,
  propertyChecklistId: null,
  checklistName: null,
  sourceChecklistId: null,
  progress: {
    totalCount: 0,
    completedCount: 0,
    goodCount: 0,
    cautionCount: 0,
    unconfirmedCount: 0,
    progressRate: 0,
  },
});

describe('내 체크리스트 편집', () => {
  it('체크리스트가 있으면 목록 없이 그 체크리스트의 편집 화면을 연다', async () => {
    server.use(
      http.get(`${config.apiBaseUrl}/api/checklists`, () =>
        HttpResponse.json(
          successEnvelope(checklistPageFixture([onSiteChecklistSummary, secondOnSiteChecklistSummary])),
        ),
      ),
      http.get(`${config.apiBaseUrl}/api/checklists/7`, () =>
        HttpResponse.json(successEnvelope(finalChecklistDetail())),
      ),
    );
    renderAuthenticated('/checklists');

    // 헤더는 체크리스트 이름이 아니라 화면 이름을 보여 주고, 이름 입력칸은 없다.
    expect(await screen.findByRole('heading', { name: '체크리스트 편집', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText(onlineItemFixture.question)).toBeInTheDocument();
    expect(screen.queryByLabelText('체크리스트 이름')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '새 체크리스트 만들기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /삭제$/ })).not.toBeInTheDocument();
  });

  it('체크리스트 최초 요청 실패 후 다시 시도하면 편집 화면을 연다', async () => {
    let shouldFail = true;
    server.use(
      http.get(`${config.apiBaseUrl}/api/checklists`, () =>
        shouldFail
          ? HttpResponse.error()
          : HttpResponse.json(successEnvelope(checklistPageFixture([onSiteChecklistSummary]))),
      ),
      http.get(`${config.apiBaseUrl}/api/checklists/7`, () =>
        HttpResponse.json(successEnvelope(finalChecklistDetail())),
      ),
    );
    const user = userEvent.setup();
    renderAuthenticated('/checklists');

    expect(await screen.findByText('체크리스트를 불러오지 못했어요.')).toBeInTheDocument();
    shouldFail = false;
    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByRole('button', { name: '변경 내용 저장' })).toBeInTheDocument();
  });

  it('예전 만들기·개별 편집 주소는 내 체크리스트 편집으로 보낸다', async () => {
    server.use(
      http.get(`${config.apiBaseUrl}/api/checklists`, () =>
        HttpResponse.json(successEnvelope(checklistPageFixture([onSiteChecklistSummary]))),
      ),
      http.get(`${config.apiBaseUrl}/api/checklists/7`, () =>
        HttpResponse.json(successEnvelope(finalChecklistDetail())),
      ),
    );
    renderAuthenticated('/checklists/new');

    expect(await screen.findByRole('button', { name: '변경 내용 저장' })).toBeInTheDocument();
  });

  it('체크리스트가 없으면 CORE로 채운 편집 화면을 열고, 저장하면 하나를 만들어 새 매물에 쓰도록 기억한다', async () => {
    let requestBody: unknown;
    server.use(
      http.get(`${config.apiBaseUrl}/api/checklists`, () =>
        HttpResponse.json(successEnvelope(checklistPageFixture([]))),
      ),
      http.get(`${config.apiBaseUrl}/api/check-items`, () =>
        HttpResponse.json(successEnvelope(checkItemPageFixture([onSiteItemFixture, secondOnSiteItemFixture]))),
      ),
      http.post(`${config.apiBaseUrl}/api/checklists`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          successEnvelope(finalChecklistDetail({ id: 9, name: '내 체크리스트', stage: 'ON_SITE' })),
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderAuthenticated('/checklists');

    expect(await screen.findByRole('heading', { name: '체크리스트 편집', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText(onlineItemFixture.question)).toBeInTheDocument();
    expect(screen.queryByText(secondOnlineItemFixture.question)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('체크리스트 이름')).not.toBeInTheDocument();

    const addItemButton = screen.getByRole('button', { name: '체크 항목 추가' });
    const saveButton = screen.getByRole('button', { name: '체크리스트 저장' });
    const orderHeading = screen.getByRole('heading', { name: '확인 순서' });
    expect(addItemButton.compareDocumentPosition(orderHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(saveButton.compareDocumentPosition(orderHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(addItemButton);
    const optionalItem = await screen.findByRole('checkbox', { name: secondOnlineItemFixture.question });
    const cancelButton = screen.getByRole('button', { name: '취소' });
    const addSelectedButton = screen.getByRole('button', { name: '선택한 0개 항목 추가' });
    const searchResultsHeading = screen.getByRole('heading', { name: '검색 결과' });
    const resultItems = screen.getAllByRole('checkbox');
    expect(cancelButton.compareDocumentPosition(searchResultsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      addSelectedButton.compareDocumentPosition(searchResultsHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(resultItems[0]).toHaveAccessibleName(secondOnlineItemFixture.question);
    expect(resultItems[1]).toHaveAccessibleName(onlineItemFixture.question);
    expect(resultItems[1]).toBeDisabled();
    expect(screen.getAllByText('이미 추가됨')).toHaveLength(1);
    expect(optionalItem).not.toBeChecked();
    expect(screen.queryByLabelText('내 질문 직접 추가')).not.toBeInTheDocument();
    await user.click(optionalItem);
    expect(optionalItem).toBeChecked();
    await user.click(screen.getByRole('button', { name: '선택한 1개 항목 추가' }));
    expect(screen.getByText(secondOnlineItemFixture.question)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '체크리스트 저장' }));
    await waitFor(() =>
      expect(requestBody).toEqual({
        name: '내 체크리스트',
        stage: 'ON_SITE',
        items: [{ systemCheckItemId: 101 }, { systemCheckItemId: 102 }],
      }),
    );
    await waitFor(() => expect(readLastSelectedChecklist()).toBe(9));
  });

  it('원룸 제공 항목을 불러오지 못하면 빈 목록으로 우회하지 않고 재시도한다', async () => {
    server.use(
      http.get(`${config.apiBaseUrl}/api/checklists`, () =>
        HttpResponse.json(successEnvelope(checklistPageFixture([]))),
      ),
      http.get(`${config.apiBaseUrl}/api/check-items`, () =>
        HttpResponse.json({ code: 'INTERNAL_SERVER_ERROR', message: '조회 실패', data: null }, { status: 503 }),
      ),
    );
    renderAuthenticated('/checklists');

    const error = await screen.findByRole('alert');
    expect(within(error).getByText('프리셋을 불러오지 못했어요.')).toBeInTheDocument();
    expect(within(error).getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '빈 목록으로 시작' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '체크리스트 저장' })).not.toBeInTheDocument();
  });

  it('수정 요청에는 기존 이름과 현재 제공 항목의 전체 순서를 보낸다', async () => {
    let requestBody: unknown;
    server.use(
      http.get(`${config.apiBaseUrl}/api/checklists`, () =>
        HttpResponse.json(successEnvelope(checklistPageFixture([onSiteChecklistSummary]))),
      ),
      http.get(`${config.apiBaseUrl}/api/checklists/7`, () =>
        HttpResponse.json(successEnvelope(finalChecklistDetail())),
      ),
      http.get(`${config.apiBaseUrl}/api/check-items`, () =>
        HttpResponse.json(successEnvelope(checkItemPageFixture([onlineItemFixture, secondOnlineItemFixture]))),
      ),
      http.put(`${config.apiBaseUrl}/api/checklists/7`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(successEnvelope(finalChecklistDetail()));
      }),
      // 저장한 뒤 이 체크리스트를 쓰는 매물을 찾아 다시 적용한다. 여기서는 그런 매물이 없다.
      http.get(`${config.apiBaseUrl}/api/properties`, () =>
        HttpResponse.json(successEnvelope({ totalCount: 0, items: [] })),
      ),
    );
    const user = userEvent.setup();
    renderAuthenticated('/checklists');

    await user.click(await screen.findByRole('button', { name: '변경 내용 저장' }));

    await waitFor(() =>
      expect(requestBody).toEqual({
        name: '전화 문의 기본 목록',
        items: [{ systemCheckItemId: 101 }, { systemCheckItemId: 102 }],
      }),
    );
    await waitFor(() => expect(readLastSelectedChecklist()).toBe(7));
  });
});

describe('매물 체크리스트 연결과 자동 저장', () => {
  it('매물에 체크리스트가 없으면 선택 화면 없이 바로 기본 체크리스트 시작 버튼을 보여준다', async () => {
    server.use(
      http.get(`${config.apiBaseUrl}/api/properties/10`, () =>
        HttpResponse.json(successEnvelope({ ...propertyDetailResponseFixture(), photos: [] })),
      ),
      http.get(`${config.apiBaseUrl}/api/properties/10/checklists`, () =>
        HttpResponse.json(
          successEnvelope({
            propertyId: 10,
            overallProgress: {
              totalCount: 0,
              completedCount: 0,
              goodCount: 0,
              cautionCount: 0,
              unconfirmedCount: 0,
              progressRate: 0,
            },
            stages: [emptyStageProgress('ON_SITE'), emptyStageProgress('PRE_CONTRACT')],
          }),
        ),
      ),
    );
    const user = userEvent.setup();
    renderAuthenticated('/properties/10');

    // 체크리스트는 매물 상세의 `체크리스트` 탭에서 보인다.
    await user.click(await screen.findByRole('tab', { name: '체크리스트' }));
    const sectionHeading = await screen.findByRole('heading', { name: '체크리스트' });
    const section = sectionHeading.closest('section');
    expect(section).not.toBeNull();
    // 기본 체크리스트를 자동으로 붙이는 동안에는 시작 버튼을 그리지 않는다. 자동으로 붙이지 못했을 때 시작 버튼이 나타난다.
    expect(await within(section as HTMLElement).findByRole('button', { name: /^체크리스트$/ })).toBeInTheDocument();
  });

  it('내 체크리스트가 없어도 시작 방식 선택 없이 새 체크리스트 만들기만 제공한다', async () => {
    server.use(
      http.get(`${config.apiBaseUrl}/api/properties/10`, () =>
        HttpResponse.json(successEnvelope(propertyDetailResponseFixture())),
      ),
      http.get(`${config.apiBaseUrl}/api/properties/10/checklists`, () =>
        HttpResponse.json(
          successEnvelope({
            propertyId: 10,
            overallProgress: {
              totalCount: 0,
              completedCount: 0,
              goodCount: 0,
              cautionCount: 0,
              unconfirmedCount: 0,
              progressRate: 0,
            },
            stages: [
              {
                stage: 'ON_SITE',
                applied: false,
                propertyChecklistId: null,
                checklistName: null,
                sourceChecklistId: null,
                progress: {
                  totalCount: 0,
                  completedCount: 0,
                  goodCount: 0,
                  cautionCount: 0,
                  unconfirmedCount: 0,
                  progressRate: 0,
                },
              },
              emptyStageProgress('ON_SITE'),
              emptyStageProgress('PRE_CONTRACT'),
            ],
          }),
        ),
      ),
      http.get(`${config.apiBaseUrl}/api/checklists`, () =>
        HttpResponse.json(successEnvelope(checklistPageFixture([]))),
      ),
    );
    renderAuthenticated('/properties/10/active-checklists/ON_SITE?from=property-detail');

    expect(await screen.findByRole('checkbox', { name: /자취선배 기본 체크리스트/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '새 체크리스트 만들기' })).not.toBeInTheDocument();
    expect(screen.queryByText('빈 목록')).not.toBeInTheDocument();
    expect(screen.queryByText('원룸 제공 항목')).not.toBeInTheDocument();
  });

  it('목록을 고른 뒤 확인할 때 최종 연결 API를 호출하고 적용 상세로 이동한다', async () => {
    let requestBody: unknown;
    server.use(
      http.get(`${config.apiBaseUrl}/api/properties/10`, () =>
        HttpResponse.json(successEnvelope(propertyDetailResponseFixture())),
      ),
      http.get(`${config.apiBaseUrl}/api/properties/10/checklists`, () =>
        HttpResponse.json(
          successEnvelope({
            propertyId: 10,
            overallProgress: {
              totalCount: 0,
              completedCount: 0,
              goodCount: 0,
              cautionCount: 0,
              unconfirmedCount: 0,
              progressRate: 0,
            },
            stages: [
              {
                stage: 'ON_SITE',
                applied: false,
                propertyChecklistId: null,
                checklistName: null,
                sourceChecklistId: null,
                progress: {
                  totalCount: 0,
                  completedCount: 0,
                  goodCount: 0,
                  cautionCount: 0,
                  unconfirmedCount: 0,
                  progressRate: 0,
                },
              },
              emptyStageProgress('ON_SITE'),
              emptyStageProgress('PRE_CONTRACT'),
            ],
          }),
        ),
      ),
      http.get(`${config.apiBaseUrl}/api/checklists`, () =>
        HttpResponse.json(successEnvelope(checklistPageFixture([checklistSummaryFixture]))),
      ),
      http.put(`${config.apiBaseUrl}/api/properties/10/checklists/ON_SITE`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          successEnvelope({
            id: 47,
            propertyId: 10,
            sourceChecklistId: 7,
            checklistName: '전화 문의 기본 목록',
            stage: 'ON_SITE',
            items: [],
          }),
        );
      }),
      http.get(`${config.apiBaseUrl}/api/properties/10/checklists/47`, () =>
        HttpResponse.json(
          successEnvelope({
            id: 47,
            propertyId: 10,
            sourceChecklistId: 7,
            checklistName: '전화 문의 기본 목록',
            stage: 'ON_SITE',
            items: [],
          }),
        ),
      ),
      http.get(`${config.apiBaseUrl}/api/properties/10/checklists`, () =>
        HttpResponse.json(
          successEnvelope({
            propertyId: 10,
            overallProgress: {
              totalCount: 2,
              completedCount: 1,
              goodCount: 1,
              cautionCount: 0,
              unconfirmedCount: 1,
              progressRate: 50,
            },
            stages: [
              {
                stage: 'ON_SITE',
                applied: true,
                propertyChecklistId: 47,
                checklistName: '전화 문의 기본 목록',
                sourceChecklistId: 7,
                progress: {
                  totalCount: 1,
                  completedCount: 0,
                  goodCount: 0,
                  cautionCount: 0,
                  unconfirmedCount: 1,
                  progressRate: 0,
                },
              },
              emptyStageProgress('ON_SITE'),
              emptyStageProgress('PRE_CONTRACT'),
            ],
          }),
        ),
      ),
    );
    const user = userEvent.setup();
    renderAuthenticated('/properties/10/active-checklists/ON_SITE?mode=replace');

    expect(await screen.findByRole('checkbox', { name: /전화 문의 기본 목록/ })).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /전화 문의 기본 목록/ }));
    expect(requestBody).toBeUndefined();
    await user.click(screen.getByRole('button', { name: '체크리스트 적용' }));

    await waitFor(() => expect(requestBody).toEqual({ sourceType: 'USER', checklistId: 7 }));
    expect(await screen.findByRole('heading', { name: '전화 문의 기본 목록', level: 1 })).toBeInTheDocument();
    // 다음 매물은 이번에 고른 목록으로 시작한다.
    expect(readLastSelectedChecklist()).toBe(7);
  });

  it('적용된 체크리스트에서 변경을 누르면 현재 연결을 유지한 채 교체 목록을 보여준다', async () => {
    server.use(
      http.get(`${config.apiBaseUrl}/api/properties/10`, () =>
        HttpResponse.json(successEnvelope(propertyDetailResponseFixture())),
      ),
      http.get(`${config.apiBaseUrl}/api/properties/10/checklists`, () =>
        HttpResponse.json(
          successEnvelope({
            propertyId: 10,
            overallProgress: {
              totalCount: 2,
              completedCount: 1,
              goodCount: 1,
              cautionCount: 0,
              unconfirmedCount: 1,
              progressRate: 50,
            },
            stages: [
              {
                stage: 'ON_SITE',
                applied: true,
                propertyChecklistId: 47,
                checklistName: '전화 문의 기본 목록',
                sourceChecklistId: 7,
                progress: {
                  totalCount: 2,
                  completedCount: 1,
                  goodCount: 1,
                  cautionCount: 0,
                  unconfirmedCount: 1,
                  progressRate: 50,
                },
              },
              emptyStageProgress('PRE_CONTRACT'),
            ],
          }),
        ),
      ),
      http.get(`${config.apiBaseUrl}/api/checklists`, () =>
        HttpResponse.json(
          successEnvelope(checklistPageFixture([checklistSummaryFixture, secondChecklistSummaryFixture])),
        ),
      ),
    );
    const user = userEvent.setup();
    renderAuthenticated('/properties/10/active-checklists/ON_SITE?from=property-detail&mode=replace');

    const current = await screen.findByRole('checkbox', { name: /전화 문의 기본 목록/ });
    expect(current).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /직방 매물 문의 목록/ })).not.toBeChecked();

    await user.click(screen.getByRole('checkbox', { name: /직방 매물 문의 목록/ }));
    expect(screen.getByRole('button', { name: '선택한 체크리스트로 교체' })).toBeEnabled();
  });

  it('상태와 항목 메모를 각각 즉시 저장한다', async () => {
    let statusRequest: unknown;
    let memoRequest: unknown;
    server.use(
      http.get(`${config.apiBaseUrl}/api/properties/10`, () =>
        HttpResponse.json(successEnvelope({ ...propertyDetailResponseFixture(), photos: [] })),
      ),
      http.get(`${config.apiBaseUrl}/api/properties/10/checklists/47`, () =>
        HttpResponse.json(
          successEnvelope({
            id: 47,
            propertyId: 10,
            sourceChecklistId: 7,
            checklistName: '전화 문의 기본 목록',
            stage: 'ON_SITE',
            items: [
              {
                id: 701,
                systemCheckItemId: 101,
                question: '수압이 충분한가요?',
                displayOrder: 1,
                status: 'UNCONFIRMED',
                memo: '',
              },
              {
                id: 702,
                systemCheckItemId: 102,
                question: '채광이 충분한가요?',
                displayOrder: 2,
                status: 'UNCONFIRMED',
                memo: '',
              },
            ],
          }),
        ),
      ),
      http.get(`${config.apiBaseUrl}/api/properties/10/checklists`, () =>
        HttpResponse.json(
          successEnvelope({
            propertyId: 10,
            overallProgress: {
              totalCount: 1,
              completedCount: 0,
              goodCount: 0,
              cautionCount: 0,
              unconfirmedCount: 1,
              progressRate: 0,
            },
            stages: [
              {
                stage: 'ON_SITE',
                applied: true,
                propertyChecklistId: 47,
                checklistName: '전화 문의 기본 목록',
                sourceChecklistId: 7,
                progress: {
                  totalCount: 1,
                  completedCount: 0,
                  goodCount: 0,
                  cautionCount: 0,
                  unconfirmedCount: 1,
                  progressRate: 0,
                },
              },
              emptyStageProgress('ON_SITE'),
              emptyStageProgress('PRE_CONTRACT'),
            ],
          }),
        ),
      ),
      http.patch(`${config.apiBaseUrl}/api/properties/10/checklists/47/items/701/status`, async ({ request }) => {
        statusRequest = await request.json();
        return HttpResponse.json(successEnvelope({ item: { id: 701, status: 'CAUTION' } }));
      }),
      http.patch(`${config.apiBaseUrl}/api/properties/10/checklists/47/items/701/memo`, async ({ request }) => {
        memoRequest = await request.json();
        return HttpResponse.json(successEnvelope({ item: { id: 701, memo: '수압은 괜찮지만 온수 확인 필요' } }));
      }),
    );
    const user = userEvent.setup();
    renderAuthenticated('/properties/10/checklists/47');

    expect(await screen.findByRole('heading', { name: '전화 문의 기본 목록', level: 1 })).toBeInTheDocument();
    // 적용한 체크리스트를 바꾸는 진입점은 상단 헤더 오른쪽의 `편집` 하나뿐이다.
    expect(screen.getByRole('link', { name: '편집' })).toHaveAttribute(
      'href',
      '/properties/10/active-checklists/ON_SITE?mode=replace',
    );

    await user.click(screen.getAllByRole('button', { name: '주의' })[0]);
    await waitFor(() => expect(statusRequest).toEqual({ status: 'CAUTION' }));
    const memo = screen.getByRole('textbox', { name: '수압이 충분한가요? 메모' });
    expect(memo).toHaveAttribute('placeholder', '메모 추가');
    expect(screen.getByRole('textbox', { name: '채광이 충분한가요? 메모' })).toBeEnabled();
    await user.type(memo, '수압은 괜찮지만 온수 확인 필요');
    await user.tab();
    await waitFor(() => expect(memoRequest).toEqual({ memo: '수압은 괜찮지만 온수 확인 필요' }));
    expect(memo).toHaveValue('수압은 괜찮지만 온수 확인 필요');
    expect(screen.getByRole('heading', { name: '사용자 체크리스트' })).toBeInTheDocument();
  });
});
