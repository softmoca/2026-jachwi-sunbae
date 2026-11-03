import { RECORDS_MAP_PATH } from '@/shared/lib/navigation/appPaths';
import { ButtonLink } from '@/shared/ui/button/Button';
import EmptyState from '@/shared/ui/empty-state/EmptyState';

/** 비교하려면 매물이 2개 이상 있어야 한다는 안내. */
const CompareEmpty = () => (
  <EmptyState
    variant="plain"
    illustration="empty-properties"
    title="비교하려면 매물이 2개 필요해요."
    description="본 방 기록 지도에서 매물을 하나 더 등록해 보세요."
    action={<ButtonLink to={RECORDS_MAP_PATH}>본 방 기록에서 등록하기</ButtonLink>}
  />
);

export default CompareEmpty;
