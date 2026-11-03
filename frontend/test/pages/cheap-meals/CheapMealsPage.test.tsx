import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';

import CheapMealsPage from '@/pages/cheap-meals/CheapMealsPage';
import CheapMealCard from '@/pages/design-home/ui/CheapMealCard';
import { setAuthentication } from '@/features/auth/model/authStore';
import * as mapLocation from '@/features/map/lib/mapLocation';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

import { server } from '../../server';

const trackEvent = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/analytics/posthog', () => ({ trackPostHogEvent: trackEvent }));

vi.mock('@/features/map/ui/map-canvas/MapCanvas', () => ({
  default: ({
    onCenterChange,
    onSelectMarker,
  }: {
    onCenterChange: (lat: number, lng: number) => void;
    onSelectMarker: (marker: { id: string }) => void;
  }) => (
    <>
      <button onClick={() => onCenterChange(37.5665, 126.978)}>지도 이동 테스트</button>
      <button onClick={() => onSelectMarker({ id: '10' })}>업소 마커 테스트</button>
    </>
  ),
}));
const calls = { promotions: vi.fn(), delivery: vi.fn(), stores: vi.fn() };
const products = Array.from({ length: 60 }, (_, index) => ({
  name: `행사상품 ${index}`,
  price: 4200,
  imageUrl: 'https://example.com/product.png',
  category: 'UNKNOWN',
  promotionType: ['ONE_PLUS_ONE', 'TWO_PLUS_ONE', 'THREE_PLUS_ONE', 'SALE', 'PICK_AND_MIX'][index % 5],
}));
const promotion = (brand: string, values = products, collectedAt: string | null = '2026-10-29T04:00:00+09:00') => ({
  brand,
  count: values.length,
  collectedAt,
  sourceUrl: 'https://example.com/promotions',
  products: values,
});
const offer = {
  id: 1,
  platform: 'BAEMIN',
  brandName: '테스트피자',
  discountAmount: 6000,
  minOrderAmount: 22000,
  startDate: null,
  endDate: null,
  conditions: null,
  lastVerifiedAt: '2026-10-29T09:00:00',
};
const success = (data: unknown) => HttpResponse.json({ code: 'SUCCESS', message: '성공', data });

beforeEach(() => {
  Object.values(calls).forEach((call) => call.mockClear());
  trackEvent.mockClear();
  setAuthentication({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 60, memberId: 1 });
  server.use(
    http.get('http://localhost:8080/api/promotions', ({ request }) => {
      const brand = new URL(request.url).searchParams.get('brand') ?? '';
      calls.promotions(brand);
      return success(promotion(brand));
    }),
    http.get('http://localhost:8080/api/delivery-discount-offers', () => {
      calls.delivery();
      return success([
        offer,
        {
          ...offer,
          id: 2,
          platform: 'COUPANG_EATS',
          brandName: '테스트치킨',
          minOrderAmount: null,
          conditions: '참여 매장에 한함',
        },
      ]);
    }),
    http.get('http://localhost:8080/api/maps/good-price-stores', ({ request }) => {
      const url = new URL(request.url);
      calls.stores(url.searchParams.get('radius'), url.searchParams.get('latitude'), url.searchParams.get('longitude'));
      return success({
        center: {
          latitude: Number(url.searchParams.get('latitude')),
          longitude: Number(url.searchParams.get('longitude')),
        },
        radius: Number(url.searchParams.get('radius')),
        count: 1,
        dataAsOf: '2026-06-30',
        stores: [
          {
            id: 10,
            name: '착한 세탁소',
            businessType: '기타비요식업',
            phone: null,
            address: '테스트 주소',
            latitude: 37.3948,
            longitude: 127.1119,
            distanceMeters: 100,
            menus: [{ name: '세탁', price: '5,000~7,000' }],
          },
        ],
      });
    }),
  );
});
const Back = () => {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>브라우저 뒤로</button>;
};
const setup = (entry = '/cheap-meals') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PublicConfigProvider config={{ apiBaseUrl: 'http://localhost:8080' }}>
        <MemoryRouter initialEntries={[entry]}>
          <Back />
          <Routes>
            <Route path="/" element={<CheapMealCard />} />
            <Route path="/cheap-meals" element={<CheapMealsPage />} />
          </Routes>
        </MemoryRouter>
      </PublicConfigProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
};
const tab = (name: string) => screen.getByRole('tab', { name });

it('홈 카드에서 들어오면 고를 카드만 늘어놓던 전체 탭 없이 식당 탭을 바로 열고, 다른 카테고리 API는 미리 부르지 않는다', async () => {
  const user = setup('/');
  await user.click(screen.getByRole('link', { name: /오늘 한 끼/ }));
  expect(screen.queryByRole('tab', { name: '전체' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('tab').map((item) => item.textContent)).toEqual(['식당', '편의점', '배달']);
  expect(tab('식당')).toHaveAttribute('aria-selected', 'true');
  expect(await screen.findByRole('list', { name: '가게 목록' })).toBeInTheDocument();
  expect(calls.promotions).not.toHaveBeenCalled();
  expect(calls.delivery).not.toHaveBeenCalled();
});

it('예전 주소의 전체 탭(?tab=all)으로 들어와도 식당 탭으로 연다', () => {
  setup('/cheap-meals?tab=all');
  expect(tab('식당')).toHaveAttribute('aria-selected', 'true');
});
it('상품은 24개씩 표시하고 추가 행사 유형과 UNKNOWN 상품도 전체 목록에 남는다', async () => {
  const user = setup('/cheap-meals?tab=convenience');
  const list = await screen.findByRole('list', { name: '행사상품 목록' });
  expect(within(list).getAllByRole('listitem')).toHaveLength(24);
  await user.click(screen.getByRole('button', { name: /상품 더 보기/ }));
  expect(within(list).getAllByRole('listitem')).toHaveLength(48);
  await user.click(screen.getByRole('radio', { name: '기타 행사' }));
  expect(within(list).getAllByRole('listitem')).toHaveLength(24);
  expect(within(list).getAllByText('3+1')).toHaveLength(12);
  expect(within(list).getAllByText('골라담기')).toHaveLength(12);
});
it('브랜드·1+1 필터·배달 플랫폼이 탭을 오가도 유지된다', async () => {
  const user = setup();
  await user.click(tab('편의점'));
  await screen.findByRole('list', { name: '행사상품 목록' });
  await user.click(screen.getByRole('radio', { name: '세븐일레븐' }));
  await waitFor(() => expect(calls.promotions).toHaveBeenCalledWith('SEVEN_ELEVEN'));
  await screen.findByRole('list', { name: '행사상품 목록' });
  await user.click(screen.getByRole('radio', { name: '1+1' }));
  await user.click(tab('배달'));
  await screen.findByRole('list', { name: '배달 혜택 목록' });
  await user.click(screen.getByRole('radio', { name: '배민' }));
  expect(screen.queryByRole('button', { name: /테스트치킨 할인 상세/ })).not.toBeInTheDocument();
  await user.click(tab('편의점'));
  expect(screen.getByRole('radio', { name: '세븐일레븐' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('radio', { name: '1+1' })).toHaveAttribute('aria-checked', 'true');
  await user.click(tab('배달'));
  expect(screen.getByRole('radio', { name: '배민' })).toHaveAttribute('aria-checked', 'true');
});
it('이미지 실패를 대체하고 상세에서 실제 판매가격·UNKNOWN·공식 링크를 표시한다', async () => {
  const user = setup('/cheap-meals?tab=convenience');
  const image = await screen.findByRole('img', { name: '행사상품 0' });
  fireEvent.error(image);
  expect(screen.getByRole('img', { name: '행사상품 0 이미지 없음' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '행사상품 0 상세 보기' }));
  const sheet = within(screen.getByRole('dialog', { name: '상품 상세' }));
  expect(sheet.getByText('4,200원')).toBeInTheDocument();
  expect(sheet.queryByText('2,100원')).not.toBeInTheDocument();
  expect(sheet.getByText('카테고리 정보 없음')).toBeInTheDocument();
  expect(sheet.getByRole('link', { name: /공식 행사/ })).toHaveAttribute('href', 'https://example.com/promotions');
  expect(document.body.style.overflow).toBe('hidden');
  await user.click(screen.getByRole('button', { name: '브라우저 뒤로' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(tab('편의점')).toHaveAttribute('aria-selected', 'true');
  expect(document.body.style.overflow).toBe('');
});
it('배달 상세는 금액과 null 조건을 보여주고 주문 링크를 만들지 않는다', async () => {
  const user = setup('/cheap-meals?tab=delivery');
  await user.click(await screen.findByRole('button', { name: /배민 테스트피자 할인 상세/ }));
  const sheet = within(screen.getByRole('dialog', { name: '할인 상세' }));
  expect(sheet.getByText('6,000원 할인')).toBeInTheDocument();
  expect(sheet.getByText('22,000원')).toBeInTheDocument();
  expect(sheet.getAllByText('정보 없음')).toHaveLength(3);
  expect(sheet.queryByRole('link')).not.toBeInTheDocument();
  await user.click(sheet.getByRole('button', { name: '상세 닫기' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('미수집 0건을 서버 오류와 구분한다', async () => {
  server.use(http.get('http://localhost:8080/api/promotions', () => success(promotion('EMART24', [], null))));
  setup('/cheap-meals?tab=convenience');
  expect(await screen.findByText('아직 행사정보를 수집하지 않았어요')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
});
it('현재 유효한 배달 혜택 0건을 그대로 표시한다', async () => {
  server.use(http.get('http://localhost:8080/api/delivery-discount-offers', () => success([])));
  setup('/cheap-meals?tab=delivery');
  expect(await screen.findByText('현재 유효한 할인정보가 없어요')).toBeInTheDocument();
});
it('서버 실패 후 다시 시도하면 실제 응답 목록으로 복구한다', async () => {
  let failed = true;
  server.use(
    http.get('http://localhost:8080/api/promotions', () =>
      failed ? new HttpResponse(null, { status: 500 }) : success(promotion('EMART24')),
    ),
  );
  const user = setup('/cheap-meals?tab=convenience');
  const retry = await screen.findByRole('button', { name: '다시 시도' });
  failed = false;
  await user.click(retry);
  expect(await screen.findByRole('list', { name: '행사상품 목록' })).toBeInTheDocument();
});
it('식당의 원본 업종을 표시하고 탭 복귀와 지도 재검색에도 2km 반경을 유지한다', async () => {
  const user = setup('/cheap-meals?tab=restaurant');
  expect(await screen.findByText('기타비요식업')).toBeInTheDocument();
  expect(calls.stores).toHaveBeenCalledWith('2000', expect.any(String), expect.any(String));
  expect(screen.queryByRole('group', { name: '탐색 반경' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^(500m|1km|2km)$/ })).not.toBeInTheDocument();
  await user.click(tab('편의점'));
  await user.click(tab('식당'));
  expect(calls.stores).toHaveBeenLastCalledWith('2000', expect.any(String), expect.any(String));
  await user.click(screen.getByRole('button', { name: '지도 이동 테스트' }));
  await user.click(screen.getByRole('button', { name: '이 위치에서 찾기' }));
  await waitFor(() => expect(calls.stores).toHaveBeenLastCalledWith('2000', '37.5665', '126.978'));
  expect(screen.getByText('지도에서 선택한 위치')).toBeInTheDocument();
  await user.click(await screen.findByRole('button', { name: '착한 세탁소 상세 보기' }));
  expect(screen.getByRole('link', { name: /길찾기/ })).toHaveAttribute(
    'href',
    expect.stringContaining('map.kakao.com/link/to/'),
  );
  await user.click(screen.getByRole('button', { name: '브라우저 뒤로' }));
  expect(screen.getByRole('list', { name: '가게 목록' })).toBeInTheDocument();
});
it('카테고리 탭을 키보드로 전환할 수 있다', async () => {
  const user = setup();
  tab('식당').focus();
  await user.keyboard('{End}');
  expect(tab('배달')).toHaveAttribute('aria-selected', 'true');
  expect(tab('배달')).toHaveFocus();
});

it('응답을 기다리는 동안 로딩을 보여주고 빈 필터 결과를 미수집과 구분한다', async () => {
  let complete!: () => void;
  const pending = new Promise<void>((resolve) => {
    complete = resolve;
  });
  server.use(
    http.get('http://localhost:8080/api/promotions', async () => {
      await pending;
      return success(promotion('EMART24', [products[0]]));
    }),
  );
  const user = setup('/cheap-meals?tab=convenience');
  // 글자 없이 가운데에 Progress Circle(40)만 둔다.
  expect(await screen.findByRole('progressbar', { name: '행사상품을 불러오고 있어요' })).toBeInTheDocument();
  expect(screen.queryByText('행사상품을 불러오고 있어요')).not.toBeInTheDocument();
  complete();
  await screen.findByRole('list', { name: '행사상품 목록' });
  await user.click(screen.getByRole('radio', { name: '할인' }));
  expect(screen.getByText('이 행사 유형의 상품이 없어요')).toBeInTheDocument();
  expect(screen.queryByText('아직 행사정보를 수집하지 않았어요')).not.toBeInTheDocument();
});
it('Escape는 상세만 한 번 닫고 기존 카테고리와 초점을 보존한다', async () => {
  const user = setup('/');
  await user.click(screen.getByRole('link', { name: /오늘 한 끼/ }));
  await user.click(tab('배달'));
  const card = await screen.findByRole('button', { name: /배민 테스트피자 할인 상세/ });
  await user.click(card);
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(tab('배달')).toHaveAttribute('aria-selected', 'true');
  expect(card).toHaveFocus();
});

it('위치 확인 중 다른 탭으로 떠났다가 돌아와도 위치 버튼을 다시 쓸 수 있다', async () => {
  const locate = vi.spyOn(mapLocation, 'requestCurrentMapLocation').mockImplementation(() => new Promise(() => {}));
  try {
    const user = setup('/cheap-meals?tab=restaurant');
    await screen.findByText('기타비요식업');
    expect(locate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '현재 위치로 찾기' }));
    expect(screen.getByRole('button', { name: '현재 위치로 찾기' })).toBeDisabled();
    await user.click(tab('편의점'));
    await user.click(tab('식당'));
    expect(screen.getByRole('button', { name: '현재 위치로 찾기' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: '현재 위치로 찾기' }));
    expect(locate).toHaveBeenCalledTimes(2);
  } finally {
    locate.mockRestore();
  }
});

it('주소 검색 결과를 선택하면 선택한 좌표의 2km 반경을 조회한다', async () => {
  server.use(
    http.get('http://localhost:8080/api/maps/geocode', () =>
      success([
        { roadAddress: '서울특별시 중구 세종대로 110', jibunAddress: null, latitude: 37.5665, longitude: 126.978 },
      ]),
    ),
  );
  const user = setup('/cheap-meals?tab=restaurant');
  await user.click(screen.getByRole('button', { name: /판교 주변.*주소 검색/ }));
  await user.type(screen.getByRole('textbox', { name: '동네 주소 검색' }), '서울시청');
  await user.click(screen.getByRole('button', { name: '검색' }));
  await user.click(await screen.findByRole('button', { name: /서울특별시 중구 세종대로 110/ }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await waitFor(() => expect(calls.stores).toHaveBeenCalledWith('2000', '37.5665', '126.978'));
});

it('명시적으로 요청한 현재 위치가 거부되면 안내하고 재요청 성공 시 해당 좌표를 조회한다', async () => {
  const locate = vi
    .spyOn(mapLocation, 'requestCurrentMapLocation')
    .mockRejectedValueOnce(new Error('denied'))
    .mockResolvedValueOnce({ latitude: 37.5665, longitude: 126.978 });
  try {
    const user = setup('/cheap-meals?tab=restaurant');
    await screen.findByRole('list', { name: '가게 목록' });
    expect(locate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '현재 위치로 찾기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('권한을 확인하거나 주소를 검색');
    await user.click(screen.getByRole('button', { name: '현재 위치로 찾기' }));
    await waitFor(() => expect(calls.stores).toHaveBeenCalledWith('2000', '37.5665', '126.978'));
    expect(screen.getByText('현재 위치 주변')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  } finally {
    locate.mockRestore();
  }
});

it('업소 마커로 원본 메뉴 가격과 비요식업 상세를 열고 뒤로가면 목록을 복원한다', async () => {
  const user = setup('/cheap-meals?tab=restaurant');
  await screen.findByRole('list', { name: '가게 목록' });
  await user.click(screen.getByRole('button', { name: '업소 마커 테스트' }));
  expect(screen.getByRole('region', { name: '메뉴와 서비스 가격' })).toHaveTextContent('5,000~7,000');
  expect(screen.getByText('등록된 전화번호가 없어요')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '브라우저 뒤로' }));
  expect(screen.getByRole('list', { name: '가게 목록' })).toBeInTheDocument();
});

it('업소 조회 오류에서 재시도한 빈 결과를 오류나 샘플 업소로 대체하지 않는다', async () => {
  let failed = true;
  server.use(
    http.get('http://localhost:8080/api/maps/good-price-stores', () =>
      failed
        ? new HttpResponse(null, { status: 500 })
        : success({ center: { latitude: 37.5, longitude: 127 }, radius: 2000, count: 0, stores: [], dataAsOf: null }),
    ),
  );
  const user = setup('/cheap-meals?tab=restaurant');
  expect(await screen.findByRole('alert')).toHaveTextContent('가게 정보를 불러오지 못했어요');
  failed = false;
  await user.click(screen.getByRole('button', { name: '다시 시도' }));
  expect(await screen.findByText('이 반경 안에 등록된 가게가 없어요')).toBeInTheDocument();
  expect(screen.queryByRole('list', { name: '가게 목록' })).not.toBeInTheDocument();
});

it('세븐일레븐 UNKNOWN 상품을 상세까지 표시한다', async () => {
  const user = setup('/cheap-meals?tab=convenience');
  await screen.findByRole('list', { name: '행사상품 목록' });
  await user.click(screen.getByRole('radio', { name: '세븐일레븐' }));
  await user.click(await screen.findByRole('button', { name: '행사상품 0 상세 보기' }));
  const sheet = within(screen.getByRole('dialog'));
  expect(sheet.getByText('세븐일레븐')).toBeInTheDocument();
  expect(sheet.getByText('카테고리 정보 없음')).toBeInTheDocument();
  await user.click(sheet.getByRole('button', { name: '상세 닫기' }));
});

it('수집 완료 0건은 미수집과 구별한다', async () => {
  server.use(http.get('http://localhost:8080/api/promotions', () => success(promotion('EMART24', []))));
  setup('/cheap-meals?tab=convenience');
  expect(await screen.findByText('현재 등록된 행사상품이 없어요')).toBeInTheDocument();
  expect(screen.queryByText('아직 행사정보를 수집하지 않았어요')).not.toBeInTheDocument();
});

it('권한 오류 403에서 다른 상품이나 샘플 데이터를 보여주지 않는다', async () => {
  server.use(
    http.get('http://localhost:8080/api/promotions', () =>
      HttpResponse.json({ code: 'FORBIDDEN', message: '권한 없음', errors: [] }, { status: 403 }),
    ),
  );
  setup('/cheap-meals?tab=convenience');
  expect(await screen.findByRole('alert')).toHaveTextContent('정보를 불러오지 못했어요');
  expect(screen.queryByRole('list', { name: '행사상품 목록' })).not.toBeInTheDocument();
});

it('만료된 401 응답은 기존 Refresh Token 클라이언트로 갱신하고 다시 조회한다', async () => {
  const refresh = vi.fn();
  server.use(
    http.get('http://localhost:8080/api/promotions', ({ request }) =>
      request.headers.get('Authorization') === 'Bearer refreshed-token'
        ? success(promotion('EMART24'))
        : HttpResponse.json({ code: 'UNAUTHORIZED', message: '만료', errors: [] }, { status: 401 }),
    ),
    http.post('http://localhost:8080/api/auth/refresh', () => {
      refresh();
      return success({ accessToken: 'refreshed-token', tokenType: 'Bearer', expiresIn: 60, member: { memberId: 1 } });
    }),
  );
  setup('/cheap-meals?tab=convenience');
  expect(await screen.findByRole('list', { name: '행사상품 목록' })).toBeInTheDocument();
  expect(refresh).toHaveBeenCalledOnce();
});

it('같은 마커를 여러 번 선택해도 상세 닫기 한 번으로 목록으로 돌아간다', async () => {
  const user = setup('/cheap-meals?tab=restaurant');
  await screen.findByRole('list', { name: '가게 목록' });
  await user.click(screen.getByRole('button', { name: '업소 마커 테스트' }));
  await user.click(screen.getByRole('button', { name: '업소 마커 테스트' }));
  await user.click(screen.getByRole('button', { name: '가게 상세 닫기' }));
  expect(screen.getByRole('list', { name: '가게 목록' })).toBeInTheDocument();
});

it('업소 상세에서 검색한 새 동네를 선택한 뒤 뒤로가면 이전 탭으로 돌아간다', async () => {
  server.use(
    http.get('http://localhost:8080/api/maps/geocode', () =>
      success([
        { roadAddress: '서울특별시 중구 세종대로 110', jibunAddress: null, latitude: 37.5665, longitude: 126.978 },
      ]),
    ),
  );
  const user = setup('/cheap-meals?tab=delivery');
  await user.click(tab('식당'));
  await screen.findByRole('list', { name: '가게 목록' });
  await user.click(screen.getByRole('button', { name: '업소 마커 테스트' }));
  await user.click(screen.getByRole('button', { name: /주소 검색/ }));
  await user.type(screen.getByRole('textbox', { name: '동네 주소 검색' }), '서울시청');
  await user.click(screen.getByRole('button', { name: '검색' }));
  await user.click(await screen.findByRole('button', { name: /서울특별시 중구 세종대로 110/ }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('서울특별시 중구 세종대로 110')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '브라우저 뒤로' }));
  expect(tab('배달')).toHaveAttribute('aria-selected', 'true');
});

it.each(['닫기', '뒤로가기'])('주소 검색에서 %s하면 진행 중이던 위치 요청의 늦은 응답을 무시한다', async (action) => {
  let complete!: (coordinate: { latitude: number; longitude: number }) => void;
  const locate = vi.spyOn(mapLocation, 'requestCurrentMapLocation').mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  try {
    const user = setup('/cheap-meals?tab=restaurant');
    await screen.findByRole('list', { name: '가게 목록' });
    await user.click(screen.getByRole('button', { name: /주소 검색/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '현재 위치로 찾기' }));
    if (action === '닫기')
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '상세 닫기' }));
    else await user.click(screen.getByRole('button', { name: '브라우저 뒤로' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await act(async () => complete({ latitude: 37.5665, longitude: 126.978 }));
    expect(screen.getByRole('button', { name: /판교 주변/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '현재 위치로 찾기' })).toBeEnabled();
  } finally {
    locate.mockRestore();
  }
});

it.each(['store=10', 'search=1'])('상세 URL %s로 직접 진입해도 닫으면 식당 목록을 유지한다', async (query) => {
  const user = setup(`/cheap-meals?tab=restaurant&${query}`);
  if (query.startsWith('store')) {
    await user.click(await screen.findByRole('button', { name: '가게 상세 닫기' }));
  } else {
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '상세 닫기' }));
  }
  expect(tab('식당')).toHaveAttribute('aria-selected', 'true');
  expect(await screen.findByRole('list', { name: '가게 목록' })).toBeInTheDocument();
});

it('UT 퍼널 이벤트 네 개를 정해진 시점에 정해진 속성으로만 기록한다', async () => {
  const user = setup('/');
  await user.click(screen.getByRole('link', { name: /오늘 한 끼/ }));
  expect(trackEvent).toHaveBeenCalledTimes(1);
  expect(trackEvent).toHaveBeenCalledWith('cheap_meal_viewed', {});

  await user.click(tab('편의점'));
  expect(trackEvent).toHaveBeenLastCalledWith('cheap_meal_category_selected', {
    category: 'convenience',
    source: 'top_tab',
  });

  // 목록 응답과 필터 변경만으로는 상세 확인을 기록하지 않는다.
  await screen.findByRole('list', { name: '행사상품 목록' });
  await user.click(screen.getByRole('radio', { name: '1+1' }));
  expect(trackEvent).toHaveBeenCalledTimes(2);

  await user.click(screen.getByRole('button', { name: '행사상품 0 상세 보기' }));
  expect(trackEvent).toHaveBeenLastCalledWith('cheap_meal_detail_viewed', {
    category: 'convenience',
    provider: 'EMART24',
  });

  await user.click(within(screen.getByRole('dialog', { name: '상품 상세' })).getByRole('link', { name: /공식 행사/ }));
  expect(trackEvent).toHaveBeenLastCalledWith('cheap_meal_outbound_clicked', {
    category: 'convenience',
    destination: 'official_source',
    provider: 'EMART24',
  });
  expect(trackEvent).toHaveBeenCalledTimes(4);
});

it('주소로 복원한 탭은 카테고리 선택으로 세지 않고, 상단 탭과 가게 상세는 각각 기록한다', async () => {
  const user = setup('/cheap-meals?tab=restaurant');
  await screen.findByRole('list', { name: '가게 목록' });
  expect(trackEvent).not.toHaveBeenCalledWith('cheap_meal_category_selected', expect.anything());

  await user.click(screen.getByRole('button', { name: '업소 마커 테스트' }));
  expect(trackEvent).toHaveBeenLastCalledWith('cheap_meal_detail_viewed', { category: 'restaurant' });
  await user.click(screen.getByRole('link', { name: /길찾기/ }));
  expect(trackEvent).toHaveBeenLastCalledWith('cheap_meal_outbound_clicked', {
    category: 'restaurant',
    destination: 'directions',
  });

  await user.click(tab('배달'));
  expect(trackEvent).toHaveBeenLastCalledWith('cheap_meal_category_selected', {
    category: 'delivery',
    source: 'top_tab',
  });
  await user.click(await screen.findByRole('button', { name: /배민 테스트피자 할인 상세/ }));
  expect(trackEvent).toHaveBeenLastCalledWith('cheap_meal_detail_viewed', { category: 'delivery', provider: 'BAEMIN' });
});

it('데스크탑은 공용 헤더 아래에서 가게 목록과 상세를 지도 옆에 함께 펼치고 상품 상세를 가운데 창으로 연다', async () => {
  const matchMedia = window.matchMedia;
  const setMatchMedia = (value: typeof window.matchMedia) =>
    Object.defineProperty(window, 'matchMedia', { configurable: true, value });
  setMatchMedia((query: string) => ({ ...matchMedia(query), matches: true }));
  try {
    const user = setup('/cheap-meals?tab=restaurant');
    expect(screen.getByRole('link', { name: '본 방 기록' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '저렴한 한 끼', level: 1 })).toBeInTheDocument();
    // 카테고리는 위쪽 가로 탭 대신 왼쪽 칸에 세로로 둔다.
    expect(screen.getByRole('tablist', { name: '한 끼 카테고리' })).toHaveAttribute('aria-orientation', 'vertical');
    await screen.findByRole('list', { name: '가게 목록' });

    await user.click(screen.getByRole('button', { name: '업소 마커 테스트' }));
    // 상세를 열어도 목록이 그대로 남는다.
    expect(screen.getByRole('list', { name: '가게 목록' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '착한 세탁소 상세' })).toBeInTheDocument();

    await user.click(tab('편의점'));
    await user.click(await screen.findByRole('button', { name: '행사상품 0 상세 보기' }));
    const dialog = screen.getByRole('dialog', { name: '상품 상세' });
    await user.click(within(dialog).getByRole('button', { name: '상세 닫기' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  } finally {
    setMatchMedia(matchMedia);
  }
});
it('식당 탭을 처음 열어 보여 줄 목록이 없으면 늦추지 않고 그 자리에 Progress Circle을 바로 둔다', async () => {
  server.use(http.get('http://localhost:8080/api/maps/good-price-stores', () => new Promise<never>(() => {})));
  setup();
  // 지연 로딩(300ms)이 걸려 있으면 이 시간 안에는 문구가 나오지 않는다.
  expect(
    await screen.findByRole('progressbar', { name: '주변 가게를 찾고 있어요.' }, { timeout: 200 }),
  ).toBeInTheDocument();
});
