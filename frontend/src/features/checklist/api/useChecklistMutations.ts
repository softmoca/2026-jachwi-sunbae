import { useMutation } from '@tanstack/react-query';

import { fetchProperties } from '@/features/property/api/propertyApi';
import { propertyQueryKeys } from '@/features/property/api/propertyQueryKeys';
import { queryClient } from '@/shared/api/queryClient';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import { toProvidedChecklistItemInputs } from '../lib/checklistEditor';
import type { ChecklistDetail, ChecklistStage } from '../model/checklistTypes';
import { clearLastSelectedChecklist, readLastSelectedChecklist } from '../model/lastChecklistStore';
import type { ChecklistDraftInput } from '../model/useChecklistDraft';
import { assignActiveChecklist, createChecklistV11, removeChecklist, updateChecklistV11 } from './checklistApi';
import { ChecklistReapplyError } from './checklistErrorMessages';
import { checklistQueryKeys } from './checklistQueryKeys';

const invalidateChecklistAggregates = async () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: checklistQueryKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: checklistQueryKeys.details() }),
  ]);

export const useCreateChecklist = () => {
  const config = usePublicConfig();
  return useMutation({
    mutationFn: ({ name, stage, items }: ChecklistDraftInput & { stage: ChecklistStage }) =>
      createChecklistV11(config, { name, stage, items: toProvidedChecklistItemInputs(items) }),
    retry: false,
    onSuccess: async (detail) => {
      queryClient.setQueryData(checklistQueryKeys.detail(detail.checklistId), detail);
      await queryClient.invalidateQueries({ queryKey: checklistQueryKeys.lists() });
    },
  });
};

/**
 * 고친 체크리스트를 그 체크리스트가 적용된 매물마다 다시 적용한다. 매물의 체크리스트는 적용할 때 떠 둔 사본이라,
 * 원본을 고쳐도 다시 적용하기 전에는 예전 항목이 남는다. 다시 적용하면 서버가 같은 체크 항목의 상태와 메모를 이어 준다.
 * 매물 목록은 한 번에 모두 오고, 매물마다 단계별로 어떤 체크리스트에서 떠 왔는지(`sourceChecklistId`)를 알려 준다.
 */
const reapplyToLinkedProperties = async (config: PublicConfig, checklist: ChecklistDetail) => {
  const { content } = await fetchProperties(config, { query: '', page: 0 });
  const linked = content.filter((property) =>
    property.stages.some(
      (stage) => stage.stage === checklist.stage && stage.applied && stage.sourceChecklistId === checklist.checklistId,
    ),
  );
  const results = await Promise.allSettled(
    linked.map((property) =>
      assignActiveChecklist(config, property.propertyId, checklist.stage, {
        sourceType: 'USER',
        checklistId: checklist.checklistId,
      }),
    ),
  );
  const failed = results.filter((result) => result.status === 'rejected').length;
  if (failed > 0) throw new ChecklistReapplyError(failed);
};

export const useUpdateChecklist = (checklistId: number) => {
  const config = usePublicConfig();
  return useMutation({
    mutationFn: async ({ name, items }: ChecklistDraftInput) => {
      const detail = await updateChecklistV11(config, checklistId, {
        name,
        items: toProvidedChecklistItemInputs(items),
      });
      // 원본을 먼저 저장해 두고 상세 캐시를 바꾼 뒤 매물에 적용한다. 적용이 일부 실패해도 저장한 내용은 남는다.
      queryClient.setQueryData(checklistQueryKeys.detail(checklistId), detail);
      try {
        await reapplyToLinkedProperties(config, detail);
      } finally {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: checklistQueryKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: propertyQueryKeys.all }),
        ]);
      }
      return detail;
    },
    retry: false,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: checklistQueryKeys.detail(checklistId), exact: true });
    },
  });
};

export const useRemoveChecklist = (checklistId: number) => {
  const config = usePublicConfig();
  return useMutation({
    mutationFn: () => removeChecklist(config, checklistId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: checklistQueryKeys.detail(checklistId), exact: true });
    },
    onSuccess: async () => {
      if (readLastSelectedChecklist() === checklistId) clearLastSelectedChecklist();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: checklistQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: propertyQueryKeys.all }),
      ]);
      queryClient.removeQueries({ queryKey: checklistQueryKeys.detail(checklistId), exact: true });
    },
  });
};

export const useAssignActiveChecklist = (propertyId: number, stage: ChecklistStage) => {
  const config = usePublicConfig();
  return useMutation({
    mutationFn: (checklistId: number | 'SYSTEM_DEFAULT') =>
      assignActiveChecklist(
        config,
        propertyId,
        stage,
        checklistId === 'SYSTEM_DEFAULT'
          ? { sourceType: 'SYSTEM_DEFAULT', checklistId: null }
          : { sourceType: 'USER', checklistId },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: propertyQueryKeys.detail(propertyId), exact: true }),
        queryClient.invalidateQueries({ queryKey: propertyQueryKeys.checklists(propertyId), exact: true }),
        queryClient.invalidateQueries({ queryKey: propertyQueryKeys.lists() }),
        invalidateChecklistAggregates(),
      ]);
    },
  });
};
