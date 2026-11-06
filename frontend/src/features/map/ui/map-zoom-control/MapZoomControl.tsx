import { css } from '@emotion/css';

import Icon from '@/shared/ui/icon/Icon';

/** 지도 확대 단계의 범위. 숫자가 작을수록 가까이 본다. Naver 지도 엔진이 쓰는 범위와 같다. */
export const MIN_MAP_LEVEL = 1;
export const MAX_MAP_LEVEL = 14;

type Props = {
  level: number;
  onChange: (level: number) => void;
  className?: string;
};

/** 두 손가락이나 휠 없이도 지도를 한 단계씩 확대·축소하는 버튼. 놓을 자리는 화면이 className으로 정한다. */
const MapZoomControl = ({ level, onChange, className }: Props) => (
  <div className={`${styles.control} ${className ?? ''}`.trim()} role="group" aria-label="지도 확대·축소">
    <button
      className={styles.button}
      type="button"
      aria-label="지도 확대"
      disabled={level <= MIN_MAP_LEVEL}
      onClick={() => onChange(Math.max(MIN_MAP_LEVEL, level - 1))}
    >
      <Icon name="plus" size={20} />
    </button>
    <span className={styles.divider} aria-hidden="true" />
    <button
      className={styles.button}
      type="button"
      aria-label="지도 축소"
      disabled={level >= MAX_MAP_LEVEL}
      onClick={() => onChange(Math.min(MAX_MAP_LEVEL, level + 1))}
    >
      <Icon name="minus" size={20} />
    </button>
  </div>
);

const styles = {
  /* 현재 위치 버튼과 같은 흰 바탕, 그림자로, 세로 두 칸을 한 덩어리로 묶는다. 지도 레일, 현재 위치 버튼과 같은 폭이다. */
  control: css`
    label: MapZoomControl-control;
    position: absolute;
    z-index: 12;
    display: grid;
    grid-auto-flow: row;
    justify-items: center;
    overflow: hidden;
    border-radius: 1.325rem;
    background: #fff;
    box-shadow: 0 2px 10px #00000016;
  `,

  button: css`
    label: MapZoomControl-button;
    display: grid;
    width: 2.65rem;
    height: 2.65rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: #41444b;
    cursor: pointer;
    place-items: center;

    &:disabled {
      color: #c4c7cc;
      cursor: default;
    }

    &:focus-visible {
      outline: 2px solid #25282d;
      outline-offset: -3px;
    }
  `,

  divider: css`
    label: MapZoomControl-divider;
    width: 1.4rem;
    height: 1px;
    background: #e6e7ea;
  `,
};

export default MapZoomControl;
