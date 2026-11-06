import { css } from '@emotion/css';
import { type ReactNode, useRef } from 'react';

import useOutsideInteraction from '@/shared/lib/hooks/useOutsideInteraction';

import Icon from '../icon/Icon';

type TopNavigationMenuProps = {
  children: ReactNode;
  label?: string;
};

const TopNavigationMenu = ({ children, label = '페이지 메뉴 열기' }: TopNavigationMenuProps) => {
  const ref = useRef<HTMLDetailsElement>(null);
  useOutsideInteraction({
    ref,
    onOutside: () => {
      if (ref.current) ref.current.open = false;
    },
  });
  return (
    <details
      ref={ref}
      className={styles.menu}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && ref.current) {
          ref.current.open = false;
          ref.current.querySelector('summary')?.focus();
        }
      }}
    >
      <summary aria-label={label}>
        <Icon name="more-vertical" size={22} />
      </summary>
      <div className={styles.items}>{children}</div>
    </details>
  );
};

const styles = {
  menu: css`
    label: TopNavigationMenu-menu;
    position: relative;

    & > summary {
      display: grid;
      width: 2.75rem;
      height: 2.75rem;
      cursor: pointer;
      list-style: none;
      place-items: center;
    }

    & > summary::-webkit-details-marker {
      display: none;
    }

    & > summary:focus-visible {
      border-radius: 0.35rem;
      outline: 2px solid var(--color-focus);
      outline-offset: -2px;
    }
  `,

  items: css`
    label: TopNavigationMenu-items;
    position: absolute;
    z-index: 30;
    top: 2.7rem;
    right: 0;
    min-width: 6rem;
    padding: 0.25rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);

    & :is(a, button) {
      display: flex;
      width: 100%;
      min-height: 2.35rem;
      align-items: center;
      padding: 0.45rem 0.65rem;
      border: 0;
      background: transparent;
      color: var(--color-ink);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 750;
      text-decoration: none;
      cursor: pointer;
    }

    & :is(a, button)[data-tone='danger'] {
      color: var(--color-error);
    }
  `,
};

export default TopNavigationMenu;
