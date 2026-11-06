import { css } from '@emotion/css';
import { useId } from 'react';

import Icon from '@/shared/ui/icon/Icon';

import { groupPropertyChecklistItems } from '../../lib/propertyChecklistGroups';
import type { PropertyChecklistDetail } from '../../model/Property';
import PropertyChecklistItemControl from './PropertyChecklistItemControl';

type PropertyChecklistProps = {
  readonly propertyId: number;
  readonly detail: PropertyChecklistDetail;
};

const PropertyChecklist = ({ propertyId, detail }: PropertyChecklistProps) => {
  const id = useId();
  const completedCount = detail.items.filter((item) => item.status !== 'UNCONFIRMED').length;
  const groups = groupPropertyChecklistItems(detail.items, detail.stage);

  return (
    <section className={styles.checklist} aria-labelledby={`${id}-title`}>
      <header className={styles.header}>
        <h2 id={`${id}-title`}>사용자 체크리스트</h2>
        <span role="status">
          <span aria-hidden="true">
            {completedCount}/{detail.items.length}
          </span>
          <span className="sr-only">
            {detail.items.length}개 중 {completedCount}개 평가
          </span>
        </span>
      </header>
      {groups.map((group, index) => (
        <section className={styles.group} key={group.name} aria-labelledby={`${id}-category-${index}`}>
          <h3 id={`${id}-category-${index}`}>
            <Icon name={group.icon} size={18} />
            {group.name}
          </h3>
          <ol className={styles.items}>
            {group.items.map((item) => (
              <PropertyChecklistItemControl
                key={item.itemId}
                propertyId={propertyId}
                propertyChecklistId={detail.propertyChecklistId}
                item={item}
              />
            ))}
          </ol>
        </section>
      ))}
      {detail.items.length === 0 && <p className={styles.empty}>체크리스트 항목이 없어요.</p>}
    </section>
  );
};

const styles = {
  checklist: css`
    label: PropertyChecklist-checklist;
    --color-surface: var(--color-canvas);
    --color-border: color-mix(in srgb, var(--color-border-strong) 60%, var(--color-canvas));
    margin-top: var(--space-md);
    padding: var(--space-md) var(--space-md) 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    min-width: 0;
  `,
  header: css`
    label: PropertyChecklist-header;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-sm);
    & h2 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
    }
    & > span {
      flex: none;
      color: var(--color-muted);
      font-size: 0.8125rem;
      font-variant-numeric: tabular-nums;
    }
  `,
  group: css`
    label: PropertyChecklist-group;
    & + & {
      border-top: 1px solid var(--color-border);
    }
    & h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      padding-top: var(--space-lg);
      font-size: 0.9375rem;
      font-weight: 750;
    }
  `,
  items: css`
    label: PropertyChecklist-items;
    margin: 0;
    padding: 0;
    list-style: none;
  `,
  empty: css`
    label: PropertyChecklist-empty;
    color: var(--color-muted);
    font-size: 0.875rem;
  `,
};

export default PropertyChecklist;
