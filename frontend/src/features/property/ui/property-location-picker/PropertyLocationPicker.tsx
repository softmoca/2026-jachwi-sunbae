import { css, cx } from '@emotion/css';

import type { MapAddress } from '@/features/map/model/Map';
import MapCanvas from '@/features/map/ui/map-canvas/MapCanvas';
import Icon from '@/shared/ui/icon/Icon';
import SearchField from '@/shared/ui/search-field/SearchField';

import type { AddressSearchStatus } from '../../hooks/useAddressSearch';
import type { PropertyLocationStatus } from '../../hooks/usePropertyLocation';

type PropertyLocationPickerProps = {
  location: {
    selected: MapAddress;
    status: PropertyLocationStatus;
    onCenterChange: (latitude: number, longitude: number) => void;
    onMoveToCurrentLocation: () => void;
  };
  search: {
    query: string;
    results: MapAddress[];
    status: AddressSearchStatus;
    onQueryChange: (value: string) => void;
    onSubmit: () => void;
    onClear: () => void;
    onSelect: (result: MapAddress) => void;
  };
};

const PropertyLocationPicker = ({ location, search }: PropertyLocationPickerProps) => (
  <section className={styles.section} aria-label="매물 위치 선택">
    <div className={styles.locationHeader}>
      <strong>위치를 선택해 주세요</strong>
      <button
        type="button"
        className={styles.currentLocationButton}
        aria-label="현재 위치로 이동"
        onClick={location.onMoveToCurrentLocation}
      >
        <Icon name="target" size={18} />
      </button>
    </div>
    <div className={styles.addressSearchArea}>
      <SearchField
        label="주소 검색"
        value={search.query}
        placeholder="도로명 또는 지번 주소를 입력해 주세요"
        onValueChange={search.onQueryChange}
        onSubmit={search.onSubmit}
        onClear={search.onClear}
        renderAsForm={false}
      />
      {search.status === 'loading' && <p className={styles.searchStatus}>주소를 찾는 중이에요.</p>}
      {search.status === 'error' && (
        <p className={styles.errorNotice} role="alert">
          주소를 찾지 못했어요. 다시 시도해 주세요.
        </p>
      )}
      {search.results.length > 0 && (
        <ul className={styles.searchResults} aria-label="주소 검색 결과">
          {search.results.map((result) => (
            <li key={`${result.latitude}-${result.longitude}`}>
              <button type="button" onClick={() => search.onSelect(result)}>
                {result.roadAddress ?? result.jibunAddress ?? result.address}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
    <div className={styles.mapPreview}>
      <MapCanvas
        center={location.selected}
        level={5}
        interactive
        showCenterPin
        onCenterChange={location.onCenterChange}
      />
    </div>
    <p className={styles.selectedAddress} aria-live="polite">
      {location.status === 'loading'
        ? '주소를 확인하는 중이에요.'
        : (location.selected.roadAddress ?? location.selected.jibunAddress ?? '주소를 확인하지 못했어요.')}
    </p>
    {location.status === 'error' && <p className={styles.errorNotice}>지도를 움직여 위치를 다시 선택해 주세요.</p>}
  </section>
);

const styles = {
  // 다른 요소의 선택자에서 `.PropertyLocationPicker-section`로 가리킨다.
  section: cx(
    css`
      label: PropertyLocationPicker-section;
      order: 1;
      margin: 0 -1.25rem;
      padding: 0.8rem 1.25rem 1rem;
      border-top: 1px solid var(--color-border, #eaebed);
      border-bottom: 1px solid var(--color-border, #eaebed);
      background: var(--color-surface, #fff);
    `,
    'PropertyLocationPicker-section',
  ),

  locationHeader: css`
    label: PropertyLocationPicker-locationHeader;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.65rem;

    & strong {
      color: var(--color-ink, #212124);
      font-size: 0.92rem;
    }

    & button {
      padding: 0.35rem 0.55rem;
      border: 1px solid var(--color-border, #eaebed);
      border-radius: 999px;
      background: transparent;
      color: var(--color-primary-dark, #536d2d);
      font: inherit;
      font-size: 0.72rem;
      font-weight: 700;
    }
  `,

  currentLocationButton: css`
    label: PropertyLocationPicker-currentLocationButton;
    display: inline-flex;
    width: 2.25rem;
    height: 2.25rem;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid var(--color-border, #eaebed);
    border-radius: 50%;
    background: var(--color-surface, #fff);
    color: var(--color-primary-dark, #536d2d);
    cursor: pointer;
  `,

  addressSearchArea: css`
    label: PropertyLocationPicker-addressSearchArea;
    position: relative;
    margin-bottom: 0.65rem;
  `,

  searchStatus: css`
    label: PropertyLocationPicker-searchStatus;
    margin: 0.35rem 0 0;
    color: var(--color-muted, #868b94);
    font-size: 0.75rem;
  `,

  searchResults: css`
    label: PropertyLocationPicker-searchResults;
    position: absolute;
    z-index: 2;
    top: calc(100% + 0.25rem);
    right: 0;
    left: 0;
    max-height: 10rem;
    margin: 0;
    padding: 0.25rem;
    overflow: auto;
    border: 1px solid var(--color-border, #eaebed);
    border-radius: var(--radius-sm, 0.65rem);
    background: var(--color-surface, #fff);
    box-shadow: 0 0.5rem 1.25rem rgb(0 0 0 / 10%);
    list-style: none;

    & button {
      width: 100%;
      padding: 0.65rem;
      border: 0;
      border-radius: 0.45rem;
      background: transparent;
      color: var(--color-ink, #212124);
      font: inherit;
      font-size: 0.78rem;
      text-align: left;
      cursor: pointer;
    }

    & button:hover,
    & button:focus-visible {
      background: var(--color-surface-muted, #f7f7f7);
    }
  `,

  mapPreview: css`
    label: PropertyLocationPicker-mapPreview;
    position: relative;
    width: calc(100% + 2.5rem);
    /* 높이를 고정하면 큰 화면에서 지도 아래 등록 버튼까지 빈칸이 남는다. 남는 화면 높이만큼 지도를 키운다. */
    height: clamp(14rem, calc(100svh - 24rem), 32rem);
    margin-left: -1.25rem;
    overflow: hidden;
    border-radius: 0;

    & > div {
      min-height: 0;
    }
  `,

  selectedAddress: css`
    label: PropertyLocationPicker-selectedAddress;
    margin: 0.65rem 0 0;
    color: var(--color-ink-soft, #5d6455);
    font-size: 0.82rem;
    font-weight: 650;
    line-height: 1.45;
  `,

  errorNotice: css`
    label: PropertyLocationPicker-errorNotice;
    margin: 0;
    color: var(--color-error, #e53e3e);
    font-size: 0.8rem;
    font-weight: 600;

    .PropertyLocationPicker-section & {
      margin-top: 0.35rem;
    }
  `,
};

export default PropertyLocationPicker;
