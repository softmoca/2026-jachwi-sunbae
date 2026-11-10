import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { useAssignActiveChecklist } from '@/features/checklist/api/useChecklistMutations';
import { writeLastSelectedChecklist } from '@/features/checklist/model/lastChecklistStore';
import { propertyChecklistTabPath } from '@/shared/lib/navigation/appPaths';

type AssignMutation = ReturnType<typeof useAssignActiveChecklist>;

/** 기본 체크리스트를 가리키는 선택지 id */
export const SYSTEM_DEFAULT_ID = -1;

type UseChecklistSelectionOptions = {
  propertyId: number;
  assign: AssignMutation;
  initialSelectedId: number | null;
  current: { checklistId: number; name: string } | null;
};

/** 선택과 적용을 분리하고, 확인 버튼을 눌렀을 때만 체크리스트로 이동한다. */
const useChecklistSelection = ({ propertyId, assign, initialSelectedId, current }: UseChecklistSelectionOptions) => {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId);

  useEffect(() => {
    if (selectedId === null && current !== null) setSelectedId(current.checklistId);
  }, [current, selectedId]);

  const openChecklist = () => navigate(propertyChecklistTabPath(propertyId), { replace: true });

  const toggleSelection = (checklistId: number) => {
    setSelectedId(checklistId);
  };

  const saveSelection = async () => {
    if (selectedId === null) return;
    if (current?.checklistId === selectedId) {
      openChecklist();
      return;
    }
    const selection = selectedId === SYSTEM_DEFAULT_ID ? ('SYSTEM_DEFAULT' as const) : selectedId;
    try {
      await assign.mutateAsync(selection);
      writeLastSelectedChecklist(selection);
      openChecklist();
    } catch {
      /* Keep the selected checklist visible for retry. */
    }
  };

  return {
    selectedId,
    isSelectionChanged: selectedId !== null && selectedId !== current?.checklistId,
    toggleSelection,
    saveSelection,
  };
};

export default useChecklistSelection;
