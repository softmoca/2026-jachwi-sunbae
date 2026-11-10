import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/app/App';
import { startAuthenticationSync } from '@/features/auth/model/authSync';
import { preventPageZoom } from '@/shared/lib/page-zoom/preventPageZoom';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('React 루트 요소를 찾을 수 없습니다.');
}

preventPageZoom();
// 다른 탭이 OAuth 인증이나 로그아웃으로 회원을 바꾸면 이 탭도 그 회원으로 맞춘다.
startAuthenticationSync();

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
