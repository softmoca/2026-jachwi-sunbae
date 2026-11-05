import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';

import MapNearbySheet from '@/pages/nearby-analysis/ui/map-nearby-sheet/MapNearbySheet';

import { expectSheetStages } from '../../../shared/ui/bottom-sheet/sheetStages';

const counts = { HOSPITAL: 1, TRANSPORT: 2, SCHOOL: 0, CONVENIENCE: 0, AGENCY: 1 };
const places = [
  { providerPlaceId: 'p1', category: 'TRANSPORT', name: '역삼역', address: '서울 강남구', distanceMeters: 120 },
] as Parameters<typeof MapNearbySheet>[0]['places'];
const renderSheet = (peekSignal?: string) =>
  render(
    <MemoryRouter>
      <MapNearbySheet
        heading="역삼1동 주변 2km"
        counts={counts}
        selectedCategories={['TRANSPORT']}
        places={places}
        peekSignal={peekSignal}
        onToggleCategory={vi.fn()}
      />
    </MemoryRouter>,
  );

it('주변 분석 시트는 공용 시트라 제목만, 처음, 크게, 페이지 네 단계를 오가고 목록을 바로 보인다', async () => {
  const user = userEvent.setup();
  renderSheet();
  const sheet = screen.getByRole('region', { name: '역삼1동 주변 2km' });
  expect(screen.getByRole('list', { name: '주변 시설 목록' })).toHaveTextContent('역삼역');
  await expectSheetStages(user, sheet);
});

it('지도에서 시설을 고르면(peekSignal이 바뀌면) 상세 카드를 가리지 않게 제목만 보이게 내린다', () => {
  const view = renderSheet(undefined);
  const sheet = screen.getByRole('region', { name: '역삼1동 주변 2km' });
  expect(sheet).toHaveAttribute('data-mode', 'default');
  view.rerender(
    <MemoryRouter>
      <MapNearbySheet
        heading="역삼1동 주변 2km"
        counts={counts}
        selectedCategories={['TRANSPORT']}
        places={places}
        peekSignal="p1"
        onToggleCategory={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(sheet).toHaveAttribute('data-mode', 'peek');
});
