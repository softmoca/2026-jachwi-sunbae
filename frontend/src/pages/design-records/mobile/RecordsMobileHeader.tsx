import { Link } from 'react-router-dom';

import { HOME_PATH } from '@/shared/lib/navigation/appPaths';
import Icon from '@/shared/ui/icon/Icon';

import type { RecordsView } from '../model/recordsView';

import * as styles from './RecordsMobilePage.styles';

type RecordsMobileHeaderProps = {
  view: RecordsView;
  onViewChange: (view: RecordsView) => void;
  /** 주소 검색 열기. 없으면(화면 코드를 받는 중) 검색 버튼을 눌러도 아무것도 하지 않게 막는다. */
  onSearchOpen?: () => void;
};

/** 휴대폰 본 방 기록 헤더. 뒤로가기, 지도와 리스트 보기 전환, 주소 검색 버튼을 둔다. */
const RecordsMobileHeader = ({ view, onViewChange, onSearchOpen }: RecordsMobileHeaderProps) => (
  <header className={styles.header}>
    <Link className={styles.back} to={HOME_PATH} aria-label="홈으로 돌아가기">
      <Icon name="chevron-left" size={24} />
    </Link>
    <nav className={styles.viewSwitch} aria-label="기록 보기 방식">
      <button type="button" aria-pressed={view === 'map'} onClick={() => onViewChange('map')}>
        <Icon name="map" size={17} /> 지도
      </button>
      <button type="button" aria-pressed={view === 'list'} onClick={() => onViewChange('list')}>
        <Icon name="checklist" size={17} /> 리스트
      </button>
    </nav>
    <button
      className={styles.back}
      type="button"
      aria-label="주소 검색 열기"
      disabled={onSearchOpen === undefined}
      onClick={onSearchOpen}
    >
      <Icon name="search" size={20} />
    </button>
  </header>
);

export default RecordsMobileHeader;
