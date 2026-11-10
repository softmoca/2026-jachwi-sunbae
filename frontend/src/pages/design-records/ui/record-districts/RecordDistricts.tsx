import { css } from '@emotion/css';

type RecordDistrictsProps = {
  districts: string[];
  /** 동네별 매물 수. 뱃지 오른쪽에 숫자로 둔다. */
  counts?: Record<string, number>;
  district: string;
  onSelect: (district: string) => void;
  /** 지도 위에 떠 있을 때 고르지 않은 뱃지를 흰 바탕·그림자로 바꿔 지도 위에서도 잘 보이게 한다. */
  overMap?: boolean;
  className?: string;
};

/** 기록한 동네 뱃지 줄. 고른 동네의 기록만 리스트와 지도에 보여 준다. */
const RecordDistricts = ({
  districts,
  counts,
  district,
  onSelect,
  overMap = false,
  className,
}: RecordDistrictsProps) => (
  <nav
    className={`${styles.districts} ${className ?? ''}`.trim()}
    data-over-map={overMap || undefined}
    aria-label="기록한 동네"
  >
    {districts.map((label) => (
      <button key={label} type="button" aria-pressed={district === label} onClick={() => onSelect(label)}>
        {label}
        {counts?.[label] !== undefined && <span>{counts[label]}</span>}
      </button>
    ))}
  </nav>
);

const styles = {
  districts: css`
    label: RecordDistricts-districts;
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding: 0.6rem 1rem 0.85rem;
    scrollbar-width: none;
    flex-shrink: 0;

    &::-webkit-scrollbar {
      display: none;
    }

    & button {
      flex-shrink: 0;
      padding: 0.65rem 1rem;
      border: 0;
      border-radius: 1.5rem;
      background: #f4f4f5;
      color: #82868e;
      font: inherit;
      font-size: 0.8rem;
      cursor: pointer;
    }

    /* 매물 수는 이름 오른쪽에 조금 옅게 붙인다. */
    & button span {
      margin-left: 0.4rem;
      font-weight: 700;
      opacity: 0.7;
    }

    & button[aria-pressed='true'] {
      background: #648fff;
      color: white;
    }

    &[data-over-map='true'] button:not([aria-pressed='true']) {
      background: white;
      box-shadow: 0 2px 8px #00000018;
    }

    & button:focus-visible {
      outline: 2px solid #25282d;
      outline-offset: 3px;
    }

    /* 태블릿 너비부터는 여백과 글자만 키운다. */
    @media (min-width: 768px) {
      padding: 0.6rem 1.5rem 1rem;
    }

    @media (min-width: 768px) {
      & button {
        font-size: 0.92rem;
      }
    }
  `,
};

export default RecordDistricts;
