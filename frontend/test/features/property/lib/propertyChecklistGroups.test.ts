import { expect, it } from 'vitest';

import { groupPropertyChecklistItems } from '@/features/property/lib/propertyChecklistGroups';
import type { PropertyChecklistItem } from '@/features/property/model/Property';

const item = (systemCheckItemId: number | null, displayOrder: number): PropertyChecklistItem => ({
  itemId: displayOrder,
  systemCheckItemId,
  displayOrder,
  question: '질문',
  status: 'UNCONFIRMED',
  memo: '',
});

it('제공 항목을 카테고리 순서로 묶고 각 카테고리 안에서는 표시 순서를 유지한다', () => {
  const items = [item(102, 5), item(107, 3), item(101, 1), item(105, 8), item(106, 6), item(103, 2)];
  const groups = groupPropertyChecklistItems(items, 'ON_SITE');
  expect(groups.map((group) => group.name)).toEqual(['보안', '창문·채광', '수도·화장실', '방 상태', '기본 옵션']);
  expect(groups.find((group) => group.name === '수도·화장실')?.items.map((value) => value.systemCheckItemId)).toEqual([
    101, 102,
  ]);
  expect(groups.flatMap((group) => group.items)).toHaveLength(items.length);
});

it('사용자 추가 항목과 알 수 없는 제공 항목을 기타로 묶어 누락하지 않는다', () => {
  const items = [item(null, 1), item(999, 2)];
  expect(groupPropertyChecklistItems(items, 'ON_SITE')).toEqual([{ name: '기타', icon: 'checklist', items }]);
});

it('계약 전 항목은 현장 카테고리로 분류하지 않는다', () => {
  const items = [item(201, 1)];
  expect(groupPropertyChecklistItems(items, 'PRE_CONTRACT')).toEqual([
    { name: '계약 전 확인', icon: 'checklist', items },
  ]);
});

it('새 제공 항목은 ID와 관계없이 서버 카테고리를 기준으로 분류한다', () => {
  const items: PropertyChecklistItem[] = [
    { ...item(1001, 1), category: 'SECURITY' },
    { ...item(101, 2), category: 'WINDOW_LIGHT' },
    { ...item(107, 3), category: 'OTHER' },
  ];
  const groups = groupPropertyChecklistItems(items, 'ON_SITE');
  expect(groups.map((group) => group.name)).toEqual(['보안', '창문·채광', '기타']);
  expect(groups.map((group) => group.items[0]?.itemId)).toEqual([1, 2, 3]);
});
