import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { setAuthentication } from '@/features/auth/model/authStore';
import { readPropertyCount } from '@/features/property/api/propertyCount';
import { propertyQueryKeys } from '@/features/property/api/propertyQueryKeys';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import { server } from '../../../server';

const config: PublicConfig = { apiBaseUrl: 'http://localhost:8080' };
const PROPERTIES_URL = `${config.apiBaseUrl}/api/properties`;

describe('분석용 매물 수', () => {
  it('목록 캐시가 있으면 요청 없이 그 전체 개수를 쓴다', async () => {
    const client = new QueryClient();
    client.setQueryData(propertyQueryKeys.list(''), {
      pages: [{ content: [], page: 0, size: 1, totalElements: 4, totalPages: 1, hasNext: false }],
      pageParams: [0],
    });
    let requested = false;
    server.use(
      http.get(PROPERTIES_URL, () => {
        requested = true;
        return HttpResponse.json({ code: 'SUCCESS', message: '성공', data: { items: [], totalCount: 0 } });
      }),
    );

    await expect(readPropertyCount(config, client)).resolves.toBe(4);
    expect(requested).toBe(false);
  });

  it('캐시가 없으면 목록을 받아 센다', async () => {
    setAuthentication({ accessToken: 'token', tokenType: 'Bearer', expiresIn: 900, memberId: 1 });
    server.use(
      http.get(PROPERTIES_URL, () =>
        HttpResponse.json({ code: 'SUCCESS', message: '성공', data: { items: [], totalCount: 0 } }),
      ),
    );

    await expect(readPropertyCount(config, new QueryClient())).resolves.toBe(0);
  });

  it('목록을 받지 못하면 0으로 추정하지 않고 모른다고 돌려준다', async () => {
    setAuthentication({ accessToken: 'token', tokenType: 'Bearer', expiresIn: 900, memberId: 1 });
    server.use(
      http.get(PROPERTIES_URL, () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: '실패', errors: [] }, { status: 500 }),
      ),
    );

    await expect(readPropertyCount(config, new QueryClient())).resolves.toBeUndefined();
  });
});
