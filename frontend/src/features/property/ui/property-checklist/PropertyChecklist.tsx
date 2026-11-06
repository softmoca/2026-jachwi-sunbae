import { css } from '@emotion/css';
import { useId } from 'react';

import { USER_CHECKLIST_STAGE } from '@/features/checklist/model/checklist';
import { propertyActiveChecklistPath } from '@/shared/lib/navigation/appPaths';
import { ButtonLink } from '@/shared/ui/button/Button';
import Icon from '@/shared/ui/icon/Icon';

import { groupPropertyChecklistItems } from '../../lib/propertyChecklistGroups';
import type { PropertyChecklistDetail } from '../../model/Property';
import PropertyChecklistItemControl from './PropertyChecklistItemControl';

type PropertyChecklistProps = {
  readonly propertyId: number;
  readonly detail: PropertyChecklistDetail;
  readonly replaceNavigation?: boolean;
  readonly fromPropertyDetail?: boolean;
};

const PropertyChecklist = ({
  propertyId,
  detail,
  replaceNavigation = false,
  fromPropertyDetail = true,
}: PropertyChecklistProps) => {
  const id = useId();
  const completedCount = detail.items.filter((item) => item.status !== 'UNCONFIRMED').length;
  const groups = groupPropertyChecklistItems(detail.items, detail.stage);

  return (
    <section className={styles.checklist} aria-labelledby={`${id}-title`}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 id={`${id}-title`}>사용자 체크리스트</h2>
          {detail.stage === USER_CHECKLIST_STAGE && (
            <ButtonLink
              variant="text"
              className={styles.replaceAction}
              to={`${propertyActiveChecklistPath(propertyId, detail.stage)}?mode=replace`}
              replace={replaceNavigation}
              state={fromPropertyDetail ? { from: 'property-detail' } : undefined}
              aria-label="사용자 체크리스트 교체"
            >
              <Icon name="replace" size={14} />
              교체
            </ButtonLink>
          )}
        </div>
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
    align-items: center;
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
  titleRow: css`
    label: PropertyChecklist-titleRow;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-sm);
    min-width: 0;
  `,
  replaceAction: css`
    label: PropertyChecklist-replaceAction;
    min-height: 2.75rem;
    padding: 0 0.25rem;
    color: var(--color-muted);
    font-size: 0.75rem;
    font-weight: 600;
    & > span {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
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
