import { css } from '@emotion/css';
import { Link } from 'react-router-dom';

import { ALL_MAP_CATEGORIES, getMapCategoryLabel } from '@/features/map/lib/mapPresentation';
import type { MapCategory, NearbyPlace } from '@/features/map/model/Map';
import MapCategoryIcon from '@/features/map/ui/map-category-icon/MapCategoryIcon';
import { MY_PATH } from '@/shared/lib/navigation/appPaths';
import Icon from '@/shared/ui/icon/Icon';

type MapNearbySheetProps = {
  eyebrow?: string;
  heading: string;
  counts: Record<Exclude<MapCategory, 'MEMO'>, number>;
  selectedCategories: MapCategory[];
  places: NearbyPlace[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleCategory: (category: MapCategory) => void;
};

const MapNearbySheet = ({
  eyebrow,
  heading,
  counts,
  selectedCategories,
  places,
  expanded,
  onToggleExpanded,
  onToggleCategory,
}: MapNearbySheetProps) => (
  <section className={styles.sheet} data-expanded={expanded || undefined} aria-label={heading}>
    <span className={styles.dragHandle} aria-hidden="true" />
    <div className={styles.header}>
      <div>
        {eyebrow !== undefined && <span>{eyebrow}</span>}
        <h1>{heading}</h1>
      </div>
      <button type="button" aria-expanded={expanded} aria-controls="nearby-place-list" onClick={onToggleExpanded}>
        {expanded ? '목록 접기' : '시설 목록 보기'}
        <Icon name={expanded ? 'chevron-down' : 'chevron-up'} size={17} />
      </button>
    </div>

    <ul className={styles.summary} aria-label="주변 시설 집계와 필터">
      {ALL_MAP_CATEGORIES.map((category) => {
        const selected = selectedCategories.includes(category);
        const label = getMapCategoryLabel(category);
        return (
          <li key={category} data-category={category}>
            <button
              type="button"
              aria-pressed={selected}
              aria-label={`${label} ${counts[category]}개 ${selected ? '숨기기' : '표시하기'}`}
              onClick={() => onToggleCategory(category)}
            >
              <MapCategoryIcon category={category} />
              {label} {counts[category]}개
            </button>
          </li>
        );
      })}
    </ul>

    {expanded && (
      <div
        className={styles.scrollArea}
        id="nearby-place-list"
        role="region"
        aria-label="스크롤 가능한 주변 시설 목록"
        tabIndex={0}
      >
        {selectedCategories.length === 0 ? (
          <p>위에서 확인할 시설을 선택해 주세요.</p>
        ) : places.length === 0 ? (
          <p>이 반경에는 선택한 시설이 없어요.</p>
        ) : (
          <ul aria-label="주변 시설 목록">
            {places.map((place) => (
              <li key={place.providerPlaceId}>
                <span data-category={place.category}>
                  <MapCategoryIcon category={place.category} />
                  <span className="sr-only">{getMapCategoryLabel(place.category)}</span>
                </span>
                <strong>{place.name}</strong>
                <small>
                  {place.distanceMeters}m · {place.address}
                </small>
              </li>
            ))}
          </ul>
        )}
        <Link to={MY_PATH}>지도 데이터 모드와 이용 안내</Link>
      </div>
    )}
  </section>
);

const styles = {
  sheet: css`
    label: MapNearbySheet-sheet;
    position: absolute;
    z-index: 18;
    right: 0;
    bottom: 0;
    left: 0;
    display: grid;
    grid-template-rows: auto auto auto;
    gap: 0.62rem;
    max-height: 53%;
    padding: 0.5rem 1rem calc(0.85rem + env(safe-area-inset-bottom));
    overflow: hidden;
    border-radius: 1.2rem 1.2rem 0 0;
    background: rgb(255 255 255 / 97%);
    box-shadow: 0 -0.5rem 1.5rem rgb(44 50 39 / 14%);
    backdrop-filter: blur(10px);
    transition: height 180ms ease-out;

    &[data-expanded='true'] {
      grid-template-rows: auto auto auto minmax(0, 1fr);
      width: 100%;
      height: min(74%, 38rem);
      max-height: calc(100% - 0.75rem);
    }

    @media (max-width: 340px) {
      padding-inline: 0.8rem;
    }
  `,

  dragHandle: css`
    label: MapNearbySheet-dragHandle;
    display: block;
    width: 2.5rem;
    height: 0.22rem;
    margin: 0 auto;
    border-radius: 999px;
    background: #d4d5d0;
  `,

  header: css`
    label: MapNearbySheet-header;
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 0.75rem;

    & span {
      display: block;
      max-width: 12rem;
      overflow: hidden;
      color: var(--color-primary-dark);
      font-size: 0.58rem;
      font-weight: 850;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    & h1 {
      margin: 0;
      font-size: 1rem;
      line-height: 1.3;
    }

    & span + h1 {
      margin-top: 0.15rem;
    }

    & > button {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 0.2rem;
      padding: 0.35rem 0;
      border: 0;
      background: transparent;
      color: var(--color-primary-dark);
      font-size: 0.62rem;
      font-weight: 850;
      cursor: pointer;
    }
  `,

  summary: css`
    label: MapNearbySheet-summary;
    display: flex;
    gap: 0.4rem;
    margin: 0;
    padding: 0 0 0.1rem;
    overflow-x: auto;
    list-style: none;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    & li {
      flex: 0 0 auto;
    }

    & button {
      display: inline-flex;
      min-height: 2.2rem;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.7rem;
      border: 1px solid transparent;
      border-radius: 999px;
      background: #f7f7f6;
      color: #6a6f67;
      font-size: 0.65rem;
      font-weight: 800;
      cursor: pointer;
    }

    & button[aria-pressed='true'] {
      border-color: #c9d8ee;
      background: #edf4ff;
      color: #2878ef;
    }

    & button > img {
      font-size: 1.1rem;
    }
  `,

  scrollArea: css`
    label: MapNearbySheet-scrollArea;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    touch-action: pan-y;
    -webkit-overflow-scrolling: touch;

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: -2px;
    }

    & > p {
      margin: 0.5rem 0;
      color: var(--color-muted);
      font-size: 0.68rem;
      text-align: center;
    }

    & > ul {
      display: grid;
      gap: 0.45rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    & li {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.08rem 0.5rem;
      padding: 0.55rem 0;
      border-top: 1px solid var(--color-border);
      font-size: 0.68rem;
    }

    & li > span {
      grid-row: 1 / span 2;
      align-self: center;
      font-size: 1.9rem;
    }

    & strong,
    & small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    & small {
      color: var(--color-muted);
      font-size: 0.58rem;
    }

    & > a {
      display: block;
      margin: 0.6rem 0 0.2rem;
      color: var(--color-muted);
      font-size: 0.58rem;
      text-align: center;
    }
  `,
};

export default MapNearbySheet;
