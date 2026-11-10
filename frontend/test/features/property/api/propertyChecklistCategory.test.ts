import { expect, it } from 'vitest';

import { parsePropertyChecklistDetail } from '@/features/property/api/propertyParsers';
import { groupPropertyChecklistItems } from '@/features/property/lib/propertyChecklistGroups';

const response = (category: unknown) => ({
  id: 51,
  propertyId: 10,
  sourceChecklistId: null,
  checklistName: '기본',
  stage: 'ON_SITE',
  items: [
    {
      id: 1,
      systemCheckItemId: 1001,
      question: '현관문 잠금장치 잘 작동하는지',
      displayOrder: 1,
      status: 'UNCONFIRMED',
      memo: '',
      category,
    },
  ],
});

it('API의 category를 보존해 신규 ID 항목도 보안 그룹으로 표시한다', () => {
  const detail = parsePropertyChecklistDetail(response('SECURITY'));
  expect(detail.items[0]?.category).toBe('SECURITY');
  expect(groupPropertyChecklistItems(detail.items, detail.stage)[0]?.name).toBe('보안');
});

it('이전 API의 카테고리 없는 응답도 읽는다', () => {
  expect(parsePropertyChecklistDetail(response(undefined)).items[0]?.category).toBeUndefined();
});

it('알 수 없는 카테고리는 API 경계에서 거절한다', () => {
  expect(() => parsePropertyChecklistDetail(response('UNKNOWN'))).toThrow('체크리스트 카테고리가 올바르지 않습니다.');
});
