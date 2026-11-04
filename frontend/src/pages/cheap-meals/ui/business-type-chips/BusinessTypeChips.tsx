import { css } from '@emotion/css';

import type { BusinessTypeCount } from '../../model/businessTypeFilter';

type BusinessTypeChipsProps = {
  types: BusinessTypeCount[];
  /** 고른 업종. null이면 전체다. */
  selected: string | null;
  /** 업종을 거르기 전 가게 수. `전체` 칩에 붙인다. */
  total: number;
  onSelect: (type: string | null) => void;
  /** 지도 위에 띄울 때 켠다. 바탕과 떨어져 보이게 칩에 그림자를 둔다. */
  floating?: boolean;
};

/**
 * 착한가격업소 목록을 업종 하나로 거르는 칩. 일식, 기타비요식업처럼 받은 업종 이름을 그대로 쓰고,
 * 다시 누르면 전체로 돌아간다. 칩이 많으면 한 줄에서 옆으로 밀어 본다.
 */
const BusinessTypeChips = ({ types, selected, total, onSelect, floating = false }: BusinessTypeChipsProps) => {
  if (types.length < 2 && selected === null) return null;
  return (
    <div className={styles.chips} data-floating={floating || undefined} role="group" aria-label="업종으로 거르기">
      <button type="button" className={styles.chip} aria-pressed={selected === null} onClick={() => onSelect(null)}>
        전체 <span>{total}</span>
      </button>
      {types.map(({ name, count }) => (
        <button
          key={name}
          type="button"
          className={styles.chip}
          aria-pressed={selected === name}
          onClick={() => onSelect(selected === name ? null : name)}
        >
          {name} <span>{count}</span>
        </button>
      ))}
    </div>
  );
};

const styles = {
  chips: css`
    label: BusinessTypeChips-chips;
    display: flex;
    gap: 0.4rem;
    overflow-x: auto;
    margin: 0 -0.85rem;
    padding: 0.1rem 0.85rem 0.35rem;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  `,
  chip: css`
    label: BusinessTypeChips-chip;
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 0.25rem;
    min-height: 2.25rem;
    padding: 0 0.8rem;
    border: 1px solid var(--color-border);
    border-radius: 99px;
    background: var(--color-surface);
    color: var(--color-ink);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    & span {
      color: var(--color-muted);
      font-weight: 500;
    }
    [data-floating] > & {
      box-shadow: var(--shadow-floating);
    }
    &[aria-pressed='true'] {
      border-color: var(--color-action);
      background: var(--color-action);
      color: var(--color-on-action);
    }
    &[aria-pressed='true'] span {
      color: inherit;
    }
    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
    }
  `,
};

export default BusinessTypeChips;
