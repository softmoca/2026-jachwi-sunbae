import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  DEFAULT_MAP_CENTER,
  type MapCoordinate,
  MapLocationError,
  requestCurrentMapLocation,
} from '@/features/map/lib/mapLocation';
import type { MapMarker } from '@/features/map/model/Map';
import { usePropertyList } from '@/features/property/api/useProperties';
import { takeMovedProperty } from '@/features/property/model/movedProperty';

import { recordPresentation } from '../model/recordPresentation';

type RecordsLocationState = { focusHeading?: boolean } | null;

/** 화면 밖(주소 등)에서 정하는 선택 매물. 넘기지 않으면 화면 안 상태로 고른다. */
type RecordsSelection = { selectedId: string | null; setSelectedId: (id: string | null) => void };

/**
 * 본 방 기록 화면의 데이터·동네 필터·선택·지도 위치. 데스크탑·휴대폰 화면이 함께 쓴다.
 * 데스크탑은 고른 매물을 주소(`/properties/:propertyId`)로 정하므로 `selection`을 넘긴다.
 */
const useRecords = (selection?: RecordsSelection) => {
  const location = useLocation();
  const locationState = location.state as RecordsLocationState;
  const headingRef = useRef<HTMLHeadingElement>(null);
  // 상세에서 매물을 삭제하고 돌아오면 화면 제목으로 포커스를 옮긴다.
  const shouldFocusHeading = locationState?.focusHeading === true;
  useEffect(() => {
    if (shouldFocusHeading) headingRef.current?.focus();
  }, [shouldFocusHeading]);

  const properties = usePropertyList();
  const allRecords = useMemo(
    () => properties.data?.pages.flatMap((page) => page.content).map(recordPresentation) ?? [],
    [properties.data],
  );
  const districts = [
    '전체',
    ...new Set(allRecords.filter((record) => record.summary.location.address?.trim()).map((record) => record.district)),
  ];
  const [district, setDistrict] = useState('전체');
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const selectedId = selection ? selection.selectedId : localSelectedId;
  const setSelectedId = selection ? selection.setSelectedId : setLocalSelectedId;
  const [center, setCenter] = useState(DEFAULT_MAP_CENTER);
  const [level, setLevel] = useState(8);
  const [notice, setNotice] = useState('');
  // 지도에서 방금 만든 매물. 그 핀은 아래에서 떠오르며 나타나 새로 생긴 자리를 알린다.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const records = useMemo(
    () => allRecords.filter((record) => district === '전체' || record.district === district),
    [allRecords, district],
  );
  const selected = records.find((record) => record.id === selectedId);

  // 상세에서 위치를 바꿔 저장한 매물이 새 좌표로 목록에 들어오면, 그 자리로 지도를 옮기고 매물을 골라 새 핀을 보인다.
  // 처음 그릴 때(휴대폰은 상세에서 돌아오며 새로 그린다)도 첫 기록 대신 그 매물로 간다.
  const hasCentered = useRef(false);
  useEffect(() => {
    const moved = takeMovedProperty((propertyId) => allRecords.find((record) => record.id === String(propertyId)));
    if (moved === null) return;
    const movedId = String(moved.propertyId);
    hasCentered.current = true;
    setDistrict('전체');
    if (selectedId !== movedId) setSelectedId(movedId);
    setCenter({ latitude: moved.latitude, longitude: moved.longitude });
    setLevel((current) => Math.min(current, 4));
  }, [allRecords, selectedId, setSelectedId]);

  // 기록을 처음 받았을 때만 첫 기록 자리로 지도를 옮긴다. 매물을 만들거나 지워 목록을 다시 받을 때마다 옮기면
  // 방금 만든 매물로 다가간 지도가 다른 자리로 튄다.
  useEffect(() => {
    if (hasCentered.current) return;
    const first = allRecords.find((record) => record.latitude !== null && record.longitude !== null);
    if (first && first.latitude !== null && first.longitude !== null) {
      hasCentered.current = true;
      setCenter({ latitude: first.latitude, longitude: first.longitude });
    }
  }, [allRecords]);

  const markers = useMemo<MapMarker[]>(
    () =>
      records.flatMap((record) =>
        record.latitude !== null && record.longitude !== null
          ? [
              {
                id: record.id,
                latitude: record.latitude,
                longitude: record.longitude,
                label: record.name,
                summary: { amount: record.price },
                tone: 'property',
                actionable: true,
                appear: record.id === createdId || undefined,
              },
            ]
          : [],
      ),
    [records, createdId],
  );

  /**
   * 지도에서 방금 만든 매물을 알린다. 동네 필터를 풀고 그 자리로 다가가 매물을 고르며, 핀은 떠오르며 나타난다.
   * 등록 화면이나 상세로 넘어가지 않고 지도에 머물러, 어디에 생겼는지 바로 보게 한다.
   */
  const revealCreated = (propertyId: string, location: MapCoordinate) => {
    setDistrict('전체');
    setCreatedId(propertyId);
    setSelectedId(propertyId);
    setCenter({ latitude: location.latitude, longitude: location.longitude });
    setLevel((current) => Math.min(current, 4));
  };

  const selectDistrict = (next: string) => {
    setDistrict(next);
    const first = allRecords.find(
      (record) =>
        (next === '전체' || record.district === next) && record.latitude !== null && record.longitude !== null,
    );
    setSelectedId(null);
    if (first && first.latitude !== null && first.longitude !== null)
      setCenter({ latitude: first.latitude, longitude: first.longitude });
    setLevel(next === '전체' ? 8 : 5);
  };

  /**
   * 리스트에서 고른 매물을 열고 지도를 그 매물 핀 자리로 옮긴다. 배율은 그대로 두어 주변을 함께 본다.
   * 위치가 없는 매물은 고르기만 한다.
   */
  const showRecord = (recordId: string) => {
    setSelectedId(recordId);
    const record = records.find((item) => item.id === recordId);
    if (record !== undefined && record.latitude !== null && record.longitude !== null)
      setCenter({ latitude: record.latitude, longitude: record.longitude });
  };

  /** 주소 검색 결과처럼 고른 자리로 지도를 옮기고 동네 수준으로 확대한다. */
  const moveTo = (coordinate: MapCoordinate) => {
    setCenter({ latitude: coordinate.latitude, longitude: coordinate.longitude });
    setLevel(4);
  };

  /**
   * 현재 위치로 지도를 옮긴다. 사파리는 누른 그 순간에만 권한 창을 띄우므로 클릭 처리기에서 바로 부른다.
   * 위치를 못 받으면 까닭을 알림으로 보여 준다. 받은 위치를 더 쓰려면 `onLocated`를 넘긴다.
   */
  const moveToCurrentLocation = (onLocated?: (coordinate: MapCoordinate) => void) => {
    requestCurrentMapLocation().then(
      (coordinate) => {
        moveTo(coordinate);
        onLocated?.(coordinate);
      },
      (error: unknown) =>
        setNotice(
          error instanceof MapLocationError && error.reason === 'denied'
            ? '위치 권한이 꺼져 있어요. 브라우저 설정에서 위치 권한을 켜 주세요.'
            : '현재 위치를 확인하지 못했어요.',
        ),
    );
  };

  return {
    headingRef,
    properties,
    districts,
    district,
    setDistrict,
    selectDistrict,
    records,
    selectedId,
    setSelectedId,
    selected,
    center,
    setCenter,
    level,
    setLevel,
    markers,
    moveTo,
    moveToCurrentLocation,
    revealCreated,
    showRecord,
    notice,
    setNotice,
  };
};

export type RecordsState = ReturnType<typeof useRecords>;

export default useRecords;
