import { css, keyframes } from '@emotion/css';
import { useEffect, useState } from 'react';

import { hasSeenRecordsMapIntro, markRecordsMapIntroSeen } from '../../model/recordsMapIntro';

/** 안내를 띄우며 다가가는 배율. 골목이 보여 어디를 누를지 고를 수 있는 정도다. */
const INTRO_LEVEL = 5;

type Props = {
  /** 지도 배율을 바꾼다. 처음 들어오면 누를 자리가 보이게 다가간다. */
  setLevel: (update: (level: number) => number) => void;
  /** 지도 빈 곳을 눌러 그 자리 말풍선이 떴는지. 뜨면 안내를 마친다. */
  hasTapped: boolean;
};

/**
 * 본 방 기록 지도에 처음 들어왔을 때 지도를 가까이 확대하고, 손가락이 지도를 톡 누르는 움직임으로 지도를 눌러 기록하는 법을 알려 주는 안내.
 * 안내는 화면을 덮어 누른 손가락이 밑의 마커나 지도에 닿지 않게 막고, 어디를 누르든 안내만 닫는다. 닫은 뒤 지도를 누르면 그 자리에 메모와 매물 말풍선이 뜬다.
 * 한 번 닫으면 다시 띄우지 않는다.
 */
const RecordMapTapIntro = ({ setLevel, hasTapped }: Props) => {
  const [isOpen, setIsOpen] = useState(() => !hasSeenRecordsMapIntro());
  // 처음 한 번만 누를 자리가 보이게 다가간다. 이미 더 가까이 보고 있으면 그대로 둔다.
  const [startedOpen] = useState(isOpen);
  useEffect(() => {
    if (startedOpen) setLevel((level) => Math.min(level, INTRO_LEVEL));
  }, [startedOpen, setLevel]);
  const finish = () => {
    markRecordsMapIntroSeen();
    setIsOpen(false);
  };
  useEffect(() => {
    if (isOpen && hasTapped) finish();
  }, [isOpen, hasTapped]);
  if (!isOpen) return null;
  return (
    <div className={styles.overlay} role="note" aria-label="지도 사용 안내">
      <div className={styles.stage} aria-hidden="true">
        <span className={styles.ripple} />
        <svg className={styles.finger} viewBox="0 0 64 80" width="64" height="80">
          {/* 집게손가락을 편 손. 손끝(32, 6)이 지도를 누르는 자리다. */}
          <path
            d="M26 30V12a6 6 0 0 1 12 0v22l3-1.5a5.5 5.5 0 0 1 7.6 3.1l.4 1.4 2.4-.8a5.5 5.5 0 0 1 7 4.2l.6 3V58c0 10-8 18-18 18h-6c-6.5 0-12.3-3.6-15.3-9.4L8.6 52a5.5 5.5 0 0 1 9.4-5.6L26 56Z"
            fill="#fff"
            stroke="#25282d"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M38 34v10M48.6 36v9" stroke="#25282d" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className={styles.text}>
        <strong>지도를 눌러 보세요</strong>
        <small>누른 자리에 거리 메모를 남기거나 본 방을 기록할 수 있어요</small>
      </p>
      <button type="button" className={styles.skip} onClick={finish}>
        건너뛰기
      </button>
      {/* 안내 아무 곳이나 눌러도 닫는다. 밑의 마커가 눌리지 않게 화면 전체를 덮는다. 키보드는 건너뛰기 버튼으로 닫는다. */}
      <button type="button" className={styles.dismissArea} aria-hidden="true" tabIndex={-1} onClick={finish} />
    </div>
  );
};

/* 손가락이 내려와 누르고 다시 올라간다. 누르는 순간 손끝에서 고리가 퍼진다. */
const tapKeyframes = keyframes`
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  30% {
    transform: translateY(0.6rem) scale(0.94);
  }
  45% {
    transform: translateY(0.6rem) scale(0.94);
  }
  70% {
    transform: translateY(0) scale(1);
  }
`;

const rippleKeyframes = keyframes`
  0%,
  28% {
    opacity: 0;
    transform: scale(0.3);
  }
  35% {
    opacity: 0.95;
  }
  80%,
  100% {
    opacity: 0;
    transform: scale(1.6);
  }
`;

const styles = {
  overlay: css`
    label: RecordMapTapIntro-overlay;
    position: absolute;
    inset: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    padding: 1.5rem;
    background: rgb(20 23 28 / 35%);
    color: white;
    text-align: center;
    /* 안내가 화면을 덮는 동안에는 밑의 지도와 마커가 눌리지 않는다. 누르면 안내만 닫는다(dismissArea). */
  `,

  dismissArea: css`
    label: RecordMapTapIntro-dismissArea;
    position: absolute;
    inset: 0;
    z-index: 0;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  `,

  stage: css`
    label: RecordMapTapIntro-stage;
    position: relative;
    width: 6rem;
    height: 7rem;
  `,

  /* 손끝 자리(위 가운데)에서 퍼지는 노란 고리. */
  ripple: css`
    label: RecordMapTapIntro-ripple;
    position: absolute;
    top: 0;
    left: 50%;
    width: 3.5rem;
    height: 3.5rem;
    margin: -1.75rem 0 0 -1.75rem;
    border: 3px solid var(--color-brand-yellow);
    border-radius: 50%;
    animation: ${rippleKeyframes} 1.8s ease-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      opacity: 0.8;
    }
  `,

  finger: css`
    label: RecordMapTapIntro-finger;
    position: absolute;
    top: 0.2rem;
    left: 50%;
    width: 4.5rem;
    height: auto;
    margin-left: -2.25rem;
    filter: drop-shadow(0 0.3rem 0.6rem rgb(0 0 0 / 30%));
    transform-origin: 50% 10%;
    animation: ${tapKeyframes} 1.8s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `,

  text: css`
    label: RecordMapTapIntro-text;
    display: grid;
    gap: 0.35rem;
    margin: 0;
    text-shadow: 0 1px 6px rgb(0 0 0 / 45%);

    & strong {
      font-size: 1.1rem;
    }

    & small {
      color: rgb(255 255 255 / 82%);
      font-size: 0.85rem;
      word-break: keep-all;
    }
  `,

  /* 화면을 덮는 dismissArea보다 위에 두어 건너뛰기를 바로 누를 수 있게 한다. 손가락 그림과 글은 그 밑에 깔려 눌러도 안내를 닫는다. */
  skip: css`
    label: RecordMapTapIntro-skip;
    position: relative;
    z-index: 1;
    padding: 0.55rem 1.2rem;
    border: 1px solid rgb(255 255 255 / 70%);
    border-radius: 2rem;
    background: rgb(20 23 28 / 45%);
    color: white;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  `,
};

export default RecordMapTapIntro;
