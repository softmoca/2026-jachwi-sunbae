import { css } from '@emotion/css';
import type { ReactNode } from 'react';

import MapCanvas from '@/features/map/ui/map-canvas/MapCanvas';
import MapCategoryRail from '@/features/map/ui/map-category-rail/MapCategoryRail';
import MapZoomControl from '@/features/map/ui/map-zoom-control/MapZoomControl';
import StreetMemoImpressionLog from '@/features/street-memo/ui/street-memo-impression-log/StreetMemoImpressionLog';
import StreetMemoPanel from '@/features/street-memo/ui/street-memo-panel/StreetMemoPanel';
import Icon from '@/shared/ui/icon/Icon';

import type { RecordsState } from '../hooks/useRecords';
import type { RecordsMapLayers } from '../hooks/useRecordsMapLayers';
import { RECORDS_HIDDEN_CATEGORIES, recordsMapHint } from '../model/recordPresentation';
import RecordMapTapIntro from '../ui/record-map-tap-intro/RecordMapTapIntro';

type Props = {
  records: RecordsState;
  layers: RecordsMapLayers;
  /** 지도 위에 띄우는 동네 뱃지. */
  districts: ReactNode;
  className?: string;
};

/**
 * 데스크탑 본 방 기록 지도. 기록한 방에 더해 시설·거리 메모 카테고리를 켜 볼 수 있고,
 * 빈 곳을 찍으면 그 자리 말풍선에서 메모를 남기거나 매물을 등록한다. 메모는 지도 위 카드에서 보고,
 * 겹쳐 묶인 매물은 리스트에 이미 모두 보여 따로 늘어놓지 않고 누르면 갈라져 보일 때까지 다가간다.
 */
const RecordsDesktopMap = ({ records, layers, districts, className }: Props) => (
  <section className={`${styles.map} ${className ?? ''}`.trim()} aria-label="본 방 기록 지도">
    <MapCanvas {...layers.canvasProps} coordinateMenu={layers.coordinateMenu} />
    <StreetMemoImpressionLog memos={layers.memo.visibleMemos} />
    <div className={styles.districts}>{districts}</div>
    <MapCategoryRail
      showMemo
      showIcons={false}
      hiddenCategories={RECORDS_HIDDEN_CATEGORIES}
      className={styles.rail}
      selectedCategories={layers.category === null ? [] : [layers.category]}
      counts={layers.counts}
      onToggle={layers.toggleCategory}
    />
    <button
      className={styles.recenter}
      type="button"
      aria-label="현재 위치로 이동"
      onClick={() => records.moveToCurrentLocation()}
    >
      <Icon name="target" size={22} />
    </button>
    <MapZoomControl className={styles.zoom} level={records.level} onChange={records.setLevel} />
    {!records.selected && layers.memo.mode === null && (
      <span className={styles.hint}>{recordsMapHint(records.records, layers)}</span>
    )}
    <StreetMemoPanel layer={layers.memo} onCreated={layers.showMemos} className={styles.memoCard} />
    <RecordMapTapIntro setLevel={records.setLevel} hasTapped={layers.tapPoint !== null} />
  </section>
);

const styles = {
  /* 데스크탑 본 방 기록 지도: 오른쪽 칸 전체. 동네 뱃지는 위에, 카테고리 레일·현재 위치는 오른쪽에, 메모 카드는 왼쪽 위에 띄운다. */
  map: css`
    label: RecordsDesktopMap-map;
    position: relative;
    min-width: 0;
    min-height: 0;
  `,

  districts: css`
    label: RecordsDesktopMap-districts;
    position: absolute;
    z-index: 10;
    top: 0;
    right: 0;
    left: 0;
    padding-top: 0.75rem;
    /* 오른쪽 위 확대·축소 버튼 자리를 비워 둔다. */
    padding-right: 6.5rem;
  `,

  /* 동네 뱃지 줄 아래 오른쪽에 둔다. */
  rail: css`
    label: RecordsDesktopMap-rail;
    top: 4.5rem;
    right: 1rem;
    z-index: 12;
  `,

  /* 메모부터 편의점까지 다섯 칸인 레일 아래에 둔다. */
  recenter: css`
    label: RecordsDesktopMap-recenter;
    position: absolute;
    top: 17.6rem;
    right: 1.15rem;
    z-index: 12;
    display: grid;
    place-items: center;
    width: 2.65rem;
    height: 2.65rem;
    border: 0;
    border-radius: 50%;
    color: #41444b;
    background: #fff;
    box-shadow: 0 2px 10px #00000016;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid #25282d;
      outline-offset: 3px;
    }
  `,

  /* 지도 오른쪽 위, 동네 뱃지 줄과 같은 높이에 둔다. */
  zoom: css`
    label: RecordsDesktopMap-zoom;
    top: 1.35rem;
    right: 1rem;
  `,

  hint: css`
    label: RecordsDesktopMap-hint;
    position: absolute;
    bottom: 2.75rem;
    left: 1rem;
    padding: 0.5rem 0.7rem;
    border-radius: 0.5rem;
    background: #ffffffed;
    color: #92969d;
    font-size: 0.8rem;
  `,

  /* 메모 카드와 겹친 매물 카드는 오른쪽 레일을 가리지 않게 왼쪽 위, 동네 뱃지 아래에 띄운다. 둘은 함께 열리지 않는다. */
  memoCard: css`
    label: RecordsDesktopMap-memoCard;
    position: absolute;
    top: 4.5rem;
    left: 1rem;
    z-index: 30;
    width: min(22rem, calc(100% - 6rem));
    max-height: calc(100% - 6rem);
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    background: var(--color-surface);
    box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 14%);
  `,
};

export default RecordsDesktopMap;
