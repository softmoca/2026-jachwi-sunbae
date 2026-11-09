import { css } from '@emotion/css';
import { useState } from 'react';

import { Button } from '@/shared/ui/button/Button';
import Icon from '@/shared/ui/icon/Icon';

import { PREFERENCE_LABELS, type StreetMemo } from '../../model/StreetMemo';

type Props = {
  memo: StreetMemo;
  isRemoving: boolean;
  removeFailed: boolean;
  onRemove: () => void;
  /** 주면 좋아요 줄 오른쪽 끝에 작은 닫기(X)를 둔다. */
  onClose?: () => void;
};

/** 지도에서 고른 메모. 작성자는 드러내지 않고, 본인 메모일 때만 한 번 더 물어본 뒤 지운다. */
const StreetMemoDetails = ({ memo, isRemoving, removeFailed, onRemove, onClose }: Props) => {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className={styles.details}>
      <p className={styles.meta}>
        <span className={styles.preference} data-preference={memo.preference}>
          {memo.preference === 'LIKE' ? '👍 ' : '👎 '}
          {PREFERENCE_LABELS[memo.preference]}
        </span>
        {memo.isMine && <span className={styles.mine}>내가 남긴 메모</span>}
        {onClose && (
          <button type="button" className={styles.close} aria-label="메모 닫기" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        )}
      </p>
      <p className={styles.memo}>{memo.memo}</p>
      {removeFailed && (
        <p className={styles.error} role="alert">
          메모를 지우지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {memo.isMine &&
        (confirming ? (
          <div className={styles.confirm}>
            <p>이 메모를 지울까요?</p>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={isRemoving}>
              취소
            </Button>
            <Button variant="danger" onClick={onRemove} disabled={isRemoving}>
              {isRemoving ? '지우는 중…' : '지우기'}
            </Button>
          </div>
        ) : (
          <Button variant="text" className={styles.remove} onClick={() => setConfirming(true)}>
            메모 지우기
          </Button>
        ))}
    </div>
  );
};

const styles = {
  details: css`
    label: StreetMemoDetails-details;
    display: grid;
    gap: 0.75rem;
  `,

  meta: css`
    label: StreetMemoDetails-meta;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 0.8125rem;
  `,

  preference: css`
    label: StreetMemoDetails-preference;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-weight: 700;

    /* 지도 말풍선과 같은 옅은 바탕·진한 글자 색을 쓴다. */
    &[data-preference='LIKE'] {
      background: var(--color-memo-like);
      color: var(--color-memo-like-ink);
    }

    &[data-preference='DISLIKE'] {
      background: var(--color-memo-dislike);
      color: var(--color-memo-dislike-ink);
    }
  `,

  /* 닫기는 테두리 없이 작은 아이콘으로 줄 오른쪽 끝에 둔다. */
  close: css`
    label: StreetMemoDetails-close;
    display: grid;
    width: 1.75rem;
    height: 1.75rem;
    margin-left: auto;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    place-items: center;
  `,

  mine: css`
    label: StreetMemoDetails-mine;
    color: var(--color-muted);
  `,

  /* 사용자 입력은 텍스트로만 보여주고, 입력한 줄바꿈과 공백을 유지한다. 옅은 회색 상자에 담아 한눈에 읽히게 한다. */
  memo: css`
    label: StreetMemoDetails-memo;
    margin: 0;
    padding: 0.9rem 1rem;
    border-radius: 0.8rem;
    background: #f6f7f8;
    color: var(--color-ink);
    font-size: 1rem;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  `,

  /* 지우기는 큰 상자 버튼이 아니라 오른쪽 아래의 작은 붉은 글자로 둔다. */
  remove: css`
    label: StreetMemoDetails-remove;
    justify-self: end;
    color: var(--color-danger);
    font-size: 0.8125rem;
  `,

  error: css`
    label: StreetMemoDetails-error;
    margin: 0;
    color: var(--color-danger);
    font-size: 0.875rem;
  `,

  confirm: css`
    label: StreetMemoDetails-confirm;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;

    & p {
      flex: 1;
      margin: 0;
    }
  `,
};

export default StreetMemoDetails;
