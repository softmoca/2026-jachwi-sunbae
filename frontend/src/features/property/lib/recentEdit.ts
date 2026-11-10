import { propertyChecklistTabPath, propertyDetailPath } from '@/shared/lib/navigation/appPaths';

const STORAGE_KEY = 'jachwi-recent-property-edit';
/** 헤더에 이미 띄운 기록의 `at`. 같은 수정은 한 번만 띄운다. */
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

/** 지금 화면이 그 매물 상세(체크리스트 탭과 하위 화면 포함)이면 참이다. 이미 보고 있으니 다시 안내하지 않는다. */
export const isOnRecentEditScreen = ({ propertyId }: RecentEdit, pathname: string) => {
  const detail = propertyDetailPath(propertyId);
  return pathname === detail || pathname.startsWith(`${detail}/`);
};

/** 10분 안에 고쳤고 지금 그 화면이 아니면 그 기록을 준다. 클릭했더라도 10분 동안은 계속 준다. */
export const readActiveRecentEdit = (pathname: string, now = Date.now()): RecentEdit | null => {
  const edit = readRecentEdit(now);
  return edit === null || isOnRecentEditScreen(edit, pathname) ? null : edit;
};
