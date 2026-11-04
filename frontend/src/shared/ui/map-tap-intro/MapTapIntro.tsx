import { css, cx, keyframes } from '@emotion/css';

type MapTapIntroProps = {
  /** 크게 적는 한 줄. 무엇을 누르면 되는지 적는다. */
  title: string;
  /** 그 아래 작은 설명. */
  description?: string;
  /** 있으면 건너뛰기 버튼을 둔다. 안내를 언제 다시 띄울지는 쓰는 화면이 정한다. */
  onSkip?: () => void;
  /** 화면마다 다른 겹침 순서(z-index) 등을 덧씌운다. */
  className?: string;
};

/**
 * 지도를 직접 눌러 보게 이끄는 안내. 지도 위를 살짝 어둡게 덮고 손가락이 지도를 톡 누르는 움직임을 보여 준다.
 * 안내는 지도 조작을 막지 않아 그대로 지도를 누를 수 있다(건너뛰기만 누를 수 있다).
 * 본 방 기록 지도의 첫 진입 안내와 동네 찾기의 출퇴근 장소 고르기 안내가 함께 쓴다. 언제 띄우고 닫을지는 쓰는 화면이 정한다.
 */
const MapTapIntro = ({ title, description, onSkip, className }: MapTapIntroProps) => (
  <div className={cx(styles.overlay, className)} role="note" aria-label="지도 사용 안내">
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
      <strong>{title}</strong>
      {description && <small>{description}</small>}
    </p>
    {onSkip && (
      <button type="button" className={styles.skip} onClick={onSkip}>
        건너뛰기
      </button>
    )}
  </div>
);

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
    label: MapTapIntro-overlay;
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
    /* 안내 위로 누른 손가락도 그대로 지도에 닿게 한다. 건너뛰기만 누를 수 있다. */
    pointer-events: none;
  `,

  stage: css`
    label: MapTapIntro-stage;
    position: relative;
    width: 6rem;
    height: 7rem;
  `,

  /* 손끝 자리(위 가운데)에서 퍼지는 노란 고리. */
  ripple: css`
    label: MapTapIntro-ripple;
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
    label: MapTapIntro-finger;
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
    label: MapTapIntro-text;
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

  skip: css`
    label: MapTapIntro-skip;
    padding: 0.55rem 1.2rem;
    border: 1px solid rgb(255 255 255 / 70%);
    border-radius: 2rem;
    background: rgb(20 23 28 / 45%);
    color: white;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    pointer-events: auto;
  `,
};

export default MapTapIntro;
