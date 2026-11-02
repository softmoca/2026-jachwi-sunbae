import { css } from '@emotion/css';

import { CHECKLISTS_PATH, COMPARE_PATH } from '@/shared/lib/navigation/appPaths';
import ShortcutTile from '@/shared/ui/shortcut-tile/ShortcutTile';

import iconChecklist from '../assets/icon-checklist.webp';
import iconCompare from '../assets/icon-compare.webp';

const QUICK_MENU_ITEMS = [
  { label: '체크리스트', to: CHECKLISTS_PATH, icon: iconChecklist },
  { label: '방 비교', to: COMPARE_PATH, icon: iconCompare },
];
// 나머지 칸은 들어갈 기능이 정해질 때까지 보이지 않는 빈칸으로 자리만 잡는다.
const EMPTY_SLOT_COUNT = 2;

const QuickMenu = () => (
  <nav className={styles.menu} aria-label="빠른 메뉴">
    {QUICK_MENU_ITEMS.map((item) => (
      <ShortcutTile key={item.to} {...item} />
    ))}
    {Array.from({ length: EMPTY_SLOT_COUNT }, (_, index) => (
      <span key={index} className={styles.emptySlot} aria-hidden="true" />
    ))}
  </nav>
);

const styles = {
  /* 빠른 메뉴는 한 줄 4칸 그리드에 바로가기 타일을 왼쪽부터 채운다. */
  menu: css`
    label: QuickMenu-menu;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.65rem;
    margin-top: 1.25rem;

    /* 태블릿부터는 칸이 넓어져도 타일이 모바일 크기를 넘지 않게 칸 크기에 상한을 둔다. */
    @media (min-width: 768px) {
      grid-template-columns: repeat(4, minmax(0, 5.5rem));
    }
  `,

  /* 빈칸은 타일 크기만큼 자리만 차지하고 보이거나 반응하지 않는다. */
  emptySlot: css`
    label: QuickMenu-emptySlot;
    aspect-ratio: 1;
  `,
};

export default QuickMenu;
