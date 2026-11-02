import { css, cx, keyframes } from '@emotion/css';
import type { ButtonHTMLAttributes, MouseEvent, ReactNode, Ref } from 'react';
import type { LinkProps } from 'react-router-dom';
import { Link } from 'react-router-dom';

import useDelayedLoading from '@/shared/lib/hooks/useDelayedLoading';

export type ButtonVariant = 'primary' | 'soft' | 'secondary' | 'neutral' | 'danger' | 'text';

export type ButtonSize = 'medium' | 'large';

type SharedButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  /** `large`는 높이 52px·글자 18px로, 로그인처럼 화면의 주 행동 버튼에 쓴다. */
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> &
  SharedButtonProps & {
    ref?: Ref<HTMLButtonElement>;
    isLoading?: boolean;
    loadingLabel?: string;
  };

type ButtonLinkProps = Omit<LinkProps, 'children'> & SharedButtonProps;

const buttonClassName = (variant: ButtonVariant, size: ButtonSize, fullWidth: boolean, className: string | undefined) =>
  [
    styles.button,
    styles[variant],
    size === 'large' ? styles.large : '',
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

/**
 * 공용 버튼. `isLoading`이면 반응은 바로, 로딩 UI만 늦게 보여 준다.
 * 사용자가 눌러 시작한 요청이라 두 번째 누름은 바로 막고 화면 읽기 프로그램에도 `aria-busy`로 바로 알린다.
 * 스피너와 흐린 비활성화 모양은 요청이 300ms를 넘길 때만 보여, 빠른 응답에서 버튼이 깜빡이지 않게 한다.
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  className,
  isLoading = false,
  loadingLabel = '처리 중…',
  disabled,
  type = 'button',
  ref,
  onClick,
  ...buttonProps
}: ButtonProps) => {
  const isSpinnerVisible = useDelayedLoading(isLoading);
  // 모양은 그대로여도 요청 중에는 두 번째 요청을 보내지 않는다. 제출 버튼은 폼 제출까지 막는다.
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isLoading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  return (
    <button
      {...buttonProps}
      ref={ref}
      className={buttonClassName(variant, size, fullWidth, className)}
      type={type}
      disabled={disabled === true || isSpinnerVisible}
      aria-busy={isLoading || undefined}
      onClick={handleClick}
    >
      {isSpinnerVisible && <span className={styles.spinner} aria-hidden="true" />}
      <span>{isSpinnerVisible ? loadingLabel : children}</span>
    </button>
  );
};

export const ButtonLink = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  className,
  ...linkProps
}: ButtonLinkProps) => (
  <Link {...linkProps} className={buttonClassName(variant, size, fullWidth, className)}>
    {children}
  </Link>
);

const spinKeyframes = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const styles = {
  button: css`
    label: Button-button;
    display: inline-flex;
    min-height: 2.65rem;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.62rem 0.9rem;
    border: 1px solid transparent;
    border-radius: 0.75rem;
    font-size: 0.8rem;
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition:
      background-color 0.18s ease,
      border-color 0.18s ease,
      color 0.18s ease;

    /* 아이콘·이모티콘과 한글이 각자의 글꼴 baseline에 끌려가지 않게 한 줄의 가운데를 공유한다. */
    & > span {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    & > span svg {
      display: block;
      flex: none;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.52;
    }
  `,

  /* 한 화면의 주 행동처럼 크게 두는 버튼. 높이 52px, 글자 18px. */
  large: css`
    label: Button-large;
    min-height: 3.25rem;
    padding: 0.875rem 1.25rem;
    font-size: 1.125rem;
    line-height: 1.5rem;
  `,

  primary: css`
    label: Button-primary;
    background: var(--color-brand-blue);
    color: var(--color-on-card-accent);

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--color-brand-blue) 88%, black);
    }
  `,

  soft: css`
    label: Button-soft;
    background: var(--color-action);
    color: var(--color-on-action);
    font-weight: 750;

    &:hover:not(:disabled) {
      background: var(--color-action-hover);
    }
  `,

  // 다른 요소의 선택자에서 `.Button-secondary`로 가리킨다.
  secondary: cx(
    css`
      label: Button-secondary;
      border-color: var(--color-border-strong);
      background: var(--color-surface);
      color: var(--color-ink);

      &:hover:not(:disabled) {
        background: var(--color-surface-muted);
      }
    `,
    'Button-secondary',
  ),

  // 다른 요소의 선택자에서 `.Button-neutral`로 가리킨다.
  neutral: cx(
    css`
      label: Button-neutral;
      border-color: transparent;
      background: var(--color-surface-neutral);
      color: var(--color-ink-soft);

      &:hover:not(:disabled) {
        background: var(--color-surface-disabled);
      }
    `,
    'Button-neutral',
  ),

  danger: css`
    label: Button-danger;
    background: var(--color-error);
    color: var(--color-on-primary);

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--color-error) 84%, var(--color-ink));
    }
  `,

  // 다른 요소의 선택자에서 `.Button-text`로 가리킨다.
  text: cx(
    css`
      label: Button-text;
      min-height: 2.75rem;
      padding-right: 0.6rem;
      padding-left: 0.6rem;
      background: transparent;
      color: var(--color-primary-dark);
    `,
    'Button-text',
  ),

  fullWidth: css`
    label: Button-fullWidth;
    width: 100%;
  `,

  spinner: css`
    label: Button-spinner;
    width: 1rem;
    height: 1rem;
    border: 2px solid color-mix(in srgb, var(--color-on-primary) 36%, transparent);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: ${spinKeyframes} 700ms linear infinite;

    .Button-secondary &,
    .Button-neutral &,
    .Button-text & {
      border-color: color-mix(in srgb, var(--color-primary) 22%, transparent);
      border-top-color: currentColor;
    }
  `,
};
