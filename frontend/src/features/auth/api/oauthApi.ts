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
 * OAuth 인증을 시작하고 제공자 인증 주소를 받는다(`POST /api/auth/oauth/{provider}/start`, #570).
 * - 요청: Bearer Access Token과 Refresh 쿠키. 서버는 둘이 같은 회원인지 확인하고 이번 시작을 이 쿠키의 세션에 묶는다(5분).
 * - 응답: `200 { authorizationUrl }`.
 * - 오류: 쿠키가 없거나 회원이 다르면 `401 OAUTH_AUTHENTICATION_FAILED`, 제공자 설정이 없으면 `503 OAUTH_PROVIDER_UNAVAILABLE`.
 *   이 401은 Access Token 만료가 아니므로 토큰을 갱신하거나 인증을 끝내지 않는다.
 * 콜백도 같은 쿠키를 가진 브라우저 안에서 이어져야 한다.
 */
export const startOAuth = (config: PublicConfig, provider: OAuthProvider): Promise<string> =>
  apiRequest({
    config,
    path: `/api/auth/oauth/${provider}/start`,
    method: 'POST',
    includeCredentials: true,
    nonSessionUnauthorizedCodes: ['OAUTH_AUTHENTICATION_FAILED'],
    parseData: parseAuthorizationUrl,
  });

const NONCE = /^[\x21-\x7e]{1,256}$/;

const parseNonce = (value: unknown): string => {
  if (typeof value !== 'object' || value === null) throw new Error('OAuth nonce 응답 형식이 올바르지 않습니다.');
  const { nonce } = value as Record<string, unknown>;
  // 앱 브리지는 공백, 제어 문자 없는 ASCII 1~256자만 받는다(#591).
  if (typeof nonce !== 'string' || !NONCE.test(nonce)) throw new Error('OAuth nonce 응답 형식이 올바르지 않습니다.');
  return nonce;
};

/**
 * 앱 네이티브 로그인에 쓸 일회용 nonce를 받는다(`POST /api/auth/oauth/{provider}/nonce`, #570 2단계).
 * - 요청: `/start`와 같이 Bearer Access Token과 Refresh 쿠키. 서버는 둘이 같은 회원인지 확인하고 nonce를 그 회원에 묶는다.
 * - 응답: `200 { nonce }`. 앱은 이 값을 해시하지 않고 그대로 제공자에 넘겨 `id_token`의 `nonce` 클레임에 들어간다.
 * - 오류: `/start`와 같다(`401 OAUTH_AUTHENTICATION_FAILED`, `503 OAUTH_PROVIDER_UNAVAILABLE`).
 *   API가 아직 없으면 404다. 호출한 쪽이 서버 미지원으로 본다.
 */
export const issueOAuthNonce = (config: PublicConfig, provider: OAuthProvider): Promise<string> =>
  apiRequest({
    config,
    path: `/api/auth/oauth/${provider}/nonce`,
    method: 'POST',
    includeCredentials: true,
    nonSessionUnauthorizedCodes: ['OAUTH_AUTHENTICATION_FAILED'],
    parseData: parseNonce,
  });

export type IdTokenCredential = { idToken: string; authorizationCode?: string; nonce: string };

/**
 * 앱이 받은 `id_token`으로 인증을 마친다(`POST /api/auth/oauth/{provider}/id-token`, #570 2단계).
 * - 요청: Bearer Access Token, Refresh 쿠키, `{ idToken, authorizationCode?, nonce }`. Apple은 `authorizationCode`도 보낸다.
 *   서버는 `id_token`을 검증하고 `nonce`가 이 회원에게 발급한 값인지 확인한 뒤 기존 `completeOAuth`를 부른다.
 *   어느 익명 회원의 기록을 옮길지는 WebView의 Refresh 쿠키로 안다.
 * - 응답: 성공하면 `/callback`처럼 Refresh 쿠키를 바꾼다. 본문은 쓰지 않는다(204나 성공 응답 모두 받는다).
 * - 오류: 세션 확인 실패는 `401 OAUTH_AUTHENTICATION_FAILED`, 그 밖의 검증 실패는 실패로 본다.
 */
export const completeOAuthWithIdToken = (
  config: PublicConfig,
  provider: OAuthProvider,
  credential: IdTokenCredential,
): Promise<void> =>
  apiRequest({
    config,
    path: `/api/auth/oauth/${provider}/id-token`,
    method: 'POST',
    body: credential,
    includeCredentials: true,
    nonSessionUnauthorizedCodes: ['OAUTH_AUTHENTICATION_FAILED'],
    parseData: () => undefined,
  });
