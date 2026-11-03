import type { QueryClient } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';

import type { BoundaryManifest, BoundaryRequestOptions } from './adminBoundaryApi';
import { fetchAdminBoundaries, fetchBoundaryManifest } from './adminBoundaryApi';

/**
 * 미리 받는 수도권 시도 코드(SGIS). 운영 파일(gzip)은 서울 177KB, 경기 1,089KB, 인천 267KB다.
 * 동네 찾기 목적지는 대부분 서울과 경기라 그 둘을 먼저 받고, 인천은 마지막에 받는다(사용 비율은 추정).
 */
export const METRO_REGION_CODES = ['11', '31', '23'] as const;

/**
 * 미리 받은 경계도 검색 전까지 남아 있어야 한다. 관찰자가 없는 쿼리는 받은 뒤 gcTime이 지나면 지워지는데,
 * 동네 찾기 진입부터 첫 검색까지는 중앙값 22초라 30분이면 대부분 검색 전에 지워지지 않는다.
 * 30분이 넘어 지워져도 파일은 1년 immutable이라 브라우저 캐시에서 다시 읽고 파싱만 다시 한다.
 */
const BOUNDARY_GC_TIME = 30 * 60 * 1000;

/** 검색(ensureQueryData)과 미리 받기(prefetchQuery)가 같은 키를 써야 받은 파일을 다시 요청하지 않는다. */
export const getAdminBoundaryQueryOptions = (
  file: BoundaryManifest,
  baseUrl: string | undefined,
  request?: BoundaryRequestOptions,
) =>
  queryOptions({
    queryKey: ['admin-boundaries', file.file, baseUrl],
    queryFn: ({ signal }) => fetchAdminBoundaries(file, baseUrl, signal, request),
    staleTime: Infinity,
    gcTime: BOUNDARY_GC_TIME,
    retry: false,
  });

type PrefetchOptions = {
  /** 검색이 시작됐거나 화면을 떠나면 true를 돌려 남은 파일을 받지 않게 한다. */
  shouldStop: () => boolean;
  /** 지도 타일과 사용자 입력을 방해하지 않도록 파일 사이와 파싱 전에 기다린다. */
  waitForIdle: () => Promise<void>;
};

/**
 * manifest를 받고 수도권 시도 파일을 하나씩 낮은 우선순위로 받아 파싱한 결과를 쿼리 캐시에 넣는다.
 * 동시에 받지 않는 이유는 지도 타일과 대역폭을 다투지 않기 위해서다. 실패해도 검색이 같은 키로 다시 받으므로 무시한다.
 * 전국 파일 하나만 있는 manifest는 너무 커서 미리 받지 않는다.
 */
export const prefetchMetroBoundaries = async (
  client: QueryClient,
  baseUrl: string | undefined,
  { shouldStop, waitForIdle }: PrefetchOptions,
) => {
  let manifest: BoundaryManifest;
  try {
    manifest = await fetchBoundaryManifest(baseUrl, undefined, { priority: 'low' });
  } catch {
    return;
  }
  const files = manifest.files;
  if (!files) return;
  for (const region of METRO_REGION_CODES) {
    const file = files[region];
    if (file === undefined) continue;
    await waitForIdle();
    if (shouldStop()) return;
    await client.prefetchQuery(
      getAdminBoundaryQueryOptions({ version: manifest.version, file }, baseUrl, {
        priority: 'low',
        beforeParse: waitForIdle,
      }),
    );
  }
};
