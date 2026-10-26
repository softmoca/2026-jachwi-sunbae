import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { unstable_HistoryRouter as HistoryRouter } from 'react-router-dom';

import { queryClient } from '@/shared/api/queryClient';
import { PublicConfigProvider } from '@/shared/config/PublicConfigContext';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import { createAppHistory } from './createAppHistory';

type AppProvidersProps = {
  config: PublicConfig;
  children: ReactNode;
};

let browserHistory: ReturnType<typeof createAppHistory> | null = null;

const getBrowserHistory = () => {
  browserHistory ??= createAppHistory(typeof __PAGES_BASE_PATH__ === 'string' ? __PAGES_BASE_PATH__ : '');
  return browserHistory;
};

const AppProviders = ({ config, children }: AppProvidersProps) => {
  const history = getBrowserHistory();

  return (
    <PublicConfigProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <HistoryRouter history={history}>{children}</HistoryRouter>
      </QueryClientProvider>
    </PublicConfigProvider>
  );
};

export default AppProviders;
