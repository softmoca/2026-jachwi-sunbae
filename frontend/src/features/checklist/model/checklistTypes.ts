export const CHECK_ITEM_CATEGORIES = [
  'SECURITY',
  'WINDOW_LIGHT',
  'WATER_BATHROOM',
  'ROOM_CONDITION',
  'BASIC_OPTIONS',
  'OTHER',
] as const;
export type CheckItemCategory = (typeof CHECK_ITEM_CATEGORIES)[number];

export const CHECKLIST_STAGES = ['ON_SITE', 'PRE_CONTRACT'] as const;

export type ChecklistStage = (typeof CHECKLIST_STAGES)[number];

export const PRESET_TYPES = ['ONE_ROOM', 'GOSHIWON'] as const;

export type ChecklistPresetType = (typeof PRESET_TYPES)[number];

export type CheckItem = {
  checkItemId: number;
  stage: ChecklistStage;
  itemType: 'CORE' | 'OPTIONAL';
  category?: CheckItemCategory;
  question: string;
  guide: string | null;
};

type ChecklistItemBase = {
  checklistItemId: number;
  itemType: 'CORE' | 'OPTIONAL';
  category?: CheckItemCategory;
  question: string;
  guide: string | null;
  order: number;
  active: boolean;
};

export type ProvidedChecklistItem = ChecklistItemBase & {
  origin: 'PROVIDED';
  sourceCheckItemId: number;
  /** @deprecated sourceCheckItemId의 v1.0 별칭이며 null일 수도 있다. */
  checkItemId: number | null;
};

export type CustomChecklistItem = ChecklistItemBase & {
  origin: 'CUSTOM';
  sourceCheckItemId: null;
  /** @deprecated CUSTOM에는 전역 제공 항목 ID가 없다. */
  checkItemId: null;
  guide: null;
};

export type ChecklistItem = ProvidedChecklistItem | CustomChecklistItem;

export type CheckItemPage = {
  content: CheckItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

export type ChecklistPresetItem = CheckItem & { order: number };

export type ChecklistPreset = {
  presetType: ChecklistPresetType;
  stage: ChecklistStage;
  items: ChecklistPresetItem[];
};

export type ChecklistSummary = {
  checklistId: number;
  name: string;
  stage: ChecklistStage;
  itemCount: number;
  assignedPropertyCount: number;
  updatedAt: string;
};

export type ChecklistPage = {
  content: ChecklistSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

export type ChecklistDetail = {
  checklistId: number;
  name: string;
  stage: ChecklistStage;
  items: ChecklistItem[];
  itemCount: number;
  assignedPropertyCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreatedChecklist = ChecklistDetail;

/** @deprecated PROVIDED 전용 v1.0 편집 화면의 무손실 호환 모델이다. */
export type LegacyChecklistDetail = Omit<ChecklistDetail, 'items'> & { items: CheckItem[] };

export type ActiveChecklist = {
  propertyChecklistId: number;
  propertyId: number;
  stage: ChecklistStage;
  checklistId: number | null;
  name: string;
  itemCount: number;
};
