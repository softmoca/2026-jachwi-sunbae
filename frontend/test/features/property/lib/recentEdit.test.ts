import { afterEach, describe, expect, it } from 'vitest';

import {
  readRecentEdit,
  RECENT_EDIT_WINDOW_MS,
  recentEditPath,
  rememberRecentEdit,
} from '@/features/property/lib/recentEdit';

describe('최근 고친 매물 기록', () => {
  afterEach(() => window.localStorage.clear());

  it('10분 안에 고친 매물만 읽는다', () => {
    rememberRecentEdit(7, 'checklist', 1_000);

    expect(readRecentEdit(1_000 + RECENT_EDIT_WINDOW_MS)).toEqual({ propertyId: 7, kind: 'checklist', at: 1_000 });
    expect(readRecentEdit(1_000 + RECENT_EDIT_WINDOW_MS + 1)).toBeNull();
  });

  it('가장 나중에 고친 매물 하나만 남긴다', () => {
    rememberRecentEdit(1, 'info', 1_000);
    rememberRecentEdit(2, 'checklist', 2_000);

    expect(readRecentEdit(2_500)?.propertyId).toBe(2);
  });

  it('깨진 저장값이나 미래 시각은 없는 것으로 본다', () => {
    window.localStorage.setItem('jachwi-recent-property-edit', '{"propertyId":"x"}');
    expect(readRecentEdit(1_000)).toBeNull();

    window.localStorage.setItem('jachwi-recent-property-edit', 'not json');
    expect(readRecentEdit(1_000)).toBeNull();

    rememberRecentEdit(3, 'info', 5_000);
    expect(readRecentEdit(1_000)).toBeNull();
  });

  it('체크리스트는 체크리스트 탭으로, 정보와 메모는 상세로 돌아간다', () => {
    expect(recentEditPath({ propertyId: 7, kind: 'checklist', at: 0 })).toBe('/properties/7?tab=checklist');
    expect(recentEditPath({ propertyId: 7, kind: 'info', at: 0 })).toBe('/properties/7');
  });
});
