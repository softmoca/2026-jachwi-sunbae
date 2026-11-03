import { useMemo, useState } from 'react';

import { useViewportPlaces } from '@/features/map/api/useViewportPlaces';
import { stationVariant } from '@/features/map/lib/mapIconAssets';
import { viewportQuery } from '@/features/map/lib/mapViewportQuery';
import type { MapBounds, MapMarker, NearbyAgency } from '@/features/map/model/Map';

import { nextPlacesVisible } from '../model/resultMapView';

type BusStop = ReturnType<typeof useViewportPlaces>['busStops'][number];
/** 동네의 출발 정류장. 경로망 정류장 ID를 그대로 가지고, 고르면 지도를 그 자리로 옮긴다. */
export type AreaStation = { stopId: string; name: string; latitude: number; longitude: number };
export type NeighborhoodPlace =
  | { kind: 'agency'; agency: NearbyAgency }
  | { kind: 'busStop'; busStop: BusStop }
  | { kind: 'station'; station: AreaStation };

export const placeTitle = (place: NeighborhoodPlace) =>
  place.kind === 'agency' ? place.agency.name : place.kind === 'busStop' ? place.busStop.name : place.station.name;

const NO_AGENCIES: NearbyAgency[] = [];
const AGENCY_PREFIX = 'agency:';
const BUS_STOP_PREFIX = 'bus-stop:';
const STATION_PREFIX = 'station:';

/**
 * 결과 지도를 가까이 확대하면 지금 화면 안의 버스정류장과 공인중개사를 지도에 올린다.
 * 동네를 고르면 그 동네로 다가가므로 바로 보이고, 전체 결과를 볼 때처럼 멀면 동네 경계와 색만 남긴다.
 * 지도 이동이 끝날 때마다(idle) 화면 범위로 다시 조회하고, 같은 화면은 캐시를 쓴다.
 */
const useNeighborhoodPlaces = (enabled: boolean) => {
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [isNear, setIsNear] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [station, setStation] = useState<AreaStation | null>(null);
  // 결과 지도가 아닌 동안(다시 고르기, 분석 중)은 지도가 확대 단계와 범위를 알려 주지 않는다.
  // 결과 지도를 떠날 때 기억한 값을 비워, 돌아온 지도가 멈추기 전에 예전 확대 단계로 마커를 올리지 않게 한다.
  const [wasEnabled, setWasEnabled] = useState(enabled);
  if (wasEnabled !== enabled) {
    setWasEnabled(enabled);
    if (!enabled) {
      setIsNear(false);
      setBounds(null);
    }
  }
  const isClose = enabled && isNear;
  const query = useMemo(() => (isClose && bounds ? viewportQuery(bounds) : null), [isClose, bounds]);
  const places = useViewportPlaces(query);
  const markers = useMemo<MapMarker[]>(
    () =>
      isClose
        ? [
            ...places.busStops.map((stop) => ({
              id: `${BUS_STOP_PREFIX}${stop.nodeId}`,
              latitude: stop.latitude,
              longitude: stop.longitude,
              label: stop.name,
              tone: 'place' as const,
              category: 'TRANSPORT' as const,
              actionable: true,
            })),
            ...places.agencies.map((agency) => ({
              id: `${AGENCY_PREFIX}${agency.providerPlaceId}`,
              latitude: agency.latitude,
              longitude: agency.longitude,
              label: agency.name,
              tone: 'place' as const,
              category: 'AGENCY' as const,
              actionable: true,
            })),
          ]
        : [],
    [isClose, places.busStops, places.agencies],
  );
  // 목록에서 고른 출발 정류장은 확대 단계와 상관없이 지도에 따로 찍어 어디인지 보여 준다.
  const stationMarker = useMemo<MapMarker[]>(
    () =>
      enabled && station && selectedId === `${STATION_PREFIX}${station.stopId}`
        ? [
            {
              id: selectedId,
              latitude: station.latitude,
              longitude: station.longitude,
              label: station.name,
              tone: 'place' as const,
              category: 'TRANSPORT' as const,
              variant: stationVariant(station.stopId),
            },
          ]
        : [],
    [enabled, station, selectedId],
  );
  const selectedPlace = useMemo<NeighborhoodPlace | null>(() => {
    if (!enabled || selectedId === null) return null;
    // 동네의 출발 정류장은 지도 화면과 상관없이 목록에서 고르므로 확대 여부와 무관하게 유지한다.
    if (selectedId.startsWith(STATION_PREFIX)) return station ? { kind: 'station', station } : null;
    if (!isClose) return null;
    if (selectedId.startsWith(AGENCY_PREFIX)) {
      const agency = places.agencies.find((item) => `${AGENCY_PREFIX}${item.providerPlaceId}` === selectedId);
      return agency ? { kind: 'agency', agency } : null;
    }
    const busStop = places.busStops.find((item) => `${BUS_STOP_PREFIX}${item.nodeId}` === selectedId);
    return busStop ? { kind: 'busStop', busStop } : null;
  }, [enabled, isClose, selectedId, station, places.agencies, places.busStops]);
  return {
    isClose,
    markers: stationMarker.length ? [...markers, ...stationMarker] : markers,
    selectedMarkerId: selectedPlace ? selectedId : null,
    selectedPlace,
    failed: places.agenciesFailed || places.busStopsFailed,
    /** 지금 화면 범위의 공인중개사. 공인중개사는 동네 단위로 받을 수 없어 화면 기준 목록으로 쓴다. 멀리 보면 비운다. */
    agencies: isClose ? places.agencies : NO_AGENCIES,
    /** 목록에서 공인중개사를 고른다. */
    selectAgency: (agency: NearbyAgency) => setSelectedId(`${AGENCY_PREFIX}${agency.providerPlaceId}`),
    /** 정류장·부동산 마커만 고른다. 다른 마커(목적지 등)는 무시한다. */
    selectMarker: (marker: MapMarker) => {
      if (marker.id.startsWith(AGENCY_PREFIX) || marker.id.startsWith(BUS_STOP_PREFIX)) setSelectedId(marker.id);
    },
    /** 동네 목록에서 출발 정류장을 고른다. */
    selectStation: (next: AreaStation) => {
      setStation(next);
      setSelectedId(`${STATION_PREFIX}${next.stopId}`);
    },
    closePlace: () => setSelectedId(null),
    bounds,
    rememberBounds: setBounds,
    rememberLevel: (level: number) => setIsNear((wasNear) => nextPlacesVisible(wasNear, level)),
  };
};

export default useNeighborhoodPlaces;
