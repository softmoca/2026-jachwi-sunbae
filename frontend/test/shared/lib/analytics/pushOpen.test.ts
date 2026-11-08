import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { trackPostHogEvent } from '@/shared/lib/analytics/posthog';
import { takePushOpenFromLocation } from '@/shared/lib/analytics/pushOpen';

vi.mock('@/shared/lib/analytics/posthog', () => ({ trackPostHogEvent: vi.fn(() => true) }));

const ID = '0b9a7c1e-2f7d-4b8e-9a51-6f0e1d2c3b4a';
const open = (path: string, state: unknown = null) => window.history.replaceState(state, '', path);
const currentPath = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

describe('푸시 열림 기록', () => {
  beforeEach(() => {
    vi.mocked(trackPostHogEvent).mockReset().mockReturnValue(true);
  });
  afterEach(() => {
    vi.useRealTimers();
    open('/');
  });

  it('푸시 쿼리를 지우고 다른 쿼리와 해시, 기록 상태는 남긴다', () => {
    open(`/cheap-meals?tab=delivery&notification_id=${ID}&notification_type=delivery_coupon#top`, { idx: 0 });
    takePushOpenFromLocation();
    expect(currentPath()).toBe('/cheap-meals?tab=delivery#top');
    expect(window.history.state).toEqual({ idx: 0 });
    expect(trackPostHogEvent).toHaveBeenCalledWith('push_opened', {
      notification_id: ID,
      notification_type: 'delivery_coupon',
    });
  });

  it('지운 주소를 다시 읽어도 또 기록하지 않는다', () => {
    open(`/me?notification_id=${ID}&notification_type=weather`);
    takePushOpenFromLocation();
    // 새로고침이나 뒤로 가기로 같은 주소를 다시 열었을 때
    takePushOpenFromLocation();
    expect(trackPostHogEvent).toHaveBeenCalledTimes(1);
    expect(currentPath()).toBe('/me');
  });

  it('수집이 아직 초기화되지 않았으면 받을 때까지 다시 보내고, 끝내 못 받으면 포기한다', () => {
    vi.useFakeTimers();
    vi.mocked(trackPostHogEvent).mockReturnValueOnce(false).mockReturnValueOnce(false);
    open(`/me?notification_id=${ID}`);
    takePushOpenFromLocation();
    vi.runAllTimers();
    expect(trackPostHogEvent).toHaveBeenCalledTimes(3);

    vi.mocked(trackPostHogEvent).mockClear().mockReturnValue(false);
    open(`/me?notification_id=${ID}`);
    takePushOpenFromLocation();
    vi.runAllTimers();
    expect(trackPostHogEvent).toHaveBeenCalledTimes(20);
  });

  it('형식에 맞지 않는 값은 주소에서 지우되 싣지 않는다', () => {
    open('/?notification_id=%3Cscript%3E&notification_type=weather');
    takePushOpenFromLocation();
    expect(trackPostHogEvent).not.toHaveBeenCalled();
    expect(currentPath()).toBe('/');

    open(`/?notification_id=${ID}&notification_type=Bad%20Type`);
    takePushOpenFromLocation();
    expect(trackPostHogEvent).toHaveBeenCalledWith('push_opened', { notification_id: ID });
  });

  it('푸시 쿼리가 없으면 주소를 건드리지 않는다', () => {
    open('/me?ut_session_id=UT01');
    const replace = vi.spyOn(window.history, 'replaceState');
    takePushOpenFromLocation();
    expect(replace).not.toHaveBeenCalled();
    expect(trackPostHogEvent).not.toHaveBeenCalled();
    replace.mockRestore();
  });
});
