import { css } from '@emotion/css';

import ProgressCircle from '@/shared/ui/progress-circle/ProgressCircle';

/**
 * 화면 코드를 받는 동안 Suspense fallback으로 보여 주는 로딩. 화면 전체를 바꾸는 중이라 남겨 둘 내용이 없으므로
 * 늦추지 않고 바로 보여 준다. 화면 뼈대가 있는 경로(홈, 본 방 기록)는 이 대신 그 뼈대를 넘긴다.
 */
const RouteLoading = () => (
  <div className={styles.loading}>
    <ProgressCircle />
  </div>
);

const styles = {
  loading: css`
    label: RouteLoading-loading;
    height: 100%;
    min-height: 12rem;
    display: grid;
    place-items: center;
  `,
};

export default RouteLoading;
