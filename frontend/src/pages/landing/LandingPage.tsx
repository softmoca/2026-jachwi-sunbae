import { useLocation } from 'react-router-dom';

import { LogScreen } from '@/shared/lib/analytics/logging';
import useIsDesktop from '@/shared/lib/hooks/useIsDesktop';
import { readLandingEntryState } from '@/shared/lib/navigation/appPaths';

import LandingDesktopPage from './desktop/LandingDesktopPage';
import LandingMobilePage from './mobile/LandingMobilePage';

/**
 * 생활권 탐색 광고에서 들어오는 랜딩. 영상과 앱 받기를 먼저 보이고, 아래로 프로젝트를 운영 화면과 함께 설명한다.
 * 서비스 안(홈 푸터)에서 들어오면 라우터 state의 진입 위치를 `entry`로 남기고, 웹 바로가기를 돌아가기로 바꾼다.
 */
const LandingPage = () => {
  // 광고 유입(utm 등)을 홈까지 이어서 측정한다.
  const { search, state } = useLocation();
  const isDesktop = useIsDesktop();
  const entry = readLandingEntryState(state);
  const returnTo = entry?.returnTo;

  return (
    <LogScreen event="landing_viewed" params={{ entry: entry?.landingEntry ?? 'direct' }}>
      {isDesktop ? (
        <LandingDesktopPage search={search} returnTo={returnTo} />
      ) : (
        <LandingMobilePage search={search} returnTo={returnTo} />
      )}
    </LogScreen>
  );
};

export default LandingPage;
