import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import type { OAuthProvider } from '../model/oauthLink';
import { apiRequest } from './apiClient';

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
 * OAuth 인증을 시작하고 제공자 인증 주소를 받는다(`POST /api/auth/oauth/{provider}/start`).
 * 서버는 Access Token과 Refresh 쿠키가 같은 회원인지 확인하고, 이번 시작 요청을 이 기기의 세션에 묶는다.
 * 그래서 쿠키를 함께 보내고, 콜백도 같은 쿠키를 가진 브라우저나 WebView 안에서 이어져야 한다.
 */
export const startOAuth = (config: PublicConfig, provider: OAuthProvider): Promise<string> =>
  apiRequest({
    config,
    path: `/api/auth/oauth/${provider}/start`,
    method: 'POST',
    includeCredentials: true,
    parseData: parseAuthorizationUrl,
  });
