import { http, HttpResponse } from 'msw';
import { expect, it, vi } from 'vitest';

import { createHandlers } from '@/app/mocks/handlers/index';
import { getAccessToken, setAuthentication } from '@/features/auth/model/authStore';
import { fetchGoodPriceStores } from '@/features/good-price/api/goodPriceApi';
import { createGoodPriceServerClient } from '@/features/good-price/api/goodPriceServerApi';

import { server } from '../../../server';

const base = 'https://good-price.test';
const parameters = new URLSearchParams({ latitude: '37.5665', longitude: '126.978', radius: '1000' });
const success = (data: unknown) => HttpResponse.json({ code: 'SUCCESS', message: '성공', data });
const token = (accessToken = 'dev-access-token') => ({ accessToken, tokenType: 'Bearer', expiresIn: 900 });

it('동시 조회는 익명 인증 한 번을 공유하고 목 로그인 토큰을 서버에 보내지 않는다', async () => {
  setAuthentication({ accessToken: 'mock-token', tokenType: 'Bearer', expiresIn: 900 });
  const refresh = vi.fn(() => new HttpResponse(null, { status: 401 }));
  const login = vi.fn(() => success(token()));
  const requests: Request[] = [];
  server.use(
    http.post(`${base}/api/auth/refresh`, refresh),
    http.post(`${base}/api/auth/login`, login),
    http.get(`${base}/api/maps/good-price-stores`, ({ request }) => {
      requests.push(request);
      return success({ count: 22 });
    }),
  );
  const client = createGoodPriceServerClient(base);
  await Promise.all([client(parameters), client(parameters)]);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(login).toHaveBeenCalledTimes(1);
  expect(requests).toHaveLength(2);
  for (const request of requests) {
    expect(request.headers.get('Authorization')).toBe('Bearer dev-access-token');
    expect(new URL(request.url).searchParams.toString()).toBe(parameters.toString());
  }
  expect(getAccessToken()).toBe('mock-token');
});

it('조회가 401이면 인증을 한 번 갱신하고 다시 조회한다', async () => {
  let refreshCount = 0;
  const authorizations: Array<string | null> = [];
  server.use(
    http.post(`${base}/api/auth/refresh`, () => success(token(`dev-token-${++refreshCount}`))),
    http.get(`${base}/api/maps/good-price-stores`, ({ request }) => {
      authorizations.push(request.headers.get('Authorization'));
      return authorizations.length === 1 ? new HttpResponse(null, { status: 401 }) : success({ count: 2 });
    }),
  );
  expect(await createGoodPriceServerClient(base)(parameters)).toEqual({ count: 2 });
  expect(authorizations).toEqual(['Bearer dev-token-1', 'Bearer dev-token-2']);
});

it('갱신 후에도 401이면 무한 재시도하지 않고 실패를 표시한다', async () => {
  const stores = vi.fn(() => new HttpResponse(null, { status: 401 }));
  server.use(
    http.post(`${base}/api/auth/refresh`, () => success(token())),
    http.get(`${base}/api/maps/good-price-stores`, stores),
  );
  await expect(createGoodPriceServerClient(base)(parameters)).rejects.toThrow('가게 정보를 불러오지 못했어요');
  expect(stores).toHaveBeenCalledTimes(2);
});

it('취소된 조회는 익명 회원을 만들거나 가게 요청을 보내지 않는다', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(createGoodPriceServerClient(base)(parameters, controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
});

it('실서버 모드의 목록과 상세는 서버의 ID·전화번호·메뉴를 보존하고 실패 시 샘플로 대체하지 않는다', async () => {
  const storesBase = 'https://good-price-detail.test';
  const result = {
    center: { latitude: 37.5665, longitude: 126.978 },
    radius: 1000,
    count: 1,
    dataAsOf: '2026-06-30',
    stores: [
      {
        id: 99,
        name: '서버 가게',
        businessType: '한식',
        phone: '02-123-4567',
        address: '서울 중구',
        latitude: 37.567,
        longitude: 126.978,
        distanceMeters: 151,
        menus: [{ name: '서버 메뉴', price: '7000~9000' }],
      },
    ],
  };
  server.use(
    http.post(`${storesBase}/api/auth/refresh`, () => success(token())),
    http.get(`${storesBase}/api/maps/good-price-stores`, () => success(result)),
  );
  const config = { apiBaseUrl: 'http://localhost:8080', goodPriceApiBaseUrl: storesBase };
  expect(await fetchGoodPriceStores(config, result.center, 1000)).toEqual(result);
  server.use(http.get(`${storesBase}/api/maps/good-price-stores`, () => new HttpResponse(null, { status: 503 })));
  await expect(fetchGoodPriceStores(config, result.center, 1000)).rejects.toThrow('가게 정보를 불러오지 못했어요');
});

it('실서버 모드의 MSW는 가게 요청을 가로채지 않고 다른 데모 기능은 유지한다', async () => {
  const productionRequest = vi.fn(() => success({ count: 99 }));
  server.use(...createHandlers(true), http.get(`${base}/api/maps/good-price-stores`, productionRequest));
  const response = await fetch(`${base}/api/maps/good-price-stores?${parameters}`);
  expect((await response.json()).data.count).toBe(99);
  expect(productionRequest).toHaveBeenCalledTimes(1);
  const member = await fetch(`${base}/api/members/me`);
  expect((await member.json()).data.name).toBe('이자취');
});
