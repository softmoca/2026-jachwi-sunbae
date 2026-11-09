import { css } from '@emotion/css';

import HeaderWeather from '@/features/weather/ui/header-weather/HeaderWeather';
import DesktopHeader from '@/shared/ui/desktop-header/DesktopHeader';

import CheapMealCard from '../ui/CheapMealCard';
import GuideCard from '../ui/GuideCard';
import HomeFeatures from '../ui/HomeFeatures';
import HomeFooter from '../ui/HomeFooter';
import QuickMenu from '../ui/QuickMenu';
import RecentRooms from '../ui/RecentRooms';

import * as shared from '../HomePage.styles';

/** 데스크탑 홈. 다른 화면과 같은 공용 헤더를 쓰고, 기능 카드 옆 오른쪽 열에 빠른 메뉴·최근 기록을 둔다. */
const HomeDesktopPage = () => (
  <main className={shared.page}>
    <DesktopHeader center={<HeaderWeather />} />
    <div className={styles.layout}>
      <GuideCard className={styles.guide} />
      <CheapMealCard className={styles.meals} />
      <HomeFeatures className={styles.features} />
      <div className={styles.side}>
        <QuickMenu />
        {/* 최근 기록한 방은 상세로 넘어가지 않고 본 방 기록 화면에서 고른 상태로 연다. */}
        <RecentRooms inSideColumn />
      </div>
    </div>
    <HomeFooter className={styles.footer} alignStart />
  </main>
);

const styles = {
  /* 저렴한 한 끼 카드는 사용방법 카드와 같은 줄의 오른쪽 열에 둔다. */
  meals: css`
    label: HomeDesktopPage-meals;
    grid-area: meals;
    margin-top: 1.2rem;

    /* 옆 사용방법 카드처럼 글자를 세로 가운데에 둔다. 좁은 열이라 가로는 왼쪽에 붙인다. */
    & .ActionCard-text {
      top: 50%;
      transform: translateY(-50%);
    }
  `,
  /*
   * 데스크탑 홈: 공용 헤더 아래 본문을 64rem 안에 두고, 첫 줄 왼쪽에 사용방법 카드, 오른쪽 19rem 열에 저렴한 한 끼 카드를,
   * 그 아래 왼쪽에 기능 카드, 오른쪽 열에 빠른 메뉴와 최근 기록을 둔다.
   */
  layout: css`
    label: HomeDesktopPage-layout;
    display: grid;
    grid-template-areas:
      'guide meals'
      'features side';
    grid-template-columns: minmax(0, 1fr) 19rem;
    align-items: start;
    column-gap: 2rem;
    width: min(100%, 64rem);
    margin: 0 auto;
    padding: 0 2rem;
    box-sizing: border-box;
  `,

  guide: css`
    label: HomeDesktopPage-guide;
    grid-area: guide;
    margin-top: 1.2rem;
  `,

  /*
   * 노트북 화면에서도 푸터까지 한 화면에 들어오게 카드 높이를 화면 높이에 맞춘다.
   * 카드 위(헤더, 사용방법 카드)와 아래(간격, 푸터)를 합친 약 25.5rem을 빼고, 18rem에서 24rem 사이로 둔다.
   */
  features: css`
    label: HomeDesktopPage-features;
    grid-area: features;
    height: clamp(18rem, calc(100dvh - 25.5rem), 24rem);
  `,

  /* 오른쪽 열은 기능 카드 위쪽에 맞춰 시작하고, 빠른 메뉴 타일은 5rem을 넘지 않게 한다. */
  side: css`
    label: HomeDesktopPage-side;
    grid-area: side;
    margin-top: 1.4rem;

    & > nav {
      grid-template-columns: repeat(2, minmax(0, 5rem));
      margin-top: 0;
    }

    /* 아직 기능이 없는 빠른 메뉴 빈칸은 오른쪽 열에서 그리지 않는다. */
    & > nav > [aria-hidden='true'] {
      display: none;
    }
  `,

  footer: css`
    label: HomeDesktopPage-footer;
    width: min(100%, 64rem);
    margin-right: auto;
    margin-left: auto;
    padding-right: 2rem;
    padding-left: 2rem;
  `,
};

export default HomeDesktopPage;
