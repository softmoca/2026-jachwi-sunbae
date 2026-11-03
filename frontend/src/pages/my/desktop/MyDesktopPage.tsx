import { css } from '@emotion/css';

import { useMember } from '@/features/auth/api/useCurrentMember';
import WeatherSummaryCard from '@/features/weather/ui/weather-summary-card/WeatherSummaryCard';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import TopNavigation from '@/shared/ui/top-navigation/TopNavigation';

import AccountResetCard from '../ui/account-reset-card/AccountResetCard';
import PrivacyLinkCard from '../ui/privacy-link-card/PrivacyLinkCard';

import * as shared from '../MyPage.styles';

/** 데스크탑 마이. 공용 헤더로 이동하므로 뒤로 가기 없이 제목만 두고, 홈과 같은 64rem 본문에 카드를 늘이지 않고 나란히 둔다. */
const MyDesktopPage = () => {
  const config = usePublicConfig();
  const member = useMember();

  return (
    <main className={shared.page}>
      <div className={styles.layout}>
        <div className={styles.heading}>
          <TopNavigation title="마이" />
        </div>
        <WeatherSummaryCard />
        <div className={styles.links}>
          <PrivacyLinkCard />
          <AccountResetCard memberId={member.memberId} />
        </div>
      </div>
      <footer className={`${shared.footer} ${styles.footer}`}>
        <span>자취선배 MVP2 · {config.mapProviderMode === 'demo' ? 'DEMO MAP' : 'LIVE MAP'}</span>
      </footer>
    </main>
  );
};

const styles = {
  /*
   * 데스크탑 마이: 26rem 카드 두 장이 나란히 놓이는 폭으로 제목·카드·바닥 문구를 화면 가운데에 둔다.
   * 카드는 화면 폭을 따라 늘이지 않는다.
   */
  layout: css`
    label: MyDesktopPage-layout;
    width: min(100%, calc(26rem * 2 + 1.25rem + 4rem));
    margin-right: auto;
    margin-left: auto;
    padding-right: 2rem;
    padding-left: 2rem;
    --my-card-padding: 1.4rem;
    --my-text-size: 1.05rem;
    --my-subtext-size: 0.85rem;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 1.25rem;
    padding-top: 2rem;
    padding-bottom: 2.5rem;
  `,

  footer: css`
    label: MyDesktopPage-footer;
    width: min(100%, calc(26rem * 2 + 1.25rem + 4rem));
    margin-right: auto;
    margin-left: auto;
    padding-right: 2rem;
    padding-left: 2rem;
    /* 바닥 문구는 카드 아래에 떠 있지 않고 화면 맨 아래에 둔다. */
    margin-top: auto;
    padding-top: 3rem;
    padding-bottom: 1.25rem;
  `,

  heading: css`
    label: MyDesktopPage-heading;
    grid-column: 1 / -1;
    margin-bottom: 0.5rem;
  `,

  /* 개인정보 처리방침과 초기화는 한 묶음으로 쌓는다(넓은 화면에서는 날씨 옆 열). */
  links: css`
    label: MyDesktopPage-links;
    display: grid;
    gap: 1.25rem;
  `,
};

export default MyDesktopPage;
