import { css } from '@emotion/css';
import { useId } from 'react';

type NotificationToggleProps = {
  checked: boolean;
  disabled: boolean;
  /** 받을 수 없는 이유나 실패 안내. 없으면 그리지 않는다. */
  message: string | null;
  onToggle: () => void;
};

/** 알림 받기 토글. 권한은 OS가 직접 묻고, 받을 수 없는 이유만 토글 아래에 알린다. */
const NotificationToggle = ({ checked, disabled, message, onToggle }: NotificationToggleProps) => {
  const labelId = useId();
  return (
    <>
      <div className={styles.row}>
        <p className={styles.label}>
          <strong id={labelId}>알림 받기</strong>
          <span>생활 날씨·배달 할인</span>
        </p>
        <button
          className={styles.toggle}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={labelId}
          disabled={disabled}
          onClick={onToggle}
        >
          <span />
        </button>
      </div>
      {message && (
        <p className={styles.blocker} role="status">
          {message}
        </p>
      )}
    </>
  );
};

const styles = {
  row: css`
    label: NotificationToggle-row;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.7rem;
  `,

  /* 라벨과 받는 알림 종류를 한 줄에 둔다. */
  label: css`
    label: NotificationToggle-label;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.2rem 0.5rem;
    margin: 0;

    & strong {
      font-size: var(--my-text-size, 0.95rem);
    }

    & span {
      color: var(--color-ink-soft);
      font-size: var(--my-subtext-size, 0.78rem);
    }
  `,

  toggle: css`
    label: NotificationToggle-toggle;
    position: relative;
    flex-shrink: 0;
    width: 4rem;
    height: 1.9rem;
    padding: 0;
    border: 0;
    border-radius: 999px;
    /* 회색 카드 위에서도 꺼진 상태가 보이도록 글자색을 섞어 바탕보다 진하게 둔다. */
    background: color-mix(in srgb, var(--color-ink) 22%, transparent);
    cursor: pointer;
    transition: background-color 200ms ease;

    & span {
      position: absolute;
      top: 0.2rem;
      left: 0.2rem;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      background: var(--color-canvas);
      box-shadow: 0 1px 3px rgb(0 0 0 / 20%);
      transition: transform 200ms ease;
    }

    &[aria-checked='true'] {
      background: var(--color-brand-blue);
    }

    &[aria-checked='true'] span {
      transform: translateX(2.1rem);
    }

    &:disabled {
      cursor: progress;
    }

    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      &,
      & span {
        transition: none;
      }
    }
  `,

  blocker: css`
    label: NotificationToggle-blocker;
    margin: 0.6rem 0 0;
    color: var(--color-ink-soft);
    font-size: 0.65rem;
  `,
};

export default NotificationToggle;
