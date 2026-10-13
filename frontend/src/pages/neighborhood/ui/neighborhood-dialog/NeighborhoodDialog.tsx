import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';

import Icon from '@/shared/ui/icon/Icon';

import styles from './NeighborhoodDialog.module.css';

type Props = { isOpen: boolean; title: string; onClose: () => void; children: ReactNode };

const NeighborhoodDialog = ({ isOpen, title, onClose, children }: Props) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!isOpen || dialog === null) return;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.handle} aria-hidden="true" />
      <header className={styles.heading}>
        <h2 id={titleId}>{title}</h2>
        <button type="button" onClick={onClose} aria-label="닫기">
          <Icon name="close" />
        </button>
      </header>
      <div className={styles.body}>{children}</div>
    </dialog>
  );
};

export default NeighborhoodDialog;
