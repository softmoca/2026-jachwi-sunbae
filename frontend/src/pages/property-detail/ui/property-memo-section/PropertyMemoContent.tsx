import type { usePropertyMemo } from '@/features/property/api/useProperties';
import DelayedFallback from '@/shared/ui/delayed-fallback/DelayedFallback';
import ProgressCircle from '@/shared/ui/progress-circle/ProgressCircle';

import * as styles from './PropertyMemoSection.styles';

type PropertyMemoQuery = ReturnType<typeof usePropertyMemo>;

type PropertyMemoContentProps = {
  memo: PropertyMemoQuery;
  onEdit: () => void;
};

/** 상세 안 메모 칸. 빠른 응답에는 로딩 문구 없이 바로 메모를 보여 주고, 오래 걸릴 때만 알린다. */
const PropertyMemoContent = ({ memo, onEdit }: PropertyMemoContentProps) => (
  <DelayedFallback
    isPending={memo.isPending}
    fallback={
      <div className={styles.state}>
        <ProgressCircle size={24} label="매물 메모를 불러오는 중이에요." />
      </div>
    }
  >
    {() =>
      memo.isError || memo.data === undefined ? (
        <button className={styles.retry} type="button" onClick={() => void memo.refetch()}>
          매물 메모를 불러오지 못했어요. 다시 시도
        </button>
      ) : (
        <button type="button" className={styles.field} onClick={onEdit}>
          {memo.data.freeMemo || '탭해서 메모를 입력해 주세요.'}
        </button>
      )
    }
  </DelayedFallback>
);

export default PropertyMemoContent;
