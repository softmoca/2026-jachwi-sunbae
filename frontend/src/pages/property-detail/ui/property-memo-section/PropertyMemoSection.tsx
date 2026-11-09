import { useEffect, useRef, useState } from 'react';

import { usePropertyMemo } from '@/features/property/api/useProperties';
import { useSavePropertyMemoDocument } from '@/features/property/api/usePropertyMutations';
import DetailSection from '@/shared/ui/detail-section/DetailSection';

import PropertyMemoContent from './PropertyMemoContent';

import * as styles from './PropertyMemoSection.styles';

type PropertyMemoSectionProps = {
  propertyId: number;
};

/** 메모를 창 없이 그 자리에서 고친다. 엔터는 줄바꿈이고, 바깥을 누르거나 Cmd/Ctrl+Enter를 누르면 저장하며, Esc는 취소한다. */
const PropertyMemoSection = ({ propertyId }: PropertyMemoSectionProps) => {
  const memo = usePropertyMemo(propertyId);
  const saveMemo = useSavePropertyMemoDocument(propertyId);
  const [draft, setDraft] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelledRef = useRef(false);
  const isEditing = draft !== null;

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  const commit = () => {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    if (draft === null || memo.data === undefined) return;
    const next = draft.trim();
    if (next === memo.data.freeMemo) {
      setDraft(null);
      return;
    }
    void saveMemo
      .mutateAsync({ freeMemo: next })
      .then(() => setDraft(null))
      .catch(() => undefined);
  };

  return (
    <DetailSection title="메모">
      {isEditing ? (
        <>
          <textarea
            ref={textareaRef}
            className={styles.editor}
            aria-label="메모 내용"
            value={draft}
            maxLength={2_000}
            rows={5}
            placeholder="그 외 내용을 자유롭게 적어보세요."
            disabled={saveMemo.isPending}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'Escape') {
                // 취소: 포커스를 잃어도 저장되지 않도록 먼저 편집을 끝낸다.
                cancelledRef.current = true;
                setDraft(null);
              } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.currentTarget.blur();
              }
            }}
          />
          {saveMemo.isError && <p className={styles.error}>메모를 저장하지 못했어요. 다시 시도해 주세요.</p>}
        </>
      ) : (
        <PropertyMemoContent
          memo={memo}
          onEdit={() => {
            if (memo.data === undefined) return;
            setDraft(memo.data.freeMemo);
          }}
        />
      )}
    </DetailSection>
  );
};

export default PropertyMemoSection;
