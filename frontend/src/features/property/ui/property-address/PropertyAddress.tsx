import { css, cx } from '@emotion/css';

import { UNSUPPORTED_ADDRESS_MESSAGE } from '@/features/map/lib/mapAddress';

type PropertyAddressProps = {
  address: string | null;
  /** 놓이는 자리의 글자 크기와 색. 주소가 없으면 색만 흐리게 덮는다. */
  className?: string;
};

/**
 * 매물 카드, 최근 기록, 위치 선택이 함께 쓰는 주소 글.
 * 주소를 찾지 못한 자리에 좌표만으로 만든 매물은 빈칸 대신 흐린 `지원하지 않는 주소입니다`를 보인다.
 */
const PropertyAddress = ({ address, className }: PropertyAddressProps) => (
  <span className={cx(className, address === null && styles.missing)}>{address ?? UNSUPPORTED_ADDRESS_MESSAGE}</span>
);

const styles = {
  /* 놓이는 자리가 부모 선택자로 색을 정해도 덮도록 선택자를 두 번 겹쳐 우선순위를 올린다. */
  missing: css`
    label: PropertyAddress-missing;

    && {
      color: var(--color-muted);
    }
  `,
};

export default PropertyAddress;
