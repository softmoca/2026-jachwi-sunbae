import { useEntryLocation } from '@/features/weather/model/useEntryLocation';
import { getPublicConfig } from '@/shared/config/publicConfig';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';
import StatusPanel from '@/shared/ui/status-panel/StatusPanel';

import PostHogTracker from './analytics/PostHogTracker';
import AppProviders from './providers/AppProviders';
import AppRoutes from './router/AppRoutes';

import './styles/tokens.styles';
import './styles/global.styles';
import './styles/utilities.styles';

type AppProps = {
  config?: PublicConfig;
};

const App = ({ config }: AppProps) => {
  // 들어올 때 현재 위치를 한 번 받는다. 헤더 날씨와 지도가 이 위치를 쓴다.
  useEntryLocation();
  let resolvedConfig: PublicConfig;

  try {
    resolvedConfig = config ?? getPublicConfig();
  } catch (error) {
    // 빠진 환경변수 이름은 배포한 사람이 콘솔에서 확인한다. 화면에는 사용자 문구만 보인다.
    console.error(error);
    return (
      <StatusPanel
        title="서비스를 열지 못했어요"
        description="잠시 후 다시 열어 주세요. 계속 열리지 않으면 자취선배 팀에 알려 주세요."
        tone="error"
      />
    );
  }

  return (
    <AppProviders config={resolvedConfig}>
      <PostHogTracker />
      <AppRoutes />
    </AppProviders>
  );
};

export default App;
