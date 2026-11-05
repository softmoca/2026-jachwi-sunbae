import { type CommuteArea, formatManwon } from '@/features/map/api/commuteApi';

/** 고를 수 있는 월세 상한(만원). 0은 전체 가격이다. 자취방 월세 범위를 넘는 큰 값은 두지 않는다. */
export const RENT_LIMITS = [0, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150] as const;
export const isRentLimit = (value: unknown): value is number =>
  typeof value === 'number' && (RENT_LIMITS as readonly number[]).includes(value);
export const transferLabel = (maxTransfers: number) =>
  maxTransfers === 0 ? '환승 없음' : `환승 ${maxTransfers}회 이하`;
export const rentLabel = (maxRent: number) => (maxRent === 0 ? '월세 전체' : `월세 ${maxRent}만원 이하`);
/** 월세 조건 밖(지도의 회색) 동네를 골랐을 때의 안내. 조건 안이면 없다. */
export const overRentNotice = (rent: CommuteArea['rent'], maxRent: number) =>
  maxRent > 0 && rent && rent.monthlyRentKrw > maxRent * 10000 ? `월세 조건(${maxRent}만원 이하)보다 비싸요` : null;
export const emptyAreaMessage = (maxRent: number) =>
  maxRent === 0
    ? '조건에 맞는 동네가 없어요. 통근 시간이나 환승 조건을 넓혀보세요.'
    : '조건에 맞는 동네가 없어요. 월세 조건을 넓혀보세요.';
/** 동네 카드 설명. 시세가 없는 동네는 그리지 않지만, 넘겨받으면 "시세 없음"으로 적는다. */
export const areaCardDescription = (area: { rent: CommuteArea['rent']; stations: { stopName: string }[] }) =>
  `${area.rent ? `월세 ${formatManwon(area.rent.monthlyRentKrw)}` : '시세 없음'} · ${area.stations[0].stopName}에서 출발`;
/** 결과 지도 위 안내. 가까이 보면 정류장·부동산을 올린다. 거리 메모는 본 방 기록 지도에서만 본다. */
export const placesHint = ({ isClose, failed }: { isClose: boolean; failed: boolean }) =>
  !isClose
    ? '동네를 고르거나 가까이 확대하면 정류장·부동산이 보여요'
    : failed
      ? '주변 정보를 일부 불러오지 못했어요'
      : '마커를 눌러 정보를 볼 수 있어요';
