import { describe, expect, it } from 'vitest';

import {
  parseOAuthFailure,
  readLinkedProvider,
  resolveOAuthOutcome,
  saveLinkedProvider,
  savePendingOAuth,
  takePendingOAuth,
} from '@/features/auth/model/oauthLink';

const NOW = 1_800_000_000_000;

describe('OAuth 연결 상태', () => {
  it('시작 정보는 한 번만 읽고 지운다', () => {
    savePendingOAuth({ provider: 'KAKAO', previousMemberId: 20, previousProvider: null }, NOW);

    expect(takePendingOAuth(NOW + 1_000)).toEqual({
      provider: 'KAKAO',
      previousMemberId: 20,
      previousProvider: null,
      startedAt: NOW,
    });
    expect(takePendingOAuth(NOW + 1_000)).toBeNull();
  });

  it('30분이 지난 시작 정보는 쓰지 않는다', () => {
    savePendingOAuth({ provider: 'APPLE', previousMemberId: 20, previousProvider: null }, NOW);

    expect(takePendingOAuth(NOW + 31 * 60 * 1_000)).toBeNull();
  });

  it('형식이 다른 시작 정보는 없는 것으로 본다', () => {
    window.sessionStorage.setItem('jachwi:oauth-pending', JSON.stringify({ provider: 'GOOGLE', previousMemberId: 1 }));

    expect(takePendingOAuth(NOW)).toBeNull();
  });

  it('연결 상태는 같은 회원일 때만 보여 준다', () => {
    saveLinkedProvider(10, 'KAKAO');

    expect(readLinkedProvider(10)).toBe('KAKAO');
    expect(readLinkedProvider(11)).toBeNull();
  });

  it('인증 전후 회원으로 연결, 통합, 전환을 구분한다', () => {
    const anonymous = { provider: 'KAKAO', previousMemberId: 20, previousProvider: null, startedAt: NOW } as const;
    const linked = { ...anonymous, provider: 'APPLE', previousMemberId: 10, previousProvider: 'KAKAO' } as const;

    expect(resolveOAuthOutcome(anonymous, 20)).toBe('linked');
    expect(resolveOAuthOutcome(anonymous, 10)).toBe('merged');
    expect(resolveOAuthOutcome(linked, 30)).toBe('switched');
    expect(resolveOAuthOutcome(null, 10)).toBe('completed');
  });

  it('서버가 결과를 알려 주면 그 값을 쓴다', () => {
    const anonymous = { provider: 'KAKAO', previousMemberId: 20, previousProvider: null, startedAt: NOW } as const;

    expect(resolveOAuthOutcome(anonymous, 10, 'switched')).toBe('switched');
    expect(resolveOAuthOutcome(anonymous, 10, 'unknown')).toBe('merged');
  });

  it('제공자 거부는 취소로, 그 밖의 오류는 실패로 본다', () => {
    expect(parseOAuthFailure(null)).toBeNull();
    expect(parseOAuthFailure('access_denied')).toBe('cancelled');
    expect(parseOAuthFailure('cancelled')).toBe('cancelled');
    expect(parseOAuthFailure('unavailable')).toBe('unavailable');
    expect(parseOAuthFailure('server_error')).toBe('failed');
  });
});
