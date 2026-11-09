import { css } from '@emotion/css';

import { UNSUPPORTED_ADDRESS_MESSAGE } from '@/features/map/lib/mapAddress';
import type { MapAddress } from '@/features/map/model/Map';
import { Button } from '@/shared/ui/button/Button';

import type { LocationSelectionStatus } from '../../hooks/useLocationSelection';

type LocationAddressSheetProps = {
  selected: MapAddress;
  status: LocationSelectionStatus;
  /** 매물에 바로 저장하는 중인지. */
  isSaving?: boolean;
  /** 저장에 실패했는지. */
  saveFailed?: boolean;
  onConfirm: () => void;
};

/**
 * 지도에서 고른 자리의 주소를 보여 주고 적용하는 아래 카드. 도로명 주소를 크게, 지번 주소를 작게 두고,
 * 지도를 눌러 자리를 바꿀 때마다 주소가 따라 바뀐다. 글자 크기와 버튼은 앱의 공통 스타일을 쓴다.
 */
const LocationAddressSheet = ({
  selected,
  status,
  isSaving = false,
  saveFailed = false,
  onConfirm,
}: LocationAddressSheetProps) => {
  const selectedAddress = selected.roadAddress ?? selected.jibunAddress ?? selected.address;
  const isResolving = status === 'locating' || status === 'geocoding';
  // 주소를 찾지 못했거나 조회가 실패한 자리도 좌표만으로 적용할 수 있다.
  const hasNoAddress = !isResolving && selectedAddress === null;

  return (
    <section className={styles.sheet} aria-live="polite">
      <strong className={hasNoAddress ? styles.missingAddress : undefined}>
        {isResolving && selectedAddress === null
          ? '주소를 확인하는 중이에요'
          : (selectedAddress ?? UNSUPPORTED_ADDRESS_MESSAGE)}
      </strong>
      <p>
        {selected.roadAddress !== null && selected.jibunAddress !== null
          ? selected.jibunAddress
          : '지도를 눌러 자리를 바꿀 수 있어요.'}
      </p>
      {saveFailed && (
        <p className={styles.error} role="alert">
          저장하지 못했어요. 다시 시도해 주세요.
        </p>
      )}
      <Button
        fullWidth
        disabled={isResolving}
        isLoading={isSaving}
        loadingLabel="저장 중…"
        className={styles.confirm}
        onClick={onConfirm}
      >
        이 위치로 저장
      </Button>
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
    gap: 0.4rem;
    padding: 1.1rem 1rem calc(1rem + env(safe-area-inset-bottom));
    border-radius: 1.25rem 1.25rem 0 0;
    background: var(--color-surface);
    box-shadow: 0 -1px 8px rgb(0 0 0 / 8%);

    & > strong {
      overflow: hidden;
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.4;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    & > p {
      margin: 0;
      overflow: hidden;
      color: var(--color-muted);
      font-size: 0.82rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,

  missingAddress: css`
    label: LocationAddressSheet-missingAddress;
    color: var(--color-muted);
  `,

  error: css`
    label: LocationAddressSheet-error;

    &&& {
      color: var(--color-danger);
    }
  `,

  confirm: css`
    label: LocationAddressSheet-confirm;
    margin-top: 0.4rem;
  `,
};

export default LocationAddressSheet;
