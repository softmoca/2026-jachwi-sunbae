import { ApiError } from '@/features/auth/api/apiClient';
import { getAuthenticationSnapshot } from '@/features/auth/model/authStore';
import type { ChecklistDetail } from '@/features/checklist/model/checklistTypes';
import samplePhoto from '@/shared/assets/sample-property-coex.webp';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import type { PropertyInputDto } from '../api/dtos/PropertyDto';
import type {
  PropertyChecklistDetail,
  PropertyChecklistItemStatus,
  PropertyChecklistOverview,
  PropertyDetail,
  PropertyPage,
  PropertyPhoto,
  PropertySummary,
} from './Property';

/** 서버에 보내지 않는 브라우저 전용 ID. 일반 매물과 같은 화면에서 다룬다. */
export const EXAMPLE_PROPERTY_ID = Number.MAX_SAFE_INTEGER;
export const isExampleProperty = (propertyId: number) => propertyId === EXAMPLE_PROPERTY_ID;
const examples = new Map<string, Example>();
const dismissed = new Set<string>();
type Example = {
  nextPhotoId: number;
  detail: PropertyDetail;
  memo: string;
  photos: PropertyPhoto[];
  checklist: PropertyChecklistDetail;
};
const questions = [
  ['SECURITY', '현관문 잠금장치 잘 작동하는지'],
  ['SECURITY', '공동 현관 출입 통제되는지'],
  ['WINDOW_LIGHT', '햇빛 잘 들어오는지'],
  ['WINDOW_LIGHT', '창문·방충망 상태 괜찮은지'],
  ['WATER_BATHROOM', '싱크대·샤워기 물 잘 나오는지'],
  ['WATER_BATHROOM', '온수 잘 나오는지'],
  ['WATER_BATHROOM', '배수구·변기 물 잘 내려가는지'],
  ['ROOM_CONDITION', '벽지·창틀에 곰팡이 있는지'],
  ['ROOM_CONDITION', '천장·벽에 물 얼룩 있는지'],
  ['ROOM_CONDITION', '외부 소음 심하지 않은지'],
  ['BASIC_OPTIONS', '에어컨·냉장고 작동하는지'],
  ['BASIC_OPTIONS', '옵션·수납공간 충분한지'],
] as const;
const statuses: readonly PropertyChecklistItemStatus[] = ['GOOD', 'CAUTION', 'UNCONFIRMED'];
const scope = (config: PublicConfig) => {
  const memberId = getAuthenticationSnapshot().session?.memberId;
  return memberId == null
    ? null
    : `jachwi-sunbae:example-property:${encodeURIComponent(config.apiBaseUrl)}:${memberId}`;
};
const isDismissed = (key: string) => {
  if (dismissed.has(key)) return true;
  try {
    return window.localStorage.getItem(key) === 'dismissed';
  } catch {
    return false;
  }
};
export const dismissExampleProperty = (config: PublicConfig) => {
  const key = scope(config);
  if (key === null) return;
  dismissed.add(key);
  for (const photo of examples.get(key)?.photos ?? []) {
    if (photo.contentUrl.startsWith('blob:')) URL.revokeObjectURL(photo.contentUrl);
  }
  examples.delete(key);
  try {
    window.localStorage.setItem(key, 'dismissed');
  } catch {
    /* 저장소가 막혀 있어도 현재 세션에서는 숨긴다. */
  }
};
const createExample = (): Example => {
  const now = new Date().toISOString();
  return {
    nextPhotoId: 2,
    detail: {
      propertyId: EXAMPLE_PROPERTY_ID,
      name: '(예시) 코엑스 근처',
      depositAmount: 30_000_000,
      monthlyRentAmount: 550_000,
      location: { address: '서울 강남구 영동대로 513', latitude: 37.51252, longitude: 127.0595 },
      discoverySource: { type: 'TEXT', value: '예시 매물' },
      availableMoveInDate: null,
      maintenanceFeeAmount: 150_000,
      visitScheduledAt: null,
      roomOptions: ['REFRIGERATOR', 'MICROWAVE', 'DESK'],
      utilityOptions: ['WATER', 'ELECTRICITY'],
      photoPreview: { totalCount: 1, photos: [{ photoId: 1, contentUrl: samplePhoto, createdAt: now }] },
      createdAt: now,
      updatedAt: now,
    },
    memo: '직접 수정하고 체크해 볼 수 있는 예시 매물이에요. 내 매물을 처음 등록하면 사라져요.',
    photos: [
      {
        photoId: 1,
        contentUrl: samplePhoto,
        contentType: 'image/webp',
        sizeBytes: 70324,
        createdAt: now,
        representative: true,
      },
    ],
    checklist: {
      propertyId: EXAMPLE_PROPERTY_ID,
      propertyChecklistId: EXAMPLE_PROPERTY_ID,
      sourceChecklistId: null,
      checklistName: '예시 체크리스트',
      stage: 'ON_SITE',
      items: questions.map(([category, question], index) => ({
        itemId: index + 1,
        systemCheckItemId: null,
        category,
        question,
        displayOrder: index + 1,
        status: statuses[index < 3 ? index : Math.floor(Math.random() * statuses.length)] ?? 'UNCONFIRMED',
        memo: index === 1 ? '방문할 때 한 번 더 확인해 보세요. (예시)' : '',
      })),
    },
  };
};
const missing = () => new ApiError({ kind: 'server', status: 404, code: 'PROPERTY_NOT_FOUND' });
export const getExampleProperty = (config: PublicConfig): Example => {
  const key = scope(config);
  if (key === null || isDismissed(key)) throw missing();
  let value = examples.get(key);
  if (value === undefined) {
    value = createExample();
    examples.set(key, value);
  }
  return value;
};
export const exampleDetail = (config: PublicConfig): PropertyDetail => {
  const example = getExampleProperty(config);
  return {
    ...example.detail,
    photoPreview: {
      totalCount: example.photos.length,
      photos: [...example.photos].sort((a, b) => Number(Boolean(b.representative)) - Number(Boolean(a.representative))),
    },
  };
};
export const exampleOverview = (config: PublicConfig): PropertyChecklistOverview => {
  const { checklist } = getExampleProperty(config);
  const goodCount = checklist.items.filter((item) => item.status === 'GOOD').length;
  const cautionCount = checklist.items.filter((item) => item.status === 'CAUTION').length;
  const totalCount = checklist.items.length;
  const completedCount = goodCount + cautionCount;
  const progress = {
    totalCount,
    completedCount,
    goodCount,
    cautionCount,
    unconfirmedCount: totalCount - completedCount,
    progressRate: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
  };
  return {
    propertyId: EXAMPLE_PROPERTY_ID,
    overallProgress: progress,
    stages: [
      {
        stage: 'ON_SITE',
        applied: true,
        propertyChecklistId: EXAMPLE_PROPERTY_ID,
        sourceChecklistId: checklist.sourceChecklistId,
        checklistName: checklist.checklistName,
        progress,
      },
    ],
  };
};
export const withExampleProperty = (config: PublicConfig, page: PropertyPage): PropertyPage => {
  if (page.totalElements > 0) {
    dismissExampleProperty(config);
    return page;
  }
  const key = scope(config);
  if (key === null || isDismissed(key)) return page;
  const value = getExampleProperty(config);
  const detail = exampleDetail(config);
  const overview = exampleOverview(config);
  const summary: PropertySummary = {
    ...detail,
    representativePhoto: value.photos.find((photo) => photo.representative) ?? null,
    photoCount: value.photos.length,
    progress: overview.overallProgress,
    stages: overview.stages,
  };
  return { ...page, content: [summary], totalElements: 1, totalPages: 1, size: 1 };
};
export const updateExampleProperty = (config: PublicConfig, request: PropertyInputDto) => {
  const example = getExampleProperty(config);
  example.detail = {
    ...example.detail,
    ...request,
    discoverySource: { type: 'TEXT', value: request.discoverySource ?? '' },
    location: { address: request.address, latitude: request.latitude, longitude: request.longitude },
    updatedAt: new Date().toISOString(),
  };
  return exampleDetail(config);
};
export const updateExampleCheck = (
  config: PublicConfig,
  itemId: number,
  update: { status?: PropertyChecklistItemStatus; memo?: string },
) => {
  const example = getExampleProperty(config);
  const item = example.checklist.items.find((item) => item.itemId === itemId);
  if (item === undefined) throw missing();
  Object.assign(item, update);
  return item;
};
export const replaceExampleChecklist = (config: PublicConfig, checklist?: ChecklistDetail) => {
  const example = getExampleProperty(config);
  example.checklist =
    checklist === undefined
      ? createExample().checklist
      : {
          propertyId: EXAMPLE_PROPERTY_ID,
          propertyChecklistId: EXAMPLE_PROPERTY_ID,
          sourceChecklistId: checklist.checklistId,
          checklistName: checklist.name,
          stage: checklist.stage,
          items: checklist.items.map((item, index) => ({
            itemId: index + 1,
            systemCheckItemId: item.origin === 'PROVIDED' ? item.sourceCheckItemId : null,
            category: item.category,
            question: item.question,
            displayOrder: index + 1,
            status: 'UNCONFIRMED',
            memo: '',
          })),
        };
  return {
    propertyId: EXAMPLE_PROPERTY_ID,
    propertyChecklistId: EXAMPLE_PROPERTY_ID,
    checklistId: example.checklist.sourceChecklistId,
    name: example.checklist.checklistName,
    stage: example.checklist.stage,
    itemCount: example.checklist.items.length,
  };
};
export const addExamplePhoto = (config: PublicConfig, file: File): PropertyPhoto => {
  if (file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'image/webp')
    throw new ApiError({ kind: 'server', status: 400, code: 'PHOTO_FORMAT_UNSUPPORTED' });
  const example = getExampleProperty(config);
  if (file.size > 5 * 1024 * 1024) throw new ApiError({ kind: 'server', status: 400, code: 'PHOTO_SIZE_EXCEEDED' });
  if (example.photos.length >= 30) throw new ApiError({ kind: 'server', status: 400, code: 'PHOTO_COUNT_EXCEEDED' });
  const photo: PropertyPhoto = {
    photoId: example.nextPhotoId++,
    contentUrl: URL.createObjectURL(file),
    contentType: file.type,
    sizeBytes: file.size,
    createdAt: new Date().toISOString(),
    representative: example.photos.length === 0,
  };
  example.photos.push(photo);
  return photo;
};
export const removeExamplePhoto = (config: PublicConfig, photoId: number) => {
  const example = getExampleProperty(config);
  const removed = example.photos.find((photo) => photo.photoId === photoId);
  if (removed?.contentUrl.startsWith('blob:')) URL.revokeObjectURL(removed.contentUrl);
  example.photos = example.photos.filter((photo) => photo.photoId !== photoId);
  if (example.photos.length > 0 && !example.photos.some((photo) => photo.representative))
    example.photos[0].representative = true;
};
