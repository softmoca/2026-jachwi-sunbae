import { css } from '@emotion/css';
import { Outlet, useMatch } from 'react-router-dom';

import { SERVICE_MAP_STYLE_ID } from '@/features/map/lib/mapStyle';
import MapCanvas from '@/features/map/ui/map-canvas/MapCanvas';
import ExplorationRecordAction from '@/features/onboarding/ui/exploration-record-action/ExplorationRecordAction';
import { ROUTE_PATTERNS } from '@/shared/lib/navigation/appPaths';
import { Button } from '@/shared/ui/button/Button';
import Icon from '@/shared/ui/icon/Icon';
import ListDetailLayout from '@/shared/ui/list-detail-layout/ListDetailLayout';
import RankedCard from '@/shared/ui/ranked-card/RankedCard';
import StateIllustration from '@/shared/ui/state-illustration/StateIllustration';

import useNeighborhoodMapView from '../hooks/useNeighborhoodMapView';
import type { AreaStation } from '../hooks/useNeighborhoodPlaces';
import type { NeighborhoodPreviewContext } from '../hooks/useNeighborhoodPreview';
import { COMMUTE_COLORS, commuteLegend, OUT_OF_RENT_COLOR } from '../model/commuteColors';
import { areaCardDescription, emptyAreaMessage, placesHint, transferLabel } from '../model/criteriaLabels';
import { STATION_FOCUS_LEVEL } from '../model/resultMapView';
import AnalysisOverlay from '../ui/analysis-overlay/AnalysisOverlay';
import AreaSummary, { areaStation } from '../ui/area-summary/AreaSummary';
import ConditionPanel from '../ui/condition-panel/ConditionPanel';
import LocationControls from '../ui/location-controls/LocationControls';
import NeighborhoodMapSearch from '../ui/map-search/NeighborhoodMapSearch';
import MapTapHint from '../ui/map-tap-hint/MapTapHint';
import NeighborhoodPlacePanel from '../ui/place-panel/NeighborhoodPlacePanel';
import RentSlider from '../ui/rent-slider/RentSlider';

import * as shared from '../NeighborhoodPreviewPage.styles';
import * as placeStyles from '../ui/place-panel/NeighborhoodPlacePanel.styles';

const CARD_RANKS = [1, 2, 3, 4, 5] as const;

type Props = {
  preview: NeighborhoodPreviewContext;
};

/**
 * 데스크탑 동네 찾기. 본 방 기록처럼 왼쪽 칸에서 조작하고 지도는 오른쪽에 둔다.
 * 고를 때는 왼쪽 칸에 조건을, 결과에서는 기준 요약과 상위 동네를 두고, 대중교통 상세는 목록 옆 칸에 붙여 연다.
 */
const NeighborhoodPreviewDesktopPage = ({ preview }: Props) => {
  const isRoutePage = useMatch(`${preview.mapPath}/${ROUTE_PATTERNS.area}/*`);
  const isDetailPage = useMatch(`${preview.mapPath}/${ROUTE_PATTERNS.areaDetails}`);
  const submitSearch = preview.startAnalysis;
  const { isResultMap, mapProps, places, closeLayers } = useNeighborhoodMapView(preview, {
    showAreaAction: false,
    stationMarkersOnly: !!preview.selected,
  });
  const recordArea = preview.selected ?? preview.topAreas[0];
  /** 출발 정류장을 고르면 정보 칸에 경로를 열고 지도를 그 정류장으로 확대한다. */
  const selectAreaStation = (station: AreaStation) => {
    places.selectStation(station);
    // 출발 정류장을 바꾼 지표(commute_departure_station_changed)는 동네 요약 목록에서 고를 때 남긴다.
    preview.selectStation(station.stopId);
    preview.focusResultPoint(station, STATION_FOCUS_LEVEL);
  };
  // 정보 칸에서 같은 동네의 앞뒤 출발 정류장으로 넘긴다.
  const areaStations = preview.selected?.stations ?? [];
  const selectedPlace = places.selectedPlace;
  const stationIndex =
    selectedPlace?.kind === 'station'
      ? areaStations.findIndex((station) => station.stopId === selectedPlace.station.stopId)
      : -1;
  const stationNav =
    stationIndex >= 0 && areaStations.length > 1
      ? {
          index: stationIndex,
          total: areaStations.length,
          onPrevious: () => selectAreaStation(areaStation(areaStations[stationIndex - 1])),
          onNext: () => selectAreaStation(areaStation(areaStations[stationIndex + 1])),
        }
      : undefined;
  const hasDetail = isResultMap && !!isDetailPage;

  const list = isResultMap ? (
    <aside className={styles.areaPanel} aria-label="통근 시간 상위 동네">
      <header className={styles.areaHeader}>
        <div>
          <h2>통근 시간 상위 동네</h2>
          <p>
            {preview.destination.name}까지 · {preview.matchedAreaCount}곳
          </p>
        </div>
        <Button
          variant="secondary"
          className={styles.reselect}
          onClick={() => {
            closeLayers();
            preview.reset();
          }}
        >
          <Icon name="refresh" size={18} />
          다시 선택하기
        </Button>
      </header>
      <div className={styles.criteria} aria-label="선택한 탐색 조건">
        <span>통근 {preview.maxMinutes}분 이내</span>
        <span>{transferLabel(preview.maxTransfers)}</span>
      </div>
      {preview.topAreas.length > 0 ? (
        <div className={styles.areaList}>
          {/* 동네를 고르면 경로를 바로 그리지 않고 목록 옆 칸에 시세·출발 정류장을 연다. 정류장을 고르면 그 칸에서 경로를 본다. */}
          {preview.topAreas.map((area, index) => {
            const isSelected = preview.selected?.adminDongCode === area.adminDongCode;
            return (
              <RankedCard
                key={area.adminDongCode}
                rank={CARD_RANKS[index]}
                title={area.name}
                value={area.commuteMinutes}
                unit="분"
                description={areaCardDescription(area)}
                selected={isSelected}
                onSelect={() => {
                  closeLayers();
                  // 고른 동네를 다시 누르면 옆 칸의 동네 정보를 닫는다.
                  preview.selectRegion(isSelected ? null : area.adminDongCode, { openDetails: false });
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className={styles.empty} role="status">
          <StateIllustration name="empty-search" size={7} />
          <p>{emptyAreaMessage(preview.maxRent)}</p>
        </div>
      )}
    </aside>
  ) : (
    <ConditionPanel preview={preview} disabled={preview.isAnalyzing} onSubmit={submitSearch} />
  );

  return (
    <main className={`${shared.page} ${styles.page}`} data-public-explore={preview.isPublicExplore || undefined}>
      <ListDetailLayout
        list={list}
        // 목록 옆 칸에는 지도에서 고른 정류장·부동산, 고른 동네의 시세·출발 정류장 순으로 하나를 연다.
        // 정류장 정보를 닫으면 그 동네의 출발 정류장 목록으로 돌아가고, 동네 정보를 닫으면 동네 선택을 푼다.
        detail={
          places.selectedPlace ? (
            <NeighborhoodPlacePanel place={places.selectedPlace} preview={preview} stationNav={stationNav} />
          ) : hasDetail ? (
            <Outlet context={preview} />
          ) : isResultMap && preview.selected ? (
            <div className={placeStyles.panel}>
              <h1 className={placeStyles.title}>{preview.selected.name}</h1>
              <AreaSummary
                area={preview.selected}
                selectedStopId={null}
                onSelectStation={selectAreaStation}
                onOpenListing={preview.openListing}
                maxRent={preview.maxRent}
              />
            </div>
          ) : undefined
        }
        onCloseDetail={
          places.selectedPlace
            ? places.closePlace
            : hasDetail
              ? preview.closeAreaDetails
              : () => preview.selectRegion(null)
        }
        closeLabel={
          places.selectedPlace ? '정보 닫기' : hasDetail ? '대중교통 상세 닫기' : '동네 정보 닫기'
        }
      >
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
              </header>
              <LocationControls preview={preview} isResult={false} />
              {!preview.hasChosenMapPoint && !preview.query.trim() && preview.addressResults.length === 0 && (
                <MapTapHint />
              )}
            </>
          )}
          {isResultMap && (
            <>
              {/* 지도 색이 무엇을 뜻하는지는 지도 위에 둔다. 상세 닫기 버튼은 이 상자 아래에 뜬다. */}
              <div className={`${shared.colorLegend} ${styles.legend}`} aria-label="통근 시간 색상 기준">
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
              {/* 월세 시세는 찾기 전이 아니라 결과 지도 위에서 고른다. 끄는 동안 지도 색과 왼쪽 순위가 바로 바뀐다. */}
              <RentSlider preview={preview} className={styles.rentCard} />
              <LocationControls preview={preview} isResult />
              {preview.isPublicExplore && recordArea && (
                <div className={`${shared.recordAction} ${styles.recordAction}`}>
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
              {/* 동네만 고른 주소(`areas/:code`)는 화면을 그리지 않고, 저장된 검색이 없을 때의 안내만 맡는다. */}
              {isRoutePage && !isDetailPage && <Outlet context={preview} />}
            </>
          )}
        </section>
      </ListDetailLayout>
    </main>
  );
};

const styles = {
  /* 데스크탑 동네 찾기. 공용 틀(NeighborhoodPreviewPage.module.css) 위에 덧씌운다. */
  page: css`
    label: NeighborhoodPreviewDesktopPage-page;
    /* 지도 왼쪽 위 색상 기준 상자 아래에 상세 닫기 버튼을 둔다. */
    --list-detail-close-top: 5rem;
    overflow: hidden;
  `,

  areaPanel: css`
    label: NeighborhoodPreviewDesktopPage-areaPanel;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 0;
    overflow-y: auto;
    padding: 1.25rem 1.5rem 1.5rem;
  `,

  areaHeader: css`
    label: NeighborhoodPreviewDesktopPage-areaHeader;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;

    & h2 {
      margin: 0;
      font-size: 1.1rem;
      letter-spacing: -0.02em;
    }

    & p {
      margin: 0.3rem 0 0;
      color: var(--color-muted);
      font-size: 0.8rem;
    }
  `,

  reselect: css`
    label: NeighborhoodPreviewDesktopPage-reselect;
    flex: none;
    padding: 0.45rem 0.7rem;
    font-size: 0.75rem;
    white-space: nowrap;

    & > span {
      gap: 0.3rem;
    }
  `,

  criteria: css`
    label: NeighborhoodPreviewDesktopPage-criteria;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;

    & > span {
      padding: 0.4rem 0.65rem;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: white;
      color: var(--color-ink);
      font-size: 0.75rem;
    }
  `,

  areaList: css`
    label: NeighborhoodPreviewDesktopPage-areaList;
    display: grid;
    gap: 0.6rem;
  `,

  empty: css`
    label: NeighborhoodPreviewDesktopPage-empty;
    display: grid;
    gap: 0.75rem;
    margin: 1.5rem 0 0;
    color: var(--color-ink-soft);
    font-size: 0.9rem;
    text-align: center;

    & p {
      margin: 0;
    }
  `,

  legend: css`
    label: NeighborhoodPreviewDesktopPage-legend;
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 31;
  `,

  /* 지도 아래 왼쪽에 띄우는 월세 슬라이더 카드. 오른쪽 위치 버튼과 겹치지 않게 폭을 둔다. */
  rentCard: css`
    label: NeighborhoodPreviewDesktopPage-rentCard;
    position: absolute;
    bottom: 1.25rem;
    left: 1rem;
    z-index: 31;
    width: min(22rem, calc(100% - 6rem));
    padding: 0.9rem 1.1rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    background: white;
    box-shadow: 0 0.4rem 1.2rem rgb(0 0 0 / 12%);
  `,

  recordAction: css`
    label: NeighborhoodPreviewDesktopPage-recordAction;
    right: auto;
    width: min(24rem, calc(100% - 2rem));
  `,
};

export default NeighborhoodPreviewDesktopPage;
