import type { CheckItem, CheckItemCategory, ChecklistItem } from './checklistTypes';

type ChecklistEditorItemBase = {
  clientKey: string;
  checklistItemId: number | null;
  question: string;
  itemType: 'CORE' | 'OPTIONAL';
  active: boolean;
  category?: CheckItemCategory;
};

export type ChecklistEditorProvidedItem = ChecklistEditorItemBase & {
  origin: 'PROVIDED';
  sourceCheckItemId: number;
  guide: string | null;
};

export type ChecklistEditorCustomItem = ChecklistEditorItemBase & {
  origin: 'CUSTOM';
  sourceCheckItemId: null;
  guide: null;
};

export type ChecklistEditorItem = ChecklistEditorProvidedItem | ChecklistEditorCustomItem;

export const checklistItemToEditorItem = (item: ChecklistItem): ChecklistEditorItem =>
  item.origin === 'PROVIDED'
    ? {
        clientKey: `existing:${item.checklistItemId}`,
        origin: 'PROVIDED',
        checklistItemId: item.checklistItemId,
        sourceCheckItemId: item.sourceCheckItemId,
        question: item.question,
        category: item.category,
        guide: item.guide,
        itemType: item.itemType,
        active: item.active,
      }
    : {
        clientKey: `existing:${item.checklistItemId}`,
        origin: 'CUSTOM',
        checklistItemId: item.checklistItemId,
        sourceCheckItemId: null,
        question: item.question,
        category: item.category,
        guide: null,
        itemType: item.itemType,
        active: item.active,
      };

export const checkItemToEditorItem = (item: CheckItem): ChecklistEditorProvidedItem => ({
  clientKey: `provided:${item.checkItemId}`,
  origin: 'PROVIDED',
  checklistItemId: null,
  sourceCheckItemId: item.checkItemId,
  question: item.question,
  category: item.category,
  guide: item.guide,
  itemType: item.itemType,
  active: true,
});
