import { http, HttpResponse } from 'msw';

import { failure, success } from '../mockStore';

// 로컬 목은 Refresh 쿠키를 흉내 내지 않는다. 페이지를 새로 열면 늘 지금 익명 회원으로 복원하고,
// 탈퇴하면 쿠키가 지워진 것처럼 다음 로그인에서 회원 번호를 하나 올린다. 매물 등 목 데이터는 회원별로 나누지 않는다.
let currentMemberId = 1;
let hasRefreshCookie = true;

const tokenResponse = (newMember = false) =>
  success({
    accessToken: `local-msw-access-token-${currentMemberId}`,
    tokenType: 'Bearer',
    expiresIn: 900,
    newMember,
    member: { memberId: currentMemberId },
  });

export const authHandlers = [
  http.post('*/api/auth/login', () => {
    if (hasRefreshCookie) return tokenResponse();
    currentMemberId += 1;
    hasRefreshCookie = true;
    return tokenResponse(true);
  }),
  http.post('*/api/auth/refresh', () => (hasRefreshCookie ? tokenResponse() : failure('REFRESH_TOKEN_INVALID', 401))),
  // 탈퇴. Access Token으로 회원을 확인하고, 실제 서버는 회원과 기록을 논리 삭제한 뒤 refresh_token 쿠키를 만료시킨다.
  http.delete('*/api/members/me', ({ request }) => {
    if (
      !hasRefreshCookie ||
      request.headers.get('Authorization') !== `Bearer local-msw-access-token-${currentMemberId}`
    ) {
      return failure('ACCESS_TOKEN_INVALID', 401);
    }
    hasRefreshCookie = false;
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('*/api/members/me', () => success({ id: currentMemberId })),
  // 현재 기기 로그아웃. 쿠키가 지워진 것처럼 다음 로그인에서 새 익명 회원을 받는다.
  http.post('*/api/auth/logout', () => {
    hasRefreshCookie = false;
    return new HttpResponse(null, { status: 204 });
  }),
  // OAuth 시작. 로컬 목은 제공자 화면 없이 바로 복귀 화면으로 돌아와, 지금 회원에 처음 연결한 것처럼 보인다.
  http.post('*/api/auth/oauth/:provider/start', () =>
    success({ authorizationUrl: `${globalThis.location?.origin ?? 'http://localhost:3000'}/oauth/complete` }),
  ),
];
