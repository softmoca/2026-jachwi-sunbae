import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import type { OAuthProvider } from '../model/oauthLink';
import { apiRequest } from './apiClient';

/** 웹은 이 브라우저에서 콜백까지 이어지고, 앱은 시스템 인증 화면이 앱 콜백 주소로 돌아온다. */
export type OAuthClient = 'web' | 'app';

const parseAuthorizationUrl = (value: unknown): string => {
  if (typeof value !== 'object' || value === null) throw new Error('OAuth 시작 응답 형식이 올바르지 않습니다.');
  const { authorizationUrl } = value as Record<string, unknown>;
  if (typeof authorizationUrl !== 'string') throw new Error('OAuth 시작 응답 형식이 올바르지 않습니다.');
  const url = new URL(authorizationUrl);
  // 제공자 인증 화면은 늘 HTTPS다. 다른 형식이면 이동하지 않는다. 로컬 목만 http://localhost를 쓴다.
  const isLocalMock = url.protocol === 'http:' && url.hostname === 'localhost';
  if ((url.protocol !== 'https:' && !isLocalMock) || url.username !== '' || url.password !== '') {
    throw new Error('OAuth 인증 주소가 올바르지 않습니다.');
  }
  return url.toString();
};

/**
 * OAuth 인증을 시작하고 제공자 인증 주소를 받는다. 서버는 Access Token과 Refresh 쿠키가 같은 회원인지 확인하고,
 * 이번 시작 요청을 이 기기의 세션에 묶는다. 그래서 쿠키를 함께 보낸다.
 * 앱(`client=app`)은 아직 백엔드 계약이 없다. 시스템 인증 화면은 WebView와 쿠키를 함께 쓰지 않으므로
 * 콜백이 일회용 완료 코드와 함께 `jachwisunbae://` 주소로 돌아와야 한다(POL-AUTH-030).
 */
export const startOAuth = (config: PublicConfig, provider: OAuthProvider, client: OAuthClient): Promise<string> =>
  apiRequest({
    config,
    path: `/api/auth/oauth/${provider}/start${client === 'app' ? '?client=app' : ''}`,
    method: 'POST',
    includeCredentials: true,
    parseData: parseAuthorizationUrl,
  });

/**
 * 앱의 시스템 인증 화면이 돌려준 일회용 완료 코드로 WebView의 인증을 바꾼다. 서버가 새 Refresh 쿠키를 내려 준다.
 * 백엔드 계약 확정 전의 제안 경로다.
 */
export const completeAppOAuth = (config: PublicConfig, code: string): Promise<void> =>
  apiRequest({
    config,
    path: '/api/auth/oauth/complete',
    method: 'POST',
    body: { code },
    includeCredentials: true,
    parseData: () => undefined,
  });
