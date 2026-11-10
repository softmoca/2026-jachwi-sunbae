import { css } from '@emotion/css';

import type { StreetMemoLayer } from '../../hooks/useStreetMemoLayer';
import type { StreetMemo } from '../../model/StreetMemo';
import StreetMemoDetails from '../street-memo-details/StreetMemoDetails';
import StreetMemoForm from '../street-memo-form/StreetMemoForm';

type Props = {
  layer: StreetMemoLayer;
  onCreated?: (memo: StreetMemo) => void;
  /** 주면 메모 보기의 첫 메모에 닫기(X)를 둔다. */
  onClose?: () => void;
};

export const streetMemoTitle = (layer: StreetMemoLayer) => {
  if (layer.mode === 'compose') return '이곳을 평가해 주세요';
  return layer.selectedMemos.length > 1 ? `거리 메모 ${layer.selectedMemos.length}개` : '거리 메모';
};

/** 메모 겹의 상태에 맞춰 작성 폼이나 고른 메모(겹친 말풍선이면 그 자리 메모 모두)를 보여준다. 데스크탑 칸과 휴대폰 시트가 함께 쓴다. */
const StreetMemoContent = ({ layer, onCreated, onClose }: Props) => {
  if (layer.mode === 'compose')
    return (
      <StreetMemoForm
        isSubmitting={layer.isSubmitting}
        submitFailed={layer.submitFailed}
        onSubmit={(memo, preference) => layer.submit(memo, preference, onCreated)}
        onCancel={layer.close}
      />
    );
  if (layer.selectedMemos.length > 0)
    return (
      <ul className={styles.list}>
        {layer.selectedMemos.map((memo, index) => (
          // 다른 메모를 고르면 지우기 확인 상태를 처음으로 되돌린다.
          <li key={memo.id}>
            <StreetMemoDetails
              memo={memo}
              isRemoving={layer.removingId === memo.id}
              removeFailed={layer.removeFailedId === memo.id}
              onRemove={() => layer.remove(memo)}
              // 휴대폰 시트는 제목줄이 없어, 첫 메모의 좋아요 줄 오른쪽 끝에 닫기를 둔다.
              onClose={index === 0 && onClose !== undefined ? onClose : undefined}
            />
          </li>
        ))}
      </ul>
    );
  return null;
};

const styles = {
  list: css`
    label: StreetMemoContent-list;
    display: grid;
    gap: 1rem;
    padding: 0;
    margin: 0;
    list-style: none;

    & > li + li {
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
    }
  `,
};

export default StreetMemoContent;
