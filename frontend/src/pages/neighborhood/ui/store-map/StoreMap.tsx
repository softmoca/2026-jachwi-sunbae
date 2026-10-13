import { useMemo } from 'react';

import type { GoodPriceResult, GoodPriceStore } from '@/features/good-price/model/GoodPriceStore';
import type { MapCoordinate } from '@/features/map/lib/mapLocation';
import type { MapMarker } from '@/features/map/model/Map';
import MapCanvas from '@/features/map/ui/map-canvas/MapCanvas';

import styles from './StoreMap.module.css';

type Props = {
  stores: GoodPriceStore[];
  area: MapCoordinate;
  viewport: MapCoordinate;
  radius: GoodPriceResult['radius'];
  selectedId: number | null;
  level: number;
  onMove: (latitude: number, longitude: number) => void;
  onSelect: (id: number) => void;
};

const StoreMap = ({ stores, area, viewport, radius, selectedId, level, onMove, onSelect }: Props) => {
  const markers = useMemo<MapMarker[]>(
    () =>
      stores.map((store) => ({
        id: `store-${store.id}`,
        latitude: store.latitude,
        longitude: store.longitude,
        label: `${store.name} 상세 보기`,
        tone: 'store',
        actionable: true,
      })),
    [stores],
  );

  return (
    <div className={styles.mapSection}>
      <div className={styles.map}>
        <MapCanvas
          center={viewport}
          radiusCenter={area}
          markers={markers}
          level={level}
          selectedMarkerId={selectedId === null ? null : `store-${selectedId}`}
          interactive
          circles={[{ radiusMeters: radius, label: radius === 500 ? '500m' : `${radius / 1000}km` }]}
          onCenterChange={onMove}
          onSelectLocation={onMove}
          onSelectMarker={(marker) => {
            const store = stores.find((item) => marker.id === `store-${item.id}`);
            if (store) onSelect(store.id);
          }}
        />
      </div>
    </div>
  );
};

export default StoreMap;
