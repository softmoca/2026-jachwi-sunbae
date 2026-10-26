import { UNSAFE_createBrowserHistory, UNSAFE_createHashHistory } from 'react-router-dom';

import { createGuardedHistory } from '@/shared/lib/navigation/guardedHistory';

export const createAppHistory = (pagesBasePath: string) =>
  createGuardedHistory(
    pagesBasePath === ''
      ? UNSAFE_createBrowserHistory({ v5Compat: true })
      : UNSAFE_createHashHistory({ v5Compat: true }),
  );
