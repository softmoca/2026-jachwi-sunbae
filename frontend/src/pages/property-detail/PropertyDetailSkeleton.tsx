import { css } from '@emotion/css';

import Skeleton from '@/shared/ui/skeleton/Skeleton';

/**
 * 매물 상세 화면의 뼈대. 뒤로 가기와 매물 이름 줄, 정보와 체크리스트 탭, 화면 끝까지 닿는 대표 사진,
 * 이름과 가격 줄, 정보 묶음 카드 자리와 크기를 따른다.
 */
const PropertyDetailSkeleton = () => (
  <main className={`property-page ${styles.page}`}>
    <div className={styles.header}>
      <Skeleton shape="circle" width="2.5rem" height="2.5rem" />
      <Skeleton width="40%" height="1.4rem" />
    </div>
    <div className={styles.tabs}>
      <Skeleton width="2.5rem" height="1rem" />
      <Skeleton width="4.5rem" height="1rem" />
    </div>
    <Skeleton shape="bleed" height="13.875rem" className={styles.hero} />
    <div className={styles.title}>
      <Skeleton width="50%" height="1.4rem" />
      <Skeleton width="35%" height="1rem" />
    </div>
    <Skeleton shape="card" height="12.5rem" />
    <Skeleton shape="card" height="20rem" className={styles.section} />
    <Skeleton shape="card" height="7.8rem" className={styles.section} />
  </main>
);

const styles = {
  page: css`
    label: PropertyDetailSkeleton-page;
  `,

  header: css`
    label: PropertyDetailSkeleton-header;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 3.5rem;
  `,

  /* 탭 두 칸의 가운데에 탭 이름 자리를 둔다. */
  tabs: css`
    label: PropertyDetailSkeleton-tabs;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    place-items: center;
    height: 3rem;
  `,

  /* 대표 사진은 화면 양 끝까지 닿는다. */
  hero: css`
    label: PropertyDetailSkeleton-hero;
    width: auto !important;
    margin-inline: calc(-1 * var(--page-inline-padding));
  `,

  title: css`
    label: PropertyDetailSkeleton-title;
    display: grid;
    gap: 0.5rem;
    padding: 1.1rem 0 1rem;
  `,

  section: css`
    label: PropertyDetailSkeleton-section;
    margin-top: 0.5rem;
  `,
};

export default PropertyDetailSkeleton;
