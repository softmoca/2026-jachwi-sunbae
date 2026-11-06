import { css } from '@emotion/css';
import { useState } from 'react';

import useDelayedLoading from '@/shared/lib/hooks/useDelayedLoading';
import ProgressCircle from '@/shared/ui/progress-circle/ProgressCircle';

import { getPropertyErrorMessage } from '../../api/propertyErrorMessages';
import { usePropertyPhotos } from '../../api/useProperties';
import PhotoUploadPanel from './PhotoUploadPanel';
import PropertyPhotoCard from './PropertyPhotoCard';

type PropertyPhotoManagerProps = {
  propertyId: number;
  showHeading?: boolean;
};

const PropertyPhotoManager = ({ propertyId, showHeading = false }: PropertyPhotoManagerProps) => {
  const [visibleCount, setVisibleCount] = useState(6);
  const photos = usePropertyPhotos(propertyId);
  // 빠른 응답에는 로딩 표시 없이 바로 사진을 보여 주고, 오래 걸릴 때만 그 자리에 Progress Circle을 둔다.
  const isLoadingVisible = useDelayedLoading(photos.isPending);

  if (photos.isPending || isLoadingVisible) {
    return isLoadingVisible ? (
      <div className={styles.state}>
        <ProgressCircle size={24} label="사진 정보를 불러오는 중이에요." />
      </div>
    ) : null;
  }

  if (photos.isError) {
    return (
      <div className={styles.state} role="alert">
        <span>{getPropertyErrorMessage(photos.error)}</span>
        <button type="button" onClick={() => void photos.refetch()}>
          다시 시도
        </button>
      </div>
    );
  }

  const visiblePhotos = photos.data.photos.slice(0, visibleCount);

  return (
    <section id="property-photo-management" className={styles.root} aria-labelledby="photo-gallery-heading">
      <div className={`${styles.heading} ${showHeading ? '' : 'sr-only'}`}>
        <h2 id="photo-gallery-heading" tabIndex={-1}>
          사진 관리
        </h2>
      </div>
      <div className={styles.grid}>
        <PhotoUploadPanel propertyId={propertyId} currentPhotoCount={photos.data.totalCount} />
        {photos.data.photos.length === 0 ? (
          <div className={styles.empty}>
            <strong>등록한 사진이 없어요.</strong>
            <span>왼쪽 위 추가 버튼으로 사진을 등록해 보세요.</span>
          </div>
        ) : (
          <ul className={styles.photoList}>
            {visiblePhotos.map((photo, index) => (
              <PropertyPhotoCard key={photo.photoId} propertyId={propertyId} photo={photo} position={index + 1} />
            ))}
          </ul>
        )}
      </div>
      {visibleCount < photos.data.photos.length && (
        <button
          className={styles.loadMore}
          type="button"
          onClick={() => setVisibleCount((current) => Math.min(current + 6, photos.data.photos.length))}
        >
          다음 사진 보기
        </button>
      )}
    </section>
  );
};

const styles = {
  root: css`
    label: PropertyPhotoManager-root;
    scroll-margin-top: 1rem;
  `,

  heading: css`
    label: PropertyPhotoManager-heading;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.65rem;

    & h2 {
      margin: 0;
      color: var(--color-ink);
      font-size: 0.9rem;
    }
  `,

  grid: css`
    label: PropertyPhotoManager-grid;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.45rem;

    & .photo-grid__item {
      aspect-ratio: 1;
    }

    & .photo-grid__item .authenticated-photo,
    & .photo-grid__item > .authenticated-photo__image {
      width: 100%;
      height: 100%;
      aspect-ratio: 1;
      border-radius: var(--radius-sm);
    }

    & .photo-delete-button {
      display: grid;
      min-width: 2rem;
      min-height: 2rem;
      animation: none;
      font-size: 0;
      place-items: center;
    }

    & .photo-delete-button::before,
    & .photo-delete-button::after {
      position: absolute;
      width: 0.75rem;
      height: 1px;
      background: currentColor;
      content: '';
    }

    & .photo-delete-button::before {
      transform: rotate(45deg);
    }

    & .photo-delete-button::after {
      transform: rotate(-45deg);
    }
  `,

  photoList: css`
    label: PropertyPhotoManager-photoList;
    display: contents;
    margin: 0;
    padding: 0;
    list-style: none;
  `,

  empty: css`
    label: PropertyPhotoManager-empty;
    display: grid;
    grid-column: span 3;
    align-content: center;
    gap: 0.25rem;
    min-height: 4.5rem;
    padding: 0.75rem;
    border: 0;
    color: var(--color-muted);
    font-size: 0.7rem;

    & strong {
      color: var(--color-ink);
      font-size: 0.78rem;
    }
  `,

  loadMore: css`
    label: PropertyPhotoManager-loadMore;
    width: 100%;
    min-height: 2.75rem;
    margin-top: 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-ink);
    font-weight: 750;
  `,

  state: css`
    label: PropertyPhotoManager-state;
    display: flex;
    min-height: 5rem;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--color-muted);
    font-size: 0.75rem;

    & button {
      border: 0;
      background: transparent;
      color: var(--color-primary-dark);
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
  `,
};

export default PropertyPhotoManager;
