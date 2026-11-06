import type { Ref, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

import * as styles from './TextField.styles';

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'> & {
  ref?: Ref<HTMLTextAreaElement>;
  label: string;
  helpText?: string;
  error?: string;
  fieldClassName?: string;
  /** 기본은 밑줄. `box`는 네모 테두리, `inline`은 숨김 라벨과 회색 본문 입력이다. */
  variant?: 'box' | 'underline' | 'inline';
};

const TextAreaField = ({
  label,
  helpText,
  error,
  id,
  className,
  fieldClassName,
  variant = 'underline',
  ref,
  ...textareaProps
}: TextAreaFieldProps) => {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const helpId = helpText === undefined ? undefined : `${textareaId}-help`;
  const errorId = error === undefined ? undefined : `${textareaId}-error`;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`${styles.field} ${fieldClassName ?? ''}`} data-variant={variant}>
      <label htmlFor={textareaId} className={variant === 'inline' ? 'sr-only' : undefined}>
        {label}
      </label>
      <div className={styles.control}>
        <textarea
          {...textareaProps}
          ref={ref}
          id={textareaId}
          className={className}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={describedBy}
        />
      </div>
      {helpText !== undefined && (
        <p id={helpId} className={styles.help}>
          {helpText}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
};

export default TextAreaField;
