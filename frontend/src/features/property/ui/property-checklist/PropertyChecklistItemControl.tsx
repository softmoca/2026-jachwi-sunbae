import { css } from '@emotion/css';
import { useEffect, useId, useRef, useState } from 'react';

import useDelayedLoading from '@/shared/lib/hooks/useDelayedLoading';
import { Button } from '@/shared/ui/button/Button';
import TextAreaField from '@/shared/ui/text-field/TextAreaField';

import {
  usePropertyChecklistItemMemoMutation,
  usePropertyChecklistItemStatusMutation,
} from '../../api/usePropertyChecklistItemMutations';
import type { PropertyChecklistItem, PropertyChecklistItemStatus } from '../../model/Property';

const STATUS_OPTIONS = [
  { value: 'GOOD', label: '괜찮음' },
  { value: 'CAUTION', label: '주의' },
] as const;

type PropertyChecklistItemControlProps = {
  readonly propertyId: number;
  readonly propertyChecklistId: number;
  readonly item: PropertyChecklistItem;
};

const PropertyChecklistItemControl = ({ propertyId, propertyChecklistId, item }: PropertyChecklistItemControlProps) => {
  const id = useId();
  const [memo, setMemo] = useState(item.memo);
  const isFocused = useRef(false);
  const statusMutation = usePropertyChecklistItemStatusMutation(propertyId, propertyChecklistId);
  const memoMutation = usePropertyChecklistItemMemoMutation(propertyId, propertyChecklistId);
  const isMemoSavingVisible = useDelayedLoading(memoMutation.isPending);

  useEffect(() => {
    if (!isFocused.current && !memoMutation.isPending && !memoMutation.isError) setMemo(item.memo);
  }, [item.memo, memoMutation.isPending, memoMutation.isError]);

  const saveMemo = () => {
    if (memoMutation.isPending) return;
    const nextMemo = memo.trim();
    if (nextMemo === item.memo) {
      setMemo(item.memo);
      memoMutation.reset();
      return;
    }
    memoMutation.mutate({ itemId: item.itemId, memo: nextMemo });
  };

  const selectStatus = (status: PropertyChecklistItemStatus) => {
    if (statusMutation.isPending) return;
    statusMutation.mutate({ itemId: item.itemId, status: item.status === status ? 'UNCONFIRMED' : status });
  };

  return (
    <li className={styles.item}>
      <div className={styles.row}>
        <div className={styles.question}>
          <strong id={`${id}-question`}>{item.question}</strong>
          <TextAreaField
            label={`${item.question} 메모`}
            variant="inline"
            rows={1}
            maxLength={500}
            placeholder="메모 추가"
            value={memo}
            readOnly={memoMutation.isPending}
            aria-busy={memoMutation.isPending || undefined}
            error={memoMutation.isError ? '메모를 저장하지 못했어요. 다시 저장해 주세요.' : undefined}
            onFocus={() => {
              isFocused.current = true;
            }}
            onBlur={() => {
              isFocused.current = false;
              saveMemo();
            }}
            onChange={(event) => setMemo(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'Escape' && !memoMutation.isPending) {
                setMemo(item.memo);
                memoMutation.reset();
              }
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) event.currentTarget.blur();
            }}
          />
          {isMemoSavingVisible && (
            <span className={styles.feedback} role="status">
              메모 저장 중…
            </span>
          )}
          {memoMutation.isError && (
            <Button variant="text" onClick={saveMemo}>
              메모 다시 저장
            </Button>
          )}
        </div>
        <div className={styles.statuses} role="group" aria-labelledby={`${id}-question`}>
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant="neutral"
              className={styles.statusButton}
              data-status={option.value}
              aria-pressed={item.status === option.value}
              aria-disabled={statusMutation.isPending || undefined}
              onClick={() => selectStatus(option.value)}
            >
              {item.status === option.value && <span aria-hidden="true">✓</span>}
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      {statusMutation.isError && (
        <p className={styles.error} role="alert">
          평가를 저장하지 못했어요. 다시 선택해 주세요.
        </p>
      )}
    </li>
  );
};

const styles = {
  item: css`
    label: PropertyChecklistItemControl-item;
    & + & {
      border-top: 1px solid var(--color-border);
    }
  `,
  row: css`
    label: PropertyChecklistItemControl-row;
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    padding: var(--space-md) 0;
  `,
  question: css`
    label: PropertyChecklistItemControl-question;
    flex: 1 1 auto;
    min-width: 0;
    & > strong {
      display: block;
      font-size: 0.875rem;
      font-weight: 650;
      line-height: 1.55;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
  `,
  statuses: css`
    label: PropertyChecklistItemControl-statuses;
    display: flex;
    flex: none;
    align-items: center;
    gap: 0.25rem;
  `,
  statusButton: css`
    label: PropertyChecklistItemControl-statusButton;
    min-height: 2.5rem;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-size: 0.75rem;
    white-space: nowrap;
    & > span {
      gap: 0.2rem;
    }
    &[data-status='GOOD'][aria-pressed='true'] {
      background: color-mix(in srgb, var(--color-check-good-ink) 14%, var(--color-surface));
      color: var(--color-check-good-ink);
    }
    &[data-status='CAUTION'][aria-pressed='true'] {
      background: color-mix(in srgb, var(--color-check-caution-ink) 14%, var(--color-surface));
      color: var(--color-check-caution-ink);
    }
    &[aria-disabled='true'] {
      cursor: wait;
    }
    @media (pointer: coarse) {
      min-height: 2.75rem;
    }
  `,
  feedback: css`
    label: PropertyChecklistItemControl-feedback;
    color: var(--color-muted);
    font-size: 0.75rem;
  `,
  error: css`
    label: PropertyChecklistItemControl-error;
    color: var(--color-danger);
    font-size: 0.75rem;
  `,
};

export default PropertyChecklistItemControl;
