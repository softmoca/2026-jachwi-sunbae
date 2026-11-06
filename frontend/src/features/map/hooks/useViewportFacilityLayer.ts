import { useMemo } from 'react';

import { useViewportFacilities } from '../api/useViewportFacilities';
import { placeMarkers } from '../lib/mapClustering';
import { facilityCells } from '../lib/mapViewportQuery';
import type { MapBounds, MapCategory, MapMarker, NearbyCategory, NearbyPlace } from '../model/Map';

const NO_PLACES: NearbyPlace[] = [];

/**
 * 지도 화면 안의 시설 한 분류를 마커로 올리는 겹. 본 방 기록 지도에서 동네 찾기 결과 지도로 옮겨 왔다.
 * 시설은 반경 원 없이 지금 화면 안의 것만, 묶지 않고 낱개로 보여 준다. 화면을 격자 칸으로 나눠 조회해 가장자리까지 채운다.
 * 교통(정류장)은 화면마다 따로 다루므로 여기서는 병원, 학교, 편의점, 중개업소만 받는다.
 */
const useViewportFacilityLayer = (bounds: MapBounds | null, category: MapCategory | null) => {
  const facilityCategory: NearbyCategory | null =
    category === null || category === 'MEMO' || category === 'TRANSPORT' ? null : category;
  const cells = useMemo(
    () => (bounds && facilityCategory !== null ? facilityCells(bounds) : []),
    [bounds, facilityCategory],
  );
  const facilities = useViewportFacilities(cells, bounds, facilityCategory);
  const places = facilityCategory === null ? NO_PLACES : facilities.places;
  const markers = useMemo<MapMarker[]>(
    () => placeMarkers(places.filter((place) => place.category === facilityCategory)),
    [places, facilityCategory],
  );
  return {
    places,
    markers,
    /** 지금 화면에 올린 분류의 시설 수. 레일의 접근성 이름에 붙인다. */
    counts: useMemo(
      () => (facilityCategory === null ? {} : { [facilityCategory]: markers.length }),
      [facilityCategory, markers.length],
    ) as Partial<Record<MapCategory, number>>,
    isError: facilityCategory !== null && facilities.isError,
    /** 시설 마커(`place-<id>`)가 가리키는 시설. 다른 마커면 null이다. */
    placeOf: (marker: MapMarker): NearbyPlace | null =>
      marker.placeId === undefined ? null : (places.find((place) => place.providerPlaceId === marker.placeId) ?? null),
  };
};

export default useViewportFacilityLayer;
