import ChecklistItemRow from '@/features/checklist/ui/checklist-item-row/ChecklistItemRow';

import { groupChecklistItems } from '../../lib/checklistCategories';
import type { ChecklistEditorItem } from '../../model/ChecklistEditor';
import ChecklistCategorySection from './ChecklistCategorySection';
import usePointerReorder from './usePointerReorder';

import * as styles from './ChecklistEditor.styles';

type ChecklistItemOrderListProps = {
  items: ChecklistEditorItem[];
  isDisabled: boolean;
  isInactive: (item: ChecklistEditorItem) => boolean;
  registerFocusTarget: (clientKey: string) => (element: HTMLElement | null) => void;
  onMove: (index: number, direction: -1 | 1, focusContent?: boolean) => void;
  onReorder: (sourceKey: string, targetKey: string) => void;
  onRemove: (index: number) => void;
};

/** 순서 변경 상태와 기능 콜백을 관리하고, 표시 구조는 체크리스트 UI 컴포넌트에 위임한다. */
const ChecklistItemOrderList = ({
  items,
  isDisabled,
  isInactive,
  registerFocusTarget,
  onReorder,
  onMove,
  onRemove,
}: ChecklistItemOrderListProps) => {
  const groups = groupChecklistItems(items);
  const reorderWithinCategory = (sourceKey: string, targetKey: string) => {
    const source = items.find((item) => item.clientKey === sourceKey);
    const target = items.find((item) => item.clientKey === targetKey);
    if (source && target && (source.category ?? 'OTHER') === (target.category ?? 'OTHER'))
      onReorder(sourceKey, targetKey);
  };
  const { draggingKey, dragOverKey, handleProps } = usePointerReorder(reorderWithinCategory, isDisabled);

  return (
    <>
      {groups.map((group) => (
        <ChecklistCategorySection key={group.code} category={group}>
          <ol className={styles.selectedCheckItems}>
            {group.items.map((item, index) => (
              <ChecklistItemRow
                key={item.clientKey}
                itemKey={item.clientKey}
                question={item.question}
                guide={item.guide}
                originLabel={item.origin === 'PROVIDED' ? '제공 항목' : '이전 사용자 항목'}
                inactiveNote={
                  item.origin === 'CUSTOM'
                    ? '이전에 추가된 항목 · 이동 또는 제거 가능'
                    : isInactive(item)
                      ? '더 이상 제공되지 않음 · 유지, 이동 또는 제거 가능'
                      : undefined
                }
                isDisabled={isDisabled}
                isDragging={draggingKey === item.clientKey}
                isDragOver={dragOverKey === item.clientKey}
                dragHandleLabel={`${item.question} 순서 변경`}
                removeLabel={`${item.question} 제거`}
                contentRef={registerFocusTarget(item.clientKey)}
                dragHandleProps={handleProps(item.clientKey)}
                onDragHandleKeyDown={(event) => {
                  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                  event.preventDefault();
                  const target = group.items[index + (event.key === 'ArrowUp' ? -1 : 1)];
                  if (!target) return;
                  const sourceIndex = items.indexOf(item);
                  const direction = event.key === 'ArrowUp' ? -1 : 1;
                  if (items.indexOf(target) === sourceIndex + direction) onMove(sourceIndex, direction, false);
                  else onReorder(item.clientKey, target.clientKey);
                }}
                onRemove={() => onRemove(items.indexOf(item))}
              />
            ))}
          </ol>
        </ChecklistCategorySection>
      ))}
    </>
  );
};

export default ChecklistItemOrderList;
