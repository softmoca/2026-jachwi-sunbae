import { css } from '@emotion/css';

import type { MapCoordinate } from '@/features/map/lib/mapLocation';
import type { MapCategory } from '@/features/map/model/Map';
import MapCanvas from '@/features/map/ui/map-canvas/MapCanvas';
import MapCategoryRail from '@/features/map/ui/map-category-rail/MapCategoryRail';
import MapRadiusSelector from '@/features/map/ui/map-radius-selector/MapRadiusSelector';
import MapZoomControl from '@/features/map/ui/map-zoom-control/MapZoomControl';

import useNearbyAnalysis, {
  NEARBY_RADII,
  type NearbyRadius,
  nearbyRadiusLabel,
  type NearbyRadiusOption,
} from '../../hooks/useNearbyAnalysis';
import MapNearbySheet from '../map-nearby-sheet/MapNearbySheet';
import MapPlaceDetailCard from '../map-place-detail-card/MapPlaceDetailCard';
import NearbyMapNotice from '../nearby-map-notice/NearbyMapNotice';

const EMPTY_COUNTS = { HOSPITAL: 0, TRANSPORT: 0, SCHOOL: 0, CONVENIENCE: 0, AGENCY: 0 };

const radiusOptions = (isAllMode: boolean, radius: NearbyRadius) => [
  { value: 'all' as const, label: '전체', isSelected: isAllMode },
  ...NEARBY_RADII.map((value) => ({
    value,
    label: nearbyRadiusLabel(value),
    isSelected: !isAllMode && radius === value,
  })),
];

type NearbyStageProps = {
  subjectId: number | string;
  center: MapCoordinate | null;
  /** 중심 마커 이름. 매물이면 `선택한 매물`, 동네면 동네 이름. */
  markerLabel?: string;
  initialCategories?: MapCategory[];
  /** 시트 제목 앞부분. `{prefix} 주변 2km`로 보여준다. */
  headingPrefix: string;
  label: string;
  isSubjectPending: boolean;
};

/** 중심 좌표 하나를 기준으로 반경별 주변 시설 지도를 그린다. 매물·동네 화면이 함께 쓴다. */
const NearbyStage = ({
  subjectId,
  center,
  markerLabel,
  initialCategories,
  headingPrefix,
  label,
  isSubjectPending,
}: NearbyStageProps) => {
  const analysis = useNearbyAnalysis(subjectId, center, { markerLabel, initialCategories });
  const { nearby } = analysis;
  const hasSheet = !isSubjectPending && !nearby.isPending && !nearby.isError;
  // 두 손가락이나 휠 없이도 확대 단계를 바꾸는 버튼. 시트가 있으면 시트 바로 위에, 없으면 지도 오른쪽 아래에 둔다.
  const zoom = (
    <MapZoomControl
      className={hasSheet ? styles.dockedZoom : styles.zoom}
      level={analysis.mapLevel}
      onChange={analysis.setMapLevel}
    />
  );
  return (
    <section className={styles.mapStage} aria-label={label}>
      <MapCanvas
        center={analysis.viewportCenter}
        markers={analysis.markers}
        circles={analysis.circles}
        radiusCenter={analysis.center}
        level={analysis.mapLevel}
        showRadiusLabels
        selectedMarkerId={analysis.selectedPlace === null ? null : `place-${analysis.selectedPlace.providerPlaceId}`}
        onSelectMarker={analysis.selectMarker}
        onCenterChange={analysis.panTo}
        onLevelChange={analysis.setMapLevel}
      />
      <MapRadiusSelector<NearbyRadiusOption>
        label="분석 반경"
        options={radiusOptions(analysis.isAllMode, analysis.radius)}
        onSelect={analysis.selectRadius}
      />
      <MapCategoryRail
        selectedCategories={analysis.selectedCategories}
        counts={nearby.isSuccess ? nearby.data.counts : undefined}
        onToggle={analysis.selectCategory}
      />
      <NearbyMapNotice
        isPropertyPending={isSubjectPending}
        isNearbyPending={nearby.isPending}
        isNearbyError={nearby.isError}
        onRetry={() => void nearby.refetch()}
      />
      {analysis.selectedPlace !== null && (
        <MapPlaceDetailCard place={analysis.selectedPlace} onClose={analysis.closePlace} />
      )}
      {!hasSheet && zoom}
      {hasSheet && (
        <MapNearbySheet
          floating={zoom}
          heading={`${headingPrefix} 주변 ${nearbyRadiusLabel(analysis.radius)}`}
          counts={nearby.data?.counts ?? EMPTY_COUNTS}
          selectedCategories={analysis.selectedCategories}
          places={analysis.places}
          peekSignal={analysis.selectedPlace?.providerPlaceId}
          onToggleCategory={analysis.selectCategory}
        />
      )}
    </section>
  );
};

const styles = {
  mapStage: css`
    label: NearbyStage-mapStage;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    box-sizing: border-box;
  `,

  zoom: css`
    label: NearbyStage-zoom;
    right: 0.85rem;
    bottom: calc(env(safe-area-inset-bottom) + 1.5rem);
  `,

  /* 시트 위에 붙이면 시트가 자리를 정하므로 오른쪽 끝에만 맞춘다. */
  dockedZoom: css`
    label: NearbyStage-dockedZoom;
    position: relative;
    margin-left: auto;
    width: max-content;
  `,
};

export default NearbyStage;
