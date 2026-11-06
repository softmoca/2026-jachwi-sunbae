import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type { CommuteArea } from '@/features/map/api/commuteApi';
import { fetchCommuteAreas } from '@/features/map/api/commuteApi';
import { useCommuteAreas } from '@/features/map/api/useCommuteAreas';
import { usePrefetchMetroBoundaries } from '@/features/map/api/usePrefetchMetroBoundaries';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

import { server } from '../../../server';

vi.mock('@/features/map/api/commuteApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/map/api/commuteApi')>()),
  fetchCommuteAreas: vi.fn(),
}));

const BASE = 'https://cdn.example.com/boundaries';
const VERSION = '20250630';
const FILES: Record<string, string> = {
  '11': 'admin-dongs.11.20250630.111111111111.geojson',
  '23': 'admin-dongs.23.20250630.333333333333.geojson',
  '26': 'admin-dongs.26.20250630.262626262626.geojson',
  '31': 'admin-dongs.31.20250630.222222222222.geojson',
};
const CODES: Record<string, string> = { '11': '11230640', '23': '23010510', '26': '26010510', '31': '31023780' };

const square = (offset: number) => ({
  type: 'Polygon',
  coordinates: [
    [
      [127 + offset, 37],
      [127.01 + offset, 37],
      [127.01 + offset, 37.01],
      [127 + offset, 37.01],
      [127 + offset, 37],
    ],
  ],
});
const featureCollection = (region: string) => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { code: CODES[region], name: `${region}동`, fullName: `${region}시 ${region}동`, baseDate: VERSION },
      geometry: square(Number(region) / 100),
    },
  ],
});

let requested: string[] = [];
let active = 0;
let maxActive = 0;
const failing = new Set<string>();
let gate: Promise<void> | null = null;

beforeEach(() => {
  requested = [];
  active = 0;
  maxActive = 0;
  failing.clear();
  gate = null;
  // jsdom에는 requestIdleCallback이 없다. 한가한 때를 바로 다음 작업으로 둔다.
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => window.setTimeout(callback, 0));
  server.use(
    http.get(`${BASE}/manifest.json`, () => {
      requested.push('manifest');
      return HttpResponse.json({ version: VERSION, file: 'admin-dongs.20250630.123456abcdef.geojson', files: FILES });
    }),
    http.get(`${BASE}/:filename`, async ({ params }) => {
      const filename = String(params.filename);
      const region = filename.split('.')[1];
      requested.push(region);
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (region === '11' && gate) await gate;
      active -= 1;
      if (failing.has(region)) return new HttpResponse(null, { status: 500 });
      return HttpResponse.json(featureCollection(region));
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const area = (region: string): CommuteArea => ({
  adminDongCode: CODES[region],
  name: CODES[region],
  fullName: CODES[region],
  commuteMinutes: 10,
  stations: [],
  center: { latitude: 0, longitude: 0 },
  polygons: [],
  rent: { monthlyRentKrw: 500_000, depositKrw: 10_000_000, transactionCount: 12, legalDongNames: ['역삼동'] },
});

const renderSearch = (regions: string[]) => {
  vi.mocked(fetchCommuteAreas).mockResolvedValue({
    maxMinutes: 40,
    areaCount: regions.length,
    rentPeriod: null,
    areas: regions.map(area),
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <PublicConfigProvider config={{ apiBaseUrl: 'http://localhost', boundaryBaseUrl: BASE }}>
        {children}
      </PublicConfigProvider>
    </QueryClientProvider>
  );
  const view = renderHook(
    ({ isSearching }: { isSearching: boolean }) => ({
      prefetch: usePrefetchMetroBoundaries({ isSearching }),
      commute: useCommuteAreas({
        destination: { latitude: 37.4, longitude: 127.1 },
        maxMinutes: 40,
        maxTransfers: 1,
        enabled: isSearching,
      }),
    }),
    { wrapper, initialProps: { isSearching: false } },
  );
  return { ...view, client };
};

it('수도권 경계를 서울, 경기, 인천 순서로 하나씩 받고, 검색은 받은 파일을 다시 요청하지 않는다', async () => {
  const { result, rerender, client, unmount } = renderSearch(['11', '31']);
  result.current.prefetch();
  result.current.prefetch();
  await waitFor(() => expect(requested).toEqual(['manifest', '11', '31', '23']));
  await waitFor(() => expect(client.getQueryState(['admin-boundaries', FILES['23'], BASE])?.status).toBe('success'));
  expect(maxActive).toBe(1);

  rerender({ isSearching: true });
  await waitFor(() => expect(result.current.commute.isSuccess).toBe(true));
  // 검색은 시도 파일을 고르려고 manifest만 다시 받는다.
  expect(requested).toEqual(['manifest', '11', '31', '23', 'manifest']);
  expect(result.current.commute.data?.areas.map((item) => item.name)).toEqual(['11동', '31동']);
  expect(result.current.commute.data?.areas[0].polygons).toHaveLength(1);
  unmount();
  client.clear();
});

it('수도권 밖 결과의 경계는 미리 받지 않고 검색 응답 뒤에 받는다', async () => {
  const { result, rerender, client, unmount } = renderSearch(['26', '11']);
  result.current.prefetch();
  await waitFor(() => expect(client.getQueryState(['admin-boundaries', FILES['23'], BASE])?.status).toBe('success'));
  expect(requested).not.toContain('26');

  rerender({ isSearching: true });
  await waitFor(() => expect(result.current.commute.isSuccess).toBe(true));
  expect(requested.slice(4)).toEqual(['manifest', '26']);
  expect(result.current.commute.data?.areas.map((item) => item.name)).toEqual(['26동', '11동']);
  unmount();
  client.clear();
});

it('미리 받기에 실패한 파일은 검색이 다시 받아 결과를 그린다', async () => {
  failing.add('11');
  const { result, rerender, client, unmount } = renderSearch(['11']);
  result.current.prefetch();
  await waitFor(() => expect(client.getQueryState(['admin-boundaries', FILES['23'], BASE])?.status).toBe('success'));
  expect(client.getQueryState(['admin-boundaries', FILES['11'], BASE])?.status).toBe('error');

  failing.clear();
  rerender({ isSearching: true });
  await waitFor(() => expect(result.current.commute.isSuccess).toBe(true));
  expect(requested.filter((item) => item === '11')).toHaveLength(2);
  expect(result.current.commute.data?.areas[0].name).toBe('11동');
  unmount();
  client.clear();
});

it('manifest를 받지 못해도 검색은 막지 않는다', async () => {
  let manifestCalls = 0;
  server.use(
    http.get(`${BASE}/manifest.json`, () => {
      manifestCalls += 1;
      if (manifestCalls === 1) return new HttpResponse(null, { status: 503 });
      return HttpResponse.json({ version: VERSION, file: 'admin-dongs.20250630.123456abcdef.geojson', files: FILES });
    }),
  );
  const { result, rerender, client, unmount } = renderSearch(['11']);
  result.current.prefetch();
  await waitFor(() => expect(manifestCalls).toBe(1));
  rerender({ isSearching: true });
  await waitFor(() => expect(result.current.commute.isSuccess).toBe(true));
  expect(requested).toEqual(['11']);
  unmount();
  client.clear();
});

it('검색이 시작되면 아직 받지 않은 파일은 미리 받지 않는다', async () => {
  let release = () => {};
  gate = new Promise((resolve) => {
    release = resolve;
  });
  const { result, rerender, client, unmount } = renderSearch(['11']);
  result.current.prefetch();
  await waitFor(() => expect(requested).toContain('11'));
  // 서울 파일을 받는 도중 검색을 시작하면 검색은 진행 중인 요청을 함께 기다린다.
  rerender({ isSearching: true });
  await waitFor(() => expect(requested).toEqual(['manifest', '11', 'manifest']));
  release();
  await waitFor(() => expect(result.current.commute.isSuccess).toBe(true));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(requested.filter((item) => item === '11')).toHaveLength(1);
  expect(requested).not.toContain('31');
  expect(requested).not.toContain('23');
  unmount();
  client.clear();
});

it('검색 중이거나 데이터 절약 모드이면 미리 받지 않는다', async () => {
  const searching = renderSearch(['11']);
  searching.rerender({ isSearching: true });
  searching.result.current.prefetch();
  await waitFor(() => expect(searching.result.current.commute.isSuccess).toBe(true));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(requested).toEqual(['manifest', '11']);
  searching.unmount();
  searching.client.clear();

  requested = [];
  vi.stubGlobal('navigator', { ...navigator, connection: { saveData: true } });
  const saving = renderSearch(['11']);
  saving.result.current.prefetch();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(requested).toEqual([]);
  saving.unmount();
  saving.client.clear();
});
