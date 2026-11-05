import { expect, it, vi } from 'vitest';

import { createMapMarkerLayer, PARKED_MARKER_LIMIT } from '@/features/map/lib/mapMarkerLayer';
import type { LiveMap, LiveOverlay } from '@/features/map/lib/naverMapEngine';
import type { MapMarker } from '@/features/map/model/Map';

/** 지도에 붙었는지만 흉내 내는 오버레이. 네이버 OverlayView처럼 setMap(null)로 내리고 setMap(map)으로 다시 붙는다. */
const setup = () => {
  const map = { id: 'map' } as unknown as LiveMap;
  const overlays = new Map<string, { map: unknown; overlay: LiveOverlay }>();
  const engine = {
    createOverlay: vi.fn((target: LiveMap, marker: MapMarker) => {
      const record = { map: target as unknown, overlay: undefined as unknown as LiveOverlay };
      record.overlay = { setMap: (next: unknown) => (record.map = next) } as unknown as LiveOverlay;
      overlays.set(marker.id, record);
      return record.overlay;
    }),
  };
  const createElement = vi.fn(() => document.createElement('div'));
  const layer = createMapMarkerLayer(map, engine, createElement);
  /** 지금 지도에 붙어 있는 마커 id. */
  const onMap = () =>
    [...overlays]
      .filter(([, record]) => record.map === map)
      .map(([id]) => id)
      .sort();
  return { layer, engine, createElement, onMap };
};
const place = (id: string, category: 'TRANSPORT' | 'AGENCY'): MapMarker => ({
  id,
  latitude: 37.4,
  longitude: 127.1 + Number(id.replace(/\D/g, '')) / 1000,
  label: id,
  tone: 'place',
  category,
  actionable: true,
});
const stations = ['bus-stop:1', 'bus-stop:2', 'bus-stop:3'].map((id) => place(id, 'TRANSPORT'));
const agencies = ['agency:1', 'agency:2'].map((id) => place(id, 'AGENCY'));
const destination: MapMarker = {
  id: 'destination',
  latitude: 37.39,
  longitude: 127.11,
  label: '선택한 지역',
  tone: 'destination',
};

it('탭을 바꾸면 이전 탭 마커는 모두 지도에서 사라지고 고른 탭 마커만 남는다', () => {
  const { layer, onMap } = setup();
  layer.sync([...stations, destination], null, 5);
  expect(onMap()).toEqual(['bus-stop:1', 'bus-stop:2', 'bus-stop:3', 'destination']);
  layer.sync([...agencies, destination], null, 5);
  expect(onMap()).toEqual(['agency:1', 'agency:2', 'destination']);
  layer.sync([...stations, destination], null, 5);
  expect(onMap()).toEqual(['bus-stop:1', 'bus-stop:2', 'bus-stop:3', 'destination']);
});

it('탭을 오가며 다시 보이는 마커는 새로 만들지 않고 내렸던 것을 다시 붙인다', () => {
  const { layer, engine, createElement } = setup();
  layer.sync([...stations, destination], null, 5);
  layer.sync([...agencies, destination], null, 5);
  expect(createElement).toHaveBeenCalledTimes(6);
  layer.sync([...stations, destination], null, 5);
  layer.sync([...agencies, destination], null, 5);
  expect(createElement).toHaveBeenCalledTimes(6);
  expect(engine.createOverlay).toHaveBeenCalledTimes(6);
});

it('모양이 바뀐 마커(선택 등)는 다시 쓰지 않고 새로 만들며 예전 것은 지도에서 내린다', () => {
  const { layer, createElement, onMap } = setup();
  layer.sync(stations, null, 5);
  layer.sync(stations, 'bus-stop:2', 5);
  expect(createElement).toHaveBeenCalledTimes(4);
  expect(onMap()).toEqual(['bus-stop:1', 'bus-stop:2', 'bus-stop:3']);
  // 선택을 풀면 선택 전 모양으로 내려 두었던 마커를 다시 붙인다.
  layer.sync(stations, null, 5);
  expect(createElement).toHaveBeenCalledTimes(4);
});

it('내린 마커는 한도까지만 들고 있고 넘으면 오래된 것부터 버린다', () => {
  const { layer, createElement } = setup();
  const many = Array.from({ length: PARKED_MARKER_LIMIT + 1 }, (_, index) => place(`bus-stop:${index}`, 'TRANSPORT'));
  layer.sync(many, null, 5);
  layer.sync([], null, 5);
  layer.sync([many[0]], null, 5);
  expect(createElement).toHaveBeenCalledTimes(PARKED_MARKER_LIMIT + 2);
  layer.sync([many[PARKED_MARKER_LIMIT]], null, 5);
  expect(createElement).toHaveBeenCalledTimes(PARKED_MARKER_LIMIT + 2);
});

it('지도를 없애면 붙어 있던 마커를 내리고 들고 있던 마커도 버린다', () => {
  const { layer, createElement, onMap } = setup();
  layer.sync(stations, null, 5);
  layer.sync(agencies, null, 5);
  layer.dispose();
  expect(onMap()).toEqual([]);
  layer.sync(stations, null, 5);
  expect(createElement).toHaveBeenCalledTimes(8);
});
