// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { placeMarkers } from '@/features/map/lib/mapClustering';
import type { NearbyPlace } from '@/features/map/model/Map';

const place = (
  id: string,
  latitude: number,
  longitude: number,
  category: NearbyPlace['category'] = 'HOSPITAL',
): NearbyPlace => ({
  providerPlaceId: id,
  name: `장소 ${id}`,
  category,
  address: '서울 중구 세종대로',
  latitude,
  longitude,
  distanceMeters: 0,
});

describe('시설 마커', () => {
  it('같은 자리에 겹친 시설도 묶지 않고 하나씩 누를 수 있는 마커로 만든다', () => {
    const markers = placeMarkers([place('a-1', 37.5665, 126.978), place('a-2', 37.5665, 126.978)]);
    expect(markers).toEqual([
      expect.objectContaining({ id: 'place-a-1', placeId: 'a-1', label: '장소 a-1', tone: 'place', actionable: true }),
      expect.objectContaining({ id: 'place-a-2', placeId: 'a-2', label: '장소 a-2', tone: 'place', actionable: true }),
    ]);
  });

  it('분류를 그대로 실어 마커 그림을 고르게 하고, 묶음 마커(cluster)는 만들지 않는다', () => {
    const markers = placeMarkers([
      place('h-1', 37.5, 127, 'HOSPITAL'),
      place('s-1', 37.5001, 127.0001, 'SCHOOL'),
      place('c-1', 37.5002, 127.0002, 'CONVENIENCE'),
    ]);
    expect(markers.map((marker) => marker.category)).toEqual(['HOSPITAL', 'SCHOOL', 'CONVENIENCE']);
    expect(markers.some((marker) => marker.tone === 'cluster' || marker.count !== undefined)).toBe(false);
  });
});
