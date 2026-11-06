import { useMemo, useState } from 'react';

import { reverseGeocode } from '@/features/map/api/mapApi';
import { useViewportBusStops } from '@/features/map/api/useViewportBusStops';
import { useViewportFacilities } from '@/features/map/api/useViewportFacilities';
import { placeMarkers } from '@/features/map/lib/mapClustering';
import { SERVICE_MAP_STYLE_ID } from '@/features/map/lib/mapStyle';
import { facilityCells, viewportTiles } from '@/features/map/lib/mapViewportQuery';
import type { MapAddress, MapBounds, MapCategory, MapMarker, NearbyPlace } from '@/features/map/model/Map';
import type { MapCanvasProps, MapCoordinateMenu, MapTapAction } from '@/features/map/model/MapCanvas';
import useStreetMemoLayer from '@/features/street-memo/hooks/useStreetMemoLayer';
import { focusOnMemos, OVERLAP_HEIGHT_RATIO, OVERLAP_WIDTH_RATIO } from '@/features/street-memo/lib/streetMemoFocus';
import addProperty from '@/shared/assets/illustrations/add-property.webp';
import addProperty2x from '@/shared/assets/illustrations/add-property@2x.webp';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import { useLogger } from '@/shared/lib/analytics/logging';

import type { RecordsState } from './useRecords';

const REGISTER_MARKER_ID = 'register-point';
/** 겹쳐 묶인 매물 마커 id의 머리. 뒤에 묶인 매물 id를 쉼표로 잇는다. */
const RECORD_GROUP_PREFIX = 'record-group:';
/** 이 단계보다 멀리 축소하면 거리 메모를 숨긴다. 도시 전체를 볼 때는 골목 메모가 쓸모없다. */
const MEMO_MAX_LEVEL = 10;

type MapPoint = { latitude: number; longitude: number };

type Options = {
  /**
   * 찍은 위치에서 매물 등록을 고르면 주소 응답을 기다린 뒤에 넘긴다. 등록 화면을 여는 방식은 화면이 정한다.
   * 주소를 찾지 못했거나 조회가 실패하면 주소 없이 좌표만 넘긴다. 넘기지 않으면 찍은 위치에서는 메모만 남긴다.
   */
  onRegister?: (location: MapAddress) => void;
  /** 매물 등록에서 주소를 찾는 동안 화면 아래에 띄울 안내. */
  onRegisterNotice?: (message: string) => void;
  /** 처음 켜 둘 카테고리. 휴대폰은 거리 메모를 켠 채로 연다. */
  initialCategory?: MapCategory | null;
  /** 매물 등록 칸을 연 위치. 등록하는 동안 그 자리에 집과 더하기 그림 핀을 둔다. */
  registeringAt?: MapPoint | null;
  /**
   * 겹친 매물 묶음을 눌렀을 때. `list`는 묶인 매물을 함께 늘어놓고(휴대폰 바텀시트), `zoom`은 핀이 갈라져 보일 때까지 다가간다.
   * 데스크탑은 리스트에 이미 모든 매물이 보여, 묶음을 따로 늘어놓지 않고 다가가기만 한다.
   */
  groupAction?: 'list' | 'zoom';
};

const sameBounds = (a: MapBounds | null, b: MapBounds) =>
  a !== null && a.south === b.south && a.north === b.north && a.west === b.west && a.east === b.east;

/**
 * 화면에서 집 핀이 포개질 만큼 가까운 매물 마커를 한 무리로 묶는다. 거리 메모 말풍선과 같은 겹침 간격을 쓴다.
 * 화면 범위를 모르면 좌표가 똑같은(같은 건물의) 매물만 묶는다.
 */
const groupOverlappingRecords = (markers: MapMarker[], bounds: MapBounds | null): MapMarker[][] => {
  const latitudeGap = bounds ? (bounds.north - bounds.south) * OVERLAP_HEIGHT_RATIO : 0;
  const longitudeGap = bounds ? (bounds.east - bounds.west) * OVERLAP_WIDTH_RATIO : 0;
  const groups: MapMarker[][] = [];
  for (const marker of markers) {
    const group = groups.find(
      ([head]) =>
        Math.abs(head.latitude - marker.latitude) <= latitudeGap &&
        Math.abs(head.longitude - marker.longitude) <= longitudeGap,
    );
    if (group) group.push(marker);
    else groups.push([marker]);
  }
  return groups;
};

const recordGroupMarker = (group: MapMarker[]): MapMarker =>
  group.length === 1
    ? group[0]
    : {
        id: `${RECORD_GROUP_PREFIX}${group.map((marker) => marker.id).join(',')}`,
        latitude: group.reduce((sum, marker) => sum + marker.latitude, 0) / group.length,
        longitude: group.reduce((sum, marker) => sum + marker.longitude, 0) / group.length,
        label: `매물 ${group.length}개`,
        tone: 'propertyCluster',
        count: group.length,
        actionable: true,
      };

/**
 * 본 방 기록 지도 위에 얹는 인프라 겹. 예전 인프라 지도의 시설 카테고리·거리 메모와 찍은 위치의 동작을 맡는다.
 * 시설은 반경 원 없이 지금 지도 화면 안의 것만 보여주고, 카테고리는 한 번에 하나만 켠다.
 * 데스크탑·휴대폰 지도가 함께 쓰고, 지도 위 조작을 어디에 어떻게 놓을지는 각 화면의 지도 컴포넌트가 정한다.
 */
const useRecordsMapLayers = (
  records: RecordsState,
  { onRegister, onRegisterNotice, initialCategory = null, registeringAt = null, groupAction = 'list' }: Options,
) => {
  const config = usePublicConfig();
  const { log } = useLogger();
  const { level } = records;
  // 겹쳐 묶인 매물 마커를 눌러 함께 보는 매물들의 id. 하나만 고른 매물은 records.selected로 따로 둔다.
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const hasSelection = records.selected !== undefined || groupIds.length > 0;
  const closeSelection = () => {
    records.setSelectedId(null);
    setGroupIds([]);
  };
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [category, setCategory] = useState<MapCategory | null>(initialCategory);
  const [tapPoint, setTapPoint] = useState<MapPoint | null>(null);
  // 매물 등록을 누른 뒤 주소를 찾는 중인 위치. 응답이 늦어도 그 자리에 등록 핀을 먼저 두고, 그동안 다시 등록하지 못하게 한다.
  const [resolvingAt, setResolvingAt] = useState<MapPoint | null>(null);
  // 주소를 찾는 동안과 매물을 만드는 동안 그 자리에 등록 핀을 둔다.
  const pinAt = registeringAt ?? resolvingAt;
  const isRegistering = pinAt !== null;
  // 겹치는 메모는 개수 말풍선으로 묶이므로 웬만큼 축소해도 띄우고, 아주 멀리 축소했을 때만 숨긴다.
  const memo = useStreetMemoLayer(category === 'MEMO' && level <= MEMO_MAX_LEVEL, bounds);

  const facilityCategory = category !== null && category !== 'MEMO' ? category : null;
  // 시설은 화면 가장자리까지 빠짐없이 보이게 화면을 칸으로 나눠 조회한다. 정류장은 큰 칸 네 개로, 다른 시설은 촘촘해 격자 칸으로 나누고 화면이 넓으면 칸을 키운다.
  const showsTransport = facilityCategory === 'TRANSPORT';
  const cells = useMemo(
    () => (bounds && facilityCategory !== null && !showsTransport ? facilityCells(bounds) : []),
    [bounds, facilityCategory, showsTransport],
  );
  const facilities = useViewportFacilities(
    cells,
    bounds,
    facilityCategory === null || facilityCategory === 'TRANSPORT' ? null : facilityCategory,
  );
  const tiles = useMemo(() => (bounds ? viewportTiles(bounds) : []), [bounds]);
  const busStops = useViewportBusStops(tiles, bounds, showsTransport);
  const visiblePlaces = useMemo<NearbyPlace[]>(
    () =>
      showsTransport
        ? busStops.busStops.map((stop) => ({
            providerPlaceId: stop.nodeId,
            name: stop.name,
            latitude: stop.latitude,
            longitude: stop.longitude,
            distanceMeters: stop.distanceMeters,
            category: 'TRANSPORT',
            address: '',
          }))
        : facilities.places,
    [showsTransport, busStops.busStops, facilities.places],
  );
  const counts = useMemo(() => {
    const result: Partial<Record<MapCategory, number>> = {};
    visiblePlaces.forEach((place) => {
      result[place.category] = (result[place.category] ?? 0) + 1;
    });
    return result;
  }, [visiblePlaces]);
  // 시설은 묶지 않고 화면 안의 것을 모두 낱개로 보여 준다.
  const facilityMarkers = useMemo(
    () => placeMarkers(visiblePlaces.filter((place) => place.category === facilityCategory)),
    [visiblePlaces, facilityCategory],
  );
  const markers = useMemo<MapMarker[]>(
    () => [
      ...facilityMarkers,
      ...memo.markers,
      ...(pinAt === null
        ? []
        : [
            {
              latitude: pinAt.latitude,
              longitude: pinAt.longitude,
              id: REGISTER_MARKER_ID,
              label: '매물 등록 위치',
              image: { src: addProperty, src2x: addProperty2x },
            },
          ]),
    ],
    [facilityMarkers, memo.markers, pinAt],
  );

  /**
   * 주소 응답을 기다린 뒤 매물을 만든다. 예전에는 기다리는 동안 아무 표시가 없어 다시 누르면 매물이 둘 생겼다.
   * 주소를 찾지 못했거나 조회가 실패해도 등록은 막지 않고 주소 없이 좌표만으로 만든다.
   */
  const registerAt = (point: MapPoint) => {
    setTapPoint(null);
    if (isRegistering) return;
    setResolvingAt(point);
    onRegisterNotice?.('주소를 확인하는 중이에요.');
    const withoutAddress: MapAddress = { address: null, roadAddress: null, jibunAddress: null, ...point };
    reverseGeocode(config, point.latitude, point.longitude)
      .then(
        (address) => onRegister?.({ ...address, ...point }),
        () => onRegister?.(withoutAddress),
      )
      .finally(() => setResolvingAt(null));
  };
  const tapActions: MapTapAction[] =
    tapPoint === null
      ? []
      : [
          {
            id: 'street-memo',
            label: '📝 메모 남기기',
            onSelect: () => {
              log('map_coordinate_action_selected', { action: 'memo' });
              setTapPoint(null);
              closeSelection();
              memo.startDraft(tapPoint);
            },
          },
          ...(onRegister
            ? [
                {
                  id: 'property',
                  label: '🏠 여기에 매물 등록',
                  onSelect: () => {
                    log('map_coordinate_action_selected', { action: 'property' });
                    registerAt(tapPoint);
                  },
                },
              ]
            : []),
        ];

  const recordGroups = useMemo(() => groupOverlappingRecords(records.markers, bounds), [records.markers, bounds]);
  const recordMarkers = useMemo(() => recordGroups.map(recordGroupMarker), [recordGroups]);
  // 함께 보는 매물(겹친 무리)이나 하나만 고른 매물이 든 마커를 고른 것으로 표시한다. 배율을 바꿔 무리가 달라져도 따라간다.
  const shownIds = groupIds.length > 0 ? groupIds : records.selected ? [records.selected.id] : [];
  const selectedRecordMarkerId =
    shownIds.length === 0
      ? null
      : (recordMarkers[recordGroups.findIndex((group) => group.some((marker) => marker.id === shownIds[0]))]?.id ??
        null);

  const selectMarker = (marker: MapMarker): boolean => {
    const memos = memo.memosOf(marker);
    if (marker.id.startsWith(RECORD_GROUP_PREFIX)) {
      memo.close();
      setTapPoint(null);
      records.setSelectedId(null);
      const ids = marker.id.slice(RECORD_GROUP_PREFIX.length).split(',');
      if (groupAction === 'list') {
        setGroupIds(ids);
        return true;
      }
      // 겹친 메모처럼 묶인 핀이 갈라져 보일 만큼 다가간다.
      const focus = focusOnMemos(
        records.markers.filter((record) => ids.includes(record.id)),
        bounds,
        level,
      );
      records.setCenter(focus.center);
      records.setLevel(focus.level);
      return true;
    }
    if (!memo.selectMarker(marker)) return false;
    setTapPoint(null);
    closeSelection();
    // 누른 메모가 화면을 채우도록 다가간다. 겹쳐 묶인 메모는 말풍선이 서로 갈라질 만큼 확대한다.
    if (memos.length > 0) {
      const focus = focusOnMemos(memos, bounds, level);
      records.setCenter(focus.center);
      records.setLevel(focus.level);
    }
    return true;
  };
  /**
   * 빈 곳을 찍으면, 열린 매물·메모·동작 버튼이 있으면 닫기만 하고 아니면 그 자리에서 할 일을 고르게 한다.
   * 무언가를 닫으려고 찍었는데 바로 새 동작이 뜨면 다시 닫아야 해서 두 단계로 나눈다.
   */
  const tapLocation = (latitude: number, longitude: number) => {
    // 매물을 등록하는 동안은 새 동작을 띄우지 않는다.
    if (isRegistering) return;
    if (hasSelection || memo.mode !== null || tapPoint !== null) {
      closeSelection();
      memo.close();
      setTapPoint(null);
      return;
    }
    setTapPoint({ latitude, longitude });
  };
  /** 지도를 옮기면 화면 범위를 다시 조회하고, 찍어 둔 위치의 동작은 거둔다. */
  const rememberBounds = (next: MapBounds) => {
    if (sameBounds(bounds, next)) return;
    setBounds(next);
    setTapPoint(null);
  };
  const allMarkers = useMemo(() => [...recordMarkers, ...markers], [recordMarkers, markers]);
  /** 두 화면의 지도가 그대로 넘기는 MapCanvas 설정. 찍은 자리 말풍선(coordinateMenu)은 데스크탑만 더한다. */
  const canvasProps = {
    customStyleId: SERVICE_MAP_STYLE_ID,
    center: records.center,
    level: records.level,
    markers: allMarkers,
    selectedMarkerId: selectedRecordMarkerId ?? memo.selectedMarkerId,
    // 메모 마커와 겹친 매물 묶음이 아니면 기록한 방 하나의 마커다. 시설 마커는 누를 수 없다.
    onSelectMarker: (marker: MapMarker) => {
      if (selectMarker(marker)) return;
      memo.close();
      setTapPoint(null);
      setGroupIds([]);
      records.setSelectedId(marker.id);
    },
    onSelectLocation: tapLocation,
    onCenterChange: (latitude: number, longitude: number) => records.setCenter({ latitude, longitude }),
    onLevelChange: records.setLevel,
    onBoundsChange: rememberBounds,
  } satisfies MapCanvasProps;

  return {
    canvasProps,
    category,
    counts,
    memo,
    /** 겹친 매물 묶음을 눌러 함께 보는 매물. 묶음을 고르지 않았으면 빈 목록이다. */
    groupRecords: records.records.filter((record) => groupIds.includes(record.id)),
    closeGroup: () => setGroupIds([]),
    tapPoint,
    tapActions,
    /** 매물 등록을 눌러 주소를 찾거나 매물을 만드는 중인지. */
    isRegistering,
    facilitiesFailed: showsTransport ? busStops.isError : facilities.isError,
    coordinateMenu: (tapPoint === null ? undefined : { ...tapPoint, actions: tapActions }) satisfies
      MapCoordinateMenu | undefined,
    /** 같은 카테고리를 다시 누르면 끈다. 레일에서는 한 번에 하나만 켠다. */
    toggleCategory: (next: MapCategory) => setCategory((current) => (current === next ? null : next)),
    /** 메모를 남기면 메모가 보이도록 메모 카테고리를 켠다. */
    showMemos: () => setCategory('MEMO'),
    closeTap: () => setTapPoint(null),
    /** 열어 둔 매물·메모·찍은 위치를 모두 닫는다. */
    closeAll: () => {
      closeSelection();
      memo.close();
      setTapPoint(null);
    },
  };
};

export type RecordsMapLayers = ReturnType<typeof useRecordsMapLayers>;

export default useRecordsMapLayers;
