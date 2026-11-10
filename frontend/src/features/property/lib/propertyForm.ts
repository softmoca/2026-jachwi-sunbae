import type { MapAddress } from '@/features/map/model/Map';

import type { PropertyInputDto } from '../api/dtos/PropertyDto';

export const WON_PER_MANWON = 10_000;
/** API로 보낼 원화 금액을 JS에서 정확하게 표현할 수 있는 최대값. */
export const MAX_SAFE_WON_AMOUNT = Number.MAX_SAFE_INTEGER;
/** 입력 UI가 만원 단위이므로 원화 안전 최대값을 만원으로 내림한 값. */
export const MAX_PROPERTY_AMOUNT = Math.floor(MAX_SAFE_WON_AMOUNT / WON_PER_MANWON);

export type PropertyFormValues = {
  name: string;
  depositAmount: string;
  monthlyRentAmount: string;
  discoverySource: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type PropertyFormField = keyof PropertyFormValues;
export type PropertyFormErrors = Partial<Record<PropertyFormField, string>>;
export type PropertyFormMode = 'default' | 'registration';

export const formatMoneyInput = (value: string): string | null => {
  if (value === '') {
    return '';
  }

  if (!/^[0-9,]+$/.test(value)) {
    return null;
  }

  const digits = value.replace(/,/g, '');

  if (digits.length === 0) {
    return null;
  }

  const normalizedDigits = digits.replace(/^0+(?=\d)/, '');
  return normalizedDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const formatAmountForInput = (amount: number): string =>
  new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(amount / WON_PER_MANWON);

export const parseMoneyInput = (value: string): number | null => {
  const digits = value.replace(/,/g, '');

  if (!/^\d+$/.test(digits)) {
    return null;
  }

  const amount = Number(digits);
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= MAX_PROPERTY_AMOUNT ? amount : null;
};

const toWon = (manwon: number): number | null => {
  const amount = manwon * WON_PER_MANWON;
  return Number.isSafeInteger(amount) && amount <= MAX_SAFE_WON_AMOUNT ? amount : null;
};

export const validatePropertyForm = (values: PropertyFormValues): PropertyFormErrors => {
  const errors: PropertyFormErrors = {};
  const name = values.name.trim();
  const address = values.address?.trim() ?? '';
  const discoverySource = values.discoverySource.trim();

  if (name.length === 0) {
    errors.name = '매물을 구분할 이름을 입력해 주세요.';
  } else if (name.length > 30) {
    errors.name = '이름은 30자 이하로 입력해 주세요.';
  }

  if (values.depositAmount === '') {
    errors.depositAmount = '보증금을 입력해 주세요.';
  } else {
    const depositInput = parseMoneyInput(values.depositAmount);
    if (depositInput === null || toWon(depositInput) === null) {
      errors.depositAmount = '보증금이 입력 가능한 최대 금액을 초과했어요.';
    }
  }

  if (values.monthlyRentAmount === '') {
    errors.monthlyRentAmount = '월세를 입력해 주세요.';
  } else {
    const monthlyRentInput = parseMoneyInput(values.monthlyRentAmount);
    if (monthlyRentInput === null || toWon(monthlyRentInput) === null) {
      errors.monthlyRentAmount = '월세가 입력 가능한 최대 금액을 초과했어요.';
    }
  }

  if (address.length > 255) {
    errors.address = '주소는 255자 이하로 입력해 주세요.';
  }

  if (discoverySource.length > 500) {
    errors.discoverySource = '확인한 곳은 500자 이하로 입력해 주세요.';
  }

  return errors;
};

export const toPropertyInputDto = (values: PropertyFormValues): PropertyInputDto | null => {
  const depositInput = parseMoneyInput(values.depositAmount);
  const monthlyRentInput = parseMoneyInput(values.monthlyRentAmount);
  const depositAmount = depositInput === null ? undefined : toWon(depositInput);
  const monthlyRentAmount = monthlyRentInput === null ? undefined : toWon(monthlyRentInput);
  const address = values.address?.trim() ?? '';

  if (depositAmount === null || monthlyRentAmount === null) {
    return null;
  }

  return {
    name: values.name.trim(),
    depositAmount: depositAmount ?? 0,
    monthlyRentAmount: monthlyRentAmount ?? 0,
    discoverySource: values.discoverySource.trim() || null,
    address: address || null,
    latitude: values.latitude ?? null,
    longitude: values.longitude ?? null,
    availableMoveInDate: null,
    maintenanceFeeAmount: null,
    visitScheduledAt: null,
    roomOptions: [],
    utilityOptions: [],
  };
};

export const propertyFieldErrorMessage = (field: PropertyFormField): string => {
  const messages: Record<PropertyFormField, string> = {
    name: '매물 이름을 다시 확인해 주세요.',
    depositAmount: '보증금을 다시 확인해 주세요.',
    monthlyRentAmount: '월세를 다시 확인해 주세요.',
    discoverySource: '확인한 곳을 다시 확인해 주세요.',
    address: '주소를 확인해 주세요.',
    latitude: '선택한 위치의 위도를 확인해 주세요.',
    longitude: '선택한 위치의 경도를 확인해 주세요.',
  };

  return messages[field];
};

/** 위치만으로 바로 만든 매물의 이름. 사용자가 상세에서 바로 고친다. */
export const DEFAULT_PROPERTY_NAME = '새 매물';

export const addressOf = (location: MapAddress): string | null =>
  location.roadAddress ?? location.jibunAddress ?? location.address;

/**
 * 위치만으로 바로 만드는 매물 요청. 이름은 `새 매물`로 두고, 서버가 미확정 금액으로 받는 0을 보증금과 월세에 넣는다.
 * 나머지는 상세 화면에서 항목마다 채운다.
 */
export const toQuickPropertyInput = (location: MapAddress): PropertyInputDto => {
  return {
    name: DEFAULT_PROPERTY_NAME,
    depositAmount: 0,
    monthlyRentAmount: 0,
    discoverySource: null,
    address: addressOf(location),
    latitude: location.latitude,
    longitude: location.longitude,
    availableMoveInDate: null,
    maintenanceFeeAmount: null,
    visitScheduledAt: null,
    roomOptions: [],
    utilityOptions: [],
  };
};
