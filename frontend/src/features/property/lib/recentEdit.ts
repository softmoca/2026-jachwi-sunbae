import { propertyChecklistTabPath, propertyDetailPath } from '@/shared/lib/navigation/appPaths';

const STORAGE_KEY = 'jachwi-recent-property-edit';
/** 이 시간 안에 고친 기록만 "이어서 보기"로 보여 준다. */
export const RECENT_EDIT_WINDOW_MS = 10 * 60 * 1000;

export type RecentEditKind = 'checklist' | 'info';
export type RecentEdit = { propertyId: number; kind: RecentEditKind; at: number };

/** 가장 최근에 고친 매물 하나를 기기에 적어 둔다. 헤더가 읽어 그 화면으로 다시 가게 한다. */
export const rememberRecentEdit = (propertyId: number, kind: RecentEditKind, now = Date.now()) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ propertyId, kind, at: now } satisfies RecentEdit));
  } catch {
    // 저장소를 못 쓰는 브라우저에서는 이어서 보기 없이 동작한다.
  }
};

export const readRecentEdit = (now = Date.now()): RecentEdit | null => {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof value !== 'object' || value === null) return null;
    const { propertyId, kind, at } = value as Record<string, unknown>;
    if (typeof propertyId !== 'number' || typeof at !== 'number') return null;
    if (kind !== 'checklist' && kind !== 'info') return null;
    return now - at <= RECENT_EDIT_WINDOW_MS && now >= at ? { propertyId, kind, at } : null;
  } catch {
    return null;
  }
};

export const recentEditPath = ({ propertyId, kind }: RecentEdit) =>
  kind === 'checklist' ? propertyChecklistTabPath(propertyId) : propertyDetailPath(propertyId);
