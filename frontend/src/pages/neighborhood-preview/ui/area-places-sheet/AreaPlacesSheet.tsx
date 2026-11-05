import { css } from '@emotion/css';
import type { ReactNode } from 'react';

import { formatManwon } from '@/features/map/api/commuteApi';
import { stationIconSrc } from '@/features/map/lib/mapIconAssets';
import BottomSheet from '@/shared/ui/bottom-sheet/BottomSheet';

import { type NeighborhoodPlace, placeTitle } from '../../hooks/useNeighborhoodPlaces';
import type { NeighborhoodPreviewContext } from '../../hooks/useNeighborhoodPreview';
import { overRentNotice } from '../../model/criteriaLabels';
import ListingLink from '../listing-link/ListingLink';
import PlaceDetails from '../place-panel/PlaceDetails';

type Area = NonNullable<NeighborhoodPreviewContext['selected']>;

type Props = {
  area: Area;
  /** 고른 정류장·공인중개사. 있으면 같은 시트 안에서 그 정보로 넘어가고, 뒤로가기로 목록에 돌아온다. */
  place: NeighborhoodPlace | null;
  preview: Pick<
    NeighborhoodPreviewContext,
    'destination' | 'maxMinutes' | 'maxTransfers' | 'rentPeriod' | 'openListing' | 'maxRent'
  >;
  onSelectStation: (station: Area['stations'][number]) => void;
  onBack: () => void;
  /** 끌어 내려 닫으면 동네 선택을 푼다. */
  onClose: () => void;
  /** 값이 바뀌면 시트를 제목만 보이게 내린다(지도 빈 곳을 찍었을 때). */
  peekSignal: number;
  /** 시트 바로 위에 함께 띄울 지도 버튼(확대 축소, 현재 위치). */
  floating?: ReactNode;
};

/**
 * 휴대폰에서 동네를 고르면 아래에 올리는 시트. 그 동네의 시세와 출발 정류장 목록을 보여 주고,
 * 정류장을 고르면 시트를 바꾸지 않고 그 안에서 경로로 넘어간다. 지도에서 공인중개사 마커를 눌러도 같은 시트 안에서 연다.
 * 닫기 버튼은 두지 않는다. 끌어 내려 닫고, 끝까지 끌어 올리면 헤더에 뒤로가기·닫기가 있는 페이지로 본다.
 */
const AreaPlacesSheet = ({ area, place, preview, onSelectStation, onBack, onClose, peekSignal, floating }: Props) => {
  const overRent = overRentNotice(area.rent, preview.maxRent);
  return (
    <BottomSheet
      title={place ? `${placeTitle(place)} 정보` : area.name}
      // 목록에서는 동네 이름 아래 전체 주소를 적는다.
      subtitle={place ? undefined : area.fullName}
      initialHeightPercent={place && place.kind !== 'agency' ? 55 : 38}
      showCloseButton={false}
      closeLabel="동네 정보 닫기"
      fullPage
      peekSignal={peekSignal}
      floating={floating}
      onBack={place ? onBack : undefined}
      // 다방 링크는 목록일 때 제목 오른쪽 끝에 정사각형 아이콘으로 둔다.
      headerEnd={
        place ? undefined : (
          <ListingLink variant="icon" areaName={area.name} center={area.center} onOpen={preview.openListing} />
        )
      }
      onClose={onClose}
    >
      {place ? (
        <PlaceDetails place={place} preview={preview} phoneAction="call" />
      ) : (
        <div className={styles.body}>
          {/* 동네 대중교통 상세로 넘어가지 않으므로 시세도 이 시트에 둔다. 끝까지 올리면 페이지처럼 본다. */}
          <section className={styles.rent} aria-label="월세 시세">
            {area.rent ? (
              <>
                <strong>
                  월세 {formatManwon(area.rent.monthlyRentKrw)} · 보증금 {formatManwon(area.rent.depositKrw)}
                </strong>
                <small>
                  {area.rent.legalDongNames.join('·')} 거래 {area.rent.transactionCount}건 중앙값
                  {preview.rentPeriod && ` · ${preview.rentPeriod.startDate} ~ ${preview.rentPeriod.endDate} 계약`}
                </small>
              </>
            ) : (
              <strong>거래가 적어 시세를 내지 않았어요</strong>
            )}
            {overRent && <p className={styles.overRent}>{overRent}</p>}
          </section>
          <ul className={styles.items} aria-label={`${area.name} 출발 정류장`}>
            {area.stations.map((station) => (
              <li key={station.stopId}>
                <button type="button" onClick={() => onSelectStation(station)}>
                  <img src={stationIconSrc(station.stopId)} alt="" draggable={false} decoding="async" />
                  <span>{station.stopName}</span>
                  <small>{station.travelMinutes}분</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </BottomSheet>
  );
};

const styles = {
  body: css`
    label: AreaPlacesSheet-body;
    display: grid;
    gap: 0.75rem;
  `,

  rent: css`
    label: AreaPlacesSheet-rent;
    display: grid;
    gap: 0.2rem;

    & strong {
      font-size: 0.95rem;
    }

    & small {
      color: var(--color-muted);
      font-size: 0.75rem;
    }
  `,

  overRent: css`
    label: AreaPlacesSheet-overRent;
    margin: 0.2rem 0 0;
    color: var(--color-danger, #d14d4d);
    font-size: 0.78rem;
    font-weight: 600;
  `,

  items: css`
    label: AreaPlacesSheet-items;
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;

    & button {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.8rem 0.25rem;
      border: 0;
      border-bottom: 1px solid var(--color-border);
      background: none;
      color: var(--color-ink);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    & img {
      flex: none;
      width: 1.75rem;
      height: 1.75rem;
    }

    & span {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      font-size: 0.9rem;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    & small {
      flex: none;
      max-width: 50%;
      overflow: hidden;
      color: var(--color-muted);
      font-size: 0.75rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
};

export default AreaPlacesSheet;
