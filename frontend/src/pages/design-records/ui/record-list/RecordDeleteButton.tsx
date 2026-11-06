import { useRemoveProperty } from '@/features/property/api/usePropertyMutations';
import Icon from '@/shared/ui/icon/Icon';

type RecordDeleteButtonProps = {
  propertyId: number;
  /** 주면 화면 낭독기에 `<이름> 삭제`로 읽힌다. 리스트 삭제 모드처럼 삭제 버튼이 여러 개 보일 때 어느 기록인지 알린다. */
  propertyName?: string;
  onDone: (message: string) => void;
  className?: string;
  /** 참이면 글자 없이 휴지통 아이콘만 그린다. 이때는 `propertyName`으로 이름을 붙인다. */
  iconOnly?: boolean;
};

const RecordDeleteButton = ({
  propertyId,
  propertyName,
  onDone,
  className,
  iconOnly = false,
}: RecordDeleteButtonProps) => {
  const removeProperty = useRemoveProperty(propertyId);
  return (
    <button
      type="button"
      className={className}
      aria-label={propertyName === undefined ? undefined : `${propertyName} 삭제`}
      data-record-delete-control=""
      disabled={removeProperty.isPending}
      onClick={() =>
        removeProperty.mutate(undefined, {
          onSuccess: () => onDone('기록을 삭제했어요.'),
          onError: () => onDone('기록을 삭제하지 못했어요. 다시 시도해 주세요.'),
        })
      }
    >
      <Icon name="trash" size={16} />
      {!iconOnly && ' 삭제'}
    </button>
  );
};

export default RecordDeleteButton;
