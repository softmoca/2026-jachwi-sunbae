import { Link, useLocation, useParams } from 'react-router-dom';

import { isApiErrorCode } from '@/features/auth/api/apiClient';
import { USER_CHECKLIST_STAGE } from '@/features/checklist/model/checklist';
import ChecklistPageLayout from '@/features/checklist/ui/checklist-page-layout/ChecklistPageLayout';
import { usePropertyChecklistDetail, usePropertyDetail } from '@/features/property/api/useProperties';
import { getChecklistStageLabel, parsePositiveId } from '@/features/property/lib/propertyFormat';
import PropertyChecklist from '@/features/property/ui/property-checklist/PropertyChecklist';
import {
  CHECKLISTS_PATH,
  HOME_PATH,
  propertyActiveChecklistPath,
  propertyDetailPath,
} from '@/shared/lib/navigation/appPaths';
import useReturnNavigation from '@/shared/lib/navigation/useReturnNavigation';
import ContentState from '@/shared/ui/content-state/ContentState';
import Icon from '@/shared/ui/icon/Icon';
import IconButton from '@/shared/ui/icon-button/IconButton';
import LoadingRegion from '@/shared/ui/skeleton/LoadingRegion';

import PropertyChecklistSkeleton from './PropertyChecklistSkeleton';

import * as styles from './PropertyChecklistPage.styles';

const PROPERTY_DETAIL_STATE = { from: 'property-detail' };
const isFromPropertyDetail = (state: unknown) =>
  typeof state === 'object' && state !== null && 'from' in state && state.from === 'property-detail';

const PropertyChecklistPage = () => {
  const params = useParams();
  const propertyId = parsePositiveId(params.propertyId);
  const propertyChecklistId = parsePositiveId(params.propertyChecklistId);

  if (propertyId === null || propertyChecklistId === null) {
    return (
      <ContentState title="올바른 매물 체크리스트 주소가 아니에요.">
        <Link to={HOME_PATH}>홈으로 돌아가기</Link>
      </ContentState>
    );
  }

  return (
    <ResolvedPropertyChecklistPage
      key={propertyChecklistId}
      propertyId={propertyId}
      propertyChecklistId={propertyChecklistId}
    />
  );
};

const ResolvedPropertyChecklistPage = ({
  propertyId,
  propertyChecklistId,
}: {
  propertyId: number;
  propertyChecklistId: number;
}) => {
  const checklist = usePropertyChecklistDetail(propertyId, propertyChecklistId);
  const property = usePropertyDetail(propertyId);
  const location = useLocation();
  const fromPropertyDetail = isFromPropertyDetail(location.state);
  const backToDetail = useReturnNavigation({
    cameFromTarget: fromPropertyDetail,
    fallback: propertyDetailPath(propertyId),
  });

  // 페이지 전체를 바꾸는 중이라 남겨 둘 내용이 없으므로 로딩을 늦추지 않고 바로 보여 준다.
  if (checklist.isPending) {
    return (
      <LoadingRegion label="체크리스트를 불러오는 중이에요.">
        <PropertyChecklistSkeleton />
      </LoadingRegion>
    );
  }

  if (checklist.isError) {
    const isNotFound = isApiErrorCode(checklist.error, 'PROPERTY_CHECKLIST_NOT_FOUND');
    return (
      <main className={`${styles.statePage} property-page`}>
        <div className={isNotFound ? styles.plainState : styles.stateCard}>
          <ContentState
            page={false}
            tone="error"
            title={isNotFound ? '연결된 체크리스트를 찾을 수 없어요.' : '체크리스트를 불러오지 못했어요.'}
            onRetry={isNotFound ? undefined : () => void checklist.refetch()}
          >
            <Link to={propertyDetailPath(propertyId)}>매물 상세로 돌아가기</Link>
          </ContentState>
        </div>
      </main>
    );
  }

  const detail = checklist.data;

  return (
    <ChecklistPageLayout
      title={property.data === undefined ? '매물 체크리스트' : `${property.data.name} 체크리스트`}
      onBack={backToDetail}
      backLabel="매물 상세로 돌아가기"
      endSlot={
        <>
          {detail.stage === USER_CHECKLIST_STAGE && (
            <Link
              className={styles.editAction}
              to={`${propertyActiveChecklistPath(propertyId, detail.stage)}?mode=replace`}
              // 교체 화면이 이 화면 기록을 대신해, 교체를 마치고 돌아가도 체크리스트가 두 번 쌓이지 않는다.
              replace
              state={fromPropertyDetail ? PROPERTY_DETAIL_STATE : undefined}
            >
              편집
            </Link>
          )}
          {detail.sourceChecklistId !== null && (
            <IconButton label="체크리스트 항목 편집" to={CHECKLISTS_PATH}>
              <Icon name="edit" size={16} />
            </IconButton>
          )}
        </>
      }
    >
      <header className={styles.heading}>
        <div>
          <span>{getChecklistStageLabel(detail.stage)}</span>
          <h1>{detail.checklistName}</h1>
        </div>
      </header>
      <PropertyChecklist propertyId={propertyId} detail={detail} />

      <div className={styles.saveAction}>
        <Link
          to={propertyDetailPath(propertyId)}
          onClick={(event) => {
            event.preventDefault();
            backToDetail();
          }}
        >
          저장
        </Link>
      </div>
    </ChecklistPageLayout>
  );
};

export default PropertyChecklistPage;
