import { css } from '@emotion/css';

import ProgressCircle from '../progress-circle/ProgressCircle';

/** 뼈대가 없는 페이지 전체 로딩. 글자 없이 가운데에 Progress Circle(40)만 두고, 안내는 읽기 프로그램에만 준다. */
const PageLoading = ({ label }: { label: string }) => (
  <div className={styles.loading}>
    <ProgressCircle size={40} label={label} />
  </div>
);

const styles = {
  loading: css`
    label: PageLoading-loading;
    display: grid;
    place-items: center;
    min-height: 12rem;
    height: 100%;
  `,
};

export default PageLoading;
