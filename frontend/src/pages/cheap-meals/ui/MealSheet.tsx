import { css, cx } from '@emotion/css';
import type { ReactNode } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import BottomSheet from '@/shared/ui/bottom-sheet/BottomSheet';
import Icon from '@/shared/ui/icon/Icon';

import type { MealLayout } from '../hooks/useMealTabs';

type MealSheetProps = { title: string; layout: MealLayout; children: ReactNode; onClose: () => void };

/** 상세와 주소 검색을 띄우는 대화상자. 휴대폰은 아래에서 올라오는 시트로, 데스크탑은 화면 가운데 창으로 연다. */
const MealSheet = ({ title, layout, children, onClose }: MealSheetProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    const focused = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className={cx(styles.dialog, layout === 'desktop' && styles.dialogDesktop)}
      aria-label={title}
      onKeyDownCapture={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {layout === 'desktop' ? (
        <section className={styles.window}>
          <header className={styles.windowHeader}>
            <h2>{title}</h2>
            <button type="button" onClick={onClose} aria-label="상세 닫기">
              <Icon name="close" size={22} />
            </button>
          </header>
          <div className={styles.windowContent}>{children}</div>
        </section>
      ) : (
        <BottomSheet title={title} onClose={onClose} initialHeightPercent={80}>
          <div className={styles.content}>{children}</div>
        </BottomSheet>
      )}
    </dialog>,
    document.body,
  );
};
const styles = {
  dialog: css`
    label: MealSheet-dialog;
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100dvh;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-ink);
    overflow: hidden;
    &::backdrop {
      background: var(--color-overlay);
    }
    & .BottomSheet-sheet {
      max-height: calc(100% - env(safe-area-inset-top) - 1rem);
    }
    & .BottomSheet-sheet header h2 {
      white-space: normal;
      overflow-wrap: anywhere;
    }
    & .BottomSheet-sheet header button {
      min-width: 44px;
      min-height: 44px;
    }
  `,
  dialogDesktop: css`
    label: MealSheet-dialogDesktop;
    display: grid;
    place-items: center;
  `,
  window: css`
    label: MealSheet-window;
    display: flex;
    flex-direction: column;
    width: min(100% - 4rem, 30rem);
    max-height: min(100% - 4rem, 44rem);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-dialog);
    overflow: hidden;
  `,
  windowHeader: css`
    label: MealSheet-windowHeader;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 1rem 1rem 0.5rem 1.5rem;
    & h2 {
      margin: 0;
      font-size: 1.1rem;
      letter-spacing: -0.035em;
      overflow-wrap: anywhere;
    }
    & button {
      display: grid;
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--color-ink);
      cursor: pointer;
      place-items: center;
    }
    & button:hover {
      background: var(--color-surface-muted);
    }
  `,
  windowContent: css`
    label: MealSheet-windowContent;
    overflow-y: auto;
    padding: 0.5rem 1.5rem 1.5rem;
    overflow-wrap: anywhere;
  `,
  content: css`
    label: MealSheet-content;
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
    overflow-wrap: anywhere;
  `,
};
export default MealSheet;
