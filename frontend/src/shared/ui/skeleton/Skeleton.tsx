import { css, keyframes } from '@emotion/css';

/** 뼈대 모양. 글자 줄은 8px, 카드와 썸네일은 16px, 원형은 9999px 둥글기를 쓴다. */
export type SkeletonShape = 'text' | 'card' | 'circle' | 'bleed';

const RADIUS: Record<SkeletonShape, string> = { text: '8px', card: '16px', circle: '9999px', bleed: '0' };

type SkeletonProps = {
  /** 실제 요소와 같은 높이. */
  height: string;
  width?: string;
  /** `bleed`는 화면 끝까지 닿아 둥글기가 없는 사진 자리에만 쓴다. */
  shape?: SkeletonShape;
  className?: string;
};

/**
 * 실제 요소 자리를 그대로 잡는 뼈대 한 칸. 읽기 프로그램에는 숨기고, 불러오는 중이라는 안내는 감싸는 쪽이 한 번만 한다.
 * Progress Circle과 함께 쓰지 않는다.
 */
const Skeleton = ({ height, width = '100%', shape = 'text', className }: SkeletonProps) => (
  <span
    aria-hidden="true"
    className={`${styles.skeleton} ${className ?? ''}`.trim()}
    style={{ width, height, borderRadius: RADIUS[shape] }}
  />
);

const shimmer = keyframes`
  to {
    background-position: -200% 0;
  }
`;

const styles = {
  skeleton: css`
    label: Skeleton-skeleton;
    display: block;
    flex: none;
    background: linear-gradient(90deg, #eff1f5 25%, #e3e6eb 50%, #eff1f5 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.2s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `,
};

export default Skeleton;
