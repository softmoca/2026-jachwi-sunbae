import { css } from '@emotion/css';

import MapCurrentLocationButton from '@/features/map/ui/map-current-location-button/MapCurrentLocationButton';
import MapZoomControl from '@/features/map/ui/map-zoom-control/MapZoomControl';

import type { NeighborhoodPreviewContext } from '../../hooks/useNeighborhoodPreview';

import * as shared from '../../NeighborhoodPreviewPage.styles';

type LocationControlsProps = {
  preview: Pick<NeighborhoodPreviewContext, 'isLocating' | 'locationError' | 'moveToCurrentLocation'>;
  /** 결과 화면이면 아래 카드 레일을 피해 더 위에 둔다. */
  isResult: boolean;
  /** 조건 칸 아래 피커가 펼쳐져 카드가 높아지면 그만큼 올린다. */
  isFilterOpen?: boolean;
  /** 결과 지도면 현재 위치 버튼 위에 확대(+)·축소(-) 버튼을 둔다. 두 손가락이나 휠 없이도 확대 단계를 바꾼다. */
  zoom?: { level: number; onZoom: (delta: -1 | 1) => void };
  /** 바텀시트 위에 붙여 띄운다(`BottomSheet`의 `floating`). 시트가 자리를 정하므로 지도 위 고정 위치를 쓰지 않는다. */
  docked?: boolean;
};

/** 지도 오른쪽 아래 현재 위치 버튼과 위치 확인 상태 말풍선. 결과 지도면 그 위에 확대·축소 버튼을 둔다. */
const LocationControls = ({ preview, isResult, isFilterOpen = false, zoom, docked = false }: LocationControlsProps) => (
  <div
    className={shared.locationControls}
    data-docked={docked || undefined}
    data-result={isResult || undefined}
    data-filter-open={isFilterOpen || undefined}
  >
    {(preview.isLocating || preview.locationError) && (
      <span className={shared.locationStatus} role={preview.locationError ? 'alert' : 'status'}>
        {preview.isLocating ? '현재 위치를 확인하는 중이에요.' : preview.locationError}
      </span>
    )}
    {zoom && (
      <MapZoomControl
        className={styles.zoom}
        level={zoom.level}
        onChange={(next) => zoom.onZoom(next < zoom.level ? -1 : 1)}
      />
    )}
    <MapCurrentLocationButton isLocating={preview.isLocating} onClick={preview.moveToCurrentLocation} />
  </div>
);

const styles = {
  /* 현재 위치 버튼 바로 위에 세로로 쌓는다. 오른쪽 끝을 맞춰 두 버튼이 한 줄로 보이게 한다. */
  zoom: css`
    label: LocationControls-zoom;
    position: static;
    margin-bottom: 0.6rem;
    margin-left: auto;
    width: max-content;
  `,
};

export default LocationControls;
