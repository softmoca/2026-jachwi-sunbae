import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { expect, it } from 'vitest';

import usePropertyMarkerPhotos from '@/features/property/hooks/usePropertyMarkerPhotos';
import { EXAMPLE_PROPERTY_ID } from '@/features/property/model/exampleProperty';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';

import { server } from '../../../server';

const config = { apiBaseUrl: 'http://localhost:8080', mapProviderMode: 'demo' } as const;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <PublicConfigProvider config={config}>{children}</PublicConfigProvider>
  </QueryClientProvider>
);

it('예시 매물은 사진을 서버에서 받지 않고 대표 사진 주소를 그대로 마커에 쓴다', async () => {
  let requests = 0;
  server.use(
    http.get('*/sample.webp', () => {
      requests += 1;
      return new HttpResponse(null, { status: 404 });
    }),
  );
  const records = [
    {
      id: String(EXAMPLE_PROPERTY_ID),
      latitude: 37.51,
      longitude: 127.06,
      representativePhoto: { photoId: 1, contentUrl: '/assets/sample.webp' },
    },
  ];
  const { result } = renderHook(() => usePropertyMarkerPhotos(records), { wrapper });

  await waitFor(() => expect(result.current.get(String(EXAMPLE_PROPERTY_ID))).toBe('/assets/sample.webp'));
  expect(requests).toBe(0);
});
