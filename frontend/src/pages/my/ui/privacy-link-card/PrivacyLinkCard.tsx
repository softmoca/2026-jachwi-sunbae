import { Link } from 'react-router-dom';

import { PRIVACY_PATH } from '@/shared/lib/navigation/appPaths';
import Icon from '@/shared/ui/icon/Icon';

import * as styles from '../my-row-card/MyRowCard.styles';

/** 개인정보 처리방침으로 가는 카드. 초기화 카드와 같은 모양을 쓴다. */
const PrivacyLinkCard = () => (
  <Link className={styles.notice} to={PRIVACY_PATH}>
    <span className={styles.noticeIcon}>
      <Icon name="info" size={16} />
    </span>
    <span>
      <strong>개인정보 처리방침</strong>
      <small>수집하는 정보와 이용 목적을 확인해요.</small>
    </span>
    <Icon name="arrow-right" size={15} />
  </Link>
);

export default PrivacyLinkCard;
