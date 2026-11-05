import { css } from '@emotion/css';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ALL_MAP_CATEGORIES, getMapCategoryLabel } from '@/features/map/lib/mapPresentation';
import type { MapCategory, NearbyPlace } from '@/features/map/model/Map';
import MapCategoryIcon from '@/features/map/ui/map-category-icon/MapCategoryIcon';
import { MY_PATH } from '@/shared/lib/navigation/appPaths';
import BottomSheet from '@/shared/ui/bottom-sheet/BottomSheet';

type MapNearbySheetProps = {
  eyebrow?: string;
  heading: string;
  counts: Record<Exclude<MapCategory, 'MEMO'>, number>;
  selectedCategories: MapCategory[];
  places: NearbyPlace[];
  /** 값이 바뀌면 시트를 제목만 보이게 내린다. 지도에서 시설을 골라 상세 카드를 띄울 때 카드를 가리지 않게 한다. */
  peekSignal?: unknown;
  onToggleCategory: (category: MapCategory) => void;
};

/**
 * 주변 분석 지도 아래 시트. 공용 시트라 손잡이로 제목만, 처음, 크게, 페이지 높이를 오간다.
 * 닫는 화면이 없어 끝까지 끌어 내리면 닫지 않고 제목만 보이게 내린다.
 */
const MapNearbySheet = ({
  eyebrow,
  heading,
  counts,
  selectedCategories,
  places,
  peekSignal,
  onToggleCategory,
}: MapNearbySheetProps) => {
  // 공용 시트는 숫자가 바뀔 때 내린다. 바깥 신호가 바뀌거나 끝까지 끌어 내렸을 때 하나씩 올린다.
  const [peekCount, setPeekCount] = useState(0);
  const [lastPeekSignal, setLastPeekSignal] = useState(peekSignal);
  if (lastPeekSignal !== peekSignal) {
    setLastPeekSignal(peekSignal);
    setPeekCount((value) => value + 1);
  }
  return (
    <BottomSheet
      title={heading}
      subtitle={eyebrow}
      showCloseButton={false}
      initialHeightPercent={34}
      peekSignal={peekCount}
      onClose={() => setPeekCount((value) => value + 1)}
    >
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

      <div className={styles.list}>
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
    </BottomSheet>
  );
};

const styles = {
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

  list: css`
    label: MapNearbySheet-list;
    margin-top: 0.62rem;

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
