import { css } from '@emotion/css';

import MapCanvas from '@/features/map/ui/map-canvas/MapCanvas';
import MapCategoryRail from '@/features/map/ui/map-category-rail/MapCategoryRail';
import MapZoomControl from '@/features/map/ui/map-zoom-control/MapZoomControl';
import StreetMemoImpressionLog from '@/features/street-memo/ui/street-memo-impression-log/StreetMemoImpressionLog';
import StreetMemoSheet from '@/features/street-memo/ui/street-memo-sheet/StreetMemoSheet';
import Icon from '@/shared/ui/icon/Icon';

import type { RecordsState } from '../hooks/useRecords';
import type { RecordsMapLayers } from '../hooks/useRecordsMapLayers';
import { RECORDS_HIDDEN_CATEGORIES, recordsMapHint } from '../model/recordPresentation';
import RecordMapTapIntro from '../ui/record-map-tap-intro/RecordMapTapIntro';
import RecordsSelectedSheet from './RecordsSelectedSheet';

type Props = {
  records: RecordsState;
  layers: RecordsMapLayers;
};

/**
 * 휴대폰·태블릿 본 방 기록 지도. 위에 뜬 헤더 아래로 시설·거리 메모 카테고리 레일을 둔다.
 * 데스크탑처럼 빈 곳을 찍으면 그 자리 말풍선에서 메모를 남기거나 매물을 등록한다. 열린 것이 있으면 먼저 닫기만 한다.
 * 고른 매물은 아래 바텀시트에서 보고, 겹쳐 묶인 매물은 시트에 함께 늘어놓는다.
 */
const RecordsMobileMap = ({ records, layers }: Props) => {
  const { selected } = records;
  const sheetRecords = layers.groupRecords.length > 0 ? layers.groupRecords : selected ? [selected] : [];
  const hasBottomLayer = sheetRecords.length > 0 || layers.memo.mode !== null;
  return (
    <section className={styles.map} aria-label="본 방 기록 지도">
      <MapCanvas {...layers.canvasProps} coordinateMenu={layers.coordinateMenu} />
      <StreetMemoImpressionLog memos={layers.memo.visibleMemos} />
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
      {!hasBottomLayer && <span className={styles.hint}>{recordsMapHint(records.records, layers)}</span>}
      <RecordsSelectedSheet records={sheetRecords} onClose={layers.closeAll} onNotice={records.setNotice} />
      <StreetMemoSheet layer={layers.memo} onCreated={layers.showMemos} />
      <RecordMapTapIntro setLevel={records.setLevel} hasTapped={layers.tapPoint !== null} />
    </section>
  );
};

const styles = {
  /* 휴대폰·태블릿 본 방 기록 지도. 위에 뜬 헤더·동네 뱃지 아래로 카테고리 레일·현재 위치 버튼을 두고, 아래쪽에 지도 안내를 띄운다. */
  map: css`
    label: RecordsMobileMap-map;
    position: relative;
    flex: 1;
    min-height: 0;
  `,

  rail: css`
    label: RecordsMobileMap-rail;
    top: calc(max(0.85rem, env(safe-area-inset-top)) + 11.4rem);
    right: 0.75rem;
    z-index: 12;
  `,

  /* 메모부터 편의점까지 다섯 칸(한 칸 2.5rem)인 레일 아래에 둔다. */
  recenter: css`
    label: RecordsMobileMap-recenter;
    position: absolute;
    top: calc(max(0.85rem, env(safe-area-inset-top)) + 24.5rem);
    right: 0.95rem;
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

  /* 헤더·동네 뱃지 아래 오른쪽 위에 두고, 카테고리 레일은 그 아래로 내린다. */
  zoom: css`
    label: RecordsMobileMap-zoom;
    top: calc(max(0.85rem, env(safe-area-inset-top)) + 8.15rem);
    right: 0.75rem;
  `,

  /* 아무것도 열리지 않았을 때 가운데 아래에 띄우는 지도 안내. 지도 조작을 막지 않는다. */
  hint: css`
    label: RecordsMobileMap-hint;
    position: absolute;
    bottom: max(1.5rem, env(safe-area-inset-bottom));
    left: 50%;
    z-index: 12;
    width: max-content;
    max-width: calc(100% - 2rem);
    padding: 0.55rem 0.85rem;
    border-radius: 2rem;
    background: #ffffffed;
    box-shadow: 0 2px 10px #00000016;
    color: #6b7079;
    font-size: 0.8rem;
    text-align: center;
    transform: translateX(-50%);
    pointer-events: none;
  `,
};

export default RecordsMobileMap;
