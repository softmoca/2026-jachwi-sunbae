import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { successEnvelope } from '@/app/mocks/fixtures/propertyFixtures';
import AppRoutes from '@/app/router/AppRoutes';
import { setAuthentication } from '@/features/auth/model/authStore';
import { queryClient } from '@/shared/api/queryClient';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

import { server } from '../../server';

const result = {
  center: { latitude: 37.5665, longitude: 126.978 },
  radius: 1000,
  count: 1,
  dataAsOf: '2026-06-30',
  stores: [
    {
      id: 1,
      name: '범위가격 가게',
      businessType: '기타비요식업',
      phone: null,
      address: '서울 중구',
      latitude: 37.567,
      longitude: 126.978,
      distanceMeters: 56,
      menus: [
        { name: '꽃다발', price: '25000~45000' },
        { name: '맞춤 꽃다발', price: null },
      ],
    },
  ],
};

let visit = 0;
const renderPage = (path = '/map?mode=thrifty') => {
  setAuthentication({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 60 });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: path.split('?')[0],
            search: path.includes('?') ? `?${path.split('?')[1]}` : '',
            key: `good-price-${++visit}`,
          },
        ]}
      >
        <PublicConfigProvider config={{ apiBaseUrl: 'http://localhost:8080', mapProviderMode: 'demo' }}>
          <AppRoutes />
        </PublicConfigProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  queryClient.clear();
  server.use(http.get('*/api/maps/good-price-stores', () => HttpResponse.json(successEnvelope(result))));
  server.use(
    http.get('*/api/maps/geocode', () =>
      HttpResponse.json(
        successEnvelope([
          { ...result.center, roadAddress: '서울 중구 세종대로 110', jibunAddress: '서울 중구 태평로1가 31' },
        ]),
      ),
    ),
  );
});

describe('지도 알뜰 탐색', () => {
  it('현재 지도의 위치와 반경으로 알뜰을 켜고 같은 지도에서 가게와 매물 모드를 전환한다', async () => {
    const user = userEvent.setup();
    const requests: URLSearchParams[] = [];
    server.use(
      http.get('*/api/maps/good-price-stores', ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push(params);
        return HttpResponse.json(successEnvelope({ ...result, radius: Number(params.get('radius')) }));
      }),
    );
    renderPage('/map');
    const toggle = await screen.findByRole('button', { name: '알뜰' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(requests).toHaveLength(0);
    expect(screen.queryByRole('link', { name: '동네생활' })).not.toBeInTheDocument();
    const map = screen.getByLabelText('데모 지도');
    await user.click(screen.getByRole('button', { name: '주소 또는 위치 검색' }));
    await user.type(screen.getByRole('textbox', { name: '주소 검색' }), '서울 시청{Enter}');
    await user.click(await screen.findByRole('button', { name: /서울 중구 세종대로 110/ }));
    await user.click(screen.getByRole('button', { name: '500m' }));
    await user.click(toggle);
    expect(await screen.findByText('500m 안 착한가격 가게 1곳')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('데모 지도')).toBe(map);
    expect(screen.getByRole('link', { name: '지도' })).toHaveAttribute('aria-current', 'page');
    expect(requests[0]?.get('latitude')).toBe(String(result.center.latitude));
    expect(requests[0]?.get('longitude')).toBe(String(result.center.longitude));
    expect(requests[0]?.get('radius')).toBe('500');
    await user.click(within(map).getByRole('button', { name: '범위가격 가게 상세 보기' }));
    expect(screen.getByRole('region', { name: '범위가격 가게' })).toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('region', { name: '매물 지도' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '범위가격 가게' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('데모 지도')).toBe(map);
    expect(screen.getByRole('button', { name: '지도에서 매물 추가' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '주소 또는 위치 검색' })).toHaveTextContent('서울 중구 세종대로 110');
    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: /병원 표시하기/ }));
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'false'));
    expect(screen.getByRole('button', { name: /병원 숨기기/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('이전 동네생활 상세 주소도 지도 알뜰 모드로 연결한다', async () => {
    renderPage('/neighborhood?store=1');
    expect(await screen.findByRole('region', { name: '범위가격 가게' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '알뜰' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: '지도' })).toHaveAttribute('aria-current', 'page');
  });

  it('매물 등록 없이 동네 검색으로 진입하고 가격 원문과 정보 누락을 상세에서 확인한다', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '주소 또는 위치 검색' }));
    await user.type(screen.getByRole('textbox', { name: '동네 주소 검색' }), '서울 시청');
    await user.click(screen.getByRole('button', { name: '검색' }));
    await user.click(await screen.findByRole('button', { name: /서울 중구 세종대로 110/ }));
    await user.click(
      within(await screen.findByRole('list', { name: '가게 목록' })).getByRole('button', {
        name: '범위가격 가게 상세 보기',
      }),
    );
    const detail = screen.getByRole('region', { name: '범위가격 가게' });
    expect(within(detail).getByText('25000~45000')).toBeInTheDocument();
    expect(within(detail).getByText('가격 정보 없음')).toBeInTheDocument();
    expect(within(detail).queryByRole('link', { name: '전화하기' })).not.toBeInTheDocument();
    expect(within(detail).getByRole('link', { name: /길찾기/ })).toHaveAttribute(
      'href',
      expect.stringContaining('37.567,126.978'),
    );
    await user.click(within(detail).getByRole('button', { name: '가게 목록으로' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: '가게 목록' })).getByRole('button', { name: '범위가격 가게 상세 보기' }),
    ).toBeInTheDocument();
  });

  it('닫힌 목록 위의 지도 핀을 누르면 같은 하단 시트에서 상세를 연다', async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(
      'jachwi-sunbae.neighborhoodArea',
      JSON.stringify({ ...result.center, label: '선택한 동네' }),
    );
    renderPage();
    expect(await screen.findByRole('button', { name: '가게 목록 열기' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list', { name: '가게 목록' })).not.toBeInTheDocument();
    const map = screen.getByLabelText('데모 지도');
    await user.click(await within(map).findByRole('button', { name: '범위가격 가게 상세 보기' }));
    const detail = screen.getByRole('region', { name: '범위가격 가게' });
    expect(within(detail).getByText('25000~45000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '가게 정보 닫기' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(within(detail).getByRole('button', { name: '가게 목록으로' }));
    expect(screen.getByRole('list', { name: '가게 목록' })).toBeInTheDocument();
  });

  it('반경을 바꾸면 지도 핀과 하단 목록을 같은 결과로 갱신하고 이전 상세를 닫는다', async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(
      'jachwi-sunbae.neighborhoodArea',
      JSON.stringify({ ...result.center, label: '선택한 동네' }),
    );
    const fartherStore = { ...result.stores[0], id: 2, name: '멀리 있는 가게', distanceMeters: 800 };
    server.use(
      http.get('*/api/maps/good-price-stores', ({ request }) => {
        const radius = Number(new URL(request.url).searchParams.get('radius'));
        const stores = radius === 500 ? result.stores : [...result.stores, fartherStore];
        return HttpResponse.json(successEnvelope({ ...result, radius, stores, count: stores.length }));
      }),
    );
    renderPage();
    const map = await screen.findByLabelText('데모 지도');
    await user.click(await within(map).findByRole('button', { name: '멀리 있는 가게 상세 보기' }));
    expect(screen.getByRole('region', { name: '멀리 있는 가게' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '500m' }));
    expect(await screen.findByText('500m 안 착한가격 가게 1곳')).toBeInTheDocument();
    expect(within(map).getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('region', { name: '멀리 있는 가게' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: '가게 목록' })).getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '멀리 있는 가게 상세 보기' })).not.toBeInTheDocument();
  });

  it('반경을 확대해서 빈 결과에서 탐색을 이어간다', async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(
      'jachwi-sunbae.neighborhoodArea',
      JSON.stringify({ ...result.center, label: '선택한 동네' }),
    );
    server.use(
      http.get('*/api/maps/good-price-stores', ({ request }) => {
        const radius = Number(new URL(request.url).searchParams.get('radius'));
        return HttpResponse.json(
          successEnvelope(radius === 1000 ? { ...result, count: 0, stores: [] } : { ...result, radius }),
        );
      }),
    );
    renderPage();
    await user.click(await screen.findByRole('button', { name: '가게 목록 열기' }));
    await user.click(await screen.findByRole('button', { name: '반경 넓히기' }));
    expect(
      within(await screen.findByRole('list', { name: '가게 목록' })).getByRole('button', {
        name: '범위가격 가게 상세 보기',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2km' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('조회 실패를 빈 결과와 구분하고 재시도한다', async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(
      'jachwi-sunbae.neighborhoodArea',
      JSON.stringify({ ...result.center, label: '선택한 동네' }),
    );
    server.use(http.get('*/api/maps/good-price-stores', () => HttpResponse.json({}, { status: 503 })));
    renderPage();
    await user.click(await screen.findByRole('button', { name: '가게 목록 열기' }));
    expect(await screen.findByRole('heading', { name: '가게를 불러오지 못했어요' })).toBeInTheDocument();
    server.use(http.get('*/api/maps/good-price-stores', () => HttpResponse.json(successEnvelope(result))));
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(
      within(await screen.findByRole('list', { name: '가게 목록' })).getByRole('button', {
        name: '범위가격 가게 상세 보기',
      }),
    ).toBeInTheDocument();
  });
});
