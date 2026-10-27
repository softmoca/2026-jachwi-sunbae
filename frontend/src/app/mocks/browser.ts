import { setupWorker } from 'msw/browser';

import { setAuthentication } from '@/features/auth/model/authStore';

import { createHandlers } from './handlers/index';

const worker = setupWorker(
  ...createHandlers(typeof __GOOD_PRICE_API_BASE_URL__ === 'string' && __GOOD_PRICE_API_BASE_URL__ !== ''),
);

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
