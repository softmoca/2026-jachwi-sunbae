import { css } from '@emotion/css';

import type { MapAddress } from '@/features/map/model/Map';

import type { LocationSelectionStatus } from '../../hooks/useLocationSelection';

type LocationAddressSheetProps = {
  selected: MapAddress;
  status: LocationSelectionStatus;
  onOpenSearch: () => void;
  onConfirm: () => void;
};

const LocationAddressSheet = ({ selected, status, onOpenSearch, onConfirm }: LocationAddressSheetProps) => {
  const selectedAddress = selected.roadAddress ?? selected.jibunAddress;

  return (
    <section className={styles.sheet} aria-live="polite">
      <strong>
        {selectedAddress ?? (status === 'error' ? '주소를 확인하지 못했어요' : '주소를 확인하는 중이에요')}
      </strong>
      <p>
        {selected.roadAddress !== null && selected.jibunAddress !== null
          ? selected.jibunAddress
          : '지도를 움직이거나 위치를 눌러 주세요.'}
      </p>
      {status === 'error' ? (
        <button className={styles.addressNotice} type="button" onClick={onOpenSearch}>
          주소로 다시 찾아볼까요?
        </button>
      ) : (
        <p className={styles.addressHint}>표시된 주소가 맞는지 확인해 주세요.</p>
      )}
      <button
        className={styles.confirmButton}
        type="button"
        disabled={status !== 'ready' || selectedAddress === null}
        onClick={onConfirm}
      >
        이 위치 적용하기
      </button>
    </section>
  );
};

const styles = {
  sheet: css`
    label: LocationAddressSheet-sheet;
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 18;
    display: grid;
    gap: 0.62rem;
    padding: 1.15rem 1rem calc(1rem + env(safe-area-inset-bottom));
    border-radius: 1.2rem 1.2rem 0 0;
    background: rgb(255 255 255 / 97%);
    box-shadow: 0 -0.5rem 1.5rem rgb(44 50 39 / 14%);
    backdrop-filter: blur(10px);

    & > strong,
    & > p {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    & > strong {
      font-size: 1.05rem;
      line-height: 1.35;
    }

    & > p {
      margin: 0;
      color: var(--color-muted);
      font-size: 0.7rem;
    }
  `,

  addressNotice: css`
    label: LocationAddressSheet-addressNotice;
    min-height: 2.75rem;
    margin: 0;
    padding: 0.7rem;
    border: 0;
    border-radius: 0.75rem;
    background: #fff0ee;
    color: #ee625d !important;
    font-size: 0.66rem !important;
    font-weight: 800;
    text-align: center;
    cursor: pointer;
  `,

  addressHint: css`
    label: LocationAddressSheet-addressHint;
    margin: 0;
    padding: 0.35rem 0 0;
    color: var(--color-muted, #868b94);
    font-size: 0.7rem;
    font-weight: 700;
    text-align: center;
  `,

  confirmButton: css`
    label: LocationAddressSheet-confirmButton;
    min-height: 3.25rem;
    padding: 0.8rem 1rem;
    border: 0;
    border-radius: 0.85rem;
    background: #111;
    color: white;
    font-size: 0.78rem;
    font-weight: 850;
    cursor: pointer;

    &:disabled {
      background: #d8d8d5;
      cursor: not-allowed;
    }
  `,
};

export default LocationAddressSheet;
