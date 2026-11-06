import { renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import useStreetMemoLayer from '@/features/street-memo/hooks/useStreetMemoLayer';
import type { StreetMemo } from '@/features/street-memo/model/StreetMemo';

const memo = (
  id: number,
  latitude: number,
  longitude: number,
  adminDongCode: string | null = '11680640',
): StreetMemo => ({
  id,
  latitude,
  longitude,
  memo: `메모 ${id}`,
  preference: id === 2 ? 'DISLIKE' : 'LIKE',
  isMine: false,
  adminDongCode,
});
const memos = [memo(1, 37.5, 127), memo(2, 37.501, 127.001), memo(3, 37.6, 127.2, null)];

vi.mock('@/features/street-memo/api/useStreetMemos', () => ({
  useStreetMemos: () => ({ memos, isFailed: false }),
  useStreetMemoMutations: () => ({
    create: { reset: vi.fn(), isPending: false, isError: false },
    remove: { reset: vi.fn(), isPending: false, isError: false },
  }),
}));

it('노출 지표에는 동네가 보이는 화면 안의 메모만 넘기고, 멀리 축소하면 넘기지 않는다', () => {
  // 위도 폭 약 1.1km 화면: 화면 밖(3번)은 빼고 1, 2번만 센다.
  const near = { south: 37.495, north: 37.505, west: 126.995, east: 127.005 };
  const { result, rerender } = renderHook(({ bounds }) => useStreetMemoLayer(true, bounds, 4), {
    initialProps: { bounds: near },
  });
  expect(result.current.visibleMemos.map((item) => item.id)).toEqual([1, 2]);
  // 위도 폭 약 22km 화면: 메모가 개수 말풍선으로 뭉쳐 보이므로 세지 않는다.
  rerender({ bounds: { south: 37.4, north: 37.6, west: 126.8, east: 127.2 } });
  expect(result.current.visibleMemos).toEqual([]);
});

it('메모 겹을 끄면 노출 지표에 넘기지 않는다', () => {
  const { result } = renderHook(() =>
    useStreetMemoLayer(false, { south: 37.495, north: 37.505, west: 126.995, east: 127.005 }, 4),
  );
  expect(result.current.visibleMemos).toEqual([]);
});

const wide = { south: 37.4, north: 37.7, west: 126.8, east: 127.3 };

it('정한 단계보다 멀면 화면의 메모를 모두 행정동 묶음으로 두고, 코드 없는 메모는 숨긴다', () => {
  const { result } = renderHook(() => useStreetMemoLayer(true, wide, 7));
  expect(result.current.markers.map((marker) => marker.id)).toEqual(['street-memo-dong:11680640']);
  expect(result.current.markers[0]).toMatchObject({ tally: { positive: 1, negative: 1 }, actionable: true });
  expect(result.current.isDongGroup(result.current.markers[0])).toBe(true);
  // 묶음은 열지 않고 지도 화면이 그 동으로 확대한다.
  expect(result.current.selectMarker(result.current.markers[0])).toBe(false);
  expect(result.current.memosOf(result.current.markers[0]).map((item) => item.id)).toEqual([1, 2]);
});

it('그 단계부터는 겹친 메모와 코드 없는 메모까지 모두 낱개로 두고 묶음을 섞지 않는다', () => {
  const { result } = renderHook(() => useStreetMemoLayer(true, wide, 5));
  expect(result.current.markers.map((marker) => marker.id)).toEqual([
    'street-memo:3',
    'street-memo:2',
    'street-memo:1',
  ]);
  expect(result.current.markers.every((marker) => marker.tally === undefined)).toBe(true);
});
