import { css } from '@emotion/css';
import { type FocusEvent, type KeyboardEvent, useRef, useState } from 'react';

import { useUpdateProperty } from '@/features/property/api/usePropertyMutations';
import {
  formatAmountForInput,
  formatMoneyInput,
  parseMoneyInput,
  WON_PER_MANWON,
} from '@/features/property/lib/propertyForm';
import type { PropertyDetail } from '@/features/property/model/Property';

type Props = {
  property: PropertyDetail;
  /** 저장을 마쳤을 때. */
  onSaved: () => void;
  /** 바뀐 값이 없거나 Esc로 닫았을 때. */
  onCancel: () => void;
};

/**
 * 보증금과 월세를 값이 있던 그 자리에서 바로 고친다(메모처럼). 별도 입력 영역이나 버튼을 띄우지 않고 테두리도 없이,
 * 읽을 때와 같은 한 줄에 두 입력을 `보증금 / 월세`로 놓는다. 두 칸을 모두 떠나거나 엔터를 누르면 저장하고, Esc는 닫는다.
 */
const PropertyPriceInput = ({ property, onSaved, onCancel }: Props) => {
  const updateProperty = useUpdateProperty(property.propertyId);
  const [deposit, setDeposit] = useState(() => formatAmountForInput(property.depositAmount));
  const [rent, setRent] = useState(() => formatAmountForInput(property.monthlyRentAmount));
  const [isInvalid, setIsInvalid] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  // 엔터로 저장한 뒤 따라오는 blur, Esc로 닫을 때의 blur에서 다시 저장하지 않는다.
  const settledRef = useRef(false);

  const save = () => {
    if (settledRef.current) return;
    const nextDeposit = parseMoneyInput(deposit.trim() === '' ? '0' : deposit);
    const nextRent = parseMoneyInput(rent.trim() === '' ? '0' : rent);
    if (nextDeposit === null || nextRent === null) {
      setIsInvalid(true);
      return;
    }
    settledRef.current = true;
    const depositAmount = nextDeposit * WON_PER_MANWON;
    const monthlyRentAmount = nextRent * WON_PER_MANWON;
    if (depositAmount === property.depositAmount && monthlyRentAmount === property.monthlyRentAmount) {
      onCancel();
      return;
    }
    updateProperty
      .mutateAsync({ current: property, changes: { depositAmount, monthlyRentAmount } })
      .then(onSaved)
      .catch(() => {
        // 실패하면 입력을 열어 둔 채 다시 저장할 수 있게 한다.
        settledRef.current = false;
      });
  };

  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    // 보증금에서 월세로 옮기는 것은 떠나는 게 아니다. 두 칸 밖으로 나갔을 때만 저장한다.
    if (rootRef.current?.contains(event.relatedTarget)) return;
    save();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 한글 조합을 끝내는 엔터는 저장으로 보지 않는다.
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      save();
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      settledRef.current = true;
      onCancel();
    }
  };

  const change = (setValue: (value: string) => void) => (event: { target: { value: string } }) => {
    const formatted = formatMoneyInput(event.target.value);
    if (formatted === null) return;
    setValue(formatted);
    setIsInvalid(false);
  };

  return (
    <span ref={rootRef} className={styles.wrap} onBlur={handleBlur}>
      <span className={styles.line}>
        <input
          className={styles.input}
          aria-label="보증금 (만원)"
          inputMode="numeric"
          value={deposit}
          autoFocus
          readOnly={updateProperty.isPending}
          enterKeyHint="next"
          onChange={change(setDeposit)}
          onKeyDown={handleKeyDown}
        />
        <span aria-hidden="true">/</span>
        <input
          className={styles.input}
          aria-label="월세 (만원)"
          inputMode="numeric"
          value={rent}
          readOnly={updateProperty.isPending}
          enterKeyHint="done"
          onChange={change(setRent)}
          onKeyDown={handleKeyDown}
        />
        <span className={styles.unit}>만원</span>
      </span>
      {(isInvalid || updateProperty.isError) && (
        <span className={styles.error} role="alert">
          {isInvalid ? '금액을 숫자로 입력해 주세요.' : '저장하지 못했어요. 다시 시도해 주세요.'}
        </span>
      )}
    </span>
  );
};

const styles = {
  wrap: css`
    label: PropertyPriceInput-wrap;
    display: grid;
    gap: 0.3rem;
  `,

  line: css`
    label: PropertyPriceInput-line;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
  `,

  /* 읽을 때와 같은 글자 크기로 줄 안에 놓는다. 테두리 없이 입력 중에만 옅은 회색 바탕을 깐다. */
  input: css`
    label: PropertyPriceInput-input;
    box-sizing: border-box;
    width: 4.2rem;
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

  unit: css`
    label: PropertyPriceInput-unit;
    color: var(--color-muted, #868b94);
  `,

  error: css`
    label: PropertyPriceInput-error;
    color: var(--color-error, #e53e3e);
    font-size: 0.75rem;
  `,
};

export default PropertyPriceInput;
