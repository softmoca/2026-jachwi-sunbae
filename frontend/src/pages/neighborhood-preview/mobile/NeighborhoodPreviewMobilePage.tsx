import { css } from '@emotion/css';
import { useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';

import { SERVICE_MAP_STYLE_ID } from '@/features/map/lib/mapStyle';
import MapCanvas from '@/features/map/ui/map-canvas/MapCanvas';
import MapCategoryRail from '@/features/map/ui/map-category-rail/MapCategoryRail';
import ExplorationRecordAction from '@/features/onboarding/ui/exploration-record-action/ExplorationRecordAction';
import { LogClick } from '@/shared/lib/analytics/logging';
import { ROUTE_PATTERNS } from '@/shared/lib/navigation/appPaths';
import BottomSheet from '@/shared/ui/bottom-sheet/BottomSheet';
import { Button } from '@/shared/ui/button/Button';
import Icon from '@/shared/ui/icon/Icon';
import StateIllustration from '@/shared/ui/state-illustration/StateIllustration';

import useNeighborhoodMapView from '../hooks/useNeighborhoodMapView';
import type { NeighborhoodPreviewContext } from '../hooks/useNeighborhoodPreview';
import useResultMapViewport from '../hooks/useResultMapViewport';
import { COMMUTE_COLORS, commuteLegend, OUT_OF_RENT_COLOR } from '../model/commuteColors';
import { criteriaSummary, emptyAreaMessage, rentLabel, transferLabel } from '../model/criteriaLabels';
import { mobileMapViewport } from '../model/resultMapView';
import type { NeighborhoodFilterField } from '../NeighborhoodFilters';
import { NeighborhoodFilterPicker } from '../NeighborhoodFilters';
import AnalysisOverlay from '../ui/analysis-overlay/AnalysisOverlay';
import LocationControls from '../ui/location-controls/LocationControls';
import MapInfo, { type MapInfoSubject, mapInfoTitle } from '../ui/map-info/MapInfo';
import NeighborhoodMapSearch from '../ui/map-search/NeighborhoodMapSearch';
import MapTapHint from '../ui/map-tap-hint/MapTapHint';
import RentSlider from '../ui/rent-slider/RentSlider';

import * as shared from '../NeighborhoodPreviewPage.styles';

type Props = {
  preview: NeighborhoodPreviewContext;
};

/**
 * 휴대폰 동네 찾기. 지도를 화면 전체에 두고 조건은 지도 아래 시트의 조건 칸으로, 결과는 지도 아래 가로 레일로 고른다.
 * 대중교통 상세는 지도 없이 화면 전체로 연다.
 */
const NeighborhoodPreviewMobilePage = ({ preview }: Props) => {
  // 위치를 고르는 동안 조건 칸 아래에 바로 펼친 피커. 같은 칸을 다시 누르면 접는다.
  const [pickerField, setPickerField] = useState<NeighborhoodFilterField | null>(null);
  const isRoutePage = useMatch(`${preview.mapPath}/${ROUTE_PATTERNS.area}/*`);
  const isDetailPage = useMatch(`${preview.mapPath}/${ROUTE_PATTERNS.areaDetails}`);
  const submitSearch = preview.startAnalysis;
  // 지도 빈 곳을 찍으면 시트를 닫지 않고 제목만 보이게 내린다.
  const [peekSignal, setPeekSignal] = useState(0);
  // 정보는 한 단계 시트 하나에만 둔다: 누른 마커 하나, 고른 동네, `My` 매물 목록 가운데 하나.
  const mapView = useNeighborhoodMapView(preview, {
    showAreaAction: false,
    onEmptyTap: () => setPeekSignal((value) => value + 1),
    // 시트가 열린 채 지도의 동네를 찍으면 동네 선택을 푼다.
    deselectOnRegionTap: true,
  });
  const { isResultMap, mapProps, places, closeLayers, rail, railSelection } = mapView;
  const recordArea = preview.selected ?? preview.topAreas[0];
  const selectedArea = isRoutePage ? preview.selected : undefined;
  const infoSubject: MapInfoSubject | null = places.selectedPlace
    ? { kind: 'place', place: places.selectedPlace }
    : selectedArea
      ? { kind: 'area', area: selectedArea }
      : railSelection === 'MY'
        ? { kind: 'my' }
        : null;
  // 지도는 화면 전체를 쓰고, 위 결과 머리와 아래 시트가 가리는 만큼 비우고 시점을 맞춘다.
  const mapSectionRef = useResultMapViewport<HTMLElement>(preview, (section) => {
    const rect = section.getBoundingClientRect();
    const header = section.querySelector('header');
    return mobileMapViewport(rect, header ? header.getBoundingClientRect().bottom - rect.top : 0);
  });
  // 결과에 들어오자마자 오른쪽 위에 확대 축소, 분류 레일(중개사, 병원, 교통, 편의, My), 현재 위치 버튼을 한 줄로 세운다.
  const resultControls = (
    <LocationControls
      preview={preview}
      isResult
      zoom={{ level: preview.resultLevel, onZoom: preview.zoomResultBy }}
      className={styles.railControls}
      rail={<MapCategoryRail showIcons={false} {...rail} />}
    />
  );
  // 통근, 환승, 월세 조건 칸. 위치를 고르기 전후 모두 아래 시트에 둔다.
  // 칸마다 위에 항목, 아래에 값을 적고, 읽을 때는 `통근 40분 이내`처럼 한 문장으로 읽게 한다.
  const filterCells: { field: NeighborhoodFilterField; title: string; value: string; label: string }[] = [
    {
      field: 'minutes',
      title: '통근',
      value: `${preview.maxMinutes}분 이내`,
      label: `통근 ${preview.maxMinutes}분 이내`,
    },
    {
      field: 'transfers',
      title: '환승',
      value: preview.maxTransfers === 0 ? '없음' : `${preview.maxTransfers}회 이하`,
      label: transferLabel(preview.maxTransfers),
    },
    {
      field: 'rent',
      title: '월세',
      value: preview.maxRent === 0 ? '전체' : `${preview.maxRent}만원 이하`,
      label: rentLabel(preview.maxRent),
    },
  ];
  const showsTapHint =
    !preview.hasChosenMapPoint && pickerField === null && !preview.query.trim() && preview.addressResults.length === 0;
  const filterChips = (
    <div className={shared.filterChips} aria-label="탐색 조건">
      {filterCells.map((cell) => (
        <LogClick key={cell.field} event="neighborhood_condition_clicked" params={{ field: cell.field }}>
          <button
            type="button"
            aria-label={cell.label}
            aria-expanded={pickerField === cell.field}
            onClick={() => setPickerField((open) => (open === cell.field ? null : cell.field))}
          >
            <span className={shared.filterCellTitle}>
              {cell.title}
              <Icon name="chevron-down" size={14} />
            </span>
            <span className={shared.filterCellValue}>{cell.value}</span>
          </button>
        </LogClick>
      ))}
    </div>
  );

  if (isDetailPage && !preview.isAnalyzing && !preview.error)
    return (
      <div className={shared.page}>
        <Outlet context={preview} />
      </div>
    );
  return (
    <main className={shared.page} data-public-explore={preview.isPublicExplore || undefined}>
      <section
        ref={mapSectionRef}
        className={shared.mapPage}
        aria-label={isResultMap ? '행정동 프리셋 지도' : '지도에서 목적지 선택'}
      >
        <MapCanvas
          animateView
          customStyleId={SERVICE_MAP_STYLE_ID}
          hideLoading={preview.isAnalyzing || Boolean(preview.error)}
          interactive
          onReady={preview.prefetchBoundaries}
          {...mapProps}
        />
        <AnalysisOverlay preview={preview} />
        {preview.isSelectingOnMap && (
          <>
            <header className={shared.searchHeader}>
              <NeighborhoodMapSearch preview={preview} />
            </header>
            <LocationControls
              preview={preview}
              isResult={false}
              zoom={{ level: preview.selectionLevel, onZoom: preview.zoomSelectionBy }}
              isFilterOpen={pickerField !== null}
            />
            {showsTapHint && <MapTapHint />}
            {/* 조건 칸과 찾기 버튼은 위치를 고르기 전부터 아래 시트에 두어, 위치를 골라도 자리가 바뀌지 않게 한다.
                위치를 고르기 전에는 찾기 버튼을 막아 두고 장소를 고르라고 적는다. 지도 위 버튼은 말풍선 핀과 겹쳐 두지 않는다. */}
            <section
              className={shared.searchCard}
              aria-label={preview.hasChosenMapPoint ? '고른 출퇴근 장소' : '출퇴근 조건'}
            >
              <p className={shared.searchCardTitle}>이 조건으로 추천받아요</p>
              {filterChips}
              {pickerField !== null && (
                <NeighborhoodFilterPicker key={pickerField} preview={preview} field={pickerField} />
              )}
              {preview.hasChosenMapPoint ? (
                <Button fullWidth disabled={!preview.isValidCommuteTime} onClick={submitSearch}>
                  <span className={shared.searchCardLabel}>
                    <span>{preview.mapCandidate.name}</span>에서 찾기
                  </span>
                </Button>
              ) : (
                <Button fullWidth disabled>
                  지도에서 출퇴근 장소를 골라 주세요
                </Button>
              )}
            </section>
          </>
        )}
        {isResultMap && (
          <>
            <header className={`${shared.resultHeader} ${styles.resultHeader}`}>
              {/* 첫 줄: 홈으로 나가는 집 버튼, 조건 요약 한 줄, 출퇴근 장소부터 다시 고르는 아이콘 버튼. */}
              <div className={styles.headerRow}>
                <button type="button" className={shared.mapBack} aria-label="홈으로 돌아가기" onClick={preview.leave}>
                  <Icon name="home" size={22} />
                </button>
                <p className={styles.criteriaSummary} aria-label="선택한 탐색 조건">
                  {criteriaSummary(preview)}
                </p>
                <button
                  type="button"
                  className={styles.resetButton}
                  aria-label="다시 선택하기"
                  onClick={() => {
                    closeLayers();
                    preview.reset();
                  }}
                >
                  <Icon name="refresh" size={22} />
                </button>
              </div>
              {/* 둘째 줄: 월세를 끌어서 바로 바꾸는 슬라이더와 지도 색 기준을 카드 하나에 둔다. 끄는 동안 지도 색과 순위가 바뀐다. */}
              <div className={styles.filterCard}>
                <RentSlider preview={preview} compact />
                <div className={shared.colorLegend} aria-label="통근 시간 색상 기준">
                  {commuteLegend(preview.maxMinutes).map(([group, label]) => (
                    <span key={group}>
                      <i style={{ background: COMMUTE_COLORS[group].fillColor }} />
                      {label}
                    </span>
                  ))}
                  {preview.maxRent > 0 && (
                    <span>
                      <i style={{ background: OUT_OF_RENT_COLOR.fillColor }} />
                      월세 조건 밖
                    </span>
                  )}
                </div>
              </div>
            </header>
            {resultControls}
            {preview.isPublicExplore && recordArea && (
              <div className={shared.recordAction}>
                <ExplorationRecordAction
                  location={{
                    ...recordArea.center,
                    address: recordArea.fullName,
                    roadAddress: null,
                    jibunAddress: recordArea.fullName,
                  }}
                />
              </div>
            )}
            {preview.matchedAreaCount === 0 && (
              <div className={shared.resultControls}>
                <div className={shared.selectedInfo} role="status">
                  <StateIllustration name="empty-search" size={4.5} />
                  <p>{emptyAreaMessage(preview.maxRent)}</p>
                </div>
              </div>
            )}
            {mapView.needsZoomForFacilities && <p className={styles.zoomHint}>가까이 확대하면 보여요</p>}
            {/* 정보는 한 단계 높이의 시트 하나에만 둔다. 끝까지 끌어 올리지 않고, 닫으면 그 정보를 닫는다. */}
            {infoSubject && (
              <BottomSheet
                key={infoSubject.kind === 'area' ? `area:${infoSubject.area.adminDongCode}` : infoSubject.kind}
                title={mapInfoTitle(infoSubject)}
                initialHeightPercent={40}
                resizable={false}
                fullPage={false}
                closeLabel="정보 닫기"
                peekSignal={peekSignal}
                onClose={() => {
                  if (infoSubject.kind === 'place') closeLayers();
                  else if (infoSubject.kind === 'area') preview.selectRegion(null);
                  else mapView.clearRail();
                }}
              >
                <MapInfo
                  subject={infoSubject}
                  preview={preview}
                  my={mapView.my}
                  onSelectProperty={mapView.selectMyProperty}
                  phoneAction="call"
                />
              </BottomSheet>
            )}
            {isRoutePage && <Outlet context={preview} />}
          </>
        )}
      </section>
    </main>
  );
};

const styles = {
  /* 시설 칸을 켰지만 멀리 보고 있을 때 지도 아래 가운데에 띄우는 한 줄 안내. 지도 조작을 막지 않는다. */
  zoomHint: css`
    label: NeighborhoodPreviewMobilePage-zoomHint;
    position: absolute;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom) + 1.5rem);
    z-index: 2;
    margin: 0;
    padding: 0.5rem 0.9rem;
    border-radius: 99px;
    background: var(--color-surface);
    box-shadow: var(--shadow-floating);
    color: var(--color-ink-soft);
    font-size: 0.8rem;
    transform: translateX(-50%);
    pointer-events: none;
  `,

  /* 결과 머리. 첫 줄(집, 조건 요약, 다시 선택)과 둘째 줄(월세 슬라이더와 색 기준 카드)을 위아래로 쌓는다. */
  resultHeader: css`
    label: NeighborhoodPreviewMobilePage-resultHeader;

    && {
      flex-direction: column;
      align-items: stretch;
      gap: 0.45rem;
    }
  `,

  headerRow: css`
    label: NeighborhoodPreviewMobilePage-headerRow;
    display: flex;
    align-items: center;
    gap: 0.45rem;
  `,

  /* 조건 요약 한 줄. 넘치면 말줄임으로 자른다. */
  criteriaSummary: css`
    label: NeighborhoodPreviewMobilePage-criteriaSummary;
    flex: 1;
    min-width: 0;
    margin: 0;
    padding: 0 0.9rem;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: 99px;
    background: var(--color-surface);
    box-shadow: var(--shadow-floating);
    color: var(--color-ink);
    font-size: 0.82rem;
    font-weight: 700;
    line-height: 2.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  resetButton: css`
    label: NeighborhoodPreviewMobilePage-resetButton;
    flex: none;
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    background: var(--color-surface);
    box-shadow: var(--shadow-floating);
    color: var(--color-ink);
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
    }
  `,

  /* 월세 슬라이더와 색 기준을 묶은 카드. 지도 위에서도 읽히게 흰 바탕과 그림자를 둔다. */
  filterCard: css`
    label: NeighborhoodPreviewMobilePage-filterCard;
    display: grid;
    gap: 0.2rem;
    padding: 0.45rem 0.8rem 0.4rem;
    border: 1px solid var(--color-border);
    border-radius: 0.9rem;
    background: var(--color-surface);
    box-shadow: var(--shadow-floating);

    & > [aria-label='통근 시간 색상 기준'] {
      padding: 0;
      background: none;
    }
  `,

  /* 위쪽 결과 머리(조건 요약 줄, 월세와 색 기준 카드) 아래 오른쪽에 확대 축소, 분류 레일, 현재 위치 버튼을 세운다. */
  railControls: css`
    label: NeighborhoodPreviewMobilePage-railControls;

    && {
      top: calc(env(safe-area-inset-top) + 10rem);
    }
  `,
};

export default NeighborhoodPreviewMobilePage;
