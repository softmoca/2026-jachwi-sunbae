import { css, cx } from '@emotion/css';

import { usePropertyList } from '@/features/property/api/useProperties';
import { formatRentSummary } from '@/features/property/lib/propertyFormat';
import AuthenticatedPhoto from '@/features/property/ui/authenticated-photo/AuthenticatedPhoto';
import { HOME_PATH, propertyDetailPath } from '@/shared/lib/navigation/appPaths';
import { Button } from '@/shared/ui/button/Button';
import DelayedFallback from '@/shared/ui/delayed-fallback/DelayedFallback';
import HorizontalRail from '@/shared/ui/horizontal-rail/HorizontalRail';
import Icon from '@/shared/ui/icon/Icon';
import RailCard from '@/shared/ui/rail-card/RailCard';

const RECENT_ROOM_LIMIT = 5;

type RecentRoomsProps = {
  /** 켜면 좁은 오른쪽 열에 맞게 카드를 두 장 남짓 보이도록 둔다(데스크탑). */
  inSideColumn?: boolean;
};

const RecentRooms = ({ inSideColumn = false }: RecentRoomsProps) => {
  const properties = usePropertyList();
  const rooms = properties.data?.pages.flatMap((page) => page.content).slice(0, RECENT_ROOM_LIMIT) ?? [];
  return (
    <section className={styles.section} data-side-column={inSideColumn || undefined} aria-labelledby="recent-heading">
      <div className={styles.sectionHeading}>
        <h2 id="recent-heading">최근 기록한 방</h2>
      </div>
      {/* 빠른 응답에는 로딩 문구 없이 바로 목록을 보여 주고, 오래 걸릴 때만 알린다. */}
      <DelayedFallback isPending={properties.isPending} fallback={<p role="status">기록을 불러오는 중이에요.</p>}>
        {() =>
          properties.isError ? (
            <div className={styles.loadError} role="alert">
              {/* 불러오기 실패 이미지는 준비되면 이 자리에 넣는다. */}
              <span className={styles.loadErrorImage} aria-hidden="true" />
              <p>기록을 불러오지 못했어요.</p>
              <Button variant="secondary" isLoading={properties.isFetching} onClick={() => void properties.refetch()}>
                다시 시도
              </Button>
            </div>
          ) : rooms.length === 0 ? (
            <p>아직 기록한 방이 없어요.</p>
          ) : (
            <HorizontalRail className={styles.rooms} aria-label="최근 기록한 방 목록">
              {rooms.map((property) => (
                <RailCard
                  // 데스크탑은 같은 주소에서 본 방 기록 화면이 이 매물을 고른 채로 열린다.
                  to={propertyDetailPath(property.propertyId)}
                  state={{ returnTo: HOME_PATH }}
                  key={property.propertyId}
                  className={styles.roomCard}
                >
                  {property.representativePhoto ? (
                    <AuthenticatedPhoto
                      propertyId={property.propertyId}
                      photoId={property.representativePhoto.photoId}
                      contentUrl={property.representativePhoto.contentUrl}
                      alt={`${property.name} 대표 사진`}
                      className={styles.roomPicture}
                      errorMode="retry-only"
                    />
                  ) : (
                    <span className={`${styles.roomPicture} ${styles.photoFallback}`} aria-label="대표 사진 없음">
                      <Icon name="image" size={18} />
                    </span>
                  )}
                  <div className={styles.roomInfo}>
                    <strong>{property.name}</strong>
                    <span className={styles.rent}>
                      {property.monthlyRentAmount > 0 ? '월세 ' : ''}
                      {formatRentSummary(property.depositAmount, property.monthlyRentAmount)}
                    </span>
                    <p>{property.location.address ?? '주소 미등록'}</p>
                  </div>
                </RailCard>
              ))}
            </HorizontalRail>
          )
        }
      </DelayedFallback>
    </section>
  );
};

const styles = {
  // 다른 요소의 선택자에서 `.RecentRooms-section`로 가리킨다.
  section: cx(
    css`
      label: RecentRooms-section;
      margin-top: 2.2rem;
    `,
    'RecentRooms-section',
  ),

  sectionHeading: css`
    label: RecentRooms-sectionHeading;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.9rem;

    & h2 {
      font-size: 1rem;
      margin: 0;
      letter-spacing: -0.035em;
    }
  `,

  /* 불러오기에 실패하면 이미지·안내·다시 시도 버튼을 가운데에 세로로 둔다. */
  loadError: css`
    label: RecentRooms-loadError;
    display: grid;
    justify-items: center;
    gap: 0.75rem;
    padding: 1.25rem 0 0.5rem;
    text-align: center;

    & p {
      margin: 0;
      color: var(--color-muted);
      font-size: 0.85rem;
    }
  `,

  /* 이미지가 들어올 자리. 크기만 잡아 둔다. */
  loadErrorImage: css`
    label: RecentRooms-loadErrorImage;
    width: 6rem;
    height: 6rem;
    border-radius: var(--radius-tile);
    background: var(--color-card-surface);
  `,

  rooms: css`
    label: RecentRooms-rooms;
    /* 홈 본문 좌우 패딩만큼 화면 끝까지 카드를 흘려 다음 카드가 있다는 걸 보여준다. */
    --horizontal-rail-bleed: 1.25rem;
    --horizontal-rail-gap: 0.7rem;
    padding-bottom: 0.25rem;

    @media (max-width: 360px) {
      --horizontal-rail-bleed: 1rem;
    }

    /* 데스크탑 오른쪽 열처럼 좁은 칸에서는 가장자리 여백 없이 카드를 두 장 남짓 보이게 한다. */
    .RecentRooms-section[data-side-column='true'] & {
      --horizontal-rail-bleed: 0px;
      --horizontal-rail-gap: 0.75rem;
    }
  `,

  /* 동작은 공통 RailCard가 맡고, 여기서는 사진 위·정보 아래로 된 카드 모양만 정한다. */
  roomCard: css`
    label: RecentRooms-roomCard;
    flex: 0 0 42%;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-tile);
    background: var(--color-surface);

    @media (max-width: 360px) {
      flex-basis: 52%;
    }

    /* 넓은 화면에서도 카드는 모바일 크기로 두고 한 줄에 더 많이 보여준다. */
    @media (min-width: 768px) {
      flex-basis: 11rem;
    }

    .RecentRooms-section[data-side-column='true'] & {
      flex-basis: calc((100% - var(--horizontal-rail-gap)) / 2.2);
    }
  `,

  roomPicture: css`
    label: RecentRooms-roomPicture;
    display: grid;
    place-items: center;
    width: 100%;
    height: 7rem;
    position: relative;
    overflow: hidden;
    flex: 0 0 auto;
    border-radius: 0.7rem;
    object-fit: cover;
    background: var(--color-card-surface);
    color: var(--color-placeholder);

    &.authenticated-photo {
      box-sizing: border-box;
      aspect-ratio: auto;
      gap: 0.2rem;
      padding: 0.3rem;
      font-size: 0.58rem;
      line-height: 1.2;
    }

    &.authenticated-photo .inline-button {
      min-height: 1.5rem;
      padding: 0.1rem 0.25rem;
      font-size: 0.58rem;
      text-decoration: none;
    }
  `,

  photoFallback: css`
    label: RecentRooms-photoFallback;
    align-content: center;
    justify-items: center;
  `,

  // 다른 요소의 선택자에서 `.RecentRooms-roomInfo`로 가리킨다.
  roomInfo: cx(
    css`
      label: RecentRooms-roomInfo;
      display: grid;
      min-width: 0;
      align-content: start;
      gap: 0.25rem;
      padding: 0.8rem 0.7rem;

      & > strong {
        overflow: hidden;
        color: var(--color-ink);
        font-size: 0.9rem;
        font-weight: 600;
        letter-spacing: -0.04em;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      & p {
        overflow: hidden;
        margin: 0;
        color: var(--color-muted);
        font-size: 0.68rem;
        line-height: 1.35;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
    'RecentRooms-roomInfo',
  ),

  rent: css`
    label: RecentRooms-rent;

    .RecentRooms-roomInfo > & {
      overflow: hidden;
      color: var(--color-price);
      font-size: 0.78rem;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
};

export default RecentRooms;
