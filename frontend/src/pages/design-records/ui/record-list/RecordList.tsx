import { useEffect, useRef, useState } from 'react';

import PropertyCard from '@/features/property/ui/property-card/PropertyCard';
import { RECORDS_PATH } from '@/shared/lib/navigation/appPaths';
import EmptyState from '@/shared/ui/empty-state/EmptyState';
import Icon from '@/shared/ui/icon/Icon';

import type { RecordsState } from '../../hooks/useRecords';
import RecordDeleteButton from './RecordDeleteButton';

import * as styles from './RecordList.styles';

type RecordListProps = {
  records: RecordsState['records'];
  district: string;
  /** 주면 기록을 눌러도 상세로 넘어가지 않고 이 함수를 부른다(데스크탑은 리스트 자리에 상세를 연다). */
  onOpen?: (recordId: string) => void;
  onNotice: (message: string) => void;
  className?: string;
};

/**
 * 삭제 모드를 켜고 끈다. 켠 동안 헤더의 삭제 버튼을 다시 누르거나, 삭제 버튼 밖을 누르거나, Esc를 누르면 끈다.
 * 바깥을 누르는 순간(pointerdown) 끄므로 카드나 지도를 누른 동작은 그대로 이어진다.
 */
const useDeleteMode = (hasRecords: boolean) => {
  const [isOn, setIsOn] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // 마지막 기록까지 지우면 삭제 모드도 끝낸다.
  const isDeleting = isOn && hasRecords;

  useEffect(() => {
    if (!isDeleting) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-record-delete-control]') !== null) return;
      setIsOn(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOn(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isDeleting]);

  return { isDeleting, toggleRef, toggle: () => setIsOn(!isDeleting) };
};

/** 기록 리스트. 인프라 지도 매물 목록과 같은 공용 PropertyCard를 쓰고, 헤더의 삭제 버튼으로 카드마다 삭제 버튼을 띄운다. */
const RecordList = ({ records, district, onOpen, onNotice, className }: RecordListProps) => {
  const deleteMode = useDeleteMode(records.length > 0);
  return (
    <section className={className} aria-labelledby="record-list-heading">
      <h2 id="record-list-heading" className="sr-only">
        {district === '전체' ? '모든 기록' : `${district} 기록`}
      </h2>
      {/* 리스트 필터는 아직 기능 구현 전이라 모양만 두고 누를 수 없게 막는다. */}
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="기록 필터 (준비 중)">
          <button type="button" disabled>
            최근순 <Icon name="chevron-down" size={14} />
          </button>
          <button type="button" disabled>
            월세 <Icon name="chevron-down" size={14} />
          </button>
          <button type="button" disabled>
            체크 진행 <Icon name="chevron-down" size={14} />
          </button>
        </div>
        <div className={styles.toolbarActions}>
          <span className={styles.comingSoon}>필터 준비 중</span>
          {records.length > 0 && (
            <button
              ref={deleteMode.toggleRef}
              type="button"
              className={styles.deleteToggle}
              aria-label="기록 삭제"
              aria-pressed={deleteMode.isDeleting}
              data-record-delete-control=""
              onClick={deleteMode.toggle}
            >
              <Icon name="trash" size={14} /> {deleteMode.isDeleting ? '완료' : '삭제'}
            </button>
          )}
        </div>
      </div>
      {records.length === 0 && (
        <EmptyState
          variant="plain"
          illustration="empty-properties"
          title={district === '전체' ? '아직 기록한 방이 없어요' : `${district}에 기록한 방이 없어요`}
          description="집을 보러 가면 사진과 체크한 내용을 남겨 두세요. 여기에 모여요."
        />
      )}
      <ul className={styles.items}>
        {records.map((record) => (
          <li key={record.id}>
            <PropertyCard
              property={record.summary}
              returnTo={RECORDS_PATH}
              onOpen={onOpen === undefined ? undefined : () => onOpen(record.id)}
              actions={
                deleteMode.isDeleting ? (
                  <RecordDeleteButton
                    className={styles.cardDelete}
                    iconOnly
                    propertyId={Number(record.id)}
                    propertyName={record.name}
                    onDone={onNotice}
                  />
                ) : undefined
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
};

export default RecordList;
