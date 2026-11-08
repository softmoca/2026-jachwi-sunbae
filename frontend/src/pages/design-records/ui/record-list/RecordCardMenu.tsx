import { useEffect, useRef, useState } from 'react';

import Icon from '@/shared/ui/icon/Icon';

import RecordDeleteButton from './RecordDeleteButton';

import * as styles from './RecordList.styles';

type Props = {
  propertyId: number;
  propertyName: string;
  /** 삭제를 마치거나 실패하면 알릴 문구를 넘긴다. */
  onDone: (message: string) => void;
};

/**
 * 지도에서 고른 자리의 매물 카드 오른쪽 위 더보기(⋮) 메뉴. 지금은 삭제만 둔다. 매물 리스트에서도 같은 메뉴를 사용한다.
 * 연 뒤 메뉴 밖을 누르거나 Esc를 누르면 닫는다. 다른 카드의 메뉴를 열면 앞 메뉴는 닫힌다.
 */
const RecordCardMenu = ({ propertyId, propertyName, onDone }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    // 누르는 순간(pointerdown) 닫아, 바깥의 카드나 지도를 누른 동작은 그대로 이어지게 한다.
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={styles.actions}>
      <button
        ref={toggleRef}
        type="button"
        className={styles.menuToggle}
        aria-label={`${propertyName} 메뉴`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Icon name="more-vertical" size={20} />
      </button>
      {isOpen && (
        <div className={styles.menu}>
          <RecordDeleteButton
            propertyId={propertyId}
            propertyName={propertyName}
            onDone={(message) => {
              setIsOpen(false);
              onDone(message);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default RecordCardMenu;
