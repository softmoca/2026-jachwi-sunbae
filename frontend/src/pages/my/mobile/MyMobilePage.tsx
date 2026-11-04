import { css } from '@emotion/css';

import { useMember } from '@/features/auth/api/useCurrentMember';
import WeatherSummaryCard from '@/features/weather/ui/weather-summary-card/WeatherSummaryCard';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';

import AccountLinkCard from '../ui/account-link-card/AccountLinkCard';
import AccountResetCard from '../ui/account-reset-card/AccountResetCard';
import PrivacyLinkCard from '../ui/privacy-link-card/PrivacyLinkCard';

import * as shared from '../MyPage.styles';

/** 휴대폰·태블릿 마이. 뒤로 가기·제목은 앱 상단 바가 그리고, 홈과 같은 본문(최대 45rem)에 카드를 늘이지 않고 쌓는다. */
const MyMobilePage = () => {
  const config = usePublicConfig();
  const member = useMember();

  return (
    <main className={shared.page}>
      <div className={styles.container}>
        <WeatherSummaryCard />
        <div className={styles.links}>
          <AccountLinkCard memberId={member.memberId} />
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
   * 휴대폰·태블릿 마이: 뒤로 가기·제목은 앱 상단 바("<")가 그리고, 카드·바닥 문구는 카드 폭(24rem)에 맞춘 한 열로 화면 가운데에 둔다.
   * 화면이 넓어져도 카드를 늘이지 않고, 좌우 여백은 다른 화면과 같은 1rem이다. 태블릿은 아래에서 두 열로 바꾼다.
   */
  container: css`
    label: MyMobilePage-container;
    width: min(100%, 26rem);
    margin-right: auto;
    margin-left: auto;
    padding-right: 1rem;
    padding-left: 1rem;
    display: grid;
    gap: 0.75rem;
    padding-top: 0.75rem;
    padding-bottom: 1.25rem;

    /* 태블릿(세로 패드)은 한 열이면 양옆이 비므로, 45rem 안에서 카드 두 장을 나란히 두고 글자·여백을 조금 키운다. */
    @media (min-width: 768px) {
      width: min(100%, 45rem);
      padding-right: 1.5rem;
      padding-left: 1.5rem;
    }

    @media (min-width: 768px) {
      --my-card-padding: 1.25rem;
      --my-text-size: 1rem;
      --my-subtext-size: 0.82rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
      gap: 1rem;
      padding-top: 0.75rem;
    }
  `,

  footer: css`
    label: MyMobilePage-footer;
    width: min(100%, 26rem);
    margin-right: auto;
    margin-left: auto;
    padding-right: 1rem;
    padding-left: 1rem;
    /* 바닥 문구는 카드 아래에 떠 있지 않고 화면 맨 아래에 둔다. */
    margin-top: auto;
    padding-top: 3rem;
    padding-bottom: 1.25rem;

    @media (min-width: 768px) {
      width: min(100%, 45rem);
      padding-right: 1.5rem;
      padding-left: 1.5rem;
    }
  `,

  /* 개인정보 처리방침과 초기화는 한 묶음으로 쌓는다(넓은 화면에서는 날씨 옆 열). */
  links: css`
    label: MyMobilePage-links;
    display: grid;
    gap: 0.75rem;
  `,
};

export default MyMobilePage;
