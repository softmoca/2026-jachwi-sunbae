import { css, cx, keyframes } from '@emotion/css';

type AreaSkeletonProps = {
  /** 어느 영역 자리인지. 목록 칸과 지도 칸을 구분해 시험과 화면 읽기에서 가리킨다. */
  area: 'list' | 'map';
  /** 화면 읽기 프로그램에 알릴 문구. 없으면 장식으로만 둔다. 한 화면에서는 한 영역만 알린다. */
  label?: string;
  className?: string;
};

/**
 * 지도 화면(본 방 기록, 동네 찾기)을 처음 열 때 목록 영역과 지도 영역의 배치만 채우는 뼈대.
 * 개수나 높이를 미리 알 수 없는 카드, 칩, 필터 모양은 그리지 않고 영역 하나를 통째로 채운다.
 * 라우트 대체 화면과 함께 첫 번들에 들어가므로 스타일을 작게 둔다.
 */
const AreaSkeleton = ({ area, label, className }: AreaSkeletonProps) => (
  <div
    className={cx(styles.area, className)}
    data-testid={`${area}-area-skeleton`}
    {...(label ? { role: 'status' } : { 'aria-hidden': true })}
  >
    {label && <span className="sr-only">{label}</span>}
  </div>
);

const shimmerKeyframes = keyframes`
  to {
    background-position: -200% 0;
  }
`;

const styles = {
  area: css`
    label: AreaSkeleton-area;
    flex: 1;
    width: 100%;
    height: 100%;
    min-height: 0;
    background: linear-gradient(90deg, #eff1f5 25%, #e3e6eb 50%, #eff1f5 75%);
    background-size: 200% 100%;
    animation: ${shimmerKeyframes} 1.2s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `,
};

export default AreaSkeleton;
