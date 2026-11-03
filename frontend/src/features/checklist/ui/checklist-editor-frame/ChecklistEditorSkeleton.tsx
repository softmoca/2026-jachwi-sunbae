import { css } from '@emotion/css';

import useIsDesktop from '@/shared/lib/hooks/useIsDesktop';
import { HOME_PATH } from '@/shared/lib/navigation/appPaths';
import useReturnNavigation from '@/shared/lib/navigation/useReturnNavigation';
import Skeleton from '@/shared/ui/skeleton/Skeleton';
import TopNavigation from '@/shared/ui/top-navigation/TopNavigation';

import ChecklistEditorFrame, { ChecklistDesktopHeading } from './ChecklistEditorFrame';

const ITEM_COUNT = 4;

/**
 * 체크리스트 편집 화면(`/checklists`)의 뼈대. 처음 여는 화면이라 남겨 둘 내용이 없으므로 늦추지 않고 바로 보여 준다.
 * 체크리스트 목록, 상세, 기본 항목을 받는 동안 같은 자리에 같은 뼈대를 두어, 뼈대에서 편집 화면으로 한 번만 바뀐다.
 * 읽기 프로그램 안내는 감싸는 쪽(`QueryState`, `LoadingRegion`)이 한다.
 * 첫 번들 크기 한도 때문에 라우트 Suspense 대체 화면으로는 쓰지 않는다. 화면 코드는 자동 로그인과 함께 받으므로 대개 먼저 도착한다.
 */
const ChecklistEditorSkeleton = () => {
  const isDesktop = useIsDesktop();
  const goBack = useReturnNavigation({ cameFromTarget: true, fallback: HOME_PATH });

  return (
    <ChecklistEditorFrame isDesktop={isDesktop} className={styles.page}>
      {isDesktop ? (
        <ChecklistDesktopHeading />
      ) : (
        <TopNavigation
          className={styles.topNavigation}
          title="체크리스트 편집"
          backLabel="이전 화면으로 돌아가기"
          navigationIcon="arrow-left"
          onBack={goBack}
        />
      )}
      <div className={styles.body}>
        <Skeleton width="40%" height="1rem" />
        <div className={styles.items}>
          {Array.from({ length: ITEM_COUNT }, (_, index) => (
            <Skeleton key={index} shape="card" height="3.5rem" />
          ))}
        </div>
      </div>
    </ChecklistEditorFrame>
  );
};

const styles = {
  /* 체크리스트 편집 화면(ChecklistDetailPage)과 같은 바깥 여백 */
  page: css`
    label: ChecklistEditorSkeleton-page;
    padding-right: 1rem;
    padding-left: 1rem;
  `,

  topNavigation: css`
    label: ChecklistEditorSkeleton-topNavigation;
    margin-bottom: 0;
  `,

  body: css`
    label: ChecklistEditorSkeleton-body;
    padding: 0.75rem 0;
  `,

  items: css`
    label: ChecklistEditorSkeleton-items;
    display: grid;
    gap: 0.6rem;
    margin-top: 1rem;
  `,
};

export default ChecklistEditorSkeleton;
