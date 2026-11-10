import { css } from '@emotion/css';

import Icon from '@/shared/ui/icon/Icon';

type LocationMapControlsProps = {
  isLocating: boolean;
  onMoveToCurrentLocation: () => void;
};

const LocationMapControls = ({ isLocating, onMoveToCurrentLocation }: LocationMapControlsProps) => (
  <div className={styles.controls}>
    <button type="button" aria-label="내 현재 위치로 이동" disabled={isLocating} onClick={onMoveToCurrentLocation}>
      <Icon name="target" size={22} />
    </button>
  </div>
);

const styles = {
  controls: css`
    label: LocationMapControls-controls;
    position: absolute;
    right: 0.85rem;
    bottom: 4.2rem;
    z-index: 15;
    display: grid;

    & > button {
      display: grid;
      width: 2.75rem;
      height: 2.75rem;
      padding: 0;
      border: 1px solid rgb(221 220 212 / 88%);
      border-radius: 50%;
      background: rgb(255 255 255 / 96%);
      box-shadow: 0 0.35rem 1rem rgb(42 48 35 / 18%);
      color: #30342e;
      cursor: pointer;
      place-items: center;
    }

    & > button:disabled {
      cursor: wait;
      opacity: 0.62;
    }
  `,
};

export default LocationMapControls;
