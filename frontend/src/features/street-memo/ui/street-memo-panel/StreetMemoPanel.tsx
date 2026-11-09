import { css } from '@emotion/css';

import Icon from '@/shared/ui/icon/Icon';

import type { StreetMemoLayer } from '../../hooks/useStreetMemoLayer';
import type { StreetMemo } from '../../model/StreetMemo';
import StreetMemoContent, { streetMemoTitle } from '../street-memo-content/StreetMemoContent';

type Props = {
  layer: StreetMemoLayer;
  onCreated?: (memo: StreetMemo) => void;
  /** 화면이 이미 닫기 버튼을 그리는 칸(ListDetailLayout 등)이면 끈다. */
  showCloseButton?: boolean;
  className?: string;
};

/** 데스크탑에서 메모를 쓰거나 보는 칸. 놓을 자리(지도 위 카드·목록 옆 칸)는 화면이 className으로 정한다. */
const StreetMemoPanel = ({ layer, onCreated, showCloseButton = true, className }: Props) => {
  if (layer.mode === null) return null;
  const title = streetMemoTitle(layer);
  const isViewing = layer.mode === 'view';
  return (
    <section className={`${styles.panel} ${className ?? ''}`.trim()} aria-label={title}>
      {/* 메모를 볼 때는 제목줄(제목과 X)을 숨기고, 닫기(X)는 좋아요 줄 오른쪽 끝에 작게 둔다. */}
      <header className={isViewing ? `${styles.header} sr-only` : styles.header}>
        <h2>{title}</h2>
        {showCloseButton && !isViewing && (
          <button type="button" className={styles.close} aria-label="메모 닫기" onClick={layer.close}>
            <Icon name="close" size={16} />
          </button>
        )}
      </header>
      <StreetMemoContent
        layer={layer}
        onCreated={onCreated}
        onClose={isViewing && showCloseButton ? layer.close : undefined}
      />
    </section>
  );
};

const styles = {
  panel: css`
    label: StreetMemoPanel-panel;
    display: grid;
    align-content: start;
    gap: 1rem;
    padding: 1.25rem;
  `,

  /* 닫기는 테두리 없는 작은 회색 아이콘으로 둔다. */
  close: css`
    label: StreetMemoPanel-close;
    display: grid;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    place-items: center;
  `,

  header: css`
    label: StreetMemoPanel-header;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;

    & h2 {
      margin: 0;
      font-size: 1.125rem;
    }
  `,
};

export default StreetMemoPanel;
