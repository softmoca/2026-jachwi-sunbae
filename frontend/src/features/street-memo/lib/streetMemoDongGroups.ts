import type { MapMarker } from '@/features/map/model/Map';

import type { StreetMemo } from '../model/StreetMemo';

/**
 * 본 방 기록 지도에서 메모를 하나씩 보여 주는 가장 먼 확대 단계(작을수록 가까움). 휴대폰 화면 폭이 약 1km인 단계다.
 * 이보다 멀면 화면의 메모를 모두 행정동 묶음으로, 이 단계부터는 모두 낱개로 보여 준다.
 */
export const MEMO_INDIVIDUAL_MAX_LEVEL = 5;
export const STREET_MEMO_DONG_MARKER_PREFIX = 'street-memo-dong:';

/**
 * 지도가 멈춘 확대 단계로 묶음을 보여 줄지 정한다. 데스크탑 휠은 소수 단계로 멈추므로 정수 단계로 반올림해,
 * 한 단계 안에서는 묶음과 낱개가 섞이거나 오가지 않게 한다.
 */
export const showsDongMemoGroups = (level: number) => Math.round(level) > MEMO_INDIVIDUAL_MAX_LEVEL;

export type DongMemoGroup = {
  adminDongCode: string;
  latitude: number;
  longitude: number;
  positive: number;
  negative: number;
  memos: StreetMemo[];
};

/** 행정동 코드가 같은 메모를 묶는다. 묶음 자리는 그 동 메모의 평균 좌표다. 코드가 없는 메모는 묶지 않고 뺀다. */
export const groupMemosByDong = (memos: StreetMemo[]): DongMemoGroup[] => {
  const groups = new Map<string, StreetMemo[]>();
  for (const memo of memos) {
    if (!memo.adminDongCode) continue;
    groups.set(memo.adminDongCode, [...(groups.get(memo.adminDongCode) ?? []), memo]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([adminDongCode, group]) => {
      const positive = group.filter((memo) => memo.preference === 'LIKE').length;
      return {
        adminDongCode,
        latitude: group.reduce((sum, memo) => sum + memo.latitude, 0) / group.length,
        longitude: group.reduce((sum, memo) => sum + memo.longitude, 0) / group.length,
        positive,
        negative: group.length - positive,
        memos: group,
      };
    });
};

/** 동 묶음 말풍선. 좋아요, 싫어요 개수를 두 색으로 나눠 그리고, 누르면 그 동이 보이게 확대한다. */
export const dongGroupMarker = (group: DongMemoGroup): MapMarker => ({
  id: `${STREET_MEMO_DONG_MARKER_PREFIX}${group.adminDongCode}`,
  latitude: group.latitude,
  longitude: group.longitude,
  label: `거리 메모 ${group.memos.length}개, 좋아요 ${group.positive}개, 싫어요 ${group.negative}개`,
  tally: { positive: group.positive, negative: group.negative },
  tone: 'destination',
  category: 'MEMO',
  variant: group.positive >= group.negative ? 'positive' : 'negative',
  // 누르면 그 동이 보이게 확대해 메모를 하나씩 보여 준다.
  actionable: true,
});
