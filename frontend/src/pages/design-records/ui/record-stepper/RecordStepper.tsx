import { css, cx } from '@emotion/css';

import Icon from '@/shared/ui/icon/Icon';

import type { RecordNeighbors } from '../../model/recordNavigation';

type Props = {
  neighbors: RecordNeighbors<{ id: string }>;
  /** 넘길 매물을 고른다. 지도 이동과 마커 선택은 부르는 화면이 맡는다. */
  onStep: (recordId: string) => void;
  className?: string;
};

/** 고른 매물에서 목록 순서대로 앞뒤 매물로 넘기는 화살표. 처음과 마지막 매물에서는 그쪽 화살표를 막는다. */
const RecordStepper = ({ neighbors, onStep, className }: Props) => {
  const { previous, next, position, total } = neighbors;
  return (
    <div className={cx(styles.stepper, className)} role="group" aria-label="매물 넘기기">
      <button
        type="button"
        aria-label="이전 매물"
        disabled={previous === null}
        onClick={() => previous && onStep(previous.id)}
      >
        <Icon name="chevron-left" size={20} />
      </button>
      <span className={styles.position}>
        <span aria-hidden="true">
          {position}/{total}
        </span>
        <span className="sr-only">
          {total}개 중 {position}번째
        </span>
      </span>
      <button type="button" aria-label="다음 매물" disabled={next === null} onClick={() => next && onStep(next.id)}>
        <Icon name="chevron-right" size={20} />
      </button>
    </div>
  );
};

const styles = {
  stepper: css`
    label: RecordStepper-stepper;
    display: flex;
    flex: none;
    align-items: center;
    gap: 0.1rem;

    & > button {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: none;
      color: var(--color-ink);
      cursor: pointer;
    }

    & > button:disabled {
      color: var(--color-border-strong);
      cursor: default;
    }

    & > button:focus-visible {
      outline: 2px solid var(--color-ink);
      outline-offset: 1px;
    }
  `,

  position: css`
    label: RecordStepper-position;
    min-width: 2.25rem;
    color: var(--color-muted);
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
    text-align: center;
  `,
};

export default RecordStepper;
