import { css, cx } from '@emotion/css';
import { useEffect, useRef, useState } from 'react';

import useDelayedLoading from '@/shared/lib/hooks/useDelayedLoading';
import Icon from '@/shared/ui/icon/Icon';
import ProgressCircle from '@/shared/ui/progress-circle/ProgressCircle';

import { getPropertyErrorMessage } from '../../api/propertyErrorMessages';
import { usePropertyPhotos } from '../../api/useProperties';
import AuthenticatedPhoto from '../authenticated-photo/AuthenticatedPhoto';

type PropertyPhotoViewerProps = {
  propertyId: number;
  propertyName: string;
  initialIndex: number;
  onClose: () => void;
};

const PropertyPhotoViewer = ({ propertyId, propertyName, initialIndex, onClose }: PropertyPhotoViewerProps) => {
  const photos = usePropertyPhotos(propertyId);
  // 빠른 응답에는 로딩 문구 없이 바로 사진을 보여 주고, 오래 걸릴 때만 알린다.
  const isLoadingVisible = useDelayedLoading(photos.isPending);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeWithEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeWithEscape);
    };
  }, [onClose]);

  const photoList = photos.data?.photos ?? [];
  const safeIndex = Math.min(currentIndex, Math.max(photoList.length - 1, 0));
  const currentPhoto = photoList[safeIndex];

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`${propertyName} 사진 크게 보기`}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className={styles.viewer}>
        <header className={styles.header}>
          <strong>{propertyName}</strong>
          {photoList.length > 0 && (
            <span aria-live="polite">
              {safeIndex + 1} / {photoList.length}
            </span>
          )}
          <button ref={closeButtonRef} type="button" aria-label="사진 크게 보기 닫기" onClick={onClose}>
            <Icon name="close" size={24} />
          </button>
        </header>

        <div className={styles.photoArea}>
          {photos.isPending || isLoadingVisible ? (
            isLoadingVisible && (
              <div className={styles.state}>
                <ProgressCircle size={24} label="사진을 불러오는 중이에요." />
              </div>
            )
          ) : photos.isError ? (
            <div className={styles.state} role="alert">
              <span>{getPropertyErrorMessage(photos.error)}</span>
              <button type="button" onClick={() => void photos.refetch()}>
                다시 시도
              </button>
            </div>
          ) : currentPhoto === undefined ? (
            <div className={styles.state}>표시할 사진이 없어요.</div>
          ) : (
            <AuthenticatedPhoto
              propertyId={propertyId}
              photoId={currentPhoto.photoId}
              contentUrl={currentPhoto.contentUrl}
              alt={`${propertyName} 사진 ${safeIndex + 1}`}
              className={styles.photo}
            />
          )}
        </div>

        {photoList.length > 1 && (
          <div className={styles.controls}>
            <button
              type="button"
              aria-label="이전 사진"
              disabled={safeIndex === 0}
              onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
            >
              <Icon name="arrow-left" size={24} />
            </button>
            <button
              type="button"
              aria-label="다음 사진"
              disabled={safeIndex === photoList.length - 1}
              onClick={() => setCurrentIndex((index) => Math.min(index + 1, photoList.length - 1))}
            >
              <Icon name="arrow-right" size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  backdrop: css`
    label: PropertyPhotoViewer-backdrop;
    position: fixed;
    z-index: 100;
    inset: 0;
    display: grid;
    box-sizing: border-box;
    overflow: hidden;
    padding: max(env(safe-area-inset-top), 0.5rem) 0 max(env(safe-area-inset-bottom), 0.5rem);
    background: rgb(14 17 15 / 94%);
    place-items: start center;
  `,

  viewer: css`
    label: PropertyPhotoViewer-viewer;
    display: grid;
    width: min(100%, var(--app-max-width));
    max-height: 100%;
    overflow: hidden;
    grid-template-rows: auto minmax(0, 1fr) auto;
    color: var(--color-on-primary);
  `,

  // 다른 요소의 선택자에서 `.PropertyPhotoViewer-header`로 가리킨다.
  header: cx(
    css`
      label: PropertyPhotoViewer-header;
      display: grid;
      min-height: var(--app-bar-height);
      grid-template-columns: minmax(0, 1fr) auto 2.75rem;
      align-items: center;
      gap: 0.75rem;
      padding: 0 0.75rem 0 1rem;

      & strong {
        overflow: hidden;
        font-size: 0.9rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      & span {
        color: rgb(255 255 255 / 70%);
        font-size: 0.75rem;
        font-weight: 750;
      }

      & button {
        display: grid;
        border: 0;
        border-radius: 999px;
        background: rgb(255 255 255 / 12%);
        color: inherit;
        cursor: pointer;
        place-items: center;
      }

      & button {
        width: 2.75rem;
        height: 2.75rem;
      }
    `,
    'PropertyPhotoViewer-header',
  ),

  // 다른 요소의 선택자에서 `.PropertyPhotoViewer-controls`로 가리킨다.
  controls: cx(
    css`
      label: PropertyPhotoViewer-controls;

      & button {
        display: grid;
        border: 0;
        border-radius: 999px;
        background: rgb(255 255 255 / 12%);
        color: inherit;
        cursor: pointer;
        place-items: center;
      }

      & {
        display: flex;
        justify-content: center;
        gap: 1rem;
        padding: 0.75rem 1rem 1rem;
      }

      & button {
        width: 3rem;
        height: 3rem;
      }

      & button:disabled {
        opacity: 0.25;
        cursor: default;
      }
    `,
    'PropertyPhotoViewer-controls',
  ),

  photoArea: css`
    label: PropertyPhotoViewer-photoArea;
    display: grid;
    min-height: 0;
    padding: 0.75rem 0;
    place-items: center;
  `,

  photo: css`
    label: PropertyPhotoViewer-photo;
    width: 100%;
    max-height: 100%;
    object-fit: contain;
  `,

  state: css`
    label: PropertyPhotoViewer-state;
    display: grid;
    justify-items: center;
    gap: 0.75rem;
    color: rgb(255 255 255 / 78%);
    font-size: 0.8rem;

    & button {
      padding: 0.55rem 0.8rem;
      border: 1px solid rgb(255 255 255 / 32%);
      border-radius: 999px;
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }

    :is(.PropertyPhotoViewer-header button, .PropertyPhotoViewer-controls button, & button):focus-visible {
      outline: 2px solid var(--color-brand-300);
      outline-offset: 2px;
    }
  `,
};

export default PropertyPhotoViewer;
