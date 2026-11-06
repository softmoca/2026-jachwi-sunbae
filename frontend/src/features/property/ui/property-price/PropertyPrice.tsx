import { css, cx } from '@emotion/css';

import { formatPropertyPrice, hasPropertyPrice, type PropertyPriceVariant } from '../../lib/propertyFormat';

type PropertyPriceProps = {
  depositAmount: number;
  monthlyRentAmount: number;
  variant: PropertyPriceVariant;
  /** 놓이는 자리의 글자 크기와 색. 가격을 넣기 전이면 색만 흐리게 덮는다. */
  className?: string;
};

/** 매물 카드, 비교 화면, 최근 기록이 함께 쓰는 가격 글. 미입력 금액은 흐리게 표시하며, 짧은 표기는 `월세 0/0`, 나머지는 `가격 입력 전`을 보인다. */
const PropertyPrice = ({ depositAmount, monthlyRentAmount, variant, className }: PropertyPriceProps) => (
  <span className={cx(className, !hasPropertyPrice(depositAmount, monthlyRentAmount) && styles.pending)}>
    {formatPropertyPrice(depositAmount, monthlyRentAmount, variant)}
  </span>
);

const styles = {
  /* 놓이는 자리가 부모 선택자로 색을 정해도 덮도록 선택자를 두 번 겹쳐 우선순위를 올린다. */
  pending: css`
    label: PropertyPrice-pending;

    && {
      color: var(--color-muted);
    }
  `,
};

export default PropertyPrice;
