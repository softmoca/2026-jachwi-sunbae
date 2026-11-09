import { css, cx } from '@emotion/css';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** 카드 바탕색과 글자색. `brand`는 대표 행동, `informative`는 안내, `neutral`은 일반 기능에 쓴다. */
export type ActionCardTone = 'neutral' | 'brand' | 'informative';
/** 제목 크기. 한 화면의 대표 카드만 `large`로 둔다. */
export type ActionCardSize = 'medium' | 'large';
/** 그림이 카드에 놓이는 방식. `corner`는 오른쪽 아래 모서리에 걸치고, `peek`는 아래 가장자리에서 고개를 내민다. */
export type ActionCardIllustrationPlacement = 'corner' | 'peek';

type ActionCardBaseProps = {
  title: ReactNode;
  description?: ReactNode;
  tone?: ActionCardTone;
  size?: ActionCardSize;
  /** 카드 가장자리에 걸치는 그림. 보통 `ActionCardIllustration`을 넣고, 직접 만든 장면도 넣을 수 있다. */
  illustration?: ReactNode;
  /** 제목만으로 뜻이 부족할 때 쓰는 접근성 이름. */
  'aria-label'?: string;
  /** 크기·배치처럼 화면마다 다른 레이아웃만 덧붙인다. */
  className?: string;
};

type ActionCardProps = ActionCardBaseProps & ({ to: string; onClick?: never } | { to?: never; onClick?: () => void });

/**
 * 제목·설명과 3D 그림으로 기능을 안내하는 큰 카드. 화면 이동이면 `to`로 링크를, 동작이면 `onClick`으로 버튼을 그린다.
 * 마우스를 올리면 카드가 살짝 떠오르고, 그림은 놓인 방식에 맞게 움직인다.
 */
const ActionCard = ({
  title,
  description,
  tone = 'neutral',
  size = 'medium',
  illustration,
  'aria-label': ariaLabel,
  className,
  to,
  onClick,
}: ActionCardProps) => {
  const classes = [styles.card, styles[tone], size === 'large' && styles.large, className].filter(Boolean).join(' ');
  const content = (
    <>
      <span className={styles.text}>
        <strong className={styles.title}>{title}</strong>
        {description && <small className={styles.description}>{description}</small>}
      </span>
      {illustration}
    </>
  );

  if (to !== undefined) {
    return (
      <Link className={classes} to={to} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} aria-label={ariaLabel} onClick={onClick}>
      {content}
    </button>
  );
};

type ActionCardIllustrationProps = {
  src: string;
  /** 고해상도 화면용 2배 이미지. 주면 `srcSet`으로 화면 배율에 맞춰 고른다. */
  src2x?: string;
  /** 원본 이미지 크기. 그려지는 크기는 `placement`가 정한다. */
  width: number;
  height: number;
  placement?: ActionCardIllustrationPlacement;
};

/** `ActionCard`의 `illustration`에 넣는 장식용 그림. 화면 낭독기는 읽지 않는다. */
export const ActionCardIllustration = ({
  src,
  src2x,
  width,
  height,
  placement = 'corner',
}: ActionCardIllustrationProps) => (
  <img
    className={`${styles.illustration} ${styles[placement]}`}
    src={src}
    srcSet={src2x ? `${src} 1x, ${src2x} 2x` : undefined}
    alt=""
    width={width}
    height={height}
  />
);

const styles = {
  // 다른 요소의 선택자에서 `.ActionCard-card`로 가리킨다.
  card: cx(
    css`
      label: ActionCard-card;
      --action-card-surface: var(--color-card-surface);
      --action-card-ink: var(--color-ink);
      position: relative;
      display: block;
      overflow: hidden;
      border: 0;
      border-radius: var(--radius-card);
      padding: 0;
      background: var(--action-card-surface);
      color: var(--action-card-ink);
      font: inherit;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
      transition: transform 150ms ease;

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 3px;
      }

      @media (hover: hover) {
        &:hover {
          transform: translateY(-2px);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    `,
    'ActionCard-card',
  ),

  /* 톤: 바탕색과 글자색만 바꾼다. */
  neutral: css`
    label: ActionCard-neutral;
    --action-card-surface: var(--color-card-surface);
    --action-card-ink: var(--color-ink);
  `,

  brand: css`
    label: ActionCard-brand;
    --action-card-surface: var(--color-card-brand-surface);
    --action-card-ink: var(--color-on-card-accent);
  `,

  informative: css`
    label: ActionCard-informative;
    --action-card-surface: var(--color-card-informative-surface);
    --action-card-ink: var(--color-on-card-accent);
  `,

  /* 글자 안쪽 여백은 화면이 넓어질 때 키울 수 있게 변수로 받는다. */
  // 다른 요소의 선택자에서 `.ActionCard-text`로 가리킨다.
  text: cx(
    css`
      label: ActionCard-text;
      position: absolute;
      top: var(--action-card-text-inset, 1.15rem);
      left: var(--action-card-text-inset, 1.15rem);
      z-index: 1;
      display: grid;
      gap: var(--action-card-text-gap, 0.35rem);
    `,
    'ActionCard-text',
  ),

  // 다른 요소의 선택자에서 `.ActionCard-title`로 가리킨다.
  title: cx(
    css`
      label: ActionCard-title;
      font-size: var(--action-card-title-size, 1rem);
      line-height: var(--action-card-title-line-height, 1.25);
      letter-spacing: -0.04em;
    `,
    'ActionCard-title',
  ),

  // 다른 요소의 선택자에서 `.ActionCard-description`로 가리킨다.
  description: cx(
    css`
      label: ActionCard-description;
      font-size: var(--action-card-description-size, 0.66rem);
      opacity: 0.8;

      @media (max-width: 360px) {
        font-size: 0.72rem;
      }
    `,
    'ActionCard-description',
  ),

  large: css`
    label: ActionCard-large;

    /* 크기: 대표 카드는 제목을 크게 하고 설명을 제목에 붙인다. */
    & .ActionCard-text {
      top: var(--action-card-large-text-inset, 1.1rem);
      left: var(--action-card-large-text-inset, 0.9rem);
      gap: 0.1rem;
    }

    & .ActionCard-title {
      font-size: var(--action-card-large-title-size, 1.55rem);
      line-height: 1.2;
      white-space: nowrap;
    }

    & .ActionCard-description {
      font-size: var(--action-card-large-description-size, 0.8rem);
      font-weight: 500;
      opacity: 0.95;
    }
  `,

  illustration: css`
    label: ActionCard-illustration;
    position: absolute;
    z-index: 0;
    height: auto;
    pointer-events: none;
    transition: transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1);

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `,

  corner: css`
    label: ActionCard-corner;
    right: -0.6rem;
    bottom: -0.9rem;
    width: 7.4rem;

    @media (any-hover: hover) {
      .ActionCard-card:hover & {
        transform: translateY(-5%) rotate(-4deg);
      }
    }
  `,

  peek: css`
    label: ActionCard-peek;
    right: -1rem;
    bottom: -2.1rem;
    width: 4.2rem;
    transform-origin: 50% 100%;

    @media (any-hover: hover) {
      .ActionCard-card:hover & {
        transform: translateY(-6%) rotate(-5deg);
      }
    }
  `,
};

export default ActionCard;
