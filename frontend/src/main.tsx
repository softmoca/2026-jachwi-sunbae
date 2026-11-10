import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/app/App';
import { preventPageZoom } from '@/shared/lib/page-zoom/preventPageZoom';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('React 루트 요소를 찾을 수 없습니다.');
}

preventPageZoom();

const startApplication = async () => {
  // 푸시로 연 화면에서만 기록 모듈을 받는다. 모듈이 불러와질 때 푸시 쿼리를 지우므로 라우터가 주소를 읽기 전에 기다린다.
  if (location.search.includes('notification_')) await import('@/shared/lib/analytics/pushOpen').catch(() => {});
  if (__ENABLE_MSW__) {
    const { startBrowserMocking } = await import('@/app/mocks/browser');
    await startBrowserMocking();
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void startApplication();
