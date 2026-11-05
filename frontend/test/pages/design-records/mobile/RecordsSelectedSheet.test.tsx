import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { it, vi } from 'vitest';

import { propertySummaryFixture } from '@/app/mocks/fixtures/propertyFixtures';
import RecordsSelectedSheet from '@/pages/design-records/mobile/RecordsSelectedSheet';
import { recordPresentation } from '@/pages/design-records/model/recordPresentation';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

import { expectSheetStages } from '../../../shared/ui/bottom-sheet/sheetStages';

it('지도에서 고른 매물 시트는 끝까지 끌어 올리면 페이지로 열리고 네 단계를 오간다', async () => {
  const user = userEvent.setup();
  render(
    <PublicConfigProvider config={{ apiBaseUrl: 'http://localhost:8080' }}>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <RecordsSelectedSheet
            records={[recordPresentation(propertySummaryFixture as Parameters<typeof recordPresentation>[0])]}
            onClose={vi.fn()}
            onNotice={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>
    </PublicConfigProvider>,
  );
  await expectSheetStages(user, screen.getByRole('region', { name: '선택한 매물' }));
});
