import { describe, expect, it } from 'vitest';

import {
  dongGroupMarker,
  groupMemosByDong,
  MEMO_INDIVIDUAL_MAX_LEVEL,
  showsDongMemoGroups,
} from '@/features/street-memo/lib/streetMemoDongGroups';
import type { StreetMemo } from '@/features/street-memo/model/StreetMemo';

const memo = (id: number, overrides: Partial<StreetMemo> = {}): StreetMemo => ({
  id,
  latitude: 37.5,
  longitude: 127.03,
  memo: `메모 ${id}`,
  preference: 'LIKE',
  isMine: false,
  adminDongCode: '11680640',
  ...overrides,
});

const memos = [
  memo(1, { latitude: 37.5, longitude: 127.03 }),
  memo(2, { latitude: 37.51, longitude: 127.05, preference: 'DISLIKE' }),
  memo(3, { latitude: 37.52, longitude: 127.04 }),
  memo(4, { adminDongCode: '11620695', latitude: 37.48, longitude: 126.93, preference: 'DISLIKE' }),
  memo(5, { adminDongCode: null }),
];

describe('groupMemosByDong', () => {
  it('행정동 코드가 같은 메모를 묶어 좋아요, 싫어요 수와 평균 좌표를 낸다', () => {
    const [second, first] = groupMemosByDong(memos);
    expect(first).toMatchObject({ adminDongCode: '11680640', positive: 2, negative: 1 });
    expect(first.latitude).toBeCloseTo(37.51, 6);
    expect(first.longitude).toBeCloseTo(127.04, 6);
    expect(first.memos.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(second).toMatchObject({ adminDongCode: '11620695', positive: 0, negative: 1 });
  });

  it('행정동 코드가 없는 메모는 묶음에 넣지 않는다', () => {
    const grouped = groupMemosByDong(memos).flatMap((group) => group.memos.map((item) => item.id));
    expect(grouped).not.toContain(5);
    expect(groupMemosByDong([memo(9, { adminDongCode: null }), memo(10, { adminDongCode: undefined })])).toEqual([]);
  });
});

describe('showsDongMemoGroups', () => {
  it.each([
    [MEMO_INDIVIDUAL_MAX_LEVEL + 1, true],
    [MEMO_INDIVIDUAL_MAX_LEVEL + 0.5, true],
    [MEMO_INDIVIDUAL_MAX_LEVEL + 0.49, false],
    [MEMO_INDIVIDUAL_MAX_LEVEL, false],
    [3, false],
  ])('확대 단계 %s에서 묶음 여부는 %s다(정수 단계로 반올림)', (level, expected) => {
    expect(showsDongMemoGroups(level)).toBe(expected);
  });
});

describe('dongGroupMarker', () => {
  it('동 묶음을 좋아요, 싫어요 개수 말풍선 마커로 만들고 많은 쪽 색을 따른다', () => {
    const [second, first] = groupMemosByDong(memos);
    expect(dongGroupMarker(first)).toMatchObject({
      id: 'street-memo-dong:11680640',
      tally: { positive: 2, negative: 1 },
      label: '거리 메모 3개, 좋아요 2개, 싫어요 1개',
      variant: 'positive',
      category: 'MEMO',
      actionable: true,
    });
    expect(dongGroupMarker(second)).toMatchObject({ variant: 'negative' });
  });
});
