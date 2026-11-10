import { css, keyframes } from '@emotion/css';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';

import MapCanvas from '@/features/map/ui/map-canvas/MapCanvas';
import MapCategoryRail from '@/features/map/ui/map-category-rail/MapCategoryRail';
import ExplorationRecordAction from '@/features/onboarding/ui/exploration-record-action/ExplorationRecordAction';
import { LogClick } from '@/shared/lib/analytics/logging';
import { ROUTE_PATTERNS } from '@/shared/lib/navigation/appPaths';
import BottomSheet from '@/shared/ui/bottom-sheet/BottomSheet';
import { Button } from '@/shared/ui/button/Button';
import Icon from '@/shared/ui/icon/Icon';

import useMyPropertyPager from '../hooks/useMyPropertyPager';
import useNeighborhoodMapView from '../hooks/useNeighborhoodMapView';
import type { NeighborhoodPreviewContext } from '../hooks/useNeighborhoodPreview';
import useResultMapViewport from '../hooks/useResultMapViewport';
import { COMMUTE_COLORS, commuteLegend } from '../model/commuteColors';
import { criteriaItems, criteriaSummary, rentLabel, transferLabel } from '../model/criteriaLabels';
import { MOBILE_AREA_SHEET_PERCENT, mobileMapViewport } from '../model/resultMapView';
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
/** 월세 슬라이더가 내려온 뒤, 만지지 않으면 접히기까지의 시간. */
const RENT_SLIDER_VISIBLE_MS = 3000;
/** 월세 슬라이더가 올라가며 사라지는 시간. 아래 `rentSliderRiseKeyframes`와 같다. */
const RENT_SLIDER_EXIT_MS = 250;

const NeighborhoodPreviewMobilePage = ({ preview }: Props) => {
  // 위치를 고르는 동안 조건 칸 아래에 바로 펼친 피커. 같은 칸을 다시 누르면 접는다.
  const [pickerField, setPickerField] = useState<NeighborhoodFilterField | null>(null);
  const isRoutePage = useMatch(`${preview.mapPath}/${ROUTE_PATTERNS.area}/*`);
  const isDetailPage = useMatch(`${preview.mapPath}/${ROUTE_PATTERNS.areaDetails}`);
  const submitSearch = preview.startAnalysis;
  // 지도 빈 곳을 찍으면 시트를 닫지 않고 제목만 보이게 내린다.
  const [peekSignal, setPeekSignal] = useState(0);
  // 월세 값을 누르면 슬라이더 막대가 잠깐 내려온다. 다시 눌러도 접히지 않고 시간만 새로 센다.
  // 막대를 잡고 있거나 값을 바꾸는 동안에는 접지 않고, 손을 떼거나 값을 마지막으로 바꾼 뒤 잠깐 지나면 접는다.
  const [isRentOpen, setIsRentOpen] = useState(false);
  const [isRentHeld, setIsRentHeld] = useState(false);
  // 접을 때 올라가며 사라지는 동안(0.25초)은 슬라이더를 그대로 그리고, 끝나면 지운다.
  const [isRentMounted, setIsRentMounted] = useState(false);
  useEffect(() => {
    if (isRentOpen) {
      setIsRentMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setIsRentMounted(false), RENT_SLIDER_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [isRentOpen]);
  const [rentOpenedAt, setRentOpenedAt] = useState(0);
  const maxRent = preview.maxRent;
  useEffect(() => {
    if (!isRentOpen || isRentHeld) return;
    const timer = window.setTimeout(() => setIsRentOpen(false), RENT_SLIDER_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [isRentOpen, isRentHeld, rentOpenedAt, maxRent]);
  // 동네 시트를 닫아도 동네 선택(지도 강조, 주소)은 남긴다. 닫은 동네의 행정동 코드를 두어 그 동네의 시트만 숨긴다.
  const [dismissedAreaCode, setDismissedAreaCode] = useState<string | null>(null);
  const selectedAreaCode = preview.selected?.adminDongCode;
  // 고른 동네가 바뀌면(풀었다가 같은 동네를 다시 골라도) 닫아 둔 기록을 지워, 새로 고른 동네 시트가 열리게 한다.
  const [lastAreaCode, setLastAreaCode] = useState(selectedAreaCode);
  if (lastAreaCode !== selectedAreaCode) {
    setLastAreaCode(selectedAreaCode);
    setDismissedAreaCode(null);
  }
  const isAreaSheetDismissed = dismissedAreaCode !== null && dismissedAreaCode === selectedAreaCode;
  // 빈 곳을 찍었을 때 할 일은 그때 열린 시트에 따라 다르다. 지도 설정보다 뒤에 정해지므로 렌더마다 새로 넣어 둔다.
  const emptyTapRef = useRef<() => void>(() => undefined);
  // 정보는 한 단계 시트 하나에만 둔다: 누른 마커 하나, 고른 동네, `My` 매물 목록 가운데 하나.
  const mapView = useNeighborhoodMapView(preview, {
    showAreaAction: false,
    onEmptyTap: () => emptyTapRef.current(),
    // 동네 시트가 열린 채 지도의 동네를 찍으면 동네 선택을 푼다. 시트를 닫아 둔 뒤에는 다른 동네를 찍으면 그 동네로 바꾼다.
    deselectOnRegionTap: !isAreaSheetDismissed,
    // 시트를 닫아 둔 동네 안을 다시 찍으면 그 동네 시트를 다시 연다.
    onSelectedRegionTap: isAreaSheetDismissed ? () => setDismissedAreaCode(null) : undefined,
  });
  const { isResultMap, mapProps, places, closeLayers, rail, railSelection } = mapView;
  const recordArea = preview.selected ?? preview.topAreas[0];
  const selectedArea = isRoutePage && !isAreaSheetDismissed ? preview.selected : undefined;
  const infoSubject: MapInfoSubject | null = places.selectedPlace
    ? { kind: 'place', place: places.selectedPlace }
    : selectedArea
      ? { kind: 'area', area: selectedArea }
      : railSelection === 'MY'
        ? { kind: 'my' }
        : null;
  // 고른 동네가 있으면(시트를 닫아 두었어도) 빈 곳을 찍어 선택을 푼다. 마커나 `My` 시트만 열려 있으면 제목만 보이게 내린다.
  emptyTapRef.current = () => {
    if (preview.selected && (infoSubject === null || infoSubject.kind === 'area')) {
      setDismissedAreaCode(null);
      preview.selectRegion(null);
    } else setPeekSignal((value) => value + 1);
  };
  // `My` 목록에서 고른 매물이면 시트에 이전과 다음 이동, 목록으로 돌아가는 뒤로가기를 둔다.
  const myPager = useMyPropertyPager(infoSubject, mapView);
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
                {/* 조건 카드: 통근, 환승, 월세 값을 나란히 둔다. 지도 색 기준은 아래 줄에 따로 카드로 둔다. */}
                <div className={styles.criteriaCard} aria-label={`선택한 탐색 조건 ${criteriaSummary(preview)}`}>
                  <dl className={styles.criteria}>
                    {criteriaItems(preview).map((item) =>
                      item.label === '월세' ? (
                        <div key={item.label}>
                          <dt>{item.label}</dt>
                          <dd>
                            <button
                              type="button"
                              className={styles.rentStat}
                              aria-expanded={isRentOpen}
                              aria-label={`월세 ${item.value}, 눌러서 바꾸기`}
                              onClick={() => {
                                // 열려 있을 때 다시 누르면 닫는다. 누르지 않아도 잠깐 뒤 저절로 닫힌다.
                                if (isRentOpen) {
                                  setIsRentOpen(false);
                                  return;
                                }
                                setIsRentOpen(true);
                                setRentOpenedAt((count) => count + 1);
                              }}
                            >
                              {item.value}
                              <Icon name="chevron-down" size={14} />
                            </button>
                          </dd>
                        </div>
                      ) : (
                        <div key={item.label}>
                          <dt>{item.label}</dt>
                          <dd>{item.value}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                </div>
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
              {/* 둘째 줄: 지도 색 기준 카드(세로)와, 월세 값을 눌렀을 때만 나오는 슬라이더 막대 카드. 끄는 동안에만 값이 뜬다. */}
              <div className={styles.filterRow}>
                <div className={styles.legendCard} aria-label="통근 시간 색상 기준">
                  {commuteLegend(preview.maxMinutes).map(([group, label]) => (
                    <span key={group}>
                      <i style={{ background: COMMUTE_COLORS[group].fillColor }} />
                      {label}
                    </span>
                  ))}
                </div>
                {isRentMounted && (
                  <div className={styles.filterCard} data-closing={!isRentOpen || undefined}>
                    <RentSlider preview={preview} bare onHoldChange={setIsRentHeld} />
                  </div>
                )}
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
            {mapView.needsZoomForFacilities && <p className={styles.zoomHint}>가까이 확대하면 보여요</p>}
            {/* 정보는 시트 하나에만 둔다. 마커와 `My`는 한 단계 높이로 두고, 닫으면 그 정보를 닫는다.
                동네는 지도와 고른 동이 같이 보이게 낮게 열고 끌어 올리면 더 크게 본다. 닫아도 동네 선택은 그대로 둔다. */}
            {infoSubject && (
              <BottomSheet
                key={infoSubject.kind === 'area' ? `area:${infoSubject.area.adminDongCode}` : infoSubject.kind}
                title={mapInfoTitle(infoSubject)}
                initialHeightPercent={infoSubject.kind === 'area' ? MOBILE_AREA_SHEET_PERCENT : 40}
                resizable={infoSubject.kind === 'area'}
                fullPage={false}
                closeLabel="정보 닫기"
                onBack={myPager?.backToList}
                headerEnd={myPager?.controls}
                peekSignal={peekSignal}
                onClose={() => {
                  if (infoSubject.kind === 'place') closeLayers();
                  else if (infoSubject.kind === 'area') setDismissedAreaCode(infoSubject.area.adminDongCode);
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

/* 월세 슬라이더가 위에서 부드럽게 내려온다. */
const rentSliderDropKeyframes = keyframes`
  from {
    opacity: 0;
    transform: translateY(-0.7rem);
  }
`;

/* 월세 슬라이더가 위로 부드럽게 올라가며 사라진다. */
const rentSliderRiseKeyframes = keyframes`
  to {
    opacity: 0;
    transform: translateY(-0.7rem);
  }
`;

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
    box-shadow: 0 1px 6px rgb(0 0 0 / 8%);
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

  /* 조건 카드. 지도 위에서도 읽히게 흰 바탕과 그림자를 둔다. */
  criteriaCard: css`
    label: NeighborhoodPreviewMobilePage-criteriaCard;
    display: flex;
    /* 폭을 꽉 채우지 않고 내용만큼 두어, 태블릿에서도 항목이 벌어지지 않게 한다. 양옆 버튼 사이 가운데에 놓는다. */
    flex: 0 1 auto;
    min-width: 0;
    align-items: center;
    margin-inline: auto;
    padding: 0.45rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.9rem;
    background: var(--color-surface);
    box-shadow: 0 1px 6px rgb(0 0 0 / 8%);
  `,

  criteria: css`
    label: NeighborhoodPreviewMobilePage-criteria;
    display: flex;
    min-width: 0;
    gap: 1.5rem;
    margin: 0;

    & div {
      display: grid;
      gap: 0.1rem;
      text-align: center;
    }

    & dt {
      color: var(--color-ink-soft);
      font-size: 0.72rem;
      font-weight: 600;
    }

    & dd {
      margin: 0;
      color: var(--color-ink);
      font-size: 1.05rem;
      font-weight: 750;
      white-space: nowrap;
    }
  `,

  filterRow: css`
    label: NeighborhoodPreviewMobilePage-filterRow;
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
  `,

  /* 지도 색 기준 카드. 항목을 세로로 쌓고 내용만큼만 폭을 둔다. */
  legendCard: css`
    label: NeighborhoodPreviewMobilePage-legendCard;
    display: grid;
    flex: none;
    gap: 0.2rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.9rem;
    background: var(--color-surface);
    box-shadow: 0 1px 6px rgb(0 0 0 / 8%);
    color: var(--color-ink-soft);
    font-size: 0.68rem;
    font-weight: 700;
    white-space: nowrap;

    & span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    & i {
      width: 3px;
      height: 0.62rem;
      flex: none;
      border-radius: 1px;
    }
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
    box-shadow: 0 1px 6px rgb(0 0 0 / 8%);
    color: var(--color-ink);
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
    }
  `,

  /* 막대만 있는 월세 슬라이더 카드. 지도 위에서도 읽히게 흰 바탕과 그림자를 둔다. */
  filterCard: css`
    label: NeighborhoodPreviewMobilePage-filterCard;
    animation: ${rentSliderDropKeyframes} 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;

    &[data-closing='true'] {
      animation: ${rentSliderRiseKeyframes} ${RENT_SLIDER_EXIT_MS}ms cubic-bezier(0.64, 0, 0.78, 0) both;
      pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
    flex: 1;
    min-width: 0;
    padding: 0.55rem 0.9rem;
    border-radius: 0.9rem;
    background: rgb(255 255 255 / 70%);
    backdrop-filter: blur(6px);
  `,

  /* 월세 값은 눌러서 슬라이더를 여는 버튼이다. 파란 값으로 눌러 볼 수 있다는 걸 알린다. */
  /* 눌러서 슬라이더를 여는 버튼이라는 게 보이게 옅은 파랑 알약에 아래 화살표를 붙인다. 열리면 화살표가 뒤집힌다. */
  rentStat: css`
    label: NeighborhoodPreviewMobilePage-rentStat;
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0.15rem 0.45rem 0.15rem 0.6rem;
    border: 0;
    border-radius: 999px;
    background: #eef3fd;
    color: var(--color-brand-blue-ink);
    font: inherit;
    cursor: pointer;

    & svg {
      transition: transform 0.2s ease;
    }

    &[aria-expanded='true'] svg {
      transform: rotate(180deg);
    }

    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 3px;
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
