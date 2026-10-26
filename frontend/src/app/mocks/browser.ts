import { setupWorker } from 'msw/browser';

import { setAuthentication } from '@/features/auth/model/authStore';

import { handlers } from './handlers';

const worker = setupWorker(...handlers);

export const startBrowserMocking = async () => {
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: `${typeof __PAGES_BASE_PATH__ === 'string' && __PAGES_BASE_PATH__ !== '' ? __PAGES_BASE_PATH__ : '/'}mockServiceWorker.js`,
    },
  });

  setAuthentication({
    accessToken: 'local-msw-access-token',
    tokenType: 'Bearer',
    expiresIn: 60 * 60 * 8,
  });
};
