import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  errorEnvelope,
  propertyDetailResponseFixture,
  propertyPageFixture,
  successEnvelope,
} from '@/app/mocks/fixtures/propertyFixtures';
import { propertyDetailFixture } from '@/app/mocks/fixtures/propertyFixtures';
import { setAuthentication } from '@/features/auth/model/authStore';
import { assignActiveChecklist } from '@/features/checklist/api/checklistApi';
import type { PropertyInputDto } from '@/features/property/api/dtos/PropertyDto';
import {
  fetchPropertyPhotos,
  removePropertyPhoto,
  setRepresentativePropertyPhoto,
  uploadPropertyPhoto,
} from '@/features/property/api/photoApi';
import {
  createProperty,
  fetchProperties,
  fetchPropertyChecklistDetail,
  fetchPropertyChecklistOverview,
  fetchPropertyDetail,
  fetchPropertyMemo,
  removeProperty,
  savePropertyMemoDocument,
  updateProperty,
  updatePropertyChecklistItemMemo,
  updatePropertyChecklistItemStatus,
} from '@/features/property/api/propertyApi';
import { EXAMPLE_PROPERTY_ID } from '@/features/property/model/exampleProperty';

import { server } from '../../../server';

const config = { apiBaseUrl: 'http://localhost:8080' };
let memberId = 9000;
const authenticate = (id: number) =>
  setAuthentication({ memberId: id, accessToken: 'example-test', tokenType: 'Bearer', expiresIn: 900 });
const list = () => fetchProperties(config, { query: '', page: 0 });
const input: PropertyInputDto = {
  name: '내 첫 방',
  depositAmount: 0,
  monthlyRentAmount: 0,
  maintenanceFeeAmount: null,
  address: null,
  latitude: null,
  longitude: null,
  discoverySource: null,
  availableMoveInDate: null,
  visitScheduledAt: null,
  roomOptions: [],
  utilityOptions: [],
};

beforeEach(() => {
  authenticate(++memberId);
  server.use(http.get('*/api/properties', () => HttpResponse.json(successEnvelope({ items: [], totalCount: 0 }))));
  // 예시 ID가 포함된 요청은 조회·수정·삭제 모두 실패시켜 서버 접근 회귀를 검출한다.
  server.use(http.all(`*/api/properties/${EXAMPLE_PROPERTY_ID}{/*rest}`, () => HttpResponse.error()));
});

describe('브라우저 전용 예시 매물', () => {
  it('빈 목록에 요청한 조건과 사진·무작위 평가를 가진 예시 하나를 보여준다', async () => {
    expect((await list()).content).toMatchObject([
      {
        propertyId: EXAMPLE_PROPERTY_ID,
        name: '(예시) 코엑스 근처',
        depositAmount: 30_000_000,
        monthlyRentAmount: 550_000,
        photoCount: 1,
      },
    ]);
    expect(await fetchPropertyDetail(config, EXAMPLE_PROPERTY_ID)).toMatchObject({
      maintenanceFeeAmount: 150_000,
      utilityOptions: ['WATER', 'ELECTRICITY'],
      roomOptions: ['REFRIGERATOR', 'MICROWAVE', 'DESK'],
    });
    const checklist = await fetchPropertyChecklistDetail(config, EXAMPLE_PROPERTY_ID, EXAMPLE_PROPERTY_ID);
    expect(checklist.items).toHaveLength(12);
    expect(new Set(checklist.items.map((item) => item.status)).size).toBe(3);
    expect((await fetchPropertyPhotos(config, EXAMPLE_PROPERTY_ID)).photos[0]?.contentUrl).toContain(
      'sample-property-coex.webp',
    );
  });

  it('정보·메모·평가를 서버 호출 없이 바꾸고 목록 진행률에도 반영한다', async () => {
    await list();
    await updateProperty(config, EXAMPLE_PROPERTY_ID, { ...input, name: '수정한 예시' });
    await savePropertyMemoDocument(config, EXAMPLE_PROPERTY_ID, { freeMemo: '메모 수정' });
    await updatePropertyChecklistItemStatus(config, EXAMPLE_PROPERTY_ID, EXAMPLE_PROPERTY_ID, 3, 'GOOD');
    await updatePropertyChecklistItemMemo(config, EXAMPLE_PROPERTY_ID, EXAMPLE_PROPERTY_ID, 3, '채광 확인');
    expect((await list()).content[0]?.name).toBe('수정한 예시');
    expect(await fetchPropertyMemo(config, EXAMPLE_PROPERTY_ID)).toMatchObject({ freeMemo: '메모 수정' });
    expect(
      (await fetchPropertyChecklistDetail(config, EXAMPLE_PROPERTY_ID, EXAMPLE_PROPERTY_ID)).items[2],
    ).toMatchObject({ status: 'GOOD', memo: '채광 확인' });
    expect((await list()).content[0]?.progress).toEqual(
      (await fetchPropertyChecklistOverview(config, EXAMPLE_PROPERTY_ID)).overallProgress,
    );
    authenticate(++memberId);
    expect((await list()).content[0]?.name).toBe('(예시) 코엑스 근처');
  });

  it('사진 추가·대표 지정·삭제와 체크리스트 교체도 프론트에서 처리한다', async () => {
    await list();
    const added = await uploadPropertyPhoto(
      config,
      EXAMPLE_PROPERTY_ID,
      new File(['image'], 'photo.png', { type: 'image/png' }),
    );
    await setRepresentativePropertyPhoto(config, EXAMPLE_PROPERTY_ID, added.photoId);
    expect((await list()).content[0]?.representativePhoto?.photoId).toBe(added.photoId);
    await removePropertyPhoto(config, EXAMPLE_PROPERTY_ID, added.photoId);
    expect((await fetchPropertyPhotos(config, EXAMPLE_PROPERTY_ID)).totalCount).toBe(1);
    expect(
      await assignActiveChecklist(config, EXAMPLE_PROPERTY_ID, 'ON_SITE', {
        sourceType: 'SYSTEM_DEFAULT',
        checklistId: null,
      }),
    ).toMatchObject({ propertyId: EXAMPLE_PROPERTY_ID, checklistId: null, itemCount: 12 });
  });

  it('실제 매물 생성 실패 시 유지하고 성공 후에는 빈 목록에서도 다시 나타나지 않는다', async () => {
    await list();
    server.use(
      http.post('*/api/properties', () => HttpResponse.json(errorEnvelope('INTERNAL_SERVER_ERROR'), { status: 500 })),
    );
    await expect(createProperty(config, input)).rejects.toThrow();
    expect((await list()).totalElements).toBe(1);
    server.use(
      http.post('*/api/properties', () =>
        HttpResponse.json(successEnvelope(propertyDetailResponseFixture()), { status: 201 }),
      ),
    );
    await createProperty(config, input);
    expect((await list()).content).toEqual([]);
    expect(
      window.localStorage.getItem(
        `jachwi-sunbae:example-property:${encodeURIComponent(config.apiBaseUrl)}:${memberId}`,
      ),
    ).toBe('dismissed');
    await expect(fetchPropertyDetail(config, EXAMPLE_PROPERTY_ID)).rejects.toMatchObject({ status: 404 });
  });

  it('기존 매물이 있으면 예시를 표시하지 않고 기존 매물을 지워도 복원하지 않는다', async () => {
    server.use(
      http.get('*/api/properties', () =>
        HttpResponse.json(successEnvelope(propertyPageFixture([propertyDetailFixture]))),
      ),
    );
    expect((await list()).content.map((property) => property.propertyId)).toEqual([propertyDetailFixture.propertyId]);
    server.use(http.get('*/api/properties', () => HttpResponse.json(successEnvelope({ items: [], totalCount: 0 }))));
    expect((await list()).content).toEqual([]);
  });

  it('예시 삭제도 서버에 보내지 않고 숨김 상태를 유지한다', async () => {
    await list();
    await removeProperty(config, EXAMPLE_PROPERTY_ID);
    expect((await list()).content).toEqual([]);
  });
});
