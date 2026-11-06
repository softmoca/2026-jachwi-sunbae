import { checklistStageMeta } from '@/features/checklist/model/checklist';
import type { ChecklistStage } from '@/features/checklist/model/checklistTypes';

export const formatWon = (amount: number): string => `${new Intl.NumberFormat('ko-KR').format(amount)}원`;

export const formatManwon = (amount: number): string =>
  `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(amount / 10_000)}만원`;

/** 지도 마커처럼 좁은 자리에 쓰는 짧은 시세 표기. 예: `월세 1,000/55`, `전세 10,000`, 미입력은 `월세 0/0` */
export const formatRentSummary = (depositAmount: number, monthlyRentAmount: number): string => {
  const toManwon = (amount: number) =>
    new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(amount / 10_000);
  return monthlyRentAmount === 0 && depositAmount > 0
    ? `전세 ${toManwon(depositAmount)}`
    : `월세 ${toManwon(depositAmount)}/${toManwon(monthlyRentAmount)}`;
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
