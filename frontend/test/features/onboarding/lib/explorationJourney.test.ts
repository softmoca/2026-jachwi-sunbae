import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
  completeExploration,
  getExplorationRecordLocation,
  prepareExplorationRecord,
  startExploration,
  trackExplorationLogin,
} from '@/features/onboarding/lib/explorationJourney';
import { trackPostHogEvent } from '@/shared/lib/analytics/posthog';

vi.mock('@/shared/lib/analytics/posthog', () => ({ trackPostHogEvent: vi.fn() }));
const location = { latitude: 37.4, longitude: 127.1, address: '동네 주소', roadAddress: null, jibunAddress: null };
beforeEach(() => vi.mocked(trackPostHogEvent).mockClear());
afterEach(() => vi.useRealTimers());

it('완료 전에는 기록 CTA를 전환으로 집계하지 않는다', () => {
  startExploration('commute', true);
  prepareExplorationRecord(location);
  expect(getExplorationRecordLocation()).toBeUndefined();
  expect(trackPostHogEvent).toHaveBeenCalledTimes(1);
});
it('완료부터 로그인까지 같은 journey로 집계하며 개인정보를 보내지 않는다', () => {
  startExploration('price', true);
  completeExploration(3);
  completeExploration(3);
  prepareExplorationRecord(location);
  expect(getExplorationRecordLocation()).toEqual(location);
  trackExplorationLogin(true);
  const calls = vi.mocked(trackPostHogEvent).mock.calls;
  expect(calls.map(([event]) => event)).toEqual([
    'exploration_started',
    'exploration_completed',
    'exploration_record_cta_clicked',
    'exploration_login_completed',
  ]);
  expect(new Set(calls.map(([, properties]) => properties?.journey_id)).size).toBe(1);
  expect(JSON.stringify(calls)).not.toContain('동네 주소');
  expect(JSON.stringify(calls)).not.toContain('latitude');
});
it('30분 후에는 선택 위치를 로그인으로 넘기지 않는다', () => {
  vi.useFakeTimers();
  startExploration('commute', true);
  completeExploration(0);
  prepareExplorationRecord(location);
  vi.advanceTimersByTime(30 * 60 * 1000);
  expect(getExplorationRecordLocation()).toBeUndefined();
});
it('저장소가 차단돼도 현재 탭에서는 기록으로 이어간다', () => {
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  try {
    startExploration('price', true);
    completeExploration(2);
    prepareExplorationRecord(location);
    expect(getExplorationRecordLocation()).toEqual(location);
  } finally {
    read.mockRestore();
    write.mockRestore();
  }
});
