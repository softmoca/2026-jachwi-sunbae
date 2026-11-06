import { css } from '@emotion/css';
import type { ReactNode } from 'react';

/** 뼈대를 감싸 읽기 프로그램에 불러오는 중이라고 한 번만 알린다. 감싸도 배치에는 끼어들지 않는다. */
const LoadingRegion = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className={styles.region} role="status">
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

const styles = {
  region: css`
    label: LoadingRegion-region;
    display: contents;
  `,
};

export default LoadingRegion;
