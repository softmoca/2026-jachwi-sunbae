import { css } from '@emotion/css';

import { RECORDS_MAP_PATH } from '@/shared/lib/navigation/appPaths';
import { Button, ButtonLink } from '@/shared/ui/button/Button';

import { MIN_SELECTION } from '../../hooks/usePropertyComparison';

type CompareActionBarProps = {
  /** 등록한 매물 수. 비교에 필요한 수보다 적으면 내려받기 대신 매물을 더 등록하라고 안내한다. */
  propertyCount: number;
  selectedCount: number;
  isExporting: boolean;
  onDownload: () => void;
};

const CompareActionBar = ({ propertyCount, selectedCount, isExporting, onDownload }: CompareActionBarProps) => {
  if (propertyCount < MIN_SELECTION) {
    return (
      <div className={styles.actionBar}>
        <p>매물을 하나 더 등록하면 비교할 수 있어요.</p>
        <ButtonLink to={RECORDS_MAP_PATH} fullWidth>
          본 방 기록에서 등록하기
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className={styles.actionBar}>
      <p>
        {selectedCount < MIN_SELECTION
          ? `${MIN_SELECTION - selectedCount}개 더 선택해 주세요.`
          : `${selectedCount}개 매물의 모든 기록을 PDF로 만들어요.`}
      </p>
      <Button
        fullWidth
        disabled={selectedCount < MIN_SELECTION}
        isLoading={isExporting}
        loadingLabel="PDF 만드는 중…"
        onClick={onDownload}
      >
        선택한 {selectedCount}개 PDF 받기
      </Button>
    </div>
  );
};

const styles = {
  actionBar: css`
    label: CompareActionBar-actionBar;
    position: fixed;
    z-index: 16;
    right: max(calc((100vw - var(--app-max-width)) / 2), 0px);
    bottom: calc(var(--bottom-navigation-height) + env(safe-area-inset-bottom));
    left: max(calc((100vw - var(--app-max-width)) / 2), 0px);
    display: grid;
    gap: 0.45rem;
    padding: 0.65rem 1rem 0.85rem;
    border-top: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-canvas) 94%, transparent);
    backdrop-filter: blur(10px);

    & p {
      margin: 0;
      color: var(--color-muted);
      font-size: 0.62rem;
      text-align: center;
    }
  `,
};

export default CompareActionBar;
