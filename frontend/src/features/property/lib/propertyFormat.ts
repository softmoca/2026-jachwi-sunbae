import { checklistStageMeta } from '@/features/checklist/model/checklist';
import type { ChecklistStage } from '@/features/checklist/model/checklistTypes';

export const formatWon = (amount: number): string => `${new Intl.NumberFormat('ko-KR').format(amount)}원`;

export const formatManwon = (amount: number): string =>
  `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(amount / 10_000)}만원`;

/** 보증금과 월세를 아직 넣지 않은 매물(지도에서 바로 만든 새 매물은 둘 다 0)에 금액 대신 보이는 글. */
export const PRICE_PENDING_LABEL = '가격 입력 전';

/** 보증금이나 월세 중 하나라도 넣었는지. 서비스는 월세만 다루므로 월세가 0이어도 월세 형식으로 보인다. */
export const hasPropertyPrice = (depositAmount: number, monthlyRentAmount: number): boolean =>
  depositAmount > 0 || monthlyRentAmount > 0;

/** 지도 마커처럼 좁은 자리에 쓰는 짧은 월세 표기. 단위는 만원이다. 예: `1,000/55`, 월세가 0이면 `1,000/0` */
export const formatRentSummary = (depositAmount: number, monthlyRentAmount: number): string => {
  const toManwon = (amount: number) =>
    new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(amount / 10_000);
  return `${toManwon(depositAmount)}/${toManwon(monthlyRentAmount)}`;
};

/**
 * 매물 가격 표기. 짧은 표기는 미입력이어도 `월세 0/0`, 나머지는 `가격 입력 전`을 돌려준다.
 * - `labeled`: 카드처럼 이름을 붙인다. `보증금 1,000만원 / 월세 55만원`
 * - `plain`: 표처럼 머리에 이름이 있는 자리. `1,000만원 / 55만원`
 * - `summary`: 좁은 자리. `월세 1,000/55`
 */
export type PropertyPriceVariant = 'labeled' | 'plain' | 'summary';

export const formatPropertyPrice = (
  depositAmount: number,
  monthlyRentAmount: number,
  variant: PropertyPriceVariant,
): string => {
  if (variant === 'summary') return `월세 ${formatRentSummary(depositAmount, monthlyRentAmount)}`;
  if (!hasPropertyPrice(depositAmount, monthlyRentAmount)) return PRICE_PENDING_LABEL;
  if (variant === 'plain') return `${formatManwon(depositAmount)} / ${formatManwon(monthlyRentAmount)}`;
  return `보증금 ${formatManwon(depositAmount)} / 월세 ${formatManwon(monthlyRentAmount)}`;
};

export const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export const getSafeHttpUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

export const getChecklistStageLabel = (stage: ChecklistStage): string => checklistStageMeta[stage].label;

export const parsePositiveId = (value: string | undefined): number | null => {
  if (value === undefined || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};
