import { afterEach, describe, expect, it } from 'vitest';

import {
  readActiveRecentEdit,
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

  it('10분 안에는 몇 번을 확인해도 계속 주고, 다시 고치면 새 기록을 준다', () => {
    rememberRecentEdit(7, 'info', 1_000);
    expect(readActiveRecentEdit('/', 2_000)).toEqual({ propertyId: 7, kind: 'info', at: 1_000 });
    expect(readActiveRecentEdit('/', 3_000)?.at).toBe(1_000);

    rememberRecentEdit(7, 'checklist', 4_000);
    expect(readActiveRecentEdit('/', 5_000)?.at).toBe(4_000);
  });

  it('10분이 지난 기록은 주지 않는다', () => {
    rememberRecentEdit(7, 'info', 1_000);
    expect(readActiveRecentEdit('/', 1_000 + RECENT_EDIT_WINDOW_MS + 1)).toBeNull();
  });

  it('지금 그 매물 상세나 체크리스트 화면이면 띄우지 않는다', () => {
    rememberRecentEdit(7, 'checklist', 1_000);

    expect(readActiveRecentEdit('/properties/7', 2_000)).toBeNull();
    expect(readActiveRecentEdit('/properties/7/checklists/3', 2_000)).toBeNull();
    expect(readActiveRecentEdit('/properties/70', 2_000)?.propertyId).toBe(7);
  });
});
