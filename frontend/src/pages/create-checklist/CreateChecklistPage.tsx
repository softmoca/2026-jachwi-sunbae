import { css } from '@emotion/css';
import { useEffect } from 'react';

import { getChecklistErrorMessage } from '@/features/checklist/api/checklistErrorMessages';
import { useCreateChecklist } from '@/features/checklist/api/useChecklistMutations';
import { useChecklistPreset } from '@/features/checklist/api/useChecklists';
import { USER_CHECKLIST_STAGE } from '@/features/checklist/model/checklist';
import type { ChecklistPresetItem, ChecklistStage } from '@/features/checklist/model/checklistTypes';
import { writeLastSelectedChecklist } from '@/features/checklist/model/lastChecklistStore';
import useChecklistDraft, { type ChecklistDraftInput } from '@/features/checklist/model/useChecklistDraft';
import useChecklistItemPickerRoute from '@/features/checklist/model/useChecklistItemPickerRoute';
import CheckItemPicker from '@/features/checklist/ui/checklist-editor/CheckItemPicker';
import ChecklistEditor from '@/features/checklist/ui/checklist-editor/ChecklistEditor';
import ChecklistEditorFrame, {
  ChecklistDesktopHeading,
} from '@/features/checklist/ui/checklist-editor-frame/ChecklistEditorFrame';
import ChecklistEditorSkeleton from '@/features/checklist/ui/checklist-editor-frame/ChecklistEditorSkeleton';
import { trackPostHogEvent } from '@/shared/lib/analytics/posthog';
import useIsDesktop from '@/shared/lib/hooks/useIsDesktop';
import { HOME_PATH } from '@/shared/lib/navigation/appPaths';
import useReturnNavigation from '@/shared/lib/navigation/useReturnNavigation';
import LoadingRegion from '@/shared/ui/skeleton/LoadingRegion';
import TopNavigation from '@/shared/ui/top-navigation/TopNavigation';

import ChecklistPresetStatus from './ui/checklist-preset-status/ChecklistPresetStatus';

/** 사용자 체크리스트는 현장 단계 하나뿐이라 단계 선택 화면 없이 바로 편집기로 들어간다. */
const stage: ChecklistStage = USER_CHECKLIST_STAGE;
/** 사용자마다 하나만 쓰므로 이름을 묻지 않고 이 이름으로 만든다. */
const MY_CHECKLIST_NAME = '내 체크리스트';

/** 아직 체크리스트가 없는 사용자에게 기본 항목으로 채운 편집 화면을 연다. `/checklists`가 열어 준다. */
const CreateChecklistPage = () => {
  const goBack = useReturnNavigation({ cameFromTarget: true, fallback: HOME_PATH });
  const preset = useChecklistPreset(stage, 'ONE_ROOM', true);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    trackPostHogEvent('checklist_creation_started', { stage });
  }, []);

  // 기본 항목을 받는 동안은 체크리스트 화면과 같은 뼈대를 둬, 뼈대에서 편집 화면으로 한 번만 바뀌게 한다.
  if (preset.isPending) {
    return (
      <LoadingRegion label="기본 항목을 불러오는 중이에요.">
        <ChecklistEditorSkeleton />
      </LoadingRegion>
    );
  }

  if (!preset.isSuccess)
    return (
      <ChecklistEditorFrame isDesktop={isDesktop}>
        <ChecklistEditNavigation isDesktop={isDesktop} onBack={goBack} />
        <ChecklistPresetStatus preset={preset} />
      </ChecklistEditorFrame>
    );

  return <CreateChecklistForm presetItems={preset.data.items} />;
};

const CreateChecklistForm = ({ presetItems }: { presetItems: ChecklistPresetItem[] }) => {
  const goBack = useReturnNavigation({ cameFromTarget: true, fallback: HOME_PATH });
  const create = useCreateChecklist();
  const isDesktop = useIsDesktop();
  const { isPickerOpen, openPicker, closePicker } = useChecklistItemPickerRoute();
  const draft = useChecklistDraft({
    initialName: MY_CHECKLIST_NAME,
    initialItems: presetItems,
    isSubmitting: create.isPending,
  });

  const save = async ({ name, items }: ChecklistDraftInput) => {
    try {
      trackPostHogEvent('checklist_creation_submitted', { stage });
      const created = await create.mutateAsync({ name, stage, items });
      trackPostHogEvent('checklist_created', { stage });
      // 새 매물에도 이 체크리스트가 바로 적용되도록 기억한다.
      writeLastSelectedChecklist(created.checklistId);
      goBack();
      return created;
    } catch (error) {
      trackPostHogEvent('checklist_save_failed', {
        stage,
        error_kind: error instanceof Error ? 'request' : 'unknown',
      });
      throw error;
    }
  };

  if (isPickerOpen)
    return (
      <ChecklistEditorFrame isDesktop={isDesktop}>
        <TopNavigation
          className={styles.topNavigation}
          title="체크 항목 편집"
          backLabel="체크리스트 편집으로 돌아가기"
          navigationIcon="arrow-left"
          onBack={closePicker}
        />
        <CheckItemPicker
          stage={stage}
          existingSourceIds={draft.providedSourceIds}
          disabled={create.isPending}
          onCancel={closePicker}
          onAdd={(items) => {
            if (draft.addItems(items)) closePicker();
          }}
        />
      </ChecklistEditorFrame>
    );

  return (
    <ChecklistEditorFrame isDesktop={isDesktop}>
      <ChecklistEditNavigation isDesktop={isDesktop} onBack={goBack} />
      <ChecklistEditor
        stage={stage}
        draft={draft}
        submitLabel="체크리스트 저장"
        isSubmitting={create.isPending}
        serverError={create.isError ? getChecklistErrorMessage(create.error) : undefined}
        onOpenItemPicker={openPicker}
        onSubmit={save}
        isDesktop={isDesktop}
      />
    </ChecklistEditorFrame>
  );
};

/** 휴대폰은 뒤로가기가 있는 제목 줄을, 데스크탑은 공용 헤더 아래 왼쪽 정렬 제목을 둔다. */
const ChecklistEditNavigation = ({ isDesktop, onBack }: { isDesktop: boolean; onBack: () => void }) =>
  isDesktop ? (
    <ChecklistDesktopHeading />
  ) : (
    <TopNavigation
      className={styles.topNavigation}
      title="체크리스트 편집"
      backLabel="이전 화면으로 돌아가기"
      navigationIcon="arrow-left"
      onBack={onBack}
    />
  );

const styles = {
  topNavigation: css`
    label: CreateChecklistPage-topNavigation;
    margin-bottom: 0;
  `,
};

export default CreateChecklistPage;
