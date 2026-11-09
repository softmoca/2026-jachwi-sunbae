import { css } from '@emotion/css';
import type { FormEvent } from 'react';
import { useId } from 'react';

import Icon from '../icon/Icon';

type SearchFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  shape?: 'rounded' | 'pill';
  onBack?: () => void;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onClear?: () => void;
  showSubmitButton?: boolean;
  /** 다른 form 안에 배치할 때 중첩 form을 피한다. */
  renderAsForm?: boolean;
};

const SearchField = ({
  label,
  value,
  placeholder,
  maxLength,
  disabled = false,
  autoFocus = false,
  className,
  shape = 'rounded',
  onBack,
  onValueChange,
  onSubmit,
  onClear,
  showSubmitButton = true,
  renderAsForm = true,
}: SearchFieldProps) => {
  const inputId = useId();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!disabled) onSubmit();
  };

  const clear = () => {
    onValueChange('');
    onClear?.();
  };

  const fieldContent = (
    <>
      <label className={styles.srOnly} htmlFor={inputId}>
        {label}
      </label>
      {onBack !== undefined ? (
        <button type="button" className={styles.backButton} aria-label="뒤로 가기" onClick={onBack}>
          <Icon name="arrow-left" size={18} />
        </button>
      ) : (
        <Icon name="search" size={18} className={styles.searchIcon} />
      )}
      <input
        id={inputId}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        enterKeyHint="search"
        autoFocus={autoFocus}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.nativeEvent.isComposing) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      />

      {value.length > 0 && (
        <button className={styles.clear} type="button" aria-label="검색어 지우기" disabled={disabled} onClick={clear}>
          {/* 아이폰 입력창처럼 회색 동그라미 안에 흰 x를 둔다. */}
          <span className={styles.clearIcon}>
            <Icon name="close" size={11} />
          </span>
        </button>
      )}
      {showSubmitButton && (
        <button
          className={styles.submit}
          type={renderAsForm ? 'submit' : 'button'}
          disabled={disabled}
          onClick={renderAsForm ? undefined : onSubmit}
        >
          검색
        </button>
      )}
    </>
  );

  const classNames = `${styles.search} ${shape === 'pill' ? styles.pill : ''} ${showSubmitButton ? '' : styles.withoutSubmit} ${className ?? ''}`;
  if (renderAsForm) {
    return (
      <form className={classNames} role="search" onSubmit={submit}>
        {fieldContent}
      </form>
    );
  }

  return (
    <div
      className={classNames}
      role="search"
      onKeyDown={(event) => {
        if (
          event.key === 'Enter' &&
          event.target instanceof HTMLInputElement &&
          !event.nativeEvent.isComposing &&
          !disabled
        ) {
          event.preventDefault();
          onSubmit();
        }
      }}
    >
      {fieldContent}
    </div>
  );
};

const styles = {
  search: css`
    label: SearchField-search;
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    min-height: 2.5rem;
    align-items: center;
    margin: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;

    /* 입력할 때 테두리를 검게 바꾸지 않는다. */

    & input {
      width: 100%;
      min-width: 0;
      min-height: 2.4rem;
      padding: 0.55rem 0.5rem;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--color-ink);
      font: inherit;
    }

    & input::placeholder {
      color: var(--color-placeholder);
    }
  `,

  pill: css`
    label: SearchField-pill;
    border-radius: 999px;
  `,

  withoutSubmit: css`
    label: SearchField-withoutSubmit;
    grid-template-columns: auto minmax(0, 1fr) auto;
  `,

  searchIcon: css`
    label: SearchField-searchIcon;
    margin-left: 0.85rem;
    color: var(--color-ink);
  `,

  backButton: css`
    label: SearchField-backButton;
    display: grid;
    width: 2.35rem;
    height: 2.35rem;
    margin-left: 0.25rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-ink);
    cursor: pointer;
    place-items: center;
  `,

  clear: css`
    label: SearchField-clear;
    min-width: 2.75rem;
    min-height: 2.35rem;
    border: 0;
    background: transparent;
    cursor: pointer;
    display: grid;
    place-items: center;
  `,

  /* 아이폰 입력창의 지우기 버튼처럼 옅은 회색 동그라미에 흰 x. */
  clearIcon: css`
    label: SearchField-clearIcon;
    display: grid;
    width: 1.1rem;
    height: 1.1rem;
    place-items: center;
    border-radius: 50%;
    background: #c7c9ce;
    color: #fff;
  `,

  submit: css`
    label: SearchField-submit;
    min-width: 2.75rem;
    min-height: 2.35rem;
    border: 0;
    background: transparent;
    color: var(--color-ink);
    cursor: pointer;
    padding: 0 0.85rem 0 0.4rem;
    font-weight: 800;
  `,

  srOnly: css`
    label: SearchField-srOnly;
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `,
};

export default SearchField;
