import { HOME_PATH } from '@/shared/lib/navigation/appPaths';
import { ButtonLink } from '@/shared/ui/button/Button';
import StatusPanel from '@/shared/ui/status-panel/StatusPanel';

const NotFoundPage = () => {
  return (
    <StatusPanel
      title="페이지를 찾을 수 없어요"
      description="주소를 다시 확인하거나 시작 화면으로 돌아가 주세요."
      tone="error"
      illustration="not-found"
      action={<ButtonLink to={HOME_PATH}>시작 화면으로</ButtonLink>}
    />
  );
};

export default NotFoundPage;
