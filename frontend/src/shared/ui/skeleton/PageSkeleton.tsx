import { css } from '@emotion/css';

import type { SkeletonShape } from './Skeleton';
import Skeleton from './Skeleton';

export type PageSkeletonBlock = {
  height: string;
  width?: string;
  shape?: SkeletonShape;
  /** 앞 블록과의 간격. 주지 않으면 0.75rem. */
  gap?: string;
  /** 한 줄에 같은 칸을 여러 개 둘 때(사진 그리드 등) 칸 수. */
  columns?: number;
};

type PageSkeletonProps = {
  /** 본문 블록. 실제 화면의 제목, 입력 칸, 카드와 같은 높이와 간격으로 적는다. */
  blocks: PageSkeletonBlock[];
  /** 상단 내비게이션(뒤로 가기와 제목) 자리를 둘지. */
  hasNavigation?: boolean;
};

/**
 * 상단 내비게이션 아래에 블록을 쌓는 고정 레이아웃 페이지의 뼈대. `QueryState`의 `skeleton`으로 넘긴다.
 * 크기는 rem으로 적어 데스크탑(기준 글자 125%)에서도 실제 화면과 같은 비율로 커진다.
 */
const PageSkeleton = ({ blocks, hasNavigation = true }: PageSkeletonProps) => (
  <main className={`property-page ${styles.page}`}>
    <div className="page-container">
      {hasNavigation && (
        <div className={styles.navigation}>
          <Skeleton shape="circle" width="2rem" height="2rem" />
          <Skeleton width="45%" height="1.25rem" />
        </div>
      )}
      {blocks.map((block, index) => (
        <div
          key={index}
          className={block.columns === undefined ? undefined : styles.columns}
          style={{
            marginTop: block.gap ?? '0.75rem',
            gridTemplateColumns: block.columns === undefined ? undefined : `repeat(${block.columns}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: block.columns ?? 1 }, (_, column) => (
            <Skeleton key={column} height={block.height} width={block.width} shape={block.shape ?? 'card'} />
          ))}
        </div>
      ))}
    </div>
  </main>
);

const styles = {
  page: css`
    label: PageSkeleton-page;
  `,

  columns: css`
    label: PageSkeleton-columns;
    display: grid;
    gap: 0.5rem;
  `,

  /* 공용 TopNavigation과 같은 높이(2.875rem)와 배치. */
  navigation: css`
    label: PageSkeleton-navigation;
    display: flex;
    align-items: center;
    gap: 2.5rem;
    height: 2.875rem;
  `,
};

export default PageSkeleton;
