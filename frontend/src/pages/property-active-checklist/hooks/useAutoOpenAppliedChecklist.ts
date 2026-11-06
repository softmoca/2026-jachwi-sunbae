import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import type { useAssignActiveChecklist } from '@/features/checklist/api/useChecklistMutations';
import { clearLastSelectedChecklist, readLastSelectedChecklist } from '@/features/checklist/model/lastChecklistStore';
import { propertyChecklistPath } from '@/shared/lib/navigation/appPaths';

type AssignMutation = ReturnType<typeof useAssignActiveChecklist>;

type UseAutoOpenAppliedChecklistOptions = {
  propertyId: number;
  assign: AssignMutation;
  isReplacing: boolean;
  fromPropertyDetail: boolean;
  isOverviewReady: boolean;
  isApplied: boolean;
  /** 적용된 체크리스트가 있을 때만 값이 있다. */
  appliedPropertyChecklistId: number | null;
};

/**
 * 교체 모드가 아니면 이 화면을 거치지 않고 체크리스트로 바로 보낸다.
 * - 이미 적용된 체크리스트가 있으면 그 화면으로 이동한다.
 * - 없으면 마지막으로 고른 체크리스트(실패 시 기본 체크리스트)를 적용한 뒤 이동한다.
 */
const useAutoOpenAppliedChecklist = ({
  propertyId,
  assign,
  isReplacing,
  fromPropertyDetail,
  isOverviewReady,
  isApplied,
  appliedPropertyChecklistId,
}: UseAutoOpenAppliedChecklistOptions) => {
  const navigate = useNavigate();
  const defaultAssignmentStarted = useRef(false);

  useEffect(() => {
    if (fromPropertyDetail && !isReplacing && appliedPropertyChecklistId !== null)
      navigate(propertyChecklistPath(propertyId, appliedPropertyChecklistId), {
        replace: true,
        state: { from: 'property-detail' },
      });
  }, [appliedPropertyChecklistId, fromPropertyDetail, isReplacing, navigate, propertyId]);

  useEffect(() => {
    if (isReplacing || !isOverviewReady || isApplied || defaultAssignmentStarted.current) return;
    defaultAssignmentStarted.current = true;
    const openApplied = (applied: { propertyChecklistId: number }) =>
      navigate(propertyChecklistPath(propertyId, applied.propertyChecklistId), {
        replace: true,
        ...(fromPropertyDetail ? { state: { from: 'property-detail' } } : {}),
      });
    const remembered = readLastSelectedChecklist();
    void assign
      .mutateAsync(remembered)
      .then(openApplied)
      .catch(() => {
        if (remembered === 'SYSTEM_DEFAULT') {
          defaultAssignmentStarted.current = false;
          return;
        }
        clearLastSelectedChecklist();
        void assign
          .mutateAsync('SYSTEM_DEFAULT')
          .then(openApplied)
          .catch(() => {
            defaultAssignmentStarted.current = false;
          });
      });
  }, [assign, fromPropertyDetail, isApplied, isOverviewReady, isReplacing, navigate, propertyId]);
};

export default useAutoOpenAppliedChecklist;
