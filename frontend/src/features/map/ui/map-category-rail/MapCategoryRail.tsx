import type { ReactNode } from 'react';

import { MAP_CATEGORY_OPTIONS } from '../../lib/mapPresentation';
import type { MapCategory } from '../../model/Map';
import MapCategoryIcon from '../map-category-icon/MapCategoryIcon';

import styles from './MapCategoryRail.module.css';

type MapCategoryRailProps = {
  selectedCategories: MapCategory[];
  counts?: Partial<Record<MapCategory, number>>;
  onToggle: (category: MapCategory) => void;
  className?: string;
  extraCategory?: { label: string; icon: ReactNode; isSelected: boolean; onToggle: () => void };
};

const MapCategoryRail = ({ selectedCategories, counts, onToggle, className, extraCategory }: MapCategoryRailProps) => (
  <aside className={`${styles.rail} ${className ?? ''}`} aria-label="지도 시설 카테고리">
    {extraCategory !== undefined && (
      <button
        type="button"
        className={styles.categoryButton}
        aria-label={extraCategory.label}
        aria-pressed={extraCategory.isSelected}
        onClick={extraCategory.onToggle}
      >
        {extraCategory.icon}
        <span>{extraCategory.label}</span>
      </button>
    )}
    {MAP_CATEGORY_OPTIONS.map((option) => {
      const selected = selectedCategories.includes(option.value);
      const count = counts?.[option.value];
      return (
        <button
          key={option.value}
          type="button"
          className={styles.categoryButton}
          data-category={option.value}
          aria-pressed={selected}
          aria-label={`${option.label} ${selected ? '숨기기' : '표시하기'}${count === undefined ? '' : `, ${count}개`}`}
          onClick={() => onToggle(option.value)}
        >
          <MapCategoryIcon category={option.value} className={styles.icon} />
          <span>{option.shortLabel}</span>
        </button>
      );
    })}
  </aside>
);

export default MapCategoryRail;
