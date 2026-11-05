import type { ReactNode } from 'react';

import BottomSheet from '@/shared/ui/bottom-sheet/BottomSheet';

import { type NeighborhoodPlace, placeTitle } from '../../hooks/useNeighborhoodPlaces';
import type { NeighborhoodPreviewContext } from '../../hooks/useNeighborhoodPreview';
import PlaceDetails from './PlaceDetails';

type Props = {
  place: NeighborhoodPlace;
  preview: Pick<NeighborhoodPreviewContext, 'destination' | 'maxMinutes' | 'maxTransfers'>;
  onClose: () => void;
  /** 값이 바뀌면 시트를 제목만 보이게 내린다(지도 빈 곳을 찍었을 때). */
  peekSignal?: number;
  /** 시트 바로 위에 함께 띄울 지도 버튼(확대 축소, 현재 위치). */
  floating?: ReactNode;
};

/**
 * 동네를 고르지 않고 지도의 정류장·부동산 마커를 고르면 아래 바텀시트로 띄운다(동네를 골랐으면 AreaPlacesSheet 안에서 연다).
 * 닫기 버튼 없이 끌어 내려 닫고, 지도 빈 곳을 찍으면 제목만 남게 내린다. 끝까지 끌어 올리면 화면 전체 페이지로 본다.
 */
const NeighborhoodPlaceSheet = ({ place, preview, onClose, peekSignal, floating }: Props) => (
  <BottomSheet
    // 부동산과 정류장은 처음 높이가 달라, 서로 바꿔 열면 처음 높이로 다시 연다.
    key={place.kind === 'agency' ? 'agency' : 'route'}
    title={`${placeTitle(place)} 정보`}
    initialHeightPercent={place.kind === 'agency' ? 32 : 55}
    showCloseButton={false}
    closeLabel="정보 닫기"
    fullPage
    peekSignal={peekSignal}
    floating={floating}
    onBack={onClose}
    onClose={onClose}
  >
    <PlaceDetails place={place} preview={preview} phoneAction="call" />
  </BottomSheet>
);

export default NeighborhoodPlaceSheet;
