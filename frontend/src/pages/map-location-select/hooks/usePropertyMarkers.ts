import { useMemo } from 'react';

import { DEFAULT_MAP_CENTER } from '@/features/map/lib/mapLocation';
import type { MapMarker } from '@/features/map/model/Map';
import { usePropertyList } from '@/features/property/api/useProperties';
import usePropertyMarkerPhotos from '@/features/property/hooks/usePropertyMarkerPhotos';
import { formatMarkerRent } from '@/features/property/lib/propertyFormat';
import { PROPERTY_PLACEHOLDER } from '@/shared/assets/propertyImageAssets';

/** 위치를 고를 때 참고하도록 이미 등록한 매물을 지도 마커로 보여 준다. */
const usePropertyMarkers = (excludePropertyId?: number) => {
  const properties = usePropertyList();
  const visible = useMemo(
    () =>
      (properties.data?.pages.flatMap((page) => page.content) ?? [])
        // 위치를 바꾸는 매물은 옛 자리에 마커가 남지 않게 뺀다. 새 자리는 가운데 핀이 보여 준다.
        .filter((property) => property.propertyId !== excludePropertyId)
        .filter((property) => property.location.latitude !== null && property.location.longitude !== null),
    [properties.data?.pages, excludePropertyId],
  );
  const photoUrls = usePropertyMarkerPhotos(
    visible.map((property) => ({
      id: property.propertyId,
      latitude: property.location.latitude,
      longitude: property.location.longitude,
      representativePhoto: property.representativePhoto,
    })),
  );

  return useMemo<MapMarker[]>(
    () =>
      visible.map((property) => ({
        id: `property-${property.propertyId}`,
        latitude: property.location.latitude ?? DEFAULT_MAP_CENTER.latitude,
        longitude: property.location.longitude ?? DEFAULT_MAP_CENTER.longitude,
        label: property.name,
        summary: { amount: formatMarkerRent(property.monthlyRentAmount) },
        tone: 'property',
        photo: photoUrls.get(String(property.propertyId)) ?? PROPERTY_PLACEHOLDER.src2x,
      })),
    [visible, photoUrls],
  );
};

export default usePropertyMarkers;
