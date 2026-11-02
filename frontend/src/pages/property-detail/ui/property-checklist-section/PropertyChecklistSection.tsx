import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import PropertyChecklistItemControl from '@/pages/property-checklist/ui/property-checklist-item-control/PropertyChecklistItemControl';
import { useAssignActiveChecklist } from '@/features/checklist/api/useChecklistMutations';
import { clearLastSelectedChecklist, readLastSelectedChecklist } from '@/features/checklist/model/lastChecklistStore';
import ChecklistProgressRing from '@/features/checklist/ui/checklist-progress-ring/ChecklistProgressRing';
import { fetchPropertyChecklistDetail } from '@/features/property/api/propertyApi';
import { propertyQueryKeys } from '@/features/property/api/propertyQueryKeys';
import { usePropertyChecklistOverview } from '@/features/property/api/useProperties';
import type {
  PropertyChecklistDetail,
  PropertyChecklistItem,
  PropertyChecklistProgress,
} from '@/features/property/model/Property';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import { Button } from '@/shared/ui/button/Button';
import DelayedFallback from '@/shared/ui/delayed-fallback/DelayedFallback';
import DetailSection from '@/shared/ui/detail-section/DetailSection';
import Icon from '@/shared/ui/icon/Icon';

import * as styles from './PropertyChecklistSection.styles';

type PropertyChecklistSectionProps = {
  propertyId: number;
};

const PropertyChecklistSection = ({ propertyId }: PropertyChecklistSectionProps) => {
  const checklists = usePropertyChecklistOverview(propertyId);
  const assignDefaultChecklist = useAssignActiveChecklist(propertyId, 'ON_SITE');
  const assignmentStarted = useRef(false);
  const [editingMemoItemId, setEditingMemoItemId] = useState<number | null>(null);
  const onSiteChecklist = checklists.data?.stages.find((item) => item.stage === 'ON_SITE');
  const propertyChecklistId = onSiteChecklist?.applied ? onSiteChecklist.propertyChecklistId : null;
  const config = usePublicConfig();
  // `usePropertyChecklistDetail`과 같은 조회다. 적용된 체크리스트 ID를 알기 전에는 보내지 않아야 해서 여기서 `enabled`를 붙여 부른다.
  // 두 조회를 한 컴포넌트에서 보아야 로딩 UI 하나로 기다릴 수 있다.
  const checklist = useQuery({
    queryKey: propertyQueryKeys.checklist(propertyId, propertyChecklistId ?? 0),
    queryFn: ({ signal }) => fetchPropertyChecklistDetail(config, propertyId, propertyChecklistId ?? 0, signal),
    enabled: propertyChecklistId !== null,
  });

  useEffect(() => {
    if (
      checklists.isPending ||
      checklists.isError ||
      checklists.data === undefined ||
      onSiteChecklist?.applied === true ||
      assignmentStarted.current
    ) {
      return;
    }

    assignmentStarted.current = true;
    const remembered = readLastSelectedChecklist();
    void assignDefaultChecklist.mutateAsync(remembered).catch(() => {
      if (remembered === 'SYSTEM_DEFAULT') return;
      clearLastSelectedChecklist();
      void assignDefaultChecklist.mutateAsync('SYSTEM_DEFAULT').catch(() => undefined);
    });
  }, [assignDefaultChecklist, checklists.data, checklists.isError, checklists.isPending, onSiteChecklist?.applied]);

  const isApplied = !checklists.isError && propertyChecklistId !== null;
  // 적용 여부를 아직 모르거나, 적용 안 된 매물에 기본 체크리스트를 자동으로 붙이는 중이면 시작 버튼을 그리지 않고 기다린다.
  // 요청 중에 시작 버튼을 그리면 응답이 오자마자 사라져 깜빡인다.
  // 적용된 뒤에는 항목까지 받아야 그린다. 두 기다림을 하나로 묶어, 중간에 로딩 UI가 사라졌다 다시 나타나지 않게 한다.
  const isPending =
    checklists.isPending ||
    (!checklists.isError && !isApplied && (assignDefaultChecklist.isIdle || assignDefaultChecklist.isPending)) ||
    (isApplied && checklist.isPending);

  return (
    <DetailSection title="체크리스트">
      {checklists.isError && (
        <button className={styles.retry} type="button" onClick={() => void checklists.refetch()}>
          체크리스트 정보를 불러오지 못했어요. 다시 시도
        </button>
      )}
      {assignDefaultChecklist.isError && (
        <p className={styles.retry}>체크리스트를 시작하지 못했어요. 다시 눌러 주세요.</p>
      )}
      {!checklists.isError && (
        // 빠른 응답에는 스켈레톤 없이 바로 내용을 보여 주고, 오래 걸릴 때만 스켈레톤을 띄운다.
        // 기다리는 동안에는 스켈레톤과 같은 크기의 빈자리를 두어, 내용이 들어올 때 아래가 밀리지 않게 한다.
        <DelayedFallback
          isPending={isPending}
          fallback={<ChecklistSkeleton />}
          placeholder={<ChecklistSkeleton isPlaceholder />}
        >
          {() =>
            isApplied && propertyChecklistId !== null ? (
              checklist.isError || checklist.data === undefined ? (
                <button className={styles.retry} type="button" onClick={() => void checklist.refetch()}>
                  체크리스트를 불러오지 못했어요. 다시 시도
                </button>
              ) : (
                <AppliedChecklistItems
                  propertyId={propertyId}
                  propertyChecklistId={propertyChecklistId}
                  detail={checklist.data}
                  progress={onSiteChecklist?.progress}
                  editingMemoItemId={editingMemoItemId}
                  onStartMemoEdit={setEditingMemoItemId}
                  onFinishMemoEdit={() => setEditingMemoItemId(null)}
                />
              )
            ) : (
              <Button
                className={styles.mainAction}
                variant="primary"
                fullWidth
                onClick={() => {
                  void assignDefaultChecklist.mutateAsync('SYSTEM_DEFAULT').catch(() => undefined);
                }}
              >
                체크리스트
                <Icon name="arrow-right" size={16} />
              </Button>
            )
          }
        </DelayedFallback>
      )}
    </DetailSection>
  );
};

/**
 * 진행 링과 기본 체크리스트 네 항목과 같은 모양의 스켈레톤.
 * `isPlaceholder`면 보이지 않는 같은 크기의 빈자리로 쓴다.
 */
const ChecklistSkeleton = ({ isPlaceholder = false }: { isPlaceholder?: boolean }) => (
  <div
    className={isPlaceholder ? styles.skeletonPlaceholder : undefined}
    role={isPlaceholder ? undefined : 'status'}
    aria-hidden={isPlaceholder || undefined}
  >
    {!isPlaceholder && <span className="sr-only">체크리스트를 불러오는 중이에요.</span>}
    <div className={styles.skeletonSummary} aria-hidden="true">
      <span className={`${styles.skeleton} ${styles.skeletonRing}`} />
      <span className={styles.skeletonLegend}>
        <span className={styles.skeleton} />
        <span className={styles.skeleton} />
        <span className={styles.skeleton} />
      </span>
    </div>
    <div className={styles.expandedChecklist} aria-hidden="true">
      <span className={`${styles.skeleton} ${styles.skeletonTitle}`} />
      <ul className={styles.skeletonItems}>
        {[0, 1, 2, 3].map((index) => (
          <li key={index}>
            <span className={styles.skeleton} />
            <span className={`${styles.skeleton} ${styles.skeletonAction}`} />
          </li>
        ))}
      </ul>
    </div>
  </div>
);

/** 진행 링과 항목을 함께 그려, 링이 먼저 나타나 자리를 밀지 않게 한다. */
const AppliedChecklistItems = ({
  propertyId,
  propertyChecklistId,
  detail,
  progress,
  editingMemoItemId,
  onStartMemoEdit,
  onFinishMemoEdit,
}: {
  propertyId: number;
  propertyChecklistId: number;
  detail: PropertyChecklistDetail;
  progress: PropertyChecklistProgress | undefined;
  editingMemoItemId: number | null;
  onStartMemoEdit: (itemId: number) => void;
  onFinishMemoEdit: () => void;
}) => {
  const completedCount = detail.items.filter((item) => item.status !== 'UNCONFIRMED').length;

  return (
    <>
      {progress !== undefined && progress.totalCount > 0 && <ChecklistProgressRing progress={progress} />}
      <div className={styles.expandedChecklist}>
        <header className={styles.expandedHeader}>
          <h3>{detail.checklistName}</h3>
          {/* 항목을 평가하면 바뀐 개수를 이어서 읽는다. 화면의 "2 / 3"은 "2 슬래시 3"으로 읽혀 문장으로 따로 둔다. */}
          <span role="status">
            <span aria-hidden="true">
              {completedCount} / {detail.items.length} 평가
            </span>
            <span className="sr-only">
              {detail.items.length}개 중 {completedCount}개 평가
            </span>
          </span>
        </header>
        <ol className={styles.items}>
          {detail.items.map((item: PropertyChecklistItem) => (
            <PropertyChecklistItemControl
              key={item.itemId}
              propertyId={propertyId}
              propertyChecklistId={propertyChecklistId}
              item={item}
              isMemoEditing={editingMemoItemId === item.itemId}
              isMemoEditDisabled={editingMemoItemId !== null && editingMemoItemId !== item.itemId}
              onStartMemoEdit={() => onStartMemoEdit(item.itemId)}
              onFinishMemoEdit={onFinishMemoEdit}
            />
          ))}
        </ol>
      </div>
    </>
  );
};

export default PropertyChecklistSection;
