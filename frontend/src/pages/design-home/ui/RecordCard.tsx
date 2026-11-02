import { css, cx, keyframes } from '@emotion/css';

import { RECORDS_PATH } from '@/shared/lib/navigation/appPaths';
import ActionCard from '@/shared/ui/action-card/ActionCard';

import recordHouse from '../assets/record-house.webp';
import recordNotebook from '../assets/record-notebook.webp';
import recordPencil from '../assets/record-pencil.webp';

/** 홈의 대표 카드. 노트·연필·집을 카드 가장자리에 걸쳐 두고, 처음 그려질 때와 마우스를 올릴 때 조금씩 움직인다. */
const RecordCard = ({ className }: { className?: string }) => (
  <ActionCard
    tone="brand"
    size="large"
    title="본 방을 기록해요"
    description="가격, 사진, 체크리스트를 한곳에 모아요"
    to={RECORDS_PATH}
    className={`${styles.record} ${className ?? ''}`.trim()}
    illustration={
      <span className={styles.scene} aria-hidden="true">
        <img className={styles.notebook} src={recordNotebook} alt="" width={480} height={480} />
        <img className={styles.pencil} src={recordPencil} alt="" width={480} height={480} />
        <img className={styles.house} src={recordHouse} alt="" width={480} height={480} />
      </span>
    }
  />
);

/* 반동 없이 위에서 내려와 제자리에 멈춘다. */
const recordDropKeyframes = keyframes`
  from {
    opacity: 0;
    transform: translateY(-14%);
  }
  to {
    opacity: 1;
    transform: var(--rest);
  }
`;

const styles = {
  /* 노트는 왼쪽 아래, 연필은 왼쪽 위, 집은 오른쪽에 두고 카드 가장자리에서 조금씩 잘리게 한다. */
  // 다른 요소의 선택자에서 `.RecordCard-scene`로 가리킨다.
  scene: cx(
    css`
      label: RecordCard-scene;
      position: absolute;
      inset: 0;
      pointer-events: none;

      & img {
        position: absolute;
        height: auto;
        transform: var(--rest);
        transition: transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1);
        /* 처음 그려질 때 노트·연필·집이 차례로 위에서 투명하게 떨어지며 나타난다. */
        animation: ${recordDropKeyframes} 520ms cubic-bezier(0.22, 1, 0.36, 1) var(--drop-delay) 1 backwards;
      }

      @media (prefers-reduced-motion: reduce) {
        & img {
          animation: none;
          transition: none;
        }
      }
    `,
    'RecordCard-scene',
  ),

  pencil: css`
    label: RecordCard-pencil;
    --rest: rotate(0deg);
    --lift: translateY(8%) rotate(16deg);
    --drop-delay: 260ms;
    top: 34%;
    left: -14%;
    width: 62%;
    transform-origin: 80% 80%;
  `,

  notebook: css`
    label: RecordCard-notebook;
    --rest: translateY(0);
    --lift: rotate(-6deg);
    --drop-delay: 80ms;
    bottom: -9%;
    left: -26%;
    width: 92%;
  `,

  house: css`
    label: RecordCard-house;
    --rest: translateY(0);
    --lift: translateY(-7%) rotate(-7deg);
    --drop-delay: 440ms;
    right: -26%;
    bottom: 16%;
    width: 84%;
  `,

  record: css`
    label: RecordCard-record;

    /* 마우스를 올리거나 키보드로 고르거나 손가락으로 누르면 연필은 내려가며 돌고, 노트는 돌고, 집은 떠오르며 기운다. */
    &:focus-visible .RecordCard-scene img,
    &:active .RecordCard-scene img {
      transform: var(--lift);
    }

    /* 터치와 마우스를 함께 쓰는 기기도 마우스가 있으면 반응하도록 any-hover로 판단한다. */
    @media (any-hover: hover) {
      &:hover .RecordCard-scene img {
        transform: var(--lift);
      }
    }
  `,
};

export default RecordCard;
