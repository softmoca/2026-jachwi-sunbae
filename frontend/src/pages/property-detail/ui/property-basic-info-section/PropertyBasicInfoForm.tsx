import { css } from '@emotion/css';
import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

import { requestCurrentMapLocation } from '@/features/map/lib/mapLocation';
import type { MapAddress } from '@/features/map/model/Map';
import { useUpdateProperty } from '@/features/property/api/usePropertyMutations';
import useAddressSearch from '@/features/property/hooks/useAddressSearch';
import usePropertyLocation from '@/features/property/hooks/usePropertyLocation';
import {
  formatAmountForInput,
  parseMoneyInput,
  type PropertyFormErrors,
  validatePropertyForm,
  WON_PER_MANWON,
} from '@/features/property/lib/propertyForm';
import type { PropertyDetail } from '@/features/property/model/Property';
import MoneyField from '@/features/property/ui/money-field/MoneyField';
import PropertyLocationPicker from '@/features/property/ui/property-location-picker/PropertyLocationPicker';
import { trackPostHogEvent } from '@/shared/lib/analytics/posthog';
import useOutsideInteraction from '@/shared/lib/hooks/useOutsideInteraction';
import { Button } from '@/shared/ui/button/Button';

import type { BasicEditField } from '../../model/editField';

type PropertyBasicInfoFormProps = {
  property: PropertyDetail;
  /** 상세에서 누른 항목만 보여 주고 그 값만 바꿔 저장한다. */
  field: BasicEditField;
  /** 저장을 마쳤을 때. 바뀐 값이 없으면 저장하지 않고 onCancel을 부른다. */
  onSaved: () => void;
  /** Esc를 누르거나 바뀐 값 없이 입력을 떠났을 때. */
  onCancel: () => void;
};

type BasicInfoValues = { depositAmount: string; monthlyRentAmount: string };

/** 지도 idle 때 같은 좌표가 다시 들어와도 위치를 바꾼 것으로 보지 않는다. */
const COORDINATE_EPSILON = 1e-6;

const toPresetLocation = ({ location }: PropertyDetail): MapAddress | undefined =>
  location.latitude === null || location.longitude === null
    ? undefined
    : {
        address: location.address,
        roadAddress: null,
        jibunAddress: null,
        latitude: location.latitude,
        longitude: location.longitude,
      };

/** 입력하지 않은 금액도 0으로 열어, 바꾸지 않고 닫을 수 있게 한다. */
const toPriceInputs = ({ depositAmount, monthlyRentAmount }: PropertyDetail) => ({
  depositAmount: formatAmountForInput(depositAmount),
  monthlyRentAmount: formatAmountForInput(monthlyRentAmount),
});

/**
 * 상세의 그 줄 안에서 기본 정보(보증금과 월세, 위치) 중 누른 항목 하나를 고친다. 이름은 `PropertyNameInput`이 맡는다.
 * 보증금과 월세는 입력을 마치고 칸을 떠나거나 엔터를 누르면 바로 저장하고, Esc는 저장하지 않고 닫는다.
 * 위치는 지도를 옮기는 동안 저장하면 안 되므로 `이 위치로 저장`을 눌러야 저장한다. 지도를 옮기거나 주소를 고른 경우에만 보낸다.
 */
const PropertyBasicInfoForm = ({ property, field, onSaved, onCancel }: PropertyBasicInfoFormProps) => {
  const updateProperty = useUpdateProperty(property.propertyId);
  const [initialValues] = useState<BasicInfoValues>(() => toPriceInputs(property));
  const formRef = useRef<HTMLFormElement>(null);
  useOutsideInteraction({
    ref: formRef,
    enabled: field === 'price' && !updateProperty.isPending,
    onOutside: () => formRef.current?.requestSubmit(),
  });
  const [values, setValues] = useState<BasicInfoValues>(initialValues);
  const [errors, setErrors] = useState<PropertyFormErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [presetLocation] = useState(() => toPresetLocation(property));
  const clearNotice = useCallback(() => setNotice(null), []);
  const location = usePropertyLocation(presetLocation, clearNotice);
  const search = useAddressSearch();
  const initialCoordinate = useRef({
    latitude: location.selectedLocation.latitude,
    longitude: location.selectedLocation.longitude,
  });
  const { setInitialQuery } = search;

  useEffect(() => {
    if (property.location.address) setInitialQuery(property.location.address);
  }, [property.location.address, setInitialQuery]);

  const setValue = (field: keyof BasicInfoValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const moveToCurrentLocation = async () => {
    search.setStatus('loading');
    try {
      const coordinate = await requestCurrentMapLocation();
      await location.resolveLocation(coordinate.latitude, coordinate.longitude);
      search.setStatus('idle');
    } catch {
      trackPostHogEvent('address_search_failed', { error_kind: 'location' });
      search.setStatus('error');
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const priceValues = {
      depositAmount: values.depositAmount.trim() === '' ? '0' : values.depositAmount,
      monthlyRentAmount: values.monthlyRentAmount.trim() === '' ? '0' : values.monthlyRentAmount,
    };
    // 화면에 보이는 항목의 오류만 본다. 아직 비어 있는 다른 항목이 저장을 막지 않게 한다.
    const allErrors = validatePropertyForm({
      ...priceValues,
      name: property.name,
      discoverySource: property.discoverySource.value,
    });
    const nextErrors: PropertyFormErrors =
      field === 'price'
        ? {
            ...(allErrors.depositAmount && { depositAmount: allErrors.depositAmount }),
            ...(allErrors.monthlyRentAmount && { monthlyRentAmount: allErrors.monthlyRentAmount }),
          }
        : {};
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const { selectedLocation, locationStatus } = location;
    const moved =
      Math.abs(selectedLocation.latitude - initialCoordinate.current.latitude) > COORDINATE_EPSILON ||
      Math.abs(selectedLocation.longitude - initialCoordinate.current.longitude) > COORDINATE_EPSILON;
    if (moved && locationStatus !== 'ready') {
      setNotice(
        locationStatus === 'loading'
          ? '주소를 확인하는 중이에요. 잠시 후 다시 눌러 주세요.'
          : '위치를 다시 선택해 주세요.',
      );
      return;
    }

    if (field === 'location' && !moved) {
      onCancel();
      return;
    }
    if (
      field === 'price' &&
      priceValues.depositAmount === initialValues.depositAmount &&
      priceValues.monthlyRentAmount === initialValues.monthlyRentAmount
    ) {
      onCancel();
      return;
    }

    const changes =
      field === 'price'
        ? {
            depositAmount: (parseMoneyInput(priceValues.depositAmount) ?? 0) * WON_PER_MANWON,
            monthlyRentAmount: (parseMoneyInput(priceValues.monthlyRentAmount) ?? 0) * WON_PER_MANWON,
          }
        : {
            address: selectedLocation.roadAddress ?? selectedLocation.jibunAddress ?? selectedLocation.address,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          };
    void updateProperty
      .mutateAsync({ current: property, changes })
      .then(onSaved)
      .catch(() => undefined);
  };

  const cancelOnEscape = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onCancel();
  };

  return (
    <form
      ref={formRef}
      className={styles.editor}
      aria-label={field === 'price' ? '보증금 / 월세 입력' : '주소 입력'}
      noValidate
      onSubmit={submit}
      onKeyDown={cancelOnEscape}
    >
      {field === 'price' && (
        <div className={styles.priceRow}>
          <MoneyField
            label="보증금"
            value={values.depositAmount}
            error={errors.depositAmount}
            autoFocus
            onValueChange={(value) => setValue('depositAmount', value)}
          />
          <MoneyField
            label="월세"
            value={values.monthlyRentAmount}
            error={errors.monthlyRentAmount}
            onValueChange={(value) => setValue('monthlyRentAmount', value)}
          />
        </div>
      )}
      {field === 'location' && (
        <PropertyLocationPicker
          location={{
            selected: location.selectedLocation,
            status: location.locationStatus,
            onCenterChange: location.handleCenterChange,
            onMoveToCurrentLocation: () => void moveToCurrentLocation(),
          }}
          search={{
            query: search.query,
            results: search.results,
            status: search.status,
            onQueryChange: search.changeQuery,
            onSubmit: () => void search.submit(),
            onClear: search.clear,
            onSelect: (result) => {
              location.selectAddress(result);
              search.pick(result);
            },
          }}
        />
      )}
      {notice !== null && (
        <p className={styles.errorNotice} role="alert">
          {notice}
        </p>
      )}
      {updateProperty.isError && (
        <p className={styles.errorNotice} role="alert">
          저장하지 못했어요. 다시 시도해 주세요.
        </p>
      )}
      {field === 'price' ? (
        // 금액은 떠나면 저장하므로 버튼 없이 저장 중임만 알린다. 엔터로 보내는 숨은 제출 버튼을 둔다.
        <>
          {updateProperty.isPending && (
            <p className={styles.status} role="status">
              저장 중…
            </p>
          )}
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </>
      ) : (
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onCancel}>
            취소
          </Button>
          <Button type="submit" variant="soft" isLoading={updateProperty.isPending} loadingLabel="저장 중…">
            이 위치로 저장
          </Button>
        </div>
      )}
    </form>
  );
};

const styles = {
  editor: css`
    label: PropertyBasicInfoForm-editor;
    display: grid;
    gap: 0.75rem;
    padding: 0.25rem 0 0.5rem;
  `,

  /* 보증금과 월세는 한 줄에 나란히 둔다. */
  priceRow: css`
    label: PropertyBasicInfoForm-priceRow;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
  `,

  actions: css`
    label: PropertyBasicInfoForm-actions;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  `,

  status: css`
    label: PropertyBasicInfoForm-status;
    margin: 0;
    color: var(--color-ink-soft);
    font-size: 0.78rem;
  `,

  errorNotice: css`
    label: PropertyBasicInfoForm-errorNotice;
    margin: 0;
    color: var(--color-error);
    font-size: 0.8rem;
    font-weight: 600;
  `,
};

export default PropertyBasicInfoForm;
