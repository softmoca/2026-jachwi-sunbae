import type { ChecklistStage } from '@/features/checklist/model/checklistTypes';

import type { PropertyChecklistItem } from '../model/Property';

const ON_SITE_CATEGORIES = [
  { name: '보안', icon: 'lock', itemIds: [107] },
  { name: '창문·채광', icon: 'window', itemIds: [104, 106] },
  { name: '수도·화장실', icon: 'droplet', itemIds: [101, 102] },
  { name: '방 상태', icon: 'home', itemIds: [103, 108] },
  { name: '기본 옵션', icon: 'bed', itemIds: [105] },
] as const;

export const groupPropertyChecklistItems = (items: readonly PropertyChecklistItem[], stage: ChecklistStage) => {
  const orderedItems = [...items].sort((a, b) => a.displayOrder - b.displayOrder);
  if (stage === 'PRE_CONTRACT') return [{ name: '계약 전 확인', icon: 'checklist' as const, items: orderedItems }];

  const categories = ON_SITE_CATEGORIES.map((category) => ({
    name: category.name,
    icon: category.icon,
    items: orderedItems.filter((item) => category.itemIds.some((id) => id === item.systemCheckItemId)),
  }));
  const otherItems = orderedItems.filter(
    (item) => !ON_SITE_CATEGORIES.some((category) => category.itemIds.some((id) => id === item.systemCheckItemId)),
  );
  return [...categories, { name: '기타', icon: 'checklist' as const, items: otherItems }].filter(
    (category) => category.items.length > 0,
  );
};
