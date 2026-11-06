import type { ChecklistStage } from '@/features/checklist/model/checklistTypes';

import type { PropertyChecklistCategory, PropertyChecklistItem } from '../model/Property';

const ON_SITE_CATEGORIES = [
  { code: 'SECURITY', name: '보안', icon: 'lock', itemIds: [107] },
  { code: 'WINDOW_LIGHT', name: '창문·채광', icon: 'window', itemIds: [104, 106] },
  { code: 'WATER_BATHROOM', name: '수도·화장실', icon: 'droplet', itemIds: [101, 102] },
  { code: 'ROOM_CONDITION', name: '방 상태', icon: 'home', itemIds: [103, 108] },
  { code: 'BASIC_OPTIONS', name: '기본 옵션', icon: 'bed', itemIds: [105] },
] as const;

const getCategory = (item: PropertyChecklistItem): PropertyChecklistCategory =>
  item.category ??
  ON_SITE_CATEGORIES.find((category) => category.itemIds.some((id) => id === item.systemCheckItemId))?.code ??
  'OTHER';

export const groupPropertyChecklistItems = (items: readonly PropertyChecklistItem[], stage: ChecklistStage) => {
  const orderedItems = [...items].sort((a, b) => a.displayOrder - b.displayOrder);
  if (stage === 'PRE_CONTRACT') return [{ name: '계약 전 확인', icon: 'checklist' as const, items: orderedItems }];

  const categories = ON_SITE_CATEGORIES.map((category) => ({
    name: category.name,
    icon: category.icon,
    items: orderedItems.filter((item) => getCategory(item) === category.code),
  }));
  const otherItems = orderedItems.filter((item) => getCategory(item) === 'OTHER');
  return [...categories, { name: '기타', icon: 'checklist' as const, items: otherItems }].filter(
    (category) => category.items.length > 0,
  );
};
