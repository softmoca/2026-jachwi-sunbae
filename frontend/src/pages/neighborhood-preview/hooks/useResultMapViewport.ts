import { useEffect, useRef } from 'react';

import type { MapViewport } from '../model/resultMapView';
import type { NeighborhoodPreviewContext } from './useNeighborhoodPreview';

/**
 * 결과 지도 칸(돌려주는 ref를 붙인 요소)의 크기와 가리는 여백을 동네 찾기 상태에 알린다.
 * 동네나 출발 정류장을 고를 때 이 칸에 맞춰 시점을 정한다. 크기는 고르는 순간에 읽는다.
 */
const useResultMapViewport = <T extends HTMLElement>(
  preview: Pick<NeighborhoodPreviewContext, 'setMapViewportReader'>,
  read: (element: T) => MapViewport | null,
) => {
  const ref = useRef<T>(null);
  const readRef = useRef(read);
  readRef.current = read;
  const { setMapViewportReader } = preview;
  useEffect(() => {
    setMapViewportReader(() => (ref.current ? readRef.current(ref.current) : null));
    return () => setMapViewportReader(null);
  });
  return ref;
};

export default useResultMapViewport;
