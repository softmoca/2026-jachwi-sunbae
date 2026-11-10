import { createPushController, type PushPort } from '../src/push/controller';

const setup = (choice: string | null = null, permission = true) => {
  let current = choice;
  const port: PushPort = {
    getChoice: jest.fn(async () => current),
    setChoice: jest.fn(async value => {
      current = value;
    }),
    hasPermission: jest.fn(async () => permission),
    requestPermission: jest.fn(async () => permission),
    register: jest.fn(async () => 'private-device-token'),
    subscribe: jest.fn(async () => {}),
    unregister: jest.fn(async () => {}),
  };
  return { port, push: createPushController(port) };
};

describe('push controller', () => {
  it('동의 전에는 토큰을 발급하거나 구독하지 않는다', async () => {
    const { port, push } = setup();
    expect(await push.token()).toBeNull();
    expect(await push.restore()).toBeNull();
    expect(port.register).not.toHaveBeenCalled();
    expect(port.subscribe).not.toHaveBeenCalled();
  });
  it('예전 첫 실행 안내에서 나중에를 고른 사용자도 꺼진 상태로 두고 켤 수 있다', async () => {
    const { port, push } = setup('deferred');
    expect(await push.restore()).toBeNull();
    expect(port.register).not.toHaveBeenCalled();
    expect((await push.status()).enabled).toBe(false);
    expect(await push.enable()).toBe('private-device-token');
    expect((await push.status()).enabled).toBe(true);
  });
  it('OS 권한 거절을 활성화 성공으로 취급하지 않는다', async () => {
    const { port, push } = setup(null, false);
    expect(await push.enable()).toBeNull();
    expect(port.register).not.toHaveBeenCalled();
    expect((await push.status()).enabled).toBe(false);
  });
  it('권한과 등록·구독이 모두 성공한 후 활성화한다', async () => {
    const { port, push } = setup();
    expect(await push.enable()).toBe('private-device-token');
    expect(port.subscribe).toHaveBeenCalledTimes(1);
    expect(await push.status()).toEqual({
      enabled: true,
      permissionGranted: true,
    });
  });
  it('등록 실패를 저장하지 않으며 다음에 재시도할 수 있다', async () => {
    const { port, push } = setup();
    (port.register as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await expect(push.enable()).rejects.toThrow('offline');
    expect((await push.status()).enabled).toBe(false);
    expect(await push.enable()).toBe('private-device-token');
  });
  it('갱신과 철회가 겹쳐도 철회 후 재구독하지 않는다', async () => {
    const { port, push } = setup('enabled');
    await Promise.all([push.restore(), push.disable(), push.restore()]);
    expect(port.subscribe).toHaveBeenCalledTimes(1);
    expect((await push.status()).enabled).toBe(false);
    expect(await push.token()).toBeNull();
  });
  it('OS 설정에서 권한을 철회한 경우 토큰을 정리한다', async () => {
    const { port, push } = setup('enabled', false);
    expect(await push.restore()).toBeNull();
    expect(port.unregister).toHaveBeenCalled();
    expect(port.register).not.toHaveBeenCalled();
  });
  it('네트워크 철회 실패가 활성 상태를 되돌리지 않는다', async () => {
    const { port, push } = setup('enabled');
    (port.unregister as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await expect(push.disable()).rejects.toThrow('offline');
    expect((await push.status()).enabled).toBe(false);
    await push.restore();
    expect(port.unregister).toHaveBeenCalledTimes(2);
  });
});
