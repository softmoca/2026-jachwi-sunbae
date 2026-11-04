import { useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';

import { SERVICE_MAP_STYLE_ID } from '@/features/map/lib/mapStyle';
import MapCanvas from '@/features/map/ui/map-canvas/MapCanvas';
import ExplorationRecordAction from '@/features/onboarding/ui/exploration-record-action/ExplorationRecordAction';
import { LogClick } from '@/shared/lib/analytics/logging';
import { ROUTE_PATTERNS } from '@/shared/lib/navigation/appPaths';
import BottomSheet from '@/shared/ui/bottom-sheet/BottomSheet';
import { Button } from '@/shared/ui/button/Button';
import HorizontalRail from '@/shared/ui/horizontal-rail/HorizontalRail';
import Icon from '@/shared/ui/icon/Icon';
import RankedCard from '@/shared/ui/ranked-card/RankedCard';
import StateIllustration from '@/shared/ui/state-illustration/StateIllustration';

import useNeighborhoodMapView from '../hooks/useNeighborhoodMapView';
import type { NeighborhoodPreviewContext } from '../hooks/useNeighborhoodPreview';
import { COMMUTE_COLORS, commuteLegend, OUT_OF_RENT_COLOR } from '../model/commuteColors';
import { areaCardDescription, emptyAreaMessage, placesHint, rentLabel, transferLabel } from '../model/criteriaLabels';
import type { NeighborhoodFilterField } from '../NeighborhoodFilters';
import NeighborhoodFilters, { NeighborhoodFilterPicker } from '../NeighborhoodFilters';
import AnalysisOverlay from '../ui/analysis-overlay/AnalysisOverlay';
import AreaPlacesSheet from '../ui/area-places-sheet/AreaPlacesSheet';
import { areaStation } from '../ui/area-summary/AreaSummary';
import LocationControls from '../ui/location-controls/LocationControls';
import NeighborhoodMapSearch from '../ui/map-search/NeighborhoodMapSearch';
import MapTapHint from '../ui/map-tap-hint/MapTapHint';
import NeighborhoodPlaceSheet from '../ui/place-panel/NeighborhoodPlaceSheet';

import * as shared from '../NeighborhoodPreviewPage.styles';

const CARD_RANKS = [1, 2, 3, 4, 5] as const;

type Props = {
  preview: NeighborhoodPreviewContext;
};

/**
 * 휴대폰 동네 찾기. 지도를 화면 전체에 두고 조건은 지도 아래 시트의 조건 칸으로, 결과는 지도 아래 가로 레일로 고른다.
 * 대중교통 상세는 지도 없이 화면 전체로 연다.
 */
const NeighborhoodPreviewMobilePage = ({ preview }: Props) => {
  // 결과 화면에서 월세만 고치는 시트.
  const [filterField, setFilterField] = useState<'rent' | null>(null);
  // 위치를 고르는 동안 조건 칸 아래에 바로 펼친 피커. 같은 칸을 다시 누르면 접는다.
  const [pickerField, setPickerField] = useState<NeighborhoodFilterField | null>(null);
  const isRoutePage = useMatch(`${preview.mapPath}/${ROUTE_PATTERNS.area}/*`);
  const isDetailPage = useMatch(`${preview.mapPath}/${ROUTE_PATTERNS.areaDetails}`);
  const submitSearch = preview.startAnalysis;
  // 지도 빈 곳을 찍으면 시트를 닫지 않고 제목만 보이게 내린다.
  const [peekSignal, setPeekSignal] = useState(0);
  // 고른 동네의 정보는 지도 위 말풍선 대신 아래 시트(AreaPlacesSheet)에 둔다.
  const { isResultMap, mapProps, places, closeLayers } = useNeighborhoodMapView(preview, {
    showAreaAction: false,
    onEmptyTap: () => setPeekSignal((value) => value + 1),
    // 시트가 열린 채 지도의 동네를 찍으면 시트를 닫고 랭킹을 다시 보여 준다.
    deselectOnRegionTap: true,
    stationMarkersOnly: !!isRoutePage && !!preview.selected,
  });
  const recordArea = preview.selected ?? preview.topAreas[0];
  const hasAreaSheet = !!isRoutePage && !!preview.selected;
  // 시트를 띄우면 확대 축소, 현재 위치 버튼을 시트 바로 위에 붙여 시트와 함께 오르내리게 한다. 지도 위 고정 자리에 두면 시트에 가린다.
  const hasSheet = hasAreaSheet || places.selectedPlace !== null;
  const resultControls = (
    <LocationControls
      preview={preview}
      isResult
      docked={hasSheet}
      zoom={{ level: preview.resultLevel, onZoom: preview.zoomResultBy }}
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
      <section className={shared.mapPage} aria-label={isResultMap ? '행정동 프리셋 지도' : '지도에서 목적지 선택'}>
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
              {!preview.hasChosenMapPoint && (
                <>
                  {preview.isSearching && (
                    <p className={shared.mapSearchResult} role="status">
                      주소를 찾고 있어요.
                    </p>
                  )}
                  {preview.searchError && (
                    <p className={shared.mapSearchResult} role="alert">
                      {preview.searchError}
                    </p>
                  )}
                  {preview.addressResults.map((address) => (
                    <button
                      className={shared.mapSearchResult}
                      key={`${address.latitude}-${address.longitude}`}
                      onClick={() => preview.selectAddress(address)}
                    >
                      {address.roadAddress ?? address.jibunAddress ?? address.address}
                    </button>
                  ))}
                </>
              )}
            </header>
            <LocationControls preview={preview} isResult={false} isFilterOpen={pickerField !== null} />
            {showsTapHint && <MapTapHint centered />}
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
            <header className={shared.resultHeader}>
              {/* 왼쪽은 들어온 곳(보통 홈)으로 한 번에 나가는 뒤로가기, 가운데는 조건과 색 기준, 오른쪽은 출퇴근 장소부터 다시 고르는 버튼이다. */}
              <button type="button" className={shared.mapBack} aria-label="동네 찾기 나가기" onClick={preview.leave}>
                <Icon name="chevron-left" size={24} />
              </button>
              <div className={shared.resultCriteria}>
                <div className={shared.criteriaBadges} aria-label="선택한 탐색 조건">
                  {/* 통근과 환승은 찾은 결과를 정한 조건이라 결과에서는 바꿀 수 없다. 회색으로 두고, 바꾸려면 다시 선택한다. */}
                  <span aria-disabled="true">통근 {preview.maxMinutes}분 이내</span>
                  <span aria-disabled="true">{transferLabel(preview.maxTransfers)}</span>
                  {/* 월세는 받은 시세를 거르는 조건이라 결과에서도 다시 찾지 않고 바로 바꾼다. */}
                  <Button variant="secondary" className={shared.filterBadge} onClick={() => setFilterField('rent')}>
                    {rentLabel(preview.maxRent)} <Icon name="chevron-down" size={16} />
                  </Button>
                </div>
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
                  <small className={shared.placesHint}>
                    {placesHint({ isClose: places.isClose, failed: places.failed })}
                  </small>
                </div>
              </div>
              <Button
                variant="secondary"
                className={shared.resultReset}
                onClick={() => {
                  closeLayers();
                  preview.reset();
                }}
              >
                <Icon name="refresh" size={22} />
                다시 선택하기
              </Button>
            </header>
            {!hasSheet && resultControls}
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
            {!isRoutePage && preview.topAreas.length > 0 && (
              <div className={shared.topAreaRail} aria-label="통근 시간 상위 동네">
                <HorizontalRail className={shared.areaCards}>
                  {preview.topAreas.map((area, index) => (
                    <RankedCard
                      key={area.adminDongCode}
                      className={shared.areaCard}
                      rank={CARD_RANKS[index]}
                      title={area.name}
                      value={area.commuteMinutes}
                      unit="분"
                      description={areaCardDescription(area)}
                      selected={preview.selected?.adminDongCode === area.adminDongCode}
                      onSelect={() => preview.selectRegion(area.adminDongCode)}
                    />
                  ))}
                </HorizontalRail>
              </div>
            )}
            {/* 동네를 고르면 출발 정류장 시트를 올리고, 정류장을 고르면 시트 안에서 경로로 넘어간다. 뒤로가기로 목록에 돌아온다. */}
            {hasAreaSheet && preview.selected && (
              <AreaPlacesSheet
                key={preview.selected.adminDongCode}
                area={preview.selected}
                place={places.selectedPlace}
                preview={preview}
                peekSignal={peekSignal}
                floating={resultControls}
                onSelectStation={(station) => {
                  places.selectStation(areaStation(station));
                  preview.selectStation(station.stopId);
                  preview.focusRoute(station);
                }}
                onBack={places.closePlace}
                onClose={() => {
                  closeLayers();
                  preview.selectRegion(null);
                }}
              />
            )}
            {/* 동네를 고르지 않고 마커로 연 장소는 따로 시트를 띄운다. */}
            {!hasAreaSheet && places.selectedPlace && (
              <NeighborhoodPlaceSheet
                place={places.selectedPlace}
                preview={preview}
                peekSignal={peekSignal}
                floating={resultControls}
                onClose={places.closePlace}
              />
            )}
            {filterField === 'rent' && (
              <BottomSheet
                title="월세 시세"
                initialHeightPercent={55}
                resizable={false}
                onClose={() => setFilterField(null)}
              >
                <NeighborhoodFilters preview={preview} field="rent" onClose={() => setFilterField(null)} />
              </BottomSheet>
            )}
            {isRoutePage && <Outlet context={preview} />}
          </>
        )}
      </section>
    </main>
  );
};

export default NeighborhoodPreviewMobilePage;
