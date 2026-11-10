import { css } from '@emotion/css';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import type { AdditionalEditField } from '@/pages/property-detail/model/editField';
import { useUpdateProperty } from '@/features/property/api/usePropertyMutations';
import {
  formatAmountForInput,
  formatMoneyInput,
  parseMoneyInput,
  WON_PER_MANWON,
} from '@/features/property/lib/propertyForm';
import type { PropertyDetail, RoomOption, UtilityOption } from '@/features/property/model/Property';
import { MAINTENANCE_OPTIONS, PROPERTY_OPTIONS } from '@/features/property/model/propertyOptions';
import MoneyField from '@/features/property/ui/money-field/MoneyField';
import useOutsideInteraction from '@/shared/lib/hooks/useOutsideInteraction';
import BottomActionArea from '@/shared/ui/bottom-action-area/BottomActionArea';
import { Button } from '@/shared/ui/button/Button';
import InlineNotice from '@/shared/ui/inline-notice/InlineNotice';
import TextField from '@/shared/ui/text-field/TextField';

import PropertyOptionPicker from '../property-option-picker/PropertyOptionPicker';

type AdditionalInfoValues = {
  availableMoveInDate: string;
  maintenanceFeeAmount: string;
  visitScheduledAt: string;
  discoverySource: string;
  roomOptions: RoomOption[];
  utilityOptions: UtilityOption[];
};

type PropertyAdditionalInfoFormProps = {
  property: PropertyDetail;
  onSaved: () => void;
  /**
   * `page`는 제목과 화면 아래 고정 버튼을 쓴다.
   * `inline`은 매물 상세의 그 줄 안에서 고친다. 버튼 없이 입력을 마치고 칸을 떠나면 저장하고, Esc는 저장하지 않고 닫는다.
   * `sheet`는 매물 상세의 바텀시트 안에서 고친다. 라벨이 있는 입력과 맨 아래 저장 버튼을 쓴다.
   */
  layout?: 'page' | 'inline' | 'sheet';
  /** 넘기면 상세에서 누른 항목만 보여 준다. 저장은 늘 부가 정보 전체로 한다. */
  field?: AdditionalEditField;
  /** inline에서 Esc를 누르거나 바뀐 값 없이 입력을 떠났을 때. */
  onCancel?: () => void;
};

const sameValues = (left: AdditionalInfoValues, right: AdditionalInfoValues) =>
  left.availableMoveInDate === right.availableMoveInDate &&
  left.maintenanceFeeAmount === right.maintenanceFeeAmount &&
  left.visitScheduledAt === right.visitScheduledAt &&
  left.discoverySource === right.discoverySource &&
  left.roomOptions.join() === right.roomOptions.join() &&
  left.utilityOptions.join() === right.utilityOptions.join();

const toValues = (property: PropertyDetail): AdditionalInfoValues => ({
  availableMoveInDate: property.availableMoveInDate ?? '',
  maintenanceFeeAmount:
    property.maintenanceFeeAmount === null ? '' : formatAmountForInput(property.maintenanceFeeAmount),
  visitScheduledAt: property.visitScheduledAt?.slice(0, 16) ?? '',
  discoverySource: property.discoverySource.value,
  roomOptions: property.roomOptions,
  utilityOptions: property.utilityOptions,
});

/** 매물 상세 값으로 부가 정보를 채워 두고, 바뀐 값을 얹어 전체 수정으로 저장한다. */
const PropertyAdditionalInfoForm = ({
  property,
  onSaved,
  layout = 'page',
  field,
  onCancel,
}: PropertyAdditionalInfoFormProps) => {
  const updateProperty = useUpdateProperty(property.propertyId);
  const [initialValues] = useState(() => toValues(property));
  const [values, setValues] = useState(initialValues);
  const isInline = layout === 'inline';
  const formRef = useRef<HTMLFormElement>(null);
  useOutsideInteraction({
    ref: formRef,
    enabled: isInline && !updateProperty.isPending,
    onOutside: () => formRef.current?.requestSubmit(),
  });
  // 줄 안에서 열면 첫 입력(선택지면 첫 버튼)으로 포커스를 옮긴다. 그래야 다른 곳을 누를 때 떠난 것으로 보고 저장한다.
  useEffect(() => {
    if (isInline) formRef.current?.querySelector<HTMLElement>('input, button:not([hidden]), textarea')?.focus();
  }, [isInline]);
  const shows = (target: AdditionalEditField) => field === undefined || field === target;

  const setValue = <K extends keyof AdditionalInfoValues>(key: K, value: AdditionalInfoValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submitButton = (
    <Button type="submit" variant="soft" fullWidth isLoading={updateProperty.isPending} loadingLabel="저장 중…">
      {field === undefined ? '부가 정보 저장' : '저장'}
    </Button>
  );

  const cancelOnEscape = (event: KeyboardEvent<HTMLFormElement>) => {
    if (!isInline || event.key !== 'Escape') return;
    event.stopPropagation();
    onCancel?.();
  };

  return (
    <form
      ref={formRef}
      className={styles.form}
      data-layout={layout}
      onKeyDown={cancelOnEscape}
      onSubmit={(event) => {
        event.preventDefault();
        if (isInline && sameValues(values, initialValues)) {
          onCancel?.();
          return;
        }
        const maintenanceFeeInput =
          values.maintenanceFeeAmount === '' ? null : parseMoneyInput(values.maintenanceFeeAmount);
        if (values.maintenanceFeeAmount !== '' && maintenanceFeeInput === null) return;

        void updateProperty
          .mutateAsync({
            current: property,
            changes: {
              availableMoveInDate: values.availableMoveInDate || null,
              maintenanceFeeAmount: maintenanceFeeInput === null ? null : maintenanceFeeInput * WON_PER_MANWON,
              visitScheduledAt: values.visitScheduledAt || null,
              discoverySource: values.discoverySource.trim() || null,
              roomOptions: values.roomOptions,
              utilityOptions: values.utilityOptions,
            },
          })
          .then(onSaved)
          .catch(() => undefined);
      }}
    >
      <section
        className={styles.fields}
        aria-labelledby={layout === 'page' ? 'additional-info-heading' : undefined}
        aria-label={isInline ? '부가 정보 입력' : undefined}
      >
        {layout === 'page' && <h1 id="additional-info-heading">부가 정보</h1>}
        {shows('availableMoveInDate') &&
          (isInline ? (
            <input
              className={styles.bare}
              aria-label="입주 가능일"
              type="date"
              value={values.availableMoveInDate}
              onChange={(event) => setValue('availableMoveInDate', event.target.value)}
            />
          ) : (
            <TextField
              label="입주 가능일"
              type="date"
              value={values.availableMoveInDate}
              onChange={(event) => setValue('availableMoveInDate', event.target.value)}
            />
          ))}
        {shows('maintenance') && (
          <PropertyOptionPicker
            label="관리비 포함 공과금"
            hideLabel={layout === 'sheet'}
            options={MAINTENANCE_OPTIONS}
            variant="badge"
            selected={values.utilityOptions}
            onChange={(next) => setValue('utilityOptions', next as UtilityOption[])}
          >
            {isInline ? (
              <input
                className={styles.bare}
                aria-label="총 관리비 (만원)"
                inputMode="numeric"
                placeholder="총 관리비(만원) 예: 10"
                value={values.maintenanceFeeAmount}
                onChange={(event) => {
                  const formatted = formatMoneyInput(event.target.value);
                  if (formatted !== null) setValue('maintenanceFeeAmount', formatted);
                }}
              />
            ) : (
              <MoneyField
                label="총 관리비"
                value={values.maintenanceFeeAmount}
                placeholder="예: 10"
                onValueChange={(value) => setValue('maintenanceFeeAmount', value)}
              />
            )}
          </PropertyOptionPicker>
        )}
        {shows('roomOptions') && (
          <PropertyOptionPicker
            label="방 옵션"
            hideLabel={layout === 'sheet'}
            options={PROPERTY_OPTIONS}
            selected={values.roomOptions}
            onChange={(next) => setValue('roomOptions', next as RoomOption[])}
          />
        )}
        {shows('visitScheduledAt') &&
          (isInline ? (
            <input
              className={styles.bare}
              aria-label="방문 일정"
              type="datetime-local"
              value={values.visitScheduledAt}
              onChange={(event) => setValue('visitScheduledAt', event.target.value)}
            />
          ) : (
            <TextField
              label="방문 일정"
              type="datetime-local"
              value={values.visitScheduledAt}
              onChange={(event) => setValue('visitScheduledAt', event.target.value)}
            />
          ))}
        {shows('discoverySource') &&
          (isInline ? (
            <input
              className={styles.bare}
              aria-label="확인한 곳"
              value={values.discoverySource}
              maxLength={500}
              placeholder="URL, 앱 이름 또는 중개사 정보"
              onChange={(event) => setValue('discoverySource', event.target.value)}
            />
          ) : (
            <TextField
              label="확인한 곳"
              value={values.discoverySource}
              maxLength={500}
              placeholder="URL, 앱 이름 또는 중개사 정보"
              onChange={(event) => setValue('discoverySource', event.target.value)}
            />
          ))}
      </section>
      {updateProperty.isError && (
        <InlineNotice tone="error">부가 정보를 저장하지 못했어요. 다시 시도해 주세요.</InlineNotice>
      )}
      {layout === 'page' ? (
        <BottomActionArea>{submitButton}</BottomActionArea>
      ) : layout === 'sheet' ? (
        <Button type="submit" variant="primary" fullWidth isLoading={updateProperty.isPending} loadingLabel="저장 중…">
          저장
        </Button>
      ) : (
        // 떠나면 저장하므로 버튼 없이 저장 중임만 알린다. 엔터로 보내는 숨은 제출 버튼을 둔다.
        <>
          {updateProperty.isPending && (
            <p className={styles.status} role="status">
              저장 중…
            </p>
          )}
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </>
      )}
    </form>
  );
};

const styles = {
  form: css`
    label: PropertyAdditionalInfoForm-form;
    display: grid;
    gap: 1.4rem;
    padding-bottom: 1rem;

    /* 상세 줄 안에서는 여백을 줄여 다른 줄 사이에 붙여 둔다. */
    &[data-layout='inline'] {
      gap: 0.75rem;
      padding: 0.25rem 0 0.5rem;
    }
  `,

  /* 상세 줄 안에서 값이 있던 자리 그대로 쓰는 입력. 테두리와 밑줄 없이, 입력 중에만 옅은 회색 바탕을 깐다. */
  bare: css`
    label: PropertyAdditionalInfoForm-bare;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: 0.2rem 0.4rem;
    border: 0;
    border-radius: 0.5rem;
    background: transparent;
    color: var(--color-ink, #212124);
    font: inherit;
    text-align: center;
    outline: none;
    /* 전역 포커스 링(검은 테두리)보다 우선해서, 입력 중에도 테두리 없이 옅은 회색 바탕만 둔다. */
    &:focus,
    &:focus-visible {
      outline: 0;
      background: #f1f2f4;
    }
  `,

  status: css`
    label: PropertyAdditionalInfoForm-status;
    margin: 0;
    color: var(--color-ink-soft);
    font-size: 0.78rem;
  `,

  fields: css`
    label: PropertyAdditionalInfoForm-fields;
    display: grid;
    gap: 1.4rem;

    & h1 {
      margin: 0;
      font-size: 1rem;
      font-weight: 750;
      letter-spacing: -0.03em;
    }
  `,
};

export default PropertyAdditionalInfoForm;
