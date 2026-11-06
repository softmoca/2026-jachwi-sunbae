import {
  readArray,
  readBoolean,
  readInteger,
  readNullableInteger,
  readRecord,
  readString,
} from '@/shared/api/responseParsers';

import { isChecklistStage } from '../model/checklist';
import type {
  ActiveChecklist,
  CheckItem,
  CheckItemPage,
  ChecklistDetail,
  ChecklistItem,
  ChecklistPage,
  ChecklistPreset,
  ChecklistStage,
  ChecklistSummary,
  CreatedChecklist,
} from '../model/checklistTypes';
import { CHECK_ITEM_CATEGORIES, type CheckItemCategory } from '../model/checklistTypes';

const unknownDate = '1970-01-01T00:00:00Z';

const parseStage = (value: unknown): ChecklistStage => {
  if (!isChecklistStage(value)) throw new Error('체크리스트 단계 응답이 올바르지 않습니다.');
  return value;
};

const parseItemType = (value: unknown): CheckItem['itemType'] => {
  if (value !== 'CORE' && value !== 'OPTIONAL') throw new Error('체크 항목 유형 응답이 올바르지 않습니다.');
  return value;
};

const parseCategory = (value: unknown): CheckItemCategory =>
  CHECK_ITEM_CATEGORIES.find((category) => category === value) ?? 'OTHER';

const parseCheckItem = (value: unknown): CheckItem => {
  const item = readRecord(value);
  return {
    checkItemId: readInteger(item, 'id', 1),
    stage: parseStage(item.stage),
    itemType: parseItemType(item.itemType),
    category: parseCategory(item.category),
    question: readString(item, 'question', { maximumCodePoints: 200 }),
    guide: null,
  };
};

export const parseCheckItemPage = (value: unknown, stage: ChecklistStage): CheckItemPage => {
  if (!Array.isArray(value)) throw new Error('체크 항목 응답이 올바르지 않습니다.');
  const items = value.map(parseCheckItem);
  const totalElements = items.length;
  if (items.some((item) => item.stage !== stage)) throw new Error('체크 항목 단계가 올바르지 않습니다.');
  return {
    content: items,
    page: 0,
    size: Math.max(1, items.length),
    totalElements,
    totalPages: totalElements === 0 ? 0 : 1,
    hasNext: false,
  };
};

/** 원룸 프리셋은 최종 API에 없으며, 활성 CORE만 화면 시작 구성으로 변환한다. */
export const toChecklistPreset = (stage: ChecklistStage, items: CheckItem[]): ChecklistPreset => {
  const coreItems = items.filter((item) => item.itemType === 'CORE');
  return {
    presetType: 'ONE_ROOM',
    stage,
    items: coreItems.map((item, order) => ({ ...item, order })),
  };
};

const parseChecklistSummary = (value: unknown): ChecklistSummary => {
  const result = readRecord(value);
  return {
    checklistId: readInteger(result, 'id', 1),
    name: readString(result, 'name'),
    stage: parseStage(result.stage),
    itemCount: readInteger(result, 'itemCount'),
    assignedPropertyCount: 0,
    updatedAt: unknownDate,
  };
};

export const parseChecklistPage = (value: unknown): ChecklistPage => {
  const result = readRecord(value);
  const content = readArray(result, 'items').map(parseChecklistSummary);
  const totalElements = readInteger(result, 'totalCount');
  if (content.length !== totalElements) throw new Error('체크리스트 집계 응답이 올바르지 않습니다.');
  return {
    content,
    page: 0,
    size: Math.max(1, content.length),
    totalElements,
    totalPages: totalElements === 0 ? 0 : 1,
    hasNext: false,
  };
};

const parseChecklistItem = (value: unknown): ChecklistItem => {
  const item = readRecord(value);
  const checklistItemId = readInteger(item, 'id', 1);
  // 사용자 체크리스트 조회 응답에는 origin이 없다. 현재 API는 시스템 제공 항목만
  // 저장하므로 systemCheckItemId를 기준으로 화면 내부의 PROVIDED 모델을 복원한다.
  const systemCheckItemId = readInteger(item, 'systemCheckItemId', 1);
  const common = {
    checklistItemId,
    itemType: parseItemType(item.itemType),
    category: parseCategory(item.category),
    question: readString(item, 'question', { maximumCodePoints: 200 }),
    guide: null,
    order: readInteger(item, 'displayOrder', 1),
    active: 'active' in item ? readBoolean(item, 'active') : true,
  };
  return {
    ...common,
    origin: 'PROVIDED',
    sourceCheckItemId: systemCheckItemId,
    checkItemId: systemCheckItemId,
  };
};

export const parseChecklistDetail = (value: unknown): ChecklistDetail => {
  const result = readRecord(value);
  const items = readArray(result, 'items')
    .map(parseChecklistItem)
    .sort((a, b) => a.order - b.order);
  const itemCount = readInteger(result, 'itemCount');
  if (items.length !== itemCount) throw new Error('체크리스트 항목 수 응답이 올바르지 않습니다.');
  return {
    checklistId: readInteger(result, 'id', 1),
    name: readString(result, 'name'),
    stage: parseStage(result.stage),
    items,
    itemCount,
    assignedPropertyCount: 0,
    createdAt: unknownDate,
    updatedAt: unknownDate,
  };
};

export const parseCreatedChecklist = (value: unknown): CreatedChecklist => parseChecklistDetail(value);

export const parseActiveChecklist = (value: unknown): ActiveChecklist => {
  const result = readRecord(value);
  const items = readArray(result, 'items');
  return {
    propertyChecklistId: readInteger(result, 'id', 1),
    propertyId: readInteger(result, 'propertyId', 1),
    stage: parseStage(result.stage),
    checklistId: readNullableInteger(result, 'sourceChecklistId', 1),
    name: readString(result, 'checklistName'),
    itemCount: items.length,
  };
};

export const parseNoChecklistContent = (value: unknown): undefined => {
  if (value !== undefined) throw new Error('본문 없는 응답이 필요합니다.');
  return undefined;
};
