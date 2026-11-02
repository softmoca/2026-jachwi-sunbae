import { useEffect, useRef, useState } from 'react';

import {
  usePropertyChecklistItemMemoMutation,
  usePropertyChecklistItemStatusMutation,
} from '@/features/property/api/usePropertyChecklistItemMutations';
import type { PropertyChecklistItem, PropertyChecklistItemStatus } from '@/features/property/model/Property';
import useDelayedLoading from '@/shared/lib/hooks/useDelayedLoading';
import Icon from '@/shared/ui/icon/Icon';

import * as styles from './PropertyChecklistItemControl.styles';

/** 미확인은 아무것도 고르지 않은 상태라 버튼으로 두지 않는다. 고른 상태를 다시 누르면 미확인으로 돌아간다. */
const STATUS_OPTIONS: Array<{ value: Exclude<PropertyChecklistItemStatus, 'UNCONFIRMED'>; label: string }> = [
  { value: 'GOOD', label: '괜찮음' },
  { value: 'CAUTION', label: '주의' },
];

const PropertyChecklistItemControl = ({
  propertyId,
  propertyChecklistId,
  item,
  isMemoEditing,
  isMemoEditDisabled,
  onStartMemoEdit,
  onFinishMemoEdit,
}: {
  propertyId: number;
  propertyChecklistId: number;
  item: PropertyChecklistItem;
  isMemoEditing: boolean;
  isMemoEditDisabled: boolean;
  onStartMemoEdit: () => void;
  onFinishMemoEdit: () => void;
}) => {
  const [memo, setMemo] = useState(item.memo);
  const statusMutation = usePropertyChecklistItemStatusMutation(propertyId, propertyChecklistId);
  const memoMutation = usePropertyChecklistItemMemoMutation(propertyId, propertyChecklistId);
  // 메모 저장은 대부분 금방 끝난다. "저장 중…"과 비활성화 모양은 오래 걸릴 때만 보여 버튼이 번쩍이지 않게 한다.
  // 두 번째 누름은 모양과 상관없이 `memoMutation.isPending`으로 바로 막는다.
  const isMemoSavingVisible = useDelayedLoading(memoMutation.isPending);
  const hasMemo = item.memo.trim() !== '';
  const memoButtonRef = useRef<HTMLButtonElement>(null);
  const wasMemoEditing = useRef(isMemoEditing);

  useEffect(() => {
    if (!isMemoEditing) setMemo(item.memo);
  }, [isMemoEditing, item.memo]);

  // 메모를 저장하거나 취소하면 입력칸이 사라진다. 포커스를 메모 버튼으로 돌려 같은 항목에서 이어 가게 한다.
  useEffect(() => {
    if (wasMemoEditing.current && !isMemoEditing) memoButtonRef.current?.focus();
    wasMemoEditing.current = isMemoEditing;
  }, [isMemoEditing]);

  const selectStatus = (status: PropertyChecklistItemStatus) => {
    // 저장 중에는 누르지 못하게 하되 disabled는 쓰지 않는다. disabled가 되면 포커스가 버튼에서 빠져 화면 처음으로 돌아간다.
    if (statusMutation.isPending) return;
    const nextStatus = item.status === status ? 'UNCONFIRMED' : status;
    statusMutation.mutate({ itemId: item.itemId, status: nextStatus });
  };

  const cancelMemo = () => {
    if (memoMutation.isPending) return;
    setMemo(item.memo);
    onFinishMemoEdit();
  };

  const saveMemo = async () => {
    const nextMemo = memo.trim();
    if (memoMutation.isPending) return;
    if (nextMemo === item.memo) {
      onFinishMemoEdit();
      return;
    }
    try {
      await memoMutation.mutateAsync({ itemId: item.itemId, memo: nextMemo });
      onFinishMemoEdit();
    } catch {
      // 작성 내용을 유지해 같은 자리에서 다시 저장할 수 있게 한다.
    }
  };

  return (
    <li className={styles.item} data-status={item.status}>
      <div className={styles.row}>
        <div className={styles.question}>
          <strong id={`property-checklist-question-${item.itemId}`}>{item.question}</strong>
          {hasMemo && !isMemoEditing && (
            <p className={styles.memoText}>
              <span className="sr-only">메모: </span>
              {item.memo}
            </p>
          )}
        </div>
        <div className={styles.statuses} role="group" aria-labelledby={`property-checklist-question-${item.itemId}`}>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              data-status={option.value}
              aria-pressed={item.status === option.value}
              aria-disabled={statusMutation.isPending || undefined}
              onClick={() => selectStatus(option.value)}
            >
              {option.label}
            </button>
          ))}
          <button
            ref={memoButtonRef}
            type="button"
            className={styles.memoButton}
            aria-label={`${item.question} ${hasMemo ? '메모 편집' : '메모 추가'}`}
            disabled={isMemoEditDisabled || isMemoEditing}
            onClick={onStartMemoEdit}
          >
            <Icon name={hasMemo ? 'edit' : 'plus'} size={16} />
          </button>
        </div>
      </div>
      {isMemoEditing && (
        <div className={styles.memoPanel} id={`property-checklist-memo-${item.itemId}`}>
          <label className="sr-only" htmlFor={`property-checklist-memo-input-${item.itemId}`}>
            {item.question} 메모
          </label>
          <textarea
            id={`property-checklist-memo-input-${item.itemId}`}
            value={memo}
            maxLength={500}
            rows={2}
            // 메모 버튼을 눌러 열었으니 바로 적을 수 있게 포커스를 옮긴다.
            autoFocus
            placeholder="확인한 내용을 메모해 주세요."
            onChange={(event) => setMemo(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') cancelMemo();
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void saveMemo();
            }}
          />
          <div className={styles.memoActions}>
            <button
              type="button"
              className={styles.memoCancelButton}
              disabled={isMemoSavingVisible}
              onClick={cancelMemo}
            >
              취소
            </button>
            <button
              type="button"
              className={styles.memoSaveButton}
              disabled={isMemoSavingVisible}
              aria-busy={memoMutation.isPending || undefined}
              onClick={() => void saveMemo()}
            >
              {isMemoSavingVisible ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      )}
      {(statusMutation.isError || memoMutation.isError) && (
        <p className={styles.error} role="alert">
          변경 내용을 저장하지 못했어요. 다시 시도해 주세요.
        </p>
      )}
    </li>
  );
};

export default PropertyChecklistItemControl;
