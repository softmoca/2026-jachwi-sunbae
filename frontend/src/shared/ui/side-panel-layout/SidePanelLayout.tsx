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
      <div className={styles.list}>
        <div className={styles.fit}>{list}</div>
      </div>
      {panel && (
        <section className={styles.panel} aria-label={panelLabel}>
          <div className={styles.scroll} ref={scrollRef}>
            <div className={styles.fit}>{panel}</div>
          </div>
        </section>
      )}
    </div>
  );
};

const styles = {
  layout: css`
    label: SidePanelLayout-layout;
    /*
     * 본 방 기록, 동네 찾기의 목록 칸(ListDetailLayout)과 같은 폭(20rem 16px 기준 = 320px, 최대 384px)을 쓴다.
     * 이 화면의 데스크탑 셸은 기준 글자 크기를 125%로 올려 rem이 1.25배가 되므로, 폭을 rem 대신 px로 적어 맞춘다.
     */
    --list-detail-list-width: clamp(320px, 28%, 384px);
    display: grid;
    width: 100%;
    height: calc(100dvh - 72px);
    min-height: 0;
    margin: 0;
    grid-template-columns: var(--list-detail-list-width) minmax(0, 1fr);
  `,
  list: css`
    label: SidePanelLayout-list;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    padding: 0 1rem;
  `,
  /*
   * 이 화면의 셸이 올려 둔 기준 글자 크기(125%)를 되돌려 본 방 기록, 동네 찾기와 같은 크기로 보이게 안쪽 내용만 줄인다(1 / 1.25 = 0.8).
   * 칸 크기는 그대로다.
   */
  fit: css`
    label: SidePanelLayout-fit;
    zoom: 0.8;
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
