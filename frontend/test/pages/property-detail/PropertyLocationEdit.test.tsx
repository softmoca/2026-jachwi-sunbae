import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { mapHandlers } from '@/app/mocks/handlers/mapHandlers';
import { propertyChecklistHandlers } from '@/app/mocks/handlers/propertyChecklistHandlers';
import { propertyHandlers } from '@/app/mocks/handlers/propertyHandlers';
import { failure } from '@/app/mocks/mockStore';
import PropertyDetailPage from '@/pages/property-detail/PropertyDetailPage';
import { resetAuthenticationForTests, setAuthentication } from '@/features/auth/model/authStore';
import type { MapCanvasProps } from '@/features/map/model/MapCanvas';
import { resetMovedPropertyForTests, takeMovedProperty } from '@/features/property/model/movedProperty';
import { queryClient } from '@/shared/api/queryClient';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

import { server } from '../../server';

const MOVED = { latitude: 37.5662, longitude: 126.9785 };
// 앞 테스트가 목 매물 위치를 바꿔 두므로 테스트마다 다른 자리로 끈다.
const drag = vi.hoisted(() => ({ to: { latitude: 37.5662, longitude: 126.9785 } }));

vi.mock('@/features/map/ui/map-canvas/MapCanvas', () => ({
  default: ({ onCenterChange }: MapCanvasProps) => (
    <button type="button" onClick={() => onCenterChange?.(drag.to.latitude, drag.to.longitude)}>
      지도 끌기
    </button>
  ),
}));

beforeEach(() => {
  setAuthentication({ accessToken: 'valid-token', tokenType: 'Bearer', expiresIn: 60 });
  server.use(...propertyHandlers, ...propertyChecklistHandlers, ...mapHandlers);
});
afterEach(() => {
  resetAuthenticationForTests();
  resetMovedPropertyForTests();
  queryClient.clear();
  sessionStorage.clear();
});

const renderDetail = () => {
  const router = createMemoryRouter([{ path: '/properties/:propertyId', element: <PropertyDetailPage /> }], {
    initialEntries: [{ pathname: '/properties/10', search: '?tab=details', state: { returnTo: '/properties' } }],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <PublicConfigProvider config={{ apiBaseUrl: 'http://localhost:8080' }}>
        <RouterProvider router={router} />
      </PublicConfigProvider>
    </QueryClientProvider>,
  );
};

const captureUpdates = () => {
  const bodies: Record<string, unknown>[] = [];
  const track = ({ request }: { request: Request }) => {
    if (request.method === 'PUT' && /\/api\/properties\/\d+$/.test(new URL(request.url).pathname))
      void request
        .clone()
        .json()
        .then((body: Record<string, unknown>) => bodies.push(body));
  };
  server.events.on('request:start', track);
  return { bodies, stop: () => server.events.removeListener('request:start', track) };
};

// 지도를 멈춘 뒤 주소를 묻기까지 실제로 기다리므로, 부하가 큰 환경에서도 끝나게 테스트 제한 시간을 넉넉히 둔다.
const openLocationEditor = async () => {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /^주소 .*수정$/ }));
  await screen.findByRole('button', { name: '이 위치로 저장' });
  return user;
};

it('지도를 옮기자마자 저장을 누르면 옮기기 전 위치로 닫지 않고, 새 주소를 받을 때까지 기다렸다가 저장한다', async () => {
  renderDetail();
  const user = await openLocationEditor();
  const updates = captureUpdates();
  try {
    await user.click(screen.getByRole('button', { name: '지도 끌기' }));
    await user.click(screen.getByRole('button', { name: '이 위치로 저장' }));
    // 주소를 받는 동안 버튼이 확인 중으로 바뀌고 아직 저장하지 않는다.
    expect(screen.getByRole('button', { name: '이 위치로 저장' })).toHaveAttribute('aria-busy', 'true');
    expect(updates.bodies).toEqual([]);
    // 지도를 멈춘 뒤 주소를 묻기까지 잠깐 기다리므로 넉넉히 기다린다.
    await waitFor(() => expect(updates.bodies).toHaveLength(1), { timeout: 8000 });
    expect(updates.bodies[0]).toEqual(
      expect.objectContaining({ ...MOVED, address: 'MSW 테스트 위치 (37.56620, 126.97850)' }),
    );
    // 본 방 기록 지도가 새 자리로 가도록 옮긴 매물을 기억한다.
    await waitFor(() =>
      expect(takeMovedProperty(() => MOVED)).toEqual(expect.objectContaining({ propertyId: 10, ...MOVED })),
    );
  } finally {
    updates.stop();
  }
}, 20_000);

it.each([
  ['주소를 찾지 못하면', () => failure('MAP_ADDRESS_NOT_FOUND', 404), { latitude: 34.9, longitude: 125.1 }],
  ['주소 조회가 실패하면', () => failure('INTERNAL_SERVER_ERROR', 500), { latitude: 34.8, longitude: 125.2 }],
])(
  '옮긴 자리의 %s 지원하지 않는 주소라고 보이고, 주소 없이 좌표만 저장한다',
  async (_, respond, to) => {
    server.use(http.get('*/api/maps/reverse-geocode', respond));
    drag.to = to;
    renderDetail();
    const user = await openLocationEditor();
    const updates = captureUpdates();
    try {
      await user.click(screen.getByRole('button', { name: '지도 끌기' }));
      expect(await screen.findByText('지원하지 않는 주소입니다', {}, { timeout: 8000 })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '이 위치로 저장' }));
      await waitFor(() => expect(updates.bodies).toHaveLength(1), { timeout: 8000 });
      expect(updates.bodies[0]).toEqual(expect.objectContaining({ ...to, address: null }));
      // 저장한 뒤 상세의 주소 칸도 빈칸 대신 지원하지 않는 주소라고 보인다.
      expect(await screen.findByRole('button', { name: /^주소 .*수정$/ })).toHaveTextContent(
        '지원하지 않는 주소입니다',
      );
    } finally {
      updates.stop();
    }
  },
  20_000,
);
