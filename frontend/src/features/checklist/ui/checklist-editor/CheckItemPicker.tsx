import { Fragment, useMemo, useState } from 'react';

import useDelayedLoading from '@/shared/lib/hooks/useDelayedLoading';
import BottomActionArea from '@/shared/ui/bottom-action-area/BottomActionArea';
import { Button } from '@/shared/ui/button/Button';
import ProgressCircle from '@/shared/ui/progress-circle/ProgressCircle';
import SearchField from '@/shared/ui/search-field/SearchField';

import { getChecklistErrorMessage } from '../../api/checklistErrorMessages';
import { useCheckItemSearch } from '../../api/useChecklists';
import type { CheckItem, ChecklistStage } from '../../model/checklistTypes';

import * as styles from './ChecklistEditor.styles';

type CheckItemPickerProps = {
  stage: ChecklistStage;
  existingSourceIds: number[];
  disabled: boolean;
  onCancel: () => void;
  onAdd: (items: CheckItem[]) => void;
};

const CheckItemPicker = ({ stage, existingSourceIds, disabled, onCancel, onAdd }: CheckItemPickerProps) => {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const result = useCheckItemSearch(stage, query);
  // 빠른 응답에는 로딩 표시 없이 바로 항목을 보여 주고, 오래 걸릴 때만 그 자리에 Progress Circle을 둔다.
  const isLoadingVisible = useDelayedLoading(result.isPending);
  const items = useMemo(() => result.data?.pages.flatMap((page) => page.content) ?? [], [result.data]);
  const existingIds = useMemo(() => new Set(existingSourceIds), [existingSourceIds]);
  const orderedItems = useMemo(
    () => [
      ...items.filter((item) => !existingIds.has(item.checkItemId)),
      ...items.filter((item) => existingIds.has(item.checkItemId)),
    ],
    [existingIds, items],
  );
  const additionCount = selectedIds.size;

  const search = (nextQuery: string) => {
    setQuery(nextQuery.trim());
    setSelectedIds(new Set());
  };

  const addSelected = () => {
    const selected = items.filter((item) => selectedIds.has(item.checkItemId) && !existingIds.has(item.checkItemId));
    if (selected.length === 0) return;
    onAdd(selected);
    setSelectedIds(new Set());
  };

  return (
    <div className={`${styles.checklistEditor} ${styles.checklistItemPickerView}`}>
      <section className={styles.itemPicker} aria-labelledby="item-picker-heading">
        <div className={styles.sectionHeadingRow}>
          <div>
            <h2 id="item-picker-heading">체크 항목 검색</h2>
          </div>
          <span className={styles.selectionCount} aria-live="polite">
            {additionCount}개 선택
          </span>
        </div>
        <div className={styles.checkItemSearch}>
          <SearchField
            label="제공 항목 검색"
            value={input}
            placeholder="예: 채광, 관리비, 소음"
            disabled={disabled}
            showSubmitButton={false}
            onValueChange={setInput}
            onSubmit={() => search(input)}
            onClear={() => {
              setInput('');
              setQuery('');
              setSelectedIds(new Set());
            }}
          />
        </div>

        <BottomActionArea placement="screen" divider={false} className={styles.pickerActions}>
          <Button variant="secondary" type="button" disabled={disabled} onClick={onCancel}>
            취소
          </Button>
          <Button type="button" disabled={disabled || additionCount === 0} onClick={addSelected}>
            선택한 {additionCount}개 항목 추가
          </Button>
        </BottomActionArea>

        {result.isPending || isLoadingVisible ? (
          isLoadingVisible && (
            <div className={styles.compactState}>
              <ProgressCircle size={24} label="항목을 불러오는 중이에요." />
            </div>
          )
        ) : result.isError ? (
          <div className={styles.pickerError} role="alert">
            <span>{getChecklistErrorMessage(result.error)}</span>
            <Button
              className={styles.pickerRetry}
              type="button"
              variant="text"
              disabled={disabled}
              onClick={() => void result.refetch()}
            >
              다시 시도
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className={styles.compactState}>검색 결과가 없어요.</p>
        ) : (
          <div className={styles.checkItemResults}>
            <h3>검색 결과</h3>
            <ul className={styles.checkItemSearchResults}>
              {orderedItems.map((item, index) => {
                const exists = existingIds.has(item.checkItemId);
                const checked = exists || selectedIds.has(item.checkItemId);
                const startsExistingGroup =
                  exists && (index === 0 || !existingIds.has(orderedItems[index - 1].checkItemId));
                const toggleItem = () => {
                  setSelectedIds((current) => {
                    const next = new Set(current);
                    if (next.has(item.checkItemId)) next.delete(item.checkItemId);
                    else next.add(item.checkItemId);
                    return next;
                  });
                };
                return (
                  <Fragment key={item.checkItemId}>
                    {startsExistingGroup && <li className={styles.existingDivider}>이미 추가됨</li>}
                    <li className={exists ? styles.alreadyAddedItem : undefined}>
                      <button
                        className={styles.resultSelect}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        disabled={disabled || exists}
                        onPointerDown={(event) => {
                          // 모바일 WebView에서 pointerup 이후 click이 누락되는 경우에도
                          // 누른 순간 선택 상태가 바뀌도록 한다.
                          event.preventDefault();
                          toggleItem();
                        }}
                        onClick={(event) => {
                          // 키보드(Enter/Space)는 pointer 이벤트 없이 click만 발생한다.
                          if (event.detail === 0) toggleItem();
                        }}
                      >
                        <span className={styles.resultControl} data-selected={checked || undefined} aria-hidden="true">
                          {checked ? '✓' : null}
                        </span>
                        <span className={styles.resultCopy}>
                          <strong>{item.question}</strong>
                          {item.guide !== null && <small>{item.guide}</small>}
                        </span>
                      </button>
                    </li>
                  </Fragment>
                );
              })}
            </ul>
          </div>
        )}

        {result.hasNextPage && (
          <Button
            variant="secondary"
            fullWidth
            className={styles.compactButton}
            type="button"
            disabled={disabled || result.isFetchingNextPage}
            onClick={() => void result.fetchNextPage()}
          >
            {result.isFetchingNextPage ? '불러오는 중…' : '항목 더 보기'}
          </Button>
        )}
      </section>
    </div>
  );
};

export default CheckItemPicker;
