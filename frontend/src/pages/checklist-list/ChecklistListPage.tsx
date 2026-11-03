import ChecklistDetailPage from '@/pages/checklist-detail/ChecklistDetailPage';
import CreateChecklistPage from '@/pages/create-checklist/CreateChecklistPage';
import { describeChecklistLoadError } from '@/features/checklist/api/checklistErrorMessages';
import { useChecklistList } from '@/features/checklist/api/useChecklists';
import { USER_CHECKLIST_STAGE } from '@/features/checklist/model/checklist';
import ChecklistEditorSkeleton from '@/features/checklist/ui/checklist-editor-frame/ChecklistEditorSkeleton';
import QueryState from '@/shared/ui/query-state/QueryState';

const describeError = describeChecklistLoadError('체크리스트를 불러오지 못했어요.', {});

/**
 * 사용자마다 체크리스트를 하나만 쓴다. 목록을 보여 주지 않고 바로 그 체크리스트의 편집 화면을 연다.
 * 아직 만든 적이 없으면 기본 항목으로 채운 새 체크리스트 편집 화면을 연다.
 */
const ChecklistListPage = () => {
  const list = useChecklistList(USER_CHECKLIST_STAGE);

  return (
    <QueryState
      query={list}
      loadingTitle="체크리스트를 불러오는 중이에요."
      skeleton={<ChecklistEditorSkeleton />}
      describeError={describeError}
    >
      {(data) => {
        // 예전에 여러 개를 만들어 둔 사용자는 목록의 첫 체크리스트를 자기 체크리스트로 쓴다.
        const mine = data.pages[0]?.content[0];
        return mine === undefined ? (
          <CreateChecklistPage />
        ) : (
          <ChecklistDetailPage key={mine.checklistId} checklistId={mine.checklistId} />
        );
      }}
    </QueryState>
  );
};

export default ChecklistListPage;
