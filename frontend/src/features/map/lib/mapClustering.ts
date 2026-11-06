import type { MapMarker, NearbyPlace } from '../model/Map';

/**
 * 시설을 묶지 않고 하나씩 마커로 만든다. 시설은 확대 단계와 상관없이 늘 낱개로 화면을 채운다(#562 결정).
 * 동네 찾기 결과 지도의 분류 레일과 주변 분석 지도가 함께 쓴다.
 * 어떤 마커는 묶이고 어떤 마커는 낱개로 남는 거리 기준 묶음은 두지 않는다.
 */
export const placeMarkers = (places: NearbyPlace[]): MapMarker[] =>
  places.map((place) => ({
    id: `place-${place.providerPlaceId}`,
    latitude: place.latitude,
    longitude: place.longitude,
    label: place.name,
    tone: 'place',
    category: place.category,
    placeId: place.providerPlaceId,
    actionable: true,
  }));
