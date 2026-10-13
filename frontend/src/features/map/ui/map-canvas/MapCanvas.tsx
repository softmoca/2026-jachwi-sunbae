import type { CSSProperties } from 'react';
import { useMemo } from 'react';

import StatusPanel from '@/shared/ui/status-panel/StatusPanel';

import useNaverMap from '../../hooks/useNaverMap';
import { demoMapCoordinate, demoMapOffset, demoRadiusDiameter } from '../../lib/mapDemoProjection';
import { clampToSouthKorea } from '../../lib/mapLocation';
import { markerScale } from '../../lib/mapMarkerPresentation';
import type { MapMarker } from '../../model/Map';
import type { MapCanvasProps } from '../../model/MapCanvas';
import MapMarkerView from '../map-marker/MapMarkerView';

import styles from './MapCanvas.module.css';

const EMPTY_MARKERS: MapMarker[] = [];
const EMPTY_CIRCLES: NonNullable<MapCanvasProps['circles']> = [];
const demoMarkerStyle = (
  marker: MapMarker,
  center: { latitude: number; longitude: number },
  level: number,
): CSSProperties => {
  const offset = demoMapOffset(marker, center, level);
  return {
    transform:
      marker.tone === 'property' || marker.tone === 'selected'
        ? 'translate(-50%, -120.710678%)'
        : 'translate(-50%, -50%)',
    left: `calc(50% + ${offset.x}px)`,
    top: `calc(50% + ${offset.y}px)`,
  };
};

const MapCanvas = ({
  center,
  markers = EMPTY_MARKERS,
  circles = EMPTY_CIRCLES,
  level = 5,
  interactive = false,
  showCenterPin = false,
  showRadiusLabels = false,
  selectedMarkerId = null,
  onSelectMarker,
  onSelectLocation,
  onCenterChange,
  onLevelChange,
  onBoundsChange,
  radiusCenter = center,
}: MapCanvasProps) => {
  const boundedCenter = useMemo(() => clampToSouthKorea(center), [center.latitude, center.longitude]);
  const radiusOffset = demoMapOffset(radiusCenter, boundedCenter, level);
  const { containerRef, canvasRef, liveMode, sdkError } = useNaverMap({
    center,
    markers,
    circles,
    radiusCenter,
    level,
    selectedMarkerId,
    onSelectLocation,
    onCenterChange,
    onLevelChange,
    onSelectMarker,
    onBoundsChange,
  });

  return (
    <div
      className={`${styles.canvas} ${liveMode ? styles.live : styles.demo}`}
      ref={canvasRef}
      aria-label={liveMode ? 'Naver 지도' : '데모 지도'}
      onClick={(event) => {
        if (liveMode || !interactive || onSelectLocation === undefined) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const picked = clampToSouthKorea(
          demoMapCoordinate(
            boundedCenter,
            level,
            event.clientX - rect.left - rect.width / 2,
            event.clientY - rect.top - rect.height / 2,
          ),
        );
        onSelectLocation(picked.latitude, picked.longitude);
      }}
    >
      {liveMode && (
        <div className={styles.liveLayer}>
          <div ref={containerRef} className={styles.liveMap} />
        </div>
      )}
      {!liveMode && (
        <>
          <span className={styles.roadOne} />
          <span className={styles.roadTwo} />
          <span className={styles.park}>MOCA PARK</span>
          {circles.map((circle) => (
            <span
              key={circle.radiusMeters}
              className={styles.radiusCircle}
              style={{
                width: `${demoRadiusDiameter(circle.radiusMeters, radiusCenter.latitude, level)}px`,
                left: `calc(50% + ${radiusOffset.x}px)`,
                top: `calc(50% + ${radiusOffset.y}px)`,
              }}
              aria-hidden="true"
            />
          ))}
          {markers.map((marker) => {
            return (
              <div
                key={marker.id}
                className={styles.demoMarkerPosition}
                style={
                  {
                    ...demoMarkerStyle(marker, boundedCenter, level),
                    '--map-marker-scale': markerScale(marker, level),
                  } as CSSProperties
                }
              >
                <MapMarkerView marker={marker} selectedMarkerId={selectedMarkerId} onSelectMarker={onSelectMarker} />
              </div>
            );
          })}
          <span className={styles.demoBadge}>DEMO MAP</span>
        </>
      )}
      {showCenterPin && (
        <span className={styles.fixedCenterPin} aria-label="선택할 지도 중심" role="img">
          <span aria-hidden="true">+</span>
        </span>
      )}
      {showRadiusLabels && (
        <div className={styles.radiusLabels} aria-hidden="true">
          {circles
            .slice()
            .reverse()
            .map((circle) => (
              <span key={circle.radiusMeters}>{circle.label}</span>
            ))}
        </div>
      )}
      {sdkError && (
        <div className={styles.mapError}>
          <StatusPanel title="지도를 연결할 수 없어요." description="잠시 후 다시 시도해 주세요." tone="error" />
        </div>
      )}
    </div>
  );
};

export default MapCanvas;
