import { RECORDS_MAP_PATH } from '@/shared/lib/navigation/appPaths';
import { ButtonLink } from '@/shared/ui/button/Button';
import EmptyState from '@/shared/ui/empty-state/EmptyState';

/** 등록한 매물이 하나도 없을 때의 안내. 1개일 때는 목록을 보이고 아래 바에서 하나 더 등록하라고 안내한다. */
const CompareEmpty = () => (
  <EmptyState
    variant="plain"
    illustration="empty-properties"
    title="비교하려면 매물이 2개 필요해요."
    description="본 방 기록 지도에서 본 방을 먼저 등록해 보세요."
    action={<ButtonLink to={RECORDS_MAP_PATH}>본 방 기록에서 등록하기</ButtonLink>}
  />
);

export default CompareEmpty;
