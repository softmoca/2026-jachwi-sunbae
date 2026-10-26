import { formatStoreDistance, type GoodPriceStore } from '@/features/good-price/model/GoodPriceStore';
import Icon from '@/shared/ui/icon/Icon';

import styles from './StoreDetail.module.css';

const StoreDetail = ({ store, dataAsOf }: { store: GoodPriceStore; dataAsOf: string | null }) => (
  <div className={styles.detail}>
    <p className={styles.meta}>
      {store.businessType} <span>·</span> 기준 위치에서 직선 {formatStoreDistance(store.distanceMeters)}
    </p>
    <p className={styles.address}>
      <Icon name="locate" size={18} />
      {store.address}
    </p>
    <section className={styles.menuSection} aria-label="메뉴와 서비스 가격">
      <h3>
        메뉴·서비스 <span>등록 가격 · 원</span>
      </h3>
      {store.menus.length === 0 ? (
        <p>등록된 메뉴·가격 정보가 없어요.</p>
      ) : (
        <dl>
          {store.menus.map((menu, index) => (
            <div key={`${index}-${menu.name}`}>
              <dt>{menu.name}</dt>
              <dd>{menu.price ?? '가격 정보 없음'}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
    <aside className={styles.note}>
      <strong>방문 전에 한 번 확인해 주세요</strong>
      <p>
        행정안전부 착한가격업소 현황{dataAsOf === null ? '' : ` · ${dataAsOf} 기준`}입니다. 현재 가격·영업 여부와 다를
        수 있어요.
      </p>
    </aside>
    <div className={styles.actions}>
      {store.phone !== null ? (
        <a className={styles.phone} href={`tel:${store.phone.replace(/[^+\d]/g, '')}`}>
          전화하기
        </a>
      ) : (
        <span className={styles.noPhone}>등록된 전화번호가 없어요</span>
      )}
      <a
        className={styles.mapLink}
        href={`https://map.kakao.com/link/to/${encodeURIComponent(store.name)},${store.latitude},${store.longitude}`}
        target="_blank"
        rel="noreferrer"
      >
        길찾기 <Icon name="external-link" size={16} />
      </a>
    </div>
    {store.phone !== null && <p className={styles.phoneNumber}>{store.phone}</p>}
  </div>
);

export default StoreDetail;
