import {
  ApnsTimeoutError,
  classifyPushError,
  PUSH_BRIDGE_ERROR,
  PUSH_FAILURE_NOTICE,
  waitForApnsToken,
} from '../src/push/errors';

const fakeSleep = () => {
  const waits: number[] = [];
  const sleep = jest.fn(async (ms: number) => {
    waits.push(ms);
  });
  return { waits, sleep };
};

describe('waitForApnsToken', () => {
  it('토큰이 이미 있으면 기다리지 않는다', async () => {
    const { sleep } = fakeSleep();
    const read = jest.fn(async () => 'apns');
    await waitForApnsToken(read, { sleep });
    expect(read).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('토큰이 늦게 오면 생길 때까지 간격을 두고 다시 읽는다', async () => {
    const { waits, sleep } = fakeSleep();
    const values = [null, null, null, 'apns'];
    const read = jest.fn(async () => values.shift() ?? null);
    await waitForApnsToken(read, { intervalMs: 400, timeoutMs: 10_000, sleep });
    expect(read).toHaveBeenCalledTimes(4);
    expect(waits).toEqual([400, 400, 400]);
  });

  it('등록 중이라 읽기가 실패해도 다시 읽는다', async () => {
    const { sleep } = fakeSleep();
    const read = jest
      .fn<Promise<string | null>, []>()
      .mockRejectedValueOnce(new Error('unregistered'))
      .mockResolvedValueOnce('apns');
    await waitForApnsToken(read, { sleep });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('끝내 오지 않으면 최대 시간까지만 기다리고 apns_timeout을 던진다', async () => {
    const { waits, sleep } = fakeSleep();
    const read = jest.fn(async () => null);
    const waiting = waitForApnsToken(read, {
      intervalMs: 400,
      timeoutMs: 10_000,
      sleep,
    });
    await expect(waiting).rejects.toBeInstanceOf(ApnsTimeoutError);
    await expect(waiting).rejects.toMatchObject({ code: 'apns_timeout' });
    expect(waits.reduce((sum, ms) => sum + ms, 0)).toBe(10_000);
    expect(read).toHaveBeenCalledTimes(26);
  });

  it('기본값은 실제 타이머로 기다린다', async () => {
    jest.useFakeTimers();
    try {
      let token: string | null = null;
      const waiting = waitForApnsToken(async () => token);
      await jest.advanceTimersByTimeAsync(800);
      token = 'apns';
      await jest.advanceTimersByTimeAsync(400);
      await expect(waiting).resolves.toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('classifyPushError', () => {
  it('APNs 대기 시간 초과와 네트워크 오류, 그 밖의 오류를 나눈다', () => {
    expect(classifyPushError(new ApnsTimeoutError())).toBe('apns_timeout');
    expect(
      classifyPushError({
        code: 'messaging/unknown',
        message: 'The Internet connection appears to be offline.',
      }),
    ).toBe('network');
    expect(classifyPushError({ code: 'messaging/network-error' })).toBe(
      'network',
    );
    expect(classifyPushError(new Error('registration-superseded'))).toBe(
      'unknown',
    );
    expect(classifyPushError(undefined)).toBe('unknown');
  });

  it('네트워크 문구는 네트워크 오류에만 쓰고, 브리지 코드는 종류마다 다르다', () => {
    expect(PUSH_FAILURE_NOTICE.apns_timeout.title).toBe(
      '알림 연결이 늦어지고 있어요',
    );
    expect(PUSH_FAILURE_NOTICE.apns_timeout.message).not.toContain('네트워크');
    expect(PUSH_FAILURE_NOTICE.unknown.message).not.toContain('네트워크');
    expect(PUSH_FAILURE_NOTICE.network.message).toContain('네트워크');
    expect(PUSH_BRIDGE_ERROR).toEqual({
      apns_timeout: 'apns-timeout',
      network: 'network',
      unknown: 'push-unavailable',
    });
  });
});
