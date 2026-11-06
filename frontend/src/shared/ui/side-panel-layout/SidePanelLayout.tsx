import { css } from '@emotion/css';
import { type ReactNode, useLayoutEffect, useRef } from 'react';

type Props = {
  readonly list: ReactNode;
  readonly panel?: ReactNode;
  readonly panelLabel: string;
  readonly panelKey?: string;
};

const SidePanelLayout = ({ list, panel, panelLabel, panelKey }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [panelKey]);
  return (
    <div className={styles.layout} data-panel-open={panel ? 'true' : undefined}>
      <div className={styles.list}>{list}</div>
      {panel && (
        <section className={styles.panel} aria-label={panelLabel}>
          <div className={styles.scroll} ref={scrollRef}>
            {panel}
          </div>
        </section>
      )}
    </div>
  );
};

const styles = {
  layout: css`
    label: SidePanelLayout-layout;
    display: grid;
    width: min(calc(100% - 3rem), 34rem);
    height: calc(100dvh - 72px - 3rem);
    min-height: 0;
    margin: 1.5rem auto;
    &[data-panel-open='true'] {
      width: min(calc(100% - 3rem), 72rem);
      grid-template-columns: minmax(16rem, 0.7fr) minmax(0, 1.3fr);
    }
  `,
  list: css`
    label: SidePanelLayout-list;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    padding: 0 1rem;
  `,
  panel: css`
    label: SidePanelLayout-panel;
    position: relative;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    border-left: 1px solid var(--color-border-strong);
    transform: translateZ(0);
  `,
  scroll: css`
    label: SidePanelLayout-scroll;
    height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
  `,
};

export default SidePanelLayout;
