import { describe, expect, it } from 'vitest';

import {
  createOAuthFailureNotice,
  createOAuthSuccessNotice,
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

  it('통합 안내는 #570이 옮기는 기록과 설정 우선순위를 알린다', () => {
    const notice = createOAuthSuccessNotice('merged', 'KAKAO');

    expect(notice.title).toBe('카카오 계정으로 기록을 합쳤어요');
    expect(notice.description).toContain('매물, 체크리스트, 거리 메모');
    expect(notice.description).toContain('날씨 위치와 알림 설정은 계정에 있던 설정');
  });

  it('전환 안내는 기록을 합치지 않고, 처음 쓰는 계정이면 빈 기록이라고 알린다', () => {
    const notice = createOAuthSuccessNotice('switched', 'APPLE');

    expect(notice.description).toContain('합치지 않고');
    expect(notice.description).toContain('빈 기록');
  });

  it('완료 없이 돌아온 경우는 취소와 실패를 함께 안내한다', () => {
    expect(createOAuthFailureNotice('unfinished')).toMatchObject({
      tone: 'error',
      title: '계정 연결을 마치지 못했어요',
    });
    expect(createOAuthFailureNotice('session').description).toContain('새로 고친');
  });
});
