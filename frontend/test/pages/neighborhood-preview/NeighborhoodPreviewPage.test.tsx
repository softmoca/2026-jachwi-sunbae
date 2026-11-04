import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';

import { commuteBoundaryFixtures } from '@/app/mocks/fixtures/commuteBoundaryFixtures';
import { successEnvelope } from '@/app/mocks/fixtures/propertyFixtures';
import { createCommuteAreaHandlers } from '@/app/mocks/handlers/commuteAreaHandlers';
import { mapHandlers } from '@/app/mocks/handlers/mapHandlers';
import { createStreetMemoHandlers } from '@/app/mocks/handlers/streetMemoHandlers';
import { routeFocusView } from '@/pages/neighborhood-preview/model/resultMapView';
import NeighborhoodPreviewPage from '@/pages/neighborhood-preview/NeighborhoodPreviewPage';
import NeighborhoodRoutePage from '@/pages/neighborhood-preview/NeighborhoodRoutePage';
import { MapLocationError, readGeolocationPermission, requestCurrentMapLocation } from '@/features/map/lib/mapLocation';
import type { MapCanvasProps } from '@/features/map/model/MapCanvas';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';
import { trackPostHogEvent } from '@/shared/lib/analytics/posthog';

import { server } from '../../server';

vi.mock('@/shared/lib/analytics/posthog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/analytics/posthog')>()),
  trackPostHogEvent: vi.fn(),
}));

vi.mock('@/features/map/lib/mapLocation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/map/lib/mapLocation')>()),
  readGeolocationPermission: vi.fn(),
  requestCurrentMapLocation: vi.fn(),
}));
const mapMounts = vi.hoisted(() => ({ count: 0 }));
vi.mock('@/features/map/ui/map-canvas/MapCanvas', async () => {
  const { useEffect } = await import('react');
  const MockMapCanvas = (props: MapCanvasProps) => {
    useEffect(() => {
      mapMounts.count += 1;
    }, []);
    return (
      <div>
        <button onClick={() => props.onSelectLocation?.(37.4, 127.12)}>지도에서 위치 찍기</button>
        {props.onReady && <button onClick={props.onReady}>지도 준비 완료</button>}
        {props.onSelectLocation && (
          <button onClick={() => props.onSelectLocation?.(37.45, 127.15)}>다른 위치 찍기</button>
        )}
        <output aria-label="지도 시점">{JSON.stringify({ center: props.center, level: props.level })}</output>
        <output aria-label="목적지 좌표">{JSON.stringify(props.markers)}</output>
        <output aria-label="고른 동네 경계">
          {JSON.stringify(props.regions?.find((region) => region.id === props.selectedRegionId)?.polygons ?? [])}
        </output>
        <output aria-label="지도 스타일">{props.customStyleId}</output>
        {props.coordinateAction && (
          <button onClick={props.coordinateAction.onClick} disabled={props.coordinateAction.disabled}>
            {props.coordinateAction.label}
          </button>
        )}
        {props.coordinateMenu?.actions.map((action) => (
          <button key={action.id} onClick={action.onSelect}>
            {`말풍선 ${action.label}`}
          </button>
        ))}
        {props.selectedRegionId && (
          <button
            onClick={() => props.onSelectRegion?.(props.selectedRegionId!, { latitude: 37.5, longitude: 127.035 })}
          >
            고른 동네 안 찍기
          </button>
        )}
        {props.onBoundsChange && (
          <button
            onClick={() => {
              props.onLevelChange?.(4);
              props.onBoundsChange?.({ south: 37.495, west: 127.03, north: 37.506, east: 127.044 });
            }}
          >
            가까이 확대
          </button>
        )}
        {props.onBoundsChange && (
          <button
            onClick={() => {
              props.onLevelChange?.(5.3);
              props.onBoundsChange?.({ south: 37.495, west: 127.03, north: 37.506, east: 127.044 });
            }}
          >
            휠로 조금 확대
          </button>
        )}
        {props.onBoundsChange && (
          <button
            onClick={() => {
              // 역삼1동 경계에 맞춘 단계는 마커를 올리는 상한(6.5)이다. 지도는 6.5로 옮겨도 소수 오차를 두고 멈춘다.
              props.onLevelChange?.(6.5000001);
              props.onBoundsChange?.({ south: 37.495, west: 127.03, north: 37.506, east: 127.044 });
            }}
          >
            동네 보기 이동 끝
          </button>
        )}
        {props.onBoundsChange && (
          <button
            onClick={() => {
              props.onLevelChange?.(7);
              props.onBoundsChange?.({ south: 37.49, west: 127.02, north: 37.51, east: 127.04 });
            }}
          >
            화면 범위 알림
          </button>
        )}
        {props.markers
          ?.filter((marker) => marker.actionable)
          .map((marker) => (
            <button key={marker.id} onClick={() => props.onSelectMarker?.(marker)}>
              {`마커 ${marker.label}`}
            </button>
          ))}
        {props.regions?.map((region) => (
          <button key={region.id} onClick={() => props.onSelectRegion?.(region.id)}>
            {region.name}
          </button>
        ))}
      </div>
    );
  };
  return { default: MockMapCanvas };
});
beforeEach(() => {
  mapMounts.count = 0;
  vi.mocked(trackPostHogEvent).mockClear();
  vi.mocked(readGeolocationPermission).mockResolvedValue('prompt');
  vi.mocked(requestCurrentMapLocation).mockReset();
  server.use(...createCommuteAreaHandlers({ delayMs: 0 }));
  server.use(
    http.get('*/api/maps/reverse-geocode', () =>
      HttpResponse.json({
        code: 'SUCCESS',
        message: '성공',
        data: { roadAddress: '경기 성남시 분당구 판교역로', jibunAddress: null, latitude: 37.4, longitude: 127.12 },
      }),
    ),
  );
  server.use(
    http.get('*/boundaries/manifest.json', () =>
      HttpResponse.json({ version: '20250630', file: 'admin-dongs.20250630.123456abcdef.geojson' }),
    ),
    http.get('*/boundaries/:filename', () =>
      HttpResponse.json({
        type: 'FeatureCollection',
        features: commuteBoundaryFixtures.map((fixture) => ({
          type: 'Feature',
          properties: {
            code: fixture.sourceCode,
            name: fixture.fullName.split(' ').at(-1),
            fullName: fixture.fullName,
            baseDate: '20250630',
          },
          geometry: fixture.boundary,
        })),
      }),
    ),
  );
});
const show = (isPublic = false, entries?: string[]) => {
  const result = render(
    <PublicConfigProvider config={{ apiBaseUrl: 'http://localhost:8080', commuteDataSource: 'mock' }}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <MemoryRouter
          initialEntries={entries ?? [isPublic ? '/explore' : '/neighborhoods']}
          initialIndex={entries ? entries.length - 1 : 0}
        >
          <Routes>
            <Route path="/" element={<h1>홈</h1>} />
            <Route path="/guide" element={<h1>사용 방법</h1>} />
            <Route path="/explore" element={<NeighborhoodPreviewPage />}>
              <Route path="areas/:adminDongCode" element={<NeighborhoodRoutePage />} />
              <Route path="areas/:adminDongCode/details" element={<NeighborhoodRoutePage />} />
            </Route>
            <Route path="/login" element={<h1>로그인 후 방 기록</h1>} />
            <Route path="/neighborhoods" element={<NeighborhoodPreviewPage />}>
              <Route path="areas/:adminDongCode" element={<NeighborhoodRoutePage />} />
              <Route path="areas/:adminDongCode/details" element={<NeighborhoodRoutePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </PublicConfigProvider>,
  );
  return result;
};
/** 역삼1동의 첫 출발 정류장(픽스처). 동네를 고르면 이 정류장까지 경로가 보이게 지도를 옮긴다. */
const YEOKSAM_STATION = { latitude: 37.5006, longitude: 127.0364 };
/**
 * 지도에 넘어간 시점이 출퇴근 장소부터 출발 정류장(동네를 골랐으면 그 경계까지)을 모두 담는 경로 시점인지 본다.
 * 경로보다 가깝게 다가가면 출퇴근 장소가 화면 밖으로 나간다.
 */
const expectRouteView = (station: { latitude: number; longitude: number }, withArea: boolean) => {
  const view = JSON.parse(screen.getByLabelText('지도 시점').textContent ?? '{}') as {
    center: { latitude: number; longitude: number };
    level: number;
  };
  const destination = (
    JSON.parse(screen.getByLabelText('목적지 좌표').textContent ?? '[]') as {
      id: string;
      latitude: number;
      longitude: number;
    }[]
  ).find((marker) => marker.id === 'destination')!;
  const polygons = withArea ? JSON.parse(screen.getByLabelText('고른 동네 경계').textContent ?? '[]') : [];
  const expected = routeFocusView([destination, station], polygons);
  expect(view.level).toBeCloseTo(expected.level, 6);
  expect(view.center.latitude).toBeCloseTo(expected.latitude, 6);
  expect(view.center.longitude).toBeCloseTo(expected.longitude, 6);
};
const choosePoint = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: '지도에서 위치 찍기' }));
  return user;
};
it.each([false, true])('공개 탐색 여부 %s: 처음 검색은 40분·환승 1회로 요청한다', async (isPublic) => {
  const requests: URL[] = [];
  const track = ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    if (url.pathname === '/api/commute-areas/with-rents') requests.push(url);
  };
  server.events.on('request:start', track);
  try {
    show(isPublic);
    const user = await choosePoint();
    expect(screen.getByRole('button', { name: '통근 40분 이내' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '환승 1회 이하' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
    await screen.findByRole('region', { name: '행정동 프리셋 지도' });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.searchParams.get('maxMinutes')).toBe('40');
    expect(requests[0]?.searchParams.get('maxTransfers')).toBe('1');
    expect(trackPostHogEvent).toHaveBeenCalledWith(
      'neighborhood_search_submitted',
      expect.objectContaining({ max_minutes: 40, max_transfers: 1 }),
    );
  } finally {
    server.events.removeListener('request:start', track);
  }
});
it('기록 화면으로 나갔다 상세 주소로 돌아와도 선택한 동네와 검색 결과를 복원한다', async () => {
  const view = show(true);
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  const card = await screen.findByRole('button', { name: /1위 역삼1동/ });
  await user.click(card);
  expect(await screen.findByRole('list', { name: '역삼1동 출발 정류장' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '이 동네에서 본 방 기록하기' }));
  expect(screen.getByRole('heading', { name: '로그인 후 방 기록' })).toBeInTheDocument();
  view.unmount();
  show(true, ['/explore/areas/11230640']);
  expect(await screen.findByRole('list', { name: '역삼1동 출발 정류장' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: '동네를 먼저 선택해주세요' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('선택한 탐색 조건')).toHaveTextContent('통근 40분 이내');
});
it('이전 검색 정보가 없는 상세 주소도 오류 안내 대신 위치 선택 지도로 돌아간다', async () => {
  show(true, ['/explore/areas/11230640']);
  expect(await screen.findByRole('region', { name: '지도에서 목적지 선택' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: '동네를 먼저 선택해주세요' })).not.toBeInTheDocument();
});
it('공개 통근 탐색은 로그인 없이 결과를 보고 기록 CTA로 로그인에 이어진다', async () => {
  show(true);
  expect(screen.getByRole('note')).toHaveTextContent('지도를 눌러 출퇴근 장소를 찍어보세요');
  const user = await choosePoint();
  // 위치를 고른 뒤에는 단계별 안내 없이 바로 조건을 바꾸거나 찾을 수 있다.
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
  expect(screen.queryByText('원하는 조건을 정해주세요')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '통근 40분 이내' }));
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await user.click(await screen.findByRole('button', { name: '이 동네에서 본 방 기록하기' }));
  expect(await screen.findByRole('heading', { name: '로그인 후 방 기록' })).toBeInTheDocument();
  expect(sessionStorage.getItem('jachwi.exploration-journey')).toContain('selectedLocation');
});
it('탐색 기준 선택 화면 없이 바로 지도에서 통근·환승·월세 조건을 함께 고른다', async () => {
  show(true);
  expect(screen.getByRole('region', { name: '지도에서 목적지 선택' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /월세 평균가 보기/ })).not.toBeInTheDocument();
  const conditions = within(screen.getByLabelText('탐색 조건'));
  expect(conditions.getByRole('button', { name: '통근 40분 이내' })).toBeInTheDocument();
  expect(conditions.getByRole('button', { name: '환승 1회 이하' })).toBeInTheDocument();
  expect(conditions.getByRole('button', { name: '월세 전체' })).toBeInTheDocument();
  // 조건 칸은 위치를 고르기 전부터 아래 시트에 두고, 찾기 버튼은 위치를 고를 때까지 막아 둔다.
  const sheet = within(screen.getByRole('region', { name: '출퇴근 조건' }));
  expect(sheet.getByLabelText('탐색 조건')).toBeInTheDocument();
  expect(sheet.getByRole('button', { name: '지도에서 출퇴근 장소를 골라 주세요' })).toBeDisabled();
});
it('검색창 뒤로가기는 들어온 화면으로 돌아가고, 주소로 바로 들어왔으면 홈으로 간다', async () => {
  const view = show(false, ['/guide', '/neighborhoods']);
  await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
  expect(await screen.findByRole('heading', { name: '사용 방법' })).toBeInTheDocument();
  view.unmount();
  show(true);
  await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
  expect(await screen.findByRole('heading', { name: '홈' })).toBeInTheDocument();
});
it('월세 조건은 서버에 보내지 않고 받은 동네 시세로 거르며, 결과에서 바꿔도 다시 조회하지 않는다', async () => {
  const requests: URL[] = [];
  const track = ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    if (url.pathname === '/api/commute-areas/with-rents') requests.push(url);
  };
  server.events.on('request:start', track);
  try {
    show();
    const user = await choosePoint();
    await user.click(screen.getByRole('button', { name: '월세 전체' }));
    await user.click(screen.getByRole('option', { name: '50만원 이하' }));
    await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
    const rail = await screen.findByLabelText('통근 시간 상위 동네');
    // 역삼1동은 시세가 68만원이라 빠지고 45만원인 신림동만 남는다. 정자동은 시세가 없어 처음부터 그리지 않는다.
    expect(rail.querySelectorAll('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /1위 신림동/ })).toHaveTextContent('월세 45만원');
    expect(screen.queryByRole('button', { name: /정자동/ })).not.toBeInTheDocument();
    // 서버는 월세로 거르지 않아 요청에는 월세 조건을 싣지 않는다.
    expect([...requests[0].searchParams.keys()].sort()).toEqual([
      'latitude',
      'longitude',
      'maxMinutes',
      'maxTransfers',
    ]);
    expect(trackPostHogEvent).toHaveBeenCalledWith(
      'neighborhood_search_submitted',
      expect.objectContaining({ max_rent_manwon: 50 }),
    );
    await user.click(screen.getByRole('button', { name: /월세 50만원 이하/ }));
    await user.click(screen.getByRole('option', { name: '전체 가격' }));
    await user.click(screen.getByRole('button', { name: '적용' }));
    expect(screen.getByLabelText('통근 시간 상위 동네').querySelectorAll('button')).toHaveLength(2);
    expect(requests).toHaveLength(1);
  } finally {
    server.events.removeListener('request:start', track);
  }
});
const useDesktopViewport = () =>
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: query === '(min-width: 1024px)',
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
it('데스크탑은 왼쪽 칸에서 조건을 고르고 바로 찾는다', async () => {
  const requests: URL[] = [];
  const track = ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    if (url.pathname === '/api/commute-areas/with-rents') requests.push(url);
  };
  server.events.on('request:start', track);
  const matchMedia = useDesktopViewport();
  try {
    show();
    const panel = within(screen.getByRole('complementary', { name: '탐색 조건' }));
    expect(screen.queryByRole('button', { name: '통근 40분 이내' })).not.toBeInTheDocument();
    expect(panel.getByRole('button', { name: '이 조건으로 동네 찾기' })).toBeDisabled();
    const user = await choosePoint();
    await user.click(panel.getByRole('radio', { name: '30분' }));
    await user.click(panel.getByRole('radio', { name: '환승 없음' }));
    // 월세 시세는 찾기 전에 고르지 않고, 결과 지도 위에서 고른다.
    expect(panel.queryByRole('slider', { name: '최대 월세 시세' })).not.toBeInTheDocument();
    await user.click(panel.getByRole('button', { name: '이 조건으로 동네 찾기' }));
    const areas = within(await screen.findByRole('complementary', { name: '통근 시간 상위 동네' }));
    expect(areas.getAllByRole('button', { name: /위 / })).toHaveLength(2);
    expect(requests).toHaveLength(1);
    expect(requests[0].searchParams.get('maxMinutes')).toBe('30');
    expect(requests[0].searchParams.get('maxTransfers')).toBe('0');
  } finally {
    matchMedia.mockRestore();
    server.events.removeListener('request:start', track);
  }
});
it('데스크탑 결과는 상위 동네를 지도 왼쪽 칸에 세로로 보여준다', async () => {
  const matchMedia = useDesktopViewport();
  try {
    show();
    const user = await choosePoint();
    await user.click(screen.getByRole('button', { name: '이 조건으로 동네 찾기' }));
    const panel = within(await screen.findByRole('complementary', { name: '통근 시간 상위 동네' }));
    expect(panel.getByRole('heading', { name: '통근 시간 상위 동네' })).toBeInTheDocument();
    expect(panel.getAllByRole('button', { name: /위 / })).toHaveLength(2);
    // 기준 요약과 다시 선택하기도 지도 위가 아니라 왼쪽 칸에 둔다. 지도에는 색상 기준만 남긴다.
    expect(panel.getByLabelText('선택한 탐색 조건')).toHaveTextContent('통근 40분 이내');
    expect(panel.getByRole('button', { name: '다시 선택하기' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '다시 선택하기' })).toHaveLength(1);
    expect(screen.getByLabelText('통근 시간 색상 기준')).toBeInTheDocument();
    expect(panel.getByRole('button', { name: /1위 역삼1동/ })).toHaveTextContent('월세 68만원');
    // 월세는 왼쪽 칸이 아니라 지도 위 슬라이더로 바꾸고, 다시 찾지 않고 순위가 바로 바뀐다.
    expect(panel.queryByRole('combobox', { name: '최대 월세 시세' })).not.toBeInTheDocument();
    const rent = screen.getByRole('slider', { name: '최대 월세 시세' });
    // 50만원 이하는 전체, 30, 40 다음 네 번째 칸이다.
    fireEvent.change(rent, { target: { value: '3' } });
    expect(rent).toHaveAttribute('aria-valuetext', '50만원 이하');
    expect(panel.getAllByRole('button', { name: /위 / })).toHaveLength(1);
    fireEvent.change(rent, { target: { value: '0' } });
    expect(panel.getAllByRole('button', { name: /위 / })).toHaveLength(2);
  } finally {
    matchMedia.mockRestore();
  }
});
it('동네를 찾으면 그 출퇴근 장소를 기억해 본 방 기록의 통근 시간 기준으로 쓴다', async () => {
  show();
  const user = await choosePoint();
  expect(localStorage.getItem('jachwi-sunbae:commute-destination')).toBeNull();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await screen.findByRole('region', { name: '행정동 프리셋 지도' });
  expect(JSON.parse(localStorage.getItem('jachwi-sunbae:commute-destination') ?? 'null')).toEqual(
    expect.objectContaining({ latitude: 37.4, longitude: 127.12 }),
  );
  localStorage.removeItem('jachwi-sunbae:commute-destination');
});
it('월세 조건에 맞는 동네가 없으면 월세 조건을 넓혀보라고 안내한다', async () => {
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: '월세 전체' }));
  await user.click(screen.getByRole('option', { name: '30만원 이하' }));
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  expect(await screen.findByText('조건에 맞는 동네가 없어요. 월세 조건을 넓혀보세요.')).toBeInTheDocument();
});
it('조건에 맞는 동네가 없으면 통근·환승 조건을 넓혀보라고 안내한다', async () => {
  server.use(
    http.get('*/api/commute-areas/with-rents', () =>
      HttpResponse.json({
        code: 'SUCCESS',
        message: '요청이 성공했습니다.',
        data: { maxMinutes: 40, areaCount: 0, rentStartDate: null, rentEndDate: null, areas: [] },
      }),
    ),
  );
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  expect(
    await screen.findByText('조건에 맞는 동네가 없어요. 통근 시간이나 환승 조건을 넓혀보세요.'),
  ).toBeInTheDocument();
});
it('휴대폰 동네 시트에 월세·보증금 시세와 관할 법정동, 거래 기간을 보여준다', async () => {
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await user.click(await screen.findByRole('button', { name: /2위 신림동/ }));
  const rent = within(screen.getByRole('region', { name: '신림동' })).getByRole('region', { name: '월세 시세' });
  expect(rent).toHaveTextContent('월세 45만원 · 보증금 500만원');
  expect(rent).toHaveTextContent('신림동·봉천동 거래 18건 중앙값');
  expect(rent).toHaveTextContent('2026-03-31 ~ 2026-09-30 계약');
});
it('첫 진입은 지도이며 위치 미허용 시 권한 요청·직접 선택 입구·하단 확인 화면이 없다', async () => {
  show();
  await waitFor(() => expect(readGeolocationPermission).toHaveBeenCalled());
  expect(requestCurrentMapLocation).not.toHaveBeenCalled();
  expect(screen.getByRole('region', { name: '지도에서 목적지 선택' })).toBeInTheDocument();
  expect(screen.getByLabelText('지도 스타일')).toHaveTextContent('631c1c09-380e-427f-b7d8-e600956dac10');
  expect(screen.queryByRole('button', { name: '지도에서 직접 선택' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '이 위치로 선택' })).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: '출퇴근 장소' })).not.toHaveFocus();
  expect(screen.queryByRole('spinbutton', { name: '최대 통근 시간' })).not.toBeInTheDocument();
  expect(screen.getByRole('note')).toHaveTextContent('위 검색창에서 학교·회사를 찾아도 돼요');
  expect(screen.queryByRole('button', { name: '현재 위치에서 찾기' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '통근 40분 이내' }));
  // 조건 칸을 누르면 시트를 띄우지 않고 카드 안 조건 칸 아래에 그 피커만 펼친다.
  const card = within(screen.getByRole('region', { name: '출퇴근 조건' }));
  expect(screen.queryByRole('button', { name: '상세 패널 높이 조절' })).not.toBeInTheDocument();
  expect(card.getByRole('listbox', { name: '최대 통근 시간' })).toBeInTheDocument();
  expect(screen.queryByRole('listbox', { name: '최대 월세 시세' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '월세 전체' }));
  expect(screen.queryByRole('listbox', { name: '최대 통근 시간' })).not.toBeInTheDocument();
  expect(card.getByRole('listbox', { name: '최대 월세 시세' })).toBeInTheDocument();
  // 같은 칸을 다시 누르면 접는다.
  await userEvent.click(screen.getByRole('button', { name: '월세 전체' }));
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(screen.queryByText('통근 시간·환승 조건으로 주변 동네를 찾아봐요.')).not.toBeInTheDocument();
});
it('위치 권한이 허용되면 지도만 현재 위치로 옮기고 안내 버튼을 누르면 선택·확대한다', async () => {
  vi.mocked(readGeolocationPermission).mockResolvedValue('granted');
  vi.mocked(requestCurrentMapLocation).mockResolvedValue({ latitude: 37.55, longitude: 127.05 });
  show();
  await waitFor(() => expect(screen.getByLabelText('지도 시점')).toHaveTextContent('37.55'));
  // 현재 위치는 지도 시점을 옮기는 데만 쓰고 마커로 그리지 않는다.
  expect(screen.getByLabelText('목적지 좌표')).not.toHaveTextContent('current-location');
  expect(screen.queryByRole('button', { name: /에서 찾기$/ })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '내 현재 위치로 이동' }));
  expect(await screen.findByRole('button', { name: /에서 찾기$/ })).toBeInTheDocument();
  expect(screen.getByLabelText('지도 시점')).toHaveTextContent('"level":4');
});
it.each([false, true])('지도(공개 %s)에서 현재 위치로 가도 현재 위치 점을 그리지 않는다', async (isPublic) => {
  vi.mocked(requestCurrentMapLocation).mockResolvedValue({ latitude: 37.55, longitude: 127.05 });
  show(isPublic);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: '내 현재 위치로 이동' }));
  expect(await screen.findByRole('button', { name: /에서 찾기$/ })).toBeInTheDocument();
  expect(screen.getByLabelText('목적지 좌표')).not.toHaveTextContent('current-location');
  await user.click(screen.getByRole('button', { name: '지도에서 위치 찍기' }));
  const markers = JSON.parse(screen.getByLabelText('목적지 좌표').textContent ?? '[]');
  expect(markers).toEqual([
    expect.objectContaining({ id: 'candidate', tone: 'destination', latitude: 37.4, longitude: 127.12 }),
  ]);
});
it('현재 위치 조회 실패 시 지도에서 직접 찍을 수 있다', async () => {
  vi.mocked(readGeolocationPermission).mockResolvedValue('granted');
  vi.mocked(requestCurrentMapLocation).mockRejectedValue(new Error('timeout'));
  show();
  await waitFor(() => expect(requestCurrentMapLocation).toHaveBeenCalled());
  await choosePoint();
  expect(screen.getByRole('button', { name: '통근 40분 이내' })).toBeInTheDocument();
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
});
it('현재 위치 버튼 실패를 안내하고 재시도하면 목적지로 선택한다', async () => {
  vi.mocked(requestCurrentMapLocation)
    .mockRejectedValueOnce(new MapLocationError('denied', 'denied'))
    .mockResolvedValueOnce({ latitude: 37.55, longitude: 127.05 });
  show();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: '내 현재 위치로 이동' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('위치 권한을 허용');
  await user.click(screen.getByRole('button', { name: '내 현재 위치로 이동' }));
  await waitFor(() => expect(screen.getByLabelText('지도 시점')).toHaveTextContent('37.55'));
  expect(screen.getByRole('button', { name: /에서 찾기$/ })).toBeInTheDocument();
});
it('검색 결과의 현재 위치 버튼은 목적지와 결과를 유지하고 지도만 이동한다', async () => {
  vi.mocked(requestCurrentMapLocation).mockResolvedValue({ latitude: 37.55, longitude: 127.05 });
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await screen.findByRole('region', { name: '행정동 프리셋 지도' });
  expect(screen.getByLabelText('지도 스타일')).toHaveTextContent('631c1c09-380e-427f-b7d8-e600956dac10');
  await user.click(screen.getByRole('button', { name: '내 현재 위치로 이동' }));
  await waitFor(() => expect(screen.getByLabelText('지도 시점')).toHaveTextContent('37.55'));
  expect(screen.getByRole('region', { name: '행정동 프리셋 지도' })).toBeInTheDocument();
  expect(screen.getByLabelText('목적지 좌표')).toHaveTextContent('37.4');
  expect(screen.getByLabelText('목적지 좌표')).not.toHaveTextContent('current-location');
});
it('지도에서 찍으면 시점을 옮기지 않아 누른 자리에 핀이 찍히고 바텀시트에서 필터를 선택한다', async () => {
  show();
  const before = screen.getByLabelText('지도 시점').textContent;
  await choosePoint();
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '통근 40분 이내' })).toBeInTheDocument();
  expect(screen.getByLabelText('지도 시점')).toHaveTextContent(before ?? '');
  // 찾기 버튼은 지도 위가 아니라 아래에 올리고, 버튼 글자에 고른 장소 이름을 넣는다.
  const card = within(screen.getByRole('region', { name: '고른 출퇴근 장소' }));
  expect(card.getByRole('button', { name: /에서 찾기$/ })).toBeEnabled();
  // 위치를 고르면 조건 칩도 아래 시트로 내려와, 어떤 조건으로 추천받는지 버튼과 함께 보여 준다.
  expect(card.getByText('이 조건으로 추천받아요')).toBeInTheDocument();
  expect(card.getByRole('button', { name: '통근 40분 이내' })).toBeInTheDocument();
  expect(card.getByRole('button', { name: '환승 1회 이하' })).toBeInTheDocument();
  expect(card.getByRole('button', { name: '월세 전체' })).toBeInTheDocument();
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  // 핀에는 장소 이름 대신 고른 자리라는 것만 적는다.
  expect(JSON.parse(screen.getByLabelText('목적지 좌표').textContent ?? '[]')).toEqual([
    expect.objectContaining({ id: 'candidate', label: '선택한 지역' }),
  ]);
  expect(screen.getByLabelText('목적지 좌표')).toHaveTextContent('37.4');
});
it.each([false, true])('로그인 여부와 관계없이 주소 검색 결과로 위치를 선택한다 (공개 탐색: %s)', async (isPublic) => {
  server.use(
    http.get('http://localhost:8080/api/maps/geocode', ({ request }) => {
      expect(new URL(request.url).searchParams.get('query')).toBe('신논현역');
      return HttpResponse.json(
        successEnvelope([{ roadAddress: '서울 강남구 봉은사로 102', latitude: 37.5045, longitude: 127.0249 }]),
      );
    }),
  );
  show(isPublic);
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: '출퇴근 장소' }), '신논현역');
  await user.keyboard('{Enter}');
  await user.click(await screen.findByRole('button', { name: '서울 강남구 봉은사로 102' }));
  expect(screen.getByLabelText('목적지 좌표')).toHaveTextContent('37.5045');
  expect(screen.getByLabelText('지도 시점')).toHaveTextContent('"level":4');
});
it('통근 필터·조회·동네 선택 및 닫기에도 결과와 시점을 유지한다', async () => {
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: '환승 1회 이하' }));
  await user.click(screen.getByRole('option', { name: '환승 없음' }));
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await screen.findByRole('region', { name: '행정동 프리셋 지도' });
  expect(screen.queryByRole('button', { name: '정자동' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '역삼1동' }));
  expect(screen.getByRole('region', { name: '행정동 프리셋 지도' })).toBeInTheDocument();
  // 동네 경계와 첫 출발 정류장부터 출퇴근 장소까지 경로 전체가 보이게 옮긴다.
  expectRouteView(YEOKSAM_STATION, true);
  // 휴대폰은 동네를 고르면 지도 위 말풍선 대신 아래에 정류장·공인중개사 탭 시트를 올린다.
  expect(screen.getByRole('list', { name: '역삼1동 출발 정류장' })).toBeInTheDocument();
  // 동네 대중교통 상세로 넘기는 버튼과 닫기 버튼은 두지 않는다.
  expect(screen.queryByRole('button', { name: /대중교통 정보 보기/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '동네 정보 닫기' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '역삼1동' })).toBeInTheDocument();
});
it('상위 동네 카드를 고르면 시트에서 출발 정류장을 골라 경로를 보고 뒤로가기로 목록에 돌아온다', async () => {
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await screen.findByRole('region', { name: '행정동 프리셋 지도' });
  expect(screen.getByLabelText('통근 시간 상위 동네').querySelectorAll('button')).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: /1위 역삼1동/ }));
  // 출발 정류장은 고르기 전에는 지도 마커로 찍지 않는다.
  expect(JSON.parse(screen.getByLabelText('목적지 좌표').textContent ?? '[]')).toEqual([
    expect.objectContaining({ id: 'destination' }),
  ]);
  expect(trackPostHogEvent).toHaveBeenCalledWith(
    'neighborhood_area_selected',
    expect.objectContaining({ feature: 'commute' }),
  );
  expect(screen.queryByLabelText('대중교통 경로')).not.toBeInTheDocument();
  const sheet = within(screen.getByRole('region', { name: '역삼1동' }));
  await user.click(sheet.getByRole('button', { name: /역삼역\s?3분/ }));
  // 같은 시트 안에서 정류장 정보로 넘어가 경로를 본다.
  const stop = within(await screen.findByRole('region', { name: '역삼역 정보' }));
  expect(await stop.findByLabelText('대중교통 경로')).toHaveTextContent('예상 3분');
  expect(stop.getByLabelText('대중교통 경로')).toHaveTextContent('도보');
  expect(stop.queryByRole('button', { name: '정보 닫기' })).not.toBeInTheDocument();
  await user.click(stop.getByRole('button', { name: '뒤로 가기' }));
  expect(screen.getByRole('list', { name: '역삼1동 출발 정류장' })).toBeInTheDocument();
});
it('데스크탑은 출발 정류장을 고르면 그 정류장부터 출퇴근 장소까지 경로가 보이게 지도를 옮기고, 정보 칸의 < >로 다른 출발 정류장을 넘긴다', async () => {
  const matchMedia = useDesktopViewport();
  try {
    show();
    const user = await choosePoint();
    await user.click(screen.getByRole('button', { name: '이 조건으로 동네 찾기' }));
    await user.click(await screen.findByRole('button', { name: /1위 역삼1동/ }));
    const summary = within(screen.getByRole('region', { name: '역삼1동 요약' }));
    await user.click(summary.getByRole('button', { name: /^역삼역\s?3분$/ }));
    // 정류장부터 출퇴근 장소까지 경로 전체가 보이게 옮기고, 고른 정류장은 확대 단계와 상관없이 지도에 따로 찍는다.
    expectRouteView(YEOKSAM_STATION, false);
    expect(JSON.parse(screen.getByLabelText('목적지 좌표').textContent ?? '[]')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'station:RS_ACC1_S-2-0222', label: '역삼역', latitude: 37.5006 }),
      ]),
    );
    const panel = within(await screen.findByRole('region', { name: '역삼역 정보' }));
    const nav = within(panel.getByRole('navigation', { name: '출발 정류장 넘기기' }));
    expect(nav.getByText('1 / 2')).toBeInTheDocument();
    expect(nav.getByRole('button', { name: '이전 정류장' })).toBeDisabled();
    await user.click(nav.getByRole('button', { name: '다음 정류장' }));
    const next = within(await screen.findByRole('region', { name: /역삼역\.포스코센터 .*정보/ }));
    expect(next.getByText('2 / 2')).toBeInTheDocument();
    expect(next.getByRole('button', { name: '다음 정류장' })).toBeDisabled();
    // 다음 정류장으로 넘기면 그 정류장부터 출퇴근 장소까지 경로가 보이게 다시 옮긴다.
    expectRouteView({ latitude: 37.5021, longitude: 127.0399 }, false);
    await user.click(next.getByRole('button', { name: '이전 정류장' }));
    expect(await screen.findByRole('region', { name: '역삼역 정보' })).toBeInTheDocument();
  } finally {
    matchMedia.mockRestore();
  }
});
it('데스크탑은 동네를 고르면 목록 옆 칸에 시세·출발 정류장을 열고, 정류장을 고르면 그 칸에서 경로를 본다', async () => {
  const matchMedia = useDesktopViewport();
  try {
    show();
    const user = await choosePoint();
    await user.click(screen.getByRole('button', { name: '이 조건으로 동네 찾기' }));
    await user.click(await screen.findByRole('button', { name: /1위 역삼1동/ }));
    // 동네를 고르는 것만으로는 경로를 그리지 않는다. 지도 위 '대중교통 정보 보기' 말풍선도 두지 않는다.
    // 시세·출발 정류장은 랭킹 카드 아래가 아니라 목록 옆 칸에 연다.
    const ranking = within(screen.getByRole('complementary', { name: '통근 시간 상위 동네' }));
    expect(ranking.queryByRole('region', { name: '역삼1동 요약' })).not.toBeInTheDocument();
    const summary = within(screen.getByRole('region', { name: '역삼1동 요약' }));
    expect(summary.getByText('월세 68만원 / 보증금 1,000만원')).toBeInTheDocument();
    // 공인중개사 탭 없이 출발 정류장 목록만 둔다. 공인중개사는 지도에서 마커를 눌러 본다.
    expect(summary.queryByRole('tab')).not.toBeInTheDocument();
    expect(summary.getByRole('list', { name: '역삼1동 출발 정류장' })).toBeInTheDocument();
    expect(screen.queryByRole('main', { name: '역삼1동 대중교통 상세' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('대중교통 경로')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /대중교통 정보 보기/ })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '행정동 프리셋 지도' })).toBeInTheDocument();
    await user.click(summary.getByRole('button', { name: /^역삼역\s?3분$/ }));
    const panel = within(await screen.findByRole('region', { name: '역삼역 정보' }));
    expect(await panel.findByLabelText('대중교통 경로')).toHaveTextContent('예상 3분');
    // 같은 칸에 정류장 경로를 열고, 정보를 닫으면 그 동네의 출발 정류장 목록으로 돌아간다.
    expect(screen.queryByRole('region', { name: '역삼1동 요약' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '정보 닫기' }));
    const again = within(screen.getByRole('region', { name: '역삼1동 요약' }));
    await user.click(again.getByRole('button', { name: /^역삼역\.포스코센터/ }));
    expect(trackPostHogEvent).toHaveBeenCalledWith(
      'commute_departure_station_changed',
      expect.objectContaining({ feature: 'commute' }),
    );
    expect(await screen.findByRole('region', { name: /역삼역\.포스코센터 .*정보/ })).toBeInTheDocument();
    // 다른 동네를 고르면 열어 둔 정류장 경로는 닫고 그 동네 요약을 연다.
    await user.click(screen.getByRole('button', { name: /2위 신림동/ }));
    expect(screen.queryByRole('region', { name: '역삼역 정보' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '신림동 요약' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '역삼1동 요약' })).not.toBeInTheDocument();
    // 다시 선택하기는 열어 둔 정류장 경로도 닫는다.
    await user.click(
      within(screen.getByRole('region', { name: '신림동 요약' })).getByRole('button', { name: /^신림역/ }),
    );
    expect(await screen.findByRole('region', { name: /신림역.*정보/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다시 선택하기' }));
    expect(screen.queryByRole('region', { name: /신림역.*정보/ })).not.toBeInTheDocument();
  } finally {
    matchMedia.mockRestore();
  }
});
it('결과 지도의 순위 알약을 누르면 그 동네를 고르고, 휴대폰 위쪽 뒤로가기는 동네 찾기를 한 번에 나간다', async () => {
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await screen.findByRole('region', { name: '행정동 프리셋 지도' });
  // 통근과 환승은 결과에서 바꿀 수 없어 회색으로 두고, 월세만 버튼으로 바꾼다.
  const criteria = within(screen.getByLabelText('선택한 탐색 조건'));
  expect(criteria.getByText('통근 40분 이내')).toHaveAttribute('aria-disabled', 'true');
  expect(criteria.getByRole('button', { name: /월세/ })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: '마커 신림동 2위' }));
  expect(await screen.findByRole('region', { name: '신림동' })).toBeInTheDocument();
  // 동네 시트를 열면 정류장·공인중개사 마커를 가리지 않게 순위 알약을 거둔다.
  expect(screen.queryByRole('button', { name: '마커 신림동 2위' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '동네 찾기 나가기' })).toBeInTheDocument();
});
it('결과 지도를 가까이 확대하면 화면 안 정류장·부동산을 올리고 눌러 정보를 본다', async () => {
  server.use(...mapHandlers, ...createStreetMemoHandlers([]));
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  expect(await screen.findByText('동네를 고르거나 가까이 확대하면 정류장·부동산이 보여요')).toBeInTheDocument();
  // 멀리 볼 때는 정류장·부동산 대신 상위 동네의 순위 알약만 올린다.
  expect(screen.getAllByRole('button', { name: /^마커 / }).map((button) => button.textContent)).toEqual([
    '마커 역삼1동 1위',
    '마커 신림동 2위',
  ]);
  await user.click(screen.getByRole('button', { name: '가까이 확대' }));
  await waitFor(() =>
    expect(JSON.parse(screen.getByLabelText('목적지 좌표').textContent ?? '[]')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'AGENCY', tone: 'place' }),
        expect.objectContaining({ category: 'TRANSPORT', tone: 'place' }),
      ]),
    ),
  );
  await user.click(screen.getByRole('button', { name: '마커 역삼역 공인중개사' }));
  const card = within(screen.getByRole('region', { name: '역삼역 공인중개사 정보' }));
  // 휴대폰은 바텀시트로 띄우고, 낮은 상태에서 바로 전화를 걸 수 있다. 닫기 대신 뒤로가기를 둔다.
  expect(card.getByText(/^공인중개사/)).toBeInTheDocument();
  expect(card.getByRole('link', { name: /전화 걸기/ })).toHaveAttribute('href', 'tel:02-555-1201');
  expect(card.queryByRole('button', { name: '정보 닫기' })).not.toBeInTheDocument();
  await user.click(card.getByRole('button', { name: '뒤로 가기' }));
  expect(screen.queryByRole('region', { name: '역삼역 공인중개사 정보' })).not.toBeInTheDocument();
  // 동네를 고른 뒤 마커를 누르면 동네 시트 안에서 그 정보로 넘어가고, 뒤로가기로 탭 목록에 돌아온다.
  await user.click(await screen.findByRole('button', { name: /1위 역삼1동/ }));
  expect(screen.getByRole('list', { name: '역삼1동 출발 정류장' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '마커 역삼역' }));
  expect(screen.queryByRole('list', { name: '역삼1동 출발 정류장' })).not.toBeInTheDocument();
  // 정류장은 전체 화면으로 넘기지 않고 바텀시트 안에서 경로까지 보여 주며, 끌어 올릴 수 있다.
  const stop = within(screen.getByRole('region', { name: '역삼역 정보' }));
  expect(await stop.findByLabelText('대중교통 경로')).toHaveTextContent('예상');
  expect(stop.queryByRole('button', { name: '경로 자세히 보기' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: '역삼역 정보' })).toHaveAttribute('data-resizable', 'true');
  await user.click(stop.getByRole('button', { name: '뒤로 가기' }));
  expect(screen.getByRole('list', { name: '역삼1동 출발 정류장' })).toBeInTheDocument();
});
it('결과 지도에 확대·축소 버튼을 두고, 손가락이나 휠로 바꾼 단계에서 한 단계씩 옮긴다', async () => {
  server.use(...mapHandlers, ...createStreetMemoHandlers([]));
  show();
  const user = await choosePoint();
  // 결과 전에는 버튼을 두지 않는다.
  expect(screen.queryByRole('group', { name: '지도 확대·축소' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  const level = () => JSON.parse(screen.getByLabelText('지도 시점').textContent ?? '{}').level as number;
  await waitFor(() => expect(level()).toBe(10));
  await user.click(await screen.findByRole('button', { name: '지도 확대' }));
  expect(level()).toBe(9);
  // 지도가 휠로 4단계에 멈췄다고 알리면, 축소 버튼은 그 단계에서 한 단계 멀어진다.
  await user.click(screen.getByRole('button', { name: '가까이 확대' }));
  await user.click(screen.getByRole('button', { name: '지도 축소' }));
  expect(level()).toBe(5);
});
it('휴대폰에서 동네 시트를 올리면 확대 축소, 현재 위치 버튼을 시트 바로 위에 붙여 시트에 가리지 않게 한다', async () => {
  server.use(...mapHandlers, ...createStreetMemoHandlers([]));
  show(true);
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  const zoomIn = await screen.findByRole('button', { name: '지도 확대' });
  // 시트가 없을 때는 지도 위 고정 자리에 둔다.
  expect(zoomIn.closest('.BottomSheet-sheet')).toBeNull();
  await user.click(await screen.findByRole('button', { name: /1위 역삼1동/ }));
  const sheet = await screen.findByRole('region', { name: '역삼1동' });
  expect(within(sheet).getByRole('button', { name: '지도 확대' })).toBeInTheDocument();
  expect(within(sheet).getByRole('button', { name: '내 현재 위치로 이동' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: '지도 확대' })).toHaveLength(1);
});
it('출퇴근 장소 안내는 본 방 기록과 같은 지도 안내로 띄우고, 건너뛰면 이 화면에서는 다시 띄우지 않는다', async () => {
  show(true);
  const intro = screen.getByRole('note', { name: '지도 사용 안내' });
  expect(intro).toHaveTextContent('지도를 눌러 출퇴근 장소를 찍어보세요');
  await userEvent.click(within(intro).getByRole('button', { name: '건너뛰기' }));
  expect(screen.queryByRole('note', { name: '지도 사용 안내' })).not.toBeInTheDocument();
});
it('결과 지도는 가까이 확대해도 거리 메모를 조회하거나 올리지 않는다', async () => {
  let memoRequests = 0;
  server.use(
    ...mapHandlers,
    http.get('*/api/street-memos', () => {
      memoRequests += 1;
      return HttpResponse.json({ data: [] });
    }),
  );
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await user.click(await screen.findByRole('button', { name: '가까이 확대' }));
  await waitFor(() =>
    expect(JSON.parse(screen.getByLabelText('목적지 좌표').textContent ?? '[]')).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: 'TRANSPORT', tone: 'place' })]),
    ),
  );
  expect(memoRequests).toBe(0);
  expect(screen.queryByRole('button', { name: /메모/ })).not.toBeInTheDocument();
});
it('휴대폰은 동네를 고르면 출발 정류장 시트를 올리고, 고른 정류장은 시트 안에서 열어 뒤로가기로 돌아온다', async () => {
  server.use(...mapHandlers, ...createStreetMemoHandlers([]));
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await user.click(await screen.findByRole('button', { name: /1위 역삼1동/ }));
  // 공인중개사 탭 없이 그 동네의 출발 정류장 목록만 둔다.
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  const stations = () => within(screen.getByRole('list', { name: '역삼1동 출발 정류장' }));
  // 출발 정류장을 고르면 그 정류장부터 출퇴근 장소까지 경로가 보이게 옮기고 시트 안에서 경로를 본다.
  await user.click(stations().getByRole('button', { name: /역삼역\s?3분/ }));
  expectRouteView(YEOKSAM_STATION, false);
  const stop = within(await screen.findByRole('region', { name: '역삼역 정보' }));
  expect(await stop.findByLabelText('대중교통 경로')).toHaveTextContent('예상');
  expect(screen.queryByRole('list', { name: '역삼1동 출발 정류장' })).not.toBeInTheDocument();
  // 닫기 버튼은 없고, 끌어 내리거나 Escape로 닫으면 동네 선택을 풀고 랭킹으로 돌아간다.
  await user.click(stop.getByRole('button', { name: '뒤로 가기' }));
  expect(stations().getByRole('button', { name: /역삼역\s?3분/ })).toBeInTheDocument();
  screen.getByRole('button', { name: '상세 패널 높이 조절' }).focus();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('list', { name: '역삼1동 출발 정류장' })).not.toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /1위 역삼1동/ })).toHaveAttribute('aria-pressed', 'false');
});
it('동네를 고르면 그 동네로 다가가 확대하지 않아도 마커를 올리고, 휴대폰은 출발 정류장 마커만 보인다', async () => {
  server.use(...mapHandlers, ...createStreetMemoHandlers([]));
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await user.click(await screen.findByRole('button', { name: /1위 역삼1동/ }));
  // 동네를 고르면 경로 전체가 보이게 옮기고, 이동이 끝나면(idle) 그 단계와 화면 범위를 알린다.
  // 지도가 마커를 올리는 단계(6.5) 안에 멈췄다고 알리면 정류장 마커를 올린다.
  expectRouteView(YEOKSAM_STATION, true);
  await user.click(screen.getByRole('button', { name: '동네 보기 이동 끝' }));
  const categories = () =>
    new Set(
      (JSON.parse(screen.getByLabelText('목적지 좌표').textContent ?? '[]') as { category?: string }[]).map(
        (marker) => marker.category,
      ),
    );
  // 동네를 고른 동안은 시트의 출발 정류장과 맞춰 정류장만 지도에 올린다.
  await waitFor(() => expect(categories().has('TRANSPORT')).toBe(true));
  expect(categories().has('AGENCY')).toBe(false);
  expect(screen.getByText('마커를 눌러 정보를 볼 수 있어요')).toBeInTheDocument();
});
it('월세 조건 밖 동네는 랭킹에서 빼되 지도에는 회색으로 깔고, 고르면 조건보다 비싸다고 알린다', async () => {
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: '월세 전체' }));
  await user.click(screen.getByRole('option', { name: '50만원 이하' }));
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  expect(await screen.findByLabelText('통근 시간 상위 동네')).not.toHaveTextContent('역삼1동');
  expect(screen.getByLabelText('통근 시간 색상 기준')).toHaveTextContent('월세 조건 밖');
  // 지도의 역삼1동(68만원) 구역은 회색으로 남아 누를 수 있다.
  await user.click(screen.getByRole('button', { name: '역삼1동' }));
  const sheet = within(await screen.findByRole('region', { name: '역삼1동' }));
  expect(sheet.getByRole('region', { name: '월세 시세' })).toHaveTextContent('월세 조건(50만원 이하)보다 비싸요');
  // 제목 아래에는 동네 주소를, 오른쪽 끝에는 외부 링크 표시가 있는 `현재 지역의 매물은?` 다방 버튼을 둔다.
  expect(screen.getByRole('heading', { name: '역삼1동' }).parentElement).toHaveTextContent('서울특별시 강남구 역삼1동');
  const dabang = sheet.getByRole('link', { name: '다방에서 역삼1동 원·투룸 보기' });
  expect(dabang).toHaveAttribute('target', '_blank');
  expect(dabang).toHaveTextContent('현재 지역의 매물은?');
});
it('데스크탑 휠처럼 동네 보기 근처 소수 단계로 멈춰도 정류장·부동산을 올린다', async () => {
  server.use(...mapHandlers, ...createStreetMemoHandlers([]));
  const matchMedia = useDesktopViewport();
  try {
    show();
    const user = await choosePoint();
    await user.click(screen.getByRole('button', { name: '이 조건으로 동네 찾기' }));
    await screen.findByRole('region', { name: '행정동 프리셋 지도' });
    const markers = () =>
      JSON.parse(screen.getByLabelText('목적지 좌표').textContent ?? '[]') as { category?: string }[];
    await user.click(screen.getByRole('button', { name: '휠로 조금 확대' }));
    await waitFor(() => expect(markers().some((marker) => marker.category === 'AGENCY')).toBe(true));
  } finally {
    matchMedia.mockRestore();
  }
});
it('데스크탑은 지도에서 고른 부동산·정류장 정보를 목록 옆 칸에 열고 랭킹은 그대로 둔다', async () => {
  server.use(...mapHandlers, ...createStreetMemoHandlers([]));
  const matchMedia = useDesktopViewport();
  try {
    show();
    const user = await choosePoint();
    await user.click(screen.getByRole('button', { name: '이 조건으로 동네 찾기' }));
    await user.click(await screen.findByRole('button', { name: '가까이 확대' }));
    await user.click(await screen.findByRole('button', { name: '마커 역삼역 공인중개사' }));
    const agency = within(await screen.findByRole('region', { name: '역삼역 공인중개사 정보' }));
    // 데스크탑은 전화 링크 대신 번호를 보여주고 복사하게 한다.
    expect(agency.queryByRole('link', { name: /전화 걸기/ })).not.toBeInTheDocument();
    expect(agency.getByText('02-555-1201')).toBeInTheDocument();
    await user.click(agency.getByRole('button', { name: '번호 복사' }));
    expect(await agency.findByText('복사했어요')).toBeInTheDocument();
    await expect(navigator.clipboard.readText()).resolves.toBe('02-555-1201');
    expect(screen.getByRole('complementary', { name: '통근 시간 상위 동네' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '마커 역삼역' }));
    const stop = within(await screen.findByRole('region', { name: '역삼역 정보' }));
    // 정류장은 그 정류장에서 목적지까지의 경로를 보여준다.
    expect(await stop.findByLabelText('대중교통 경로')).toHaveTextContent('예상');
    await user.click(screen.getByRole('button', { name: '정보 닫기' }));
    expect(screen.queryByRole('region', { name: '역삼역 정보' })).not.toBeInTheDocument();
  } finally {
    matchMedia.mockRestore();
  }
});
it('통근 서버 오류는 가짜 결과로 대체하지 않는다', async () => {
  server.use(...createCommuteAreaHandlers({ scenario: 'network-unavailable', delayMs: 0 }));
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('대중교통 정보를 준비하고 있습니다.');
  expect(screen.queryByRole('region', { name: '행정동 프리셋 지도' })).not.toBeInTheDocument();
  await waitFor(() =>
    expect(trackPostHogEvent).toHaveBeenCalledWith(
      'neighborhood_search_failed',
      expect.objectContaining({ feature: 'commute' }),
    ),
  );
  expect(
    vi.mocked(trackPostHogEvent).mock.calls.filter(([event]) => event === 'neighborhood_search_results_viewed'),
  ).toHaveLength(0);
});
it('환승은 두 회까지, 통근은 10~60분을 10분 단위로만 선택한다', async () => {
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: '통근 40분 이내' }));
  const minutes = within(screen.getByRole('listbox', { name: '최대 통근 시간' }));
  expect(minutes.getAllByRole('option')).toHaveLength(6);
  expect(minutes.getByRole('option', { name: '10분 이내' })).toBeInTheDocument();
  expect(minutes.queryByRole('option', { name: '70분 이내' })).not.toBeInTheDocument();
  expect(minutes.getByRole('option', { name: '40분 이내' })).toHaveAttribute('aria-selected', 'true');
  // 고르면 적용 버튼 없이 바로 조건 칸에 반영한다.
  await user.click(minutes.getByRole('option', { name: '30분 이내' }));
  expect(screen.getByRole('button', { name: '통근 30분 이내' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '환승 1회 이하' }));
  const transfers = within(screen.getByRole('listbox', { name: '최대 환승 횟수' }));
  expect(transfers.getAllByRole('option').map((option) => option.textContent)).toEqual([
    '환승 없음',
    '1회 이하',
    '2회 이하',
  ]);
  expect(screen.getByRole('button', { name: /에서 찾기$/ })).toBeEnabled();
});
it('전국 파일 하나뿐인 manifest는 미리 받지 않고, 조회 버튼 이후에 받은 경계를 다시 조회할 때 재사용한다', async () => {
  const paths: string[] = [];
  const track = ({ request }: { request: Request }) => paths.push(new URL(request.url).pathname);
  server.events.on('request:start', track);
  try {
    show();
    const user = await choosePoint();
    // 장소를 고르면 미리 받기가 manifest를 보지만, 시도별 파일이 없으면 큰 전국 파일은 받지 않는다.
    await waitFor(() => expect(paths.filter((path) => path.endsWith('/manifest.json'))).toHaveLength(1));
    expect(paths.filter((path) => path.endsWith('.geojson'))).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
    await screen.findByRole('region', { name: '행정동 프리셋 지도' });
    expect(paths.filter((path) => path.endsWith('.geojson'))).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '다시 선택하기' }));
    await user.click(screen.getByRole('button', { name: '지도에서 위치 찍기' }));
    await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
    await screen.findByRole('region', { name: '행정동 프리셋 지도' });
    expect(paths.filter((path) => path.endsWith('.geojson'))).toHaveLength(1);
    // 미리 받기는 화면마다 한 번이라 다시 고를 때는 manifest를 더 받지 않는다.
    expect(paths.filter((path) => path.endsWith('/manifest.json'))).toHaveLength(3);
  } finally {
    server.events.removeListener('request:start', track);
  }
});
it('분할 manifest에서는 결과에 나온 시도 파일만 받아 합치고 재조회 시 각 파일의 캐시를 재사용한다', async () => {
  const files = {
    '11': 'admin-dongs.11.20250630.111111111111.geojson',
    '23': 'admin-dongs.23.20250630.333333333333.geojson',
    '31': 'admin-dongs.31.20250630.222222222222.geojson',
  };
  const requested: string[] = [];
  server.use(
    http.get('*/boundaries/manifest.json', () =>
      HttpResponse.json({ version: '20250630', file: 'admin-dongs.20250630.123456abcdef.geojson', files }),
    ),
    http.get('*/boundaries/:filename', ({ params }) => {
      const filename = String(params.filename);
      requested.push(filename);
      const prefix = filename.split('.')[1];
      return HttpResponse.json({
        type: 'FeatureCollection',
        features: commuteBoundaryFixtures
          .filter((fixture) => fixture.sourceCode.startsWith(prefix))
          .map((fixture) => ({
            type: 'Feature',
            properties: {
              code: fixture.sourceCode,
              name: fixture.fullName.split(' ').at(-1),
              fullName: fixture.fullName,
              baseDate: '20250630',
            },
            geometry: fixture.boundary,
          })),
      });
    }),
  );
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await screen.findByRole('region', { name: '행정동 프리셋 지도' });
  // 경기(31)의 정자동은 시세가 없어 그리지 않으므로 경기 경계 파일도 받지 않는다.
  expect(requested.sort()).toEqual([files['11']]);
  expect(screen.getByRole('button', { name: '역삼1동' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '정자동' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '다시 선택하기' }));
  await user.click(screen.getByRole('button', { name: '지도에서 위치 찍기' }));
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await screen.findByRole('region', { name: '행정동 프리셋 지도' });
  expect(requested).toHaveLength(1);
});

it('지도가 준비되면 수도권 경계를 미리 받아 두고, 검색 뒤에는 경계 파일을 다시 받지 않는다', async () => {
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => window.setTimeout(callback, 0));
  const files = {
    '11': 'admin-dongs.11.20250630.111111111111.geojson',
    '23': 'admin-dongs.23.20250630.333333333333.geojson',
    '31': 'admin-dongs.31.20250630.222222222222.geojson',
  };
  const requested: string[] = [];
  server.use(
    http.get('*/boundaries/manifest.json', () =>
      HttpResponse.json({ version: '20250630', file: 'admin-dongs.20250630.123456abcdef.geojson', files }),
    ),
    http.get('*/boundaries/:filename', ({ params }) => {
      const filename = String(params.filename);
      requested.push(filename);
      const prefix = filename.split('.')[1];
      return HttpResponse.json({
        type: 'FeatureCollection',
        features: commuteBoundaryFixtures
          .filter((fixture) => fixture.sourceCode.startsWith(prefix))
          .map((fixture) => ({
            type: 'Feature',
            properties: {
              code: fixture.sourceCode,
              name: fixture.fullName.split(' ').at(-1),
              fullName: fixture.fullName,
              baseDate: '20250630',
            },
            geometry: fixture.boundary,
          })),
      });
    }),
  );
  try {
    show();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '지도 준비 완료' }));
    await waitFor(() => expect(requested).toEqual([files['11'], files['31'], files['23']]));
    await user.click(screen.getByRole('button', { name: '지도에서 위치 찍기' }));
    await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
    await screen.findByRole('region', { name: '행정동 프리셋 지도' });
    expect(await screen.findByRole('button', { name: '역삼1동' })).toBeInTheDocument();
    expect(requested).toHaveLength(3);
  } finally {
    vi.unstubAllGlobals();
  }
});

it('지도가 준비되기 전에 장소를 고르면 그때 수도권 경계를 미리 받기 시작한다', async () => {
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => window.setTimeout(callback, 0));
  const files = {
    '11': 'admin-dongs.11.20250630.111111111111.geojson',
    '23': 'admin-dongs.23.20250630.333333333333.geojson',
    '31': 'admin-dongs.31.20250630.222222222222.geojson',
  };
  const requested: string[] = [];
  server.use(
    http.get('*/boundaries/manifest.json', () =>
      HttpResponse.json({ version: '20250630', file: 'admin-dongs.20250630.123456abcdef.geojson', files }),
    ),
    http.get('*/boundaries/:filename', ({ params }) => {
      requested.push(String(params.filename));
      return HttpResponse.json({ type: 'FeatureCollection', features: [] });
    }),
  );
  try {
    show();
    await choosePoint();
    await waitFor(() => expect(requested).toEqual([files['11'], files['31'], files['23']]));
  } finally {
    vi.unstubAllGlobals();
  }
});

it('manifest의 해시가 바뀌면 이전 경계 캐시 대신 새 파일을 받는다', async () => {
  let file = 'admin-dongs.20250630.123456abcdef.geojson';
  server.use(http.get('*/boundaries/manifest.json', () => HttpResponse.json({ version: '20250630', file })));
  const files: string[] = [];
  const track = ({ request }: { request: Request }) => {
    const path = new URL(request.url).pathname;
    if (path.endsWith('.geojson')) files.push(path);
  };
  server.events.on('request:start', track);
  try {
    show();
    const user = await choosePoint();
    await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
    await screen.findByRole('region', { name: '행정동 프리셋 지도' });
    file = 'admin-dongs.20250630.abcdef123456.geojson';
    await user.click(screen.getByRole('button', { name: '다시 선택하기' }));
    await user.click(screen.getByRole('button', { name: '지도에서 위치 찍기' }));
    await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
    await screen.findByRole('region', { name: '행정동 프리셋 지도' });
    expect(files).toEqual([
      '/boundaries/admin-dongs.20250630.123456abcdef.geojson',
      '/boundaries/admin-dongs.20250630.abcdef123456.geojson',
    ]);
  } finally {
    server.events.removeListener('request:start', track);
  }
});
it('결과 지도 클릭은 목적지·결과를 유지하고 다시 선택하기를 눌러야 새 위치를 고른다', async () => {
  server.use(...createStreetMemoHandlers([]));
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: '다른 위치 찍기' }));
  expect(screen.getByLabelText('목적지 좌표')).toHaveTextContent('37.45');
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await screen.findByRole('region', { name: '행정동 프리셋 지도' });
  await user.click(screen.getByRole('button', { name: '역삼1동' }));
  await user.keyboard('{Escape}');
  const markers = JSON.parse(screen.getByLabelText('목적지 좌표').textContent ?? '[]');
  // 결과 지도를 찍어도 목적지와 결과는 그대로 두고, 동네 찾기에서는 메모를 남기지 않아 핀도 더하지 않는다.
  await user.click(screen.getByRole('button', { name: '지도에서 위치 찍기' }));
  expect(screen.getByRole('region', { name: '행정동 프리셋 지도' })).toBeInTheDocument();
  expect(JSON.parse(screen.getByLabelText('목적지 좌표').textContent ?? '[]')).toEqual(markers);
  expect(screen.queryByRole('button', { name: /메모 남기기/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '다시 선택하기' }));
  await user.click(screen.getByRole('button', { name: '지도에서 위치 찍기' }));
  expect(screen.queryByRole('region', { name: '행정동 프리셋 지도' })).not.toBeInTheDocument();
  expect(screen.queryByRole('complementary', { name: '선택한 동네 정보' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('목적지 좌표')).toHaveTextContent('37.4');
  expect(screen.getByRole('button', { name: /에서 찾기$/ })).toBeEnabled();
});

it('위치 선택·분석·결과·다시 선택하기 내내 지도를 새로 만들지 않는다', async () => {
  server.use(...createCommuteAreaHandlers({ delayMs: 50 }));
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  // 분석하는 동안에도 지도는 남아 있고, 찾기 버튼은 꺼진다. 빠른 응답에는 분석 안내가 덮이지 않는다.
  await waitFor(() => expect(screen.queryByRole('button', { name: /에서 찾기$/ })).not.toBeInTheDocument());
  expect(screen.getByRole('region', { name: '지도에서 목적지 선택' })).toBeInTheDocument();
  await screen.findByRole('region', { name: '행정동 프리셋 지도' });
  await user.click(screen.getByRole('button', { name: '다시 선택하기' }));
  expect(await screen.findByRole('region', { name: '지도에서 목적지 선택' })).toBeInTheDocument();
  expect(mapMounts.count).toBe(1);
});
it.each([false, true])(
  '공개 탐색 여부 %s: 결과 지도에는 외부 링크를 두지 않고 동네 시트에서 다방을 연다',
  async (isPublic) => {
    show(isPublic);
    const user = await choosePoint();
    await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
    await user.click(await screen.findByRole('button', { name: /2위 신림동/ }));
    expect(await screen.findByRole('list', { name: '신림동 출발 정류장' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /주변 시설 분석/ })).not.toBeInTheDocument();
    const dabangLink = screen.getByRole('link', { name: /다방에서 신림동 원·투룸 보기/ });
    expect(dabangLink).toHaveAttribute('target', '_blank');
    expect(dabangLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(dabangLink.getAttribute('href')).toMatch(
      /^https:\/\/www\.dabangapp\.com\/(mobile\/)?map\/onetwo\?m_lat=37\.\d+&m_lng=126\.\d+&m_zoom=15$/,
    );
    dabangLink.addEventListener('click', (event) => event.preventDefault());
    await user.click(dabangLink);
    expect(trackPostHogEvent).toHaveBeenCalledWith(
      'neighborhood_listing_link_clicked',
      expect.objectContaining({ provider: 'dabang', feature: 'commute' }),
    );
    expect(screen.queryByRole('button', { name: '이 동네에서 본 방 기록하기' }) !== null).toBe(isPublic);
    // 정류장·공인중개사는 결과 지도를 확대해 바로 보므로 상세에 주변 분석 링크를 두지 않는다.
    expect(screen.queryByRole('link', { name: /주변 시설 분석/ })).not.toBeInTheDocument();
  },
);
it('휴대폰은 동네 시트가 열린 채 지도의 동네를 찍으면 시트를 닫고 랭킹을 다시 보여 주며 메모 남기기는 띄우지 않는다', async () => {
  server.use(...mapHandlers, ...createStreetMemoHandlers([]));
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await user.click(await screen.findByRole('button', { name: /1위 역삼1동/ }));
  expect(screen.getByRole('list', { name: '역삼1동 출발 정류장' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '화면 범위 알림' }));
  await user.click(screen.getByRole('button', { name: '고른 동네 안 찍기' }));
  expect(screen.queryByRole('list', { name: '역삼1동 출발 정류장' })).not.toBeInTheDocument();
  expect(await screen.findByLabelText('통근 시간 상위 동네')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /1위 역삼1동/ })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.queryByRole('button', { name: /메모 남기기/ })).not.toBeInTheDocument();
  // 동네를 고르지 않은 상태에서 지도의 동네를 찍으면 그 동네를 고른다.
  await user.click(screen.getByRole('button', { name: '역삼1동' }));
  expect(await screen.findByRole('list', { name: '역삼1동 출발 정류장' })).toBeInTheDocument();
});
it('휴대폰은 정보 시트가 열린 채 지도를 찍으면 닫지 않고 제목만 보이게 내리며 메모 시트를 띄우지 않는다', async () => {
  server.use(...mapHandlers, ...createStreetMemoHandlers());
  show();
  const user = await choosePoint();
  await user.click(screen.getByRole('button', { name: /에서 찾기$/ }));
  await user.click(await screen.findByRole('button', { name: '가까이 확대' }));
  await user.click(await screen.findByRole('button', { name: '마커 역삼역 공인중개사' }));
  expect(screen.getByRole('region', { name: '역삼역 공인중개사 정보' })).toHaveAttribute('data-mode', 'default');
  await user.click(screen.getByRole('button', { name: '지도에서 위치 찍기' }));
  expect(screen.getByRole('region', { name: '역삼역 공인중개사 정보' })).toHaveAttribute('data-mode', 'peek');
  await user.click(screen.getByRole('button', { name: '지도에서 위치 찍기' }));
  expect(screen.queryByRole('button', { name: /메모 남기기/ })).not.toBeInTheDocument();
});
it('데스크탑도 결과 지도를 찍었을 때 메모 말풍선을 띄우지 않는다', async () => {
  server.use(...mapHandlers, ...createStreetMemoHandlers([]));
  const matchMedia = useDesktopViewport();
  try {
    show();
    const user = await choosePoint();
    await user.click(screen.getByRole('button', { name: '이 조건으로 동네 찾기' }));
    await screen.findByRole('region', { name: '행정동 프리셋 지도' });
    await user.click(screen.getByRole('button', { name: '지도에서 위치 찍기' }));
    expect(screen.queryByRole('button', { name: /메모 남기기/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '메모 남기기' })).not.toBeInTheDocument();
  } finally {
    matchMedia.mockRestore();
  }
});

it('데스크탑은 고른 동네 카드를 다시 누르거나 옆 칸을 닫으면 동네 정보를 닫는다', async () => {
  const matchMedia = useDesktopViewport();
  try {
    show();
    const user = await choosePoint();
    await user.click(screen.getByRole('button', { name: '이 조건으로 동네 찾기' }));
    const panel = within(await screen.findByRole('complementary', { name: '통근 시간 상위 동네' }));
    await user.click(panel.getByRole('button', { name: /1위 역삼1동/ }));
    expect(panel.getByRole('button', { name: /1위 역삼1동/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: '역삼1동 요약' })).toHaveTextContent('월세 68만원 / 보증금 1,000만원');
    await user.click(panel.getByRole('button', { name: /1위 역삼1동/ }));
    expect(panel.getByRole('button', { name: /1위 역삼1동/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('region', { name: '역삼1동 요약' })).not.toBeInTheDocument();
    await user.click(panel.getByRole('button', { name: /1위 역삼1동/ }));
    await user.click(screen.getByRole('button', { name: '동네 정보 닫기' }));
    expect(panel.getByRole('button', { name: /1위 역삼1동/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('region', { name: '역삼1동 요약' })).not.toBeInTheDocument();
  } finally {
    matchMedia.mockRestore();
  }
});
