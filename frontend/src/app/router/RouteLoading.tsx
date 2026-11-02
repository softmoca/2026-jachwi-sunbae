import { css, keyframes } from '@emotion/css';

import ProgressCircle from '@/shared/ui/progress-circle/ProgressCircle';

/**
 * 처음 여는 화면의 코드를 받는 동안 Suspense fallback으로 보여 주는 로딩.
 * fallback은 나타나는 순간 이미 기다리는 중이라 요청 시작을 넘겨받을 곳이 없어 `useDelayedLoading`을 쓸 수 없다.
 * 그래서 CSS로 300ms 동안 투명하게 두었다가 보여 준다. 빠르게 받은 화면에서는 Progress Circle이 번쩍이지 않는다.
 * (React는 fallback을 한 번 보이면 300ms는 붙잡아 두므로, 그동안은 빈자리가 보인다.)
 */
const RouteLoading = () => (
  <div className={styles.loading}>
    <ProgressCircle />
  </div>
);

const delayedShowKeyframes = keyframes`
  to {
    opacity: 1;
  }
`;

/** 로딩 UI를 보여 주기 전에 기다리는 시간. `useDelayedLoading`의 지연 시간과 같다. */
export const ROUTE_LOADING_DELAY_MS = 300;

const styles = {
  loading: css`
    label: RouteLoading-loading;
    height: 100%;
    min-height: 12rem;
    display: grid;
    place-items: center;
    opacity: 0;
    animation: ${delayedShowKeyframes} 0s linear ${ROUTE_LOADING_DELAY_MS}ms forwards;
  `,
};

export default RouteLoading;
