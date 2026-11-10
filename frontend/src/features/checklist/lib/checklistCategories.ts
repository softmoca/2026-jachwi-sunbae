import type { CheckItemCategory } from '../model/checklistTypes';

export const checklistCategories = [
  { code: 'SECURITY', name: '보안', icon: 'lock' },
  { code: 'WINDOW_LIGHT', name: '창문·채광', icon: 'window' },
  { code: 'WATER_BATHROOM', name: '수도·화장실', icon: 'droplet' },
  { code: 'ROOM_CONDITION', name: '방 상태', icon: 'home' },
  { code: 'BASIC_OPTIONS', name: '기본 옵션', icon: 'bed' },
  { code: 'OTHER', name: '기타', icon: 'checklist' },
] as const;

export const groupChecklistItems = <T extends { category?: CheckItemCategory }>(items: readonly T[]) =>
  checklistCategories
    .map((category) => ({ ...category, items: items.filter((item) => (item.category ?? 'OTHER') === category.code) }))
    .filter((category) => category.items.length > 0);
