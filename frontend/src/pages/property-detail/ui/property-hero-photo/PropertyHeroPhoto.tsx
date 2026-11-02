import { css } from '@emotion/css';
import { Link } from 'react-router-dom';

import { FROM_PROPERTY_DETAIL_STATE } from '@/features/property/lib/propertyNavigation';
import type { PropertyPhotoPreview } from '@/features/property/model/Property';
import AuthenticatedPhoto from '@/features/property/ui/authenticated-photo/AuthenticatedPhoto';
import { propertyPhotosPath, RECORDS_PATH } from '@/shared/lib/navigation/appPaths';
import Icon from '@/shared/ui/icon/Icon';

type PropertyHeroPhotoProps = {
  propertyId: number;
  propertyName: string;
  photos: PropertyPhotoPreview[];
  backTo: string;
  backState?: unknown;
  showBackButton?: boolean;
  onOpen: () => void;
  /** 주면 사진 추가를 눌러도 사진 화면으로 넘어가지 않고 이 함수를 부른다(데스크탑 옆 칸은 그 칸 안에서 사진을 관리한다). */
  onManagePhotos?: () => void;
};

const PropertyHeroPhoto = ({
  propertyId,
  propertyName,
  photos,
  backTo,
  backState,
  showBackButton = true,
  onOpen,
  onManagePhotos,
}: PropertyHeroPhotoProps) => (
  <section className={styles.section} aria-label="대표 사진">
    {photos.length > 0 ? (
      <button
        type="button"
        className={styles.button}
        aria-label={`${propertyName} 대표 사진 크게 보기`}
        onClick={onOpen}
      >
        <AuthenticatedPhoto
          propertyId={propertyId}
          photoId={photos[0].photoId}
          contentUrl={photos[0].contentUrl}
          alt={`${propertyName} 대표 사진`}
          className={styles.photo}
        />
      </button>
    ) : (
      <Link
        className={`${styles.button} ${styles.emptyButton}`}
        to={propertyPhotosPath(propertyId)}
        state={FROM_PROPERTY_DETAIL_STATE}
        onClick={(event) => {
          if (onManagePhotos === undefined) return;
          event.preventDefault();
          onManagePhotos();
        }}
      >
        <span className={styles.addLabel}>
          <Icon name="plus" size={16} />
          사진 추가
        </span>
      </Link>
    )}
    {showBackButton && (
      <Link
        className={styles.backButton}
        to={backTo}
        state={backState}
        aria-label={backTo === RECORDS_PATH ? '기록 화면으로 돌아가기' : '홈으로 돌아가기'}
      >
        <Icon name="chevron-left" size={24} />
      </Link>
    )}
  </section>
);

const styles = {
  section: css`
    label: PropertyHeroPhoto-section;
    position: relative;
    width: calc(100% + 2rem);
    margin-left: -1rem;
  `,

  button: css`
    label: PropertyHeroPhoto-button;
    display: block;
    width: 100%;
    height: calc(11rem + var(--app-bar-height));
    min-height: 0;
    max-height: calc(11rem + var(--app-bar-height));
    overflow: hidden;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: var(--color-surface-muted);
    color: inherit;
    cursor: pointer;
    text-decoration: none;
  `,

  emptyButton: css`
    label: PropertyHeroPhoto-emptyButton;
    display: grid;
    place-items: center;
    /* 아래 정보 칸이 사진 칸을 2rem 덮으므로 그만큼 위로 올려 보이는 칸 가운데에 둔다. */
    padding-bottom: 2rem;
  `,

  addLabel: css`
    label: PropertyHeroPhoto-addLabel;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.6rem 0.8rem;
    border-radius: 999px;
    background: rgb(33 33 36 / 82%);
    color: white;
    font-size: 0.72rem;
    font-weight: 750;
  `,

  photo: css`
    label: PropertyHeroPhoto-photo;
    display: block;
    width: 100%;
    height: 100%;
    aspect-ratio: auto;
    border-radius: 0;
    object-fit: cover;
  `,

  backButton: css`
    label: PropertyHeroPhoto-backButton;
    position: absolute;
    z-index: 2;
    top: 0.75rem;
    left: 0.75rem;
    display: grid;
    width: 2.5rem;
    height: 2.5rem;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    color: var(--color-ink);
    text-decoration: none;

    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
    }
  `,
};

export default PropertyHeroPhoto;
