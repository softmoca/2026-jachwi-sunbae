import { formatStoreDistance, type GoodPriceStore } from '@/features/good-price/model/GoodPriceStore';
import Icon from '@/shared/ui/icon/Icon';

import styles from './StoreCard.module.css';

const StoreCard = ({ store, onSelect }: { store: GoodPriceStore; onSelect: (id: number) => void }) => (
  <button
    type="button"
    className={styles.card}
    onClick={() => onSelect(store.id)}
    aria-label={`${store.name} 상세 보기`}
  >
    <span className={styles.topLine}>
      <span className={styles.businessType}>{store.businessType}</span>
      <span className={styles.distance}>직선 {formatStoreDistance(store.distanceMeters)}</span>
    </span>
    <span className={styles.name}>
      {store.name}
      <Icon name="chevron-right" size={18} />
    </span>
    <span className={styles.address}>{store.address}</span>
    <span className={styles.menus}>
      {store.menus.length === 0 ? (
        <span className={styles.noMenu}>등록된 메뉴·가격 정보가 없어요</span>
      ) : (
        store.menus.slice(0, 2).map((menu, index) => (
          <span className={styles.menu} key={`${index}-${menu.name}`}>
            <span>{menu.name}</span>
            <strong>{menu.price ?? '가격 정보 없음'}</strong>
          </span>
        ))
      )}
      {store.menus.length > 2 && <span className={styles.more}>메뉴·서비스 {store.menus.length - 2}개 더 보기</span>}
    </span>
  </button>
);

export default StoreCard;
