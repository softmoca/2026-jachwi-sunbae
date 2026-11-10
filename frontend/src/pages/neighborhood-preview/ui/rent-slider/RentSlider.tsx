import { css } from '@emotion/css';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import Slider from '@/shared/ui/slider/Slider';

import type { NeighborhoodPreviewContext } from '../../hooks/useNeighborhoodPreview';
import { RENT_OPTIONS } from '../../NeighborhoodFilters';

type Props = {
  preview: Pick<NeighborhoodPreviewContext, 'maxRent' | 'changeMaxRent'>;
  className?: string;
  /** 휴대폰 위쪽 조건 줄처럼 좁은 자리에 둘 때 설명 줄을 뺀다. */
  compact?: boolean;
  /** 막대만 그린다. 제목과 값은 두지 않고, 끄는 동안에만 손잡이 위에 현재 값을 띄운다. 값은 다른 곳(헤더)에도 보인다. */
  bare?: boolean;
  /** `bare`일 때 손가락이나 마우스로 잡고 있는 동안 true, 놓으면 false. 잡고 있는 동안 슬라이더를 접지 않게 할 때 쓴다. */
  onHoldChange?: (isHeld: boolean) => void;
};

/**
 * 동네의 월세 시세 상한을 고르는 슬라이더. 데스크탑 지도 아래 카드와 휴대폰 위쪽 조건 줄이 함께 쓴다. 선택지가 여러 개라 버튼 대신 끌어서 고르고 화살표 키로도 움직인다.
 * 받은 시세를 화면에서 거르는 조건이라 다시 찾지 않고, 끄는 동안 지도 색과 순위가 바로 바뀐다.
 */
const RentSlider = ({ preview, className, compact = false, bare = false, onHoldChange }: Props) => {
  const [isDragging, setIsDragging] = useState(false);
  useEffect(() => {
    if (!isDragging) return;
    const stop = () => {
      setIsDragging(false);
      onHoldChange?.(false);
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    // onHoldChange는 렌더마다 새로 만들어질 수 있어 잡는 동안만 다시 맺는다.
  }, [isDragging]);
  const rentIndex = Math.max(
    0,
    RENT_OPTIONS.findIndex((option) => option.value === preview.maxRent),
  );
  const rentOption = RENT_OPTIONS[rentIndex] ?? RENT_OPTIONS[0];
  return (
    <div
      style={{ '--fill': `${(rentIndex / (RENT_OPTIONS.length - 1 || 1)) * 100}%` } as CSSProperties}
      className={[styles.blue, bare ? styles.bare : '', className].filter(Boolean).join(' ')}
      onPointerDown={
        bare
          ? () => {
              setIsDragging(true);
              onHoldChange?.(true);
            }
          : undefined
      }
    >
      {bare && isDragging && (
        <output
          className={styles.bubble}
          style={{ left: `${(rentIndex / (RENT_OPTIONS.length - 1 || 1)) * 100}%` }}
          aria-hidden="true"
        >
          {rentOption.label}
        </output>
      )}
      <Slider
        label={bare ? undefined : '월세 시세'}
        indicator={bare ? undefined : rentOption.label}
        description={compact || bare ? undefined : '최근 6개월 실거래 월세 중앙값으로 걸러요.'}
        min={0}
        max={RENT_OPTIONS.length - 1}
        values={[rentIndex]}
        onValuesChange={([index]) => preview.changeMaxRent(RENT_OPTIONS[index ?? 0]?.value ?? 0)}
        getAriaLabel={() => '최대 월세 시세'}
        getAriaValuetext={() => rentOption.label}
      />
    </div>
  );
};

const styles = {
  /* 막대 뒤(채워지지 않은 쪽)는 옅은 회색, 채워진 쪽과 손잡이는 우리 파랑으로 칠한다. --fill은 손잡이 위치(%)다. */
  blue: css`
    label: RentSlider-blue;

    & input {
      accent-color: var(--color-brand-blue);
      height: 1.4rem;
      appearance: none;
      background: transparent;
    }

    & input::-webkit-slider-runnable-track {
      height: 0.3rem;
      border-radius: 999px;
      background: linear-gradient(to right, var(--color-brand-blue) var(--fill, 0%), #e3e5e9 var(--fill, 0%));
    }

    & input::-moz-range-track {
      height: 0.3rem;
      border-radius: 999px;
      background: #e3e5e9;
    }

    & input::-moz-range-progress {
      height: 0.3rem;
      border-radius: 999px;
      background: var(--color-brand-blue);
    }

    & input::-webkit-slider-thumb {
      width: 1.15rem;
      height: 1.15rem;
      margin-top: -0.425rem;
      border: 2px solid #fff;
      border-radius: 50%;
      appearance: none;
      background: var(--color-brand-blue);
      box-shadow: 0 1px 4px rgb(0 0 0 / 20%);
    }

    & input::-moz-range-thumb {
      width: 1.15rem;
      height: 1.15rem;
      border: 2px solid #fff;
      border-radius: 50%;
      background: var(--color-brand-blue);
      box-shadow: 0 1px 4px rgb(0 0 0 / 20%);
    }
  `,

  bare: css`
    label: RentSlider-bare;
    position: relative;
  `,

  /* 끄는 동안 손잡이 위에 현재 값을 띄운다. 손가락에 가리지 않게 막대 위쪽에 둔다. */
  bubble: css`
    label: RentSlider-bubble;
    position: absolute;
    bottom: calc(100% + 0.2rem);
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    background: var(--color-ink);
    color: #fff;
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
    transform: translateX(-50%);
    pointer-events: none;
  `,
};

export default RentSlider;
