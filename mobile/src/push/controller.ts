export type PushStatus = { enabled: boolean; permissionGranted: boolean };
export type PushPort = {
  getChoice(): Promise<string | null>;
  setChoice(value: string): Promise<void>;
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  register(): Promise<string>;
  subscribe(): Promise<void>;
  unregister(): Promise<void>;
};

/** 활성화·철회를 직렬화해 토큰 갱신 중 다시 구독되는 경쟁을 막는다. */
export const createPushController = (port: PushPort) => {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const next = queue.then(work);
    queue = next.catch(() => undefined);
    return next;
  };
  const status = async (): Promise<PushStatus> => ({
    enabled: (await port.getChoice()) === 'enabled',
    permissionGranted: await port.hasPermission(),
  });
  const currentToken = async (): Promise<string | null> => {
    const state = await status();
    if (!state.enabled || !state.permissionGranted) return null;
    const token = await port.register();
    await port.subscribe();
    return token;
  };
  return {
    status: () => serial(status),
    token: () => serial(currentToken),
    enable: () =>
      serial(async () => {
        if (!(await port.requestPermission())) return null;
        const token = await port.register();
        await port.subscribe();
        await port.setChoice('enabled');
        return token;
      }),
    disable: () =>
      serial(async () => {
        // 수신 철회 의사를 먼저 보관한다. 네트워크 실패 때 다음 실행에서 재시도한다.
        await port.setChoice('disabled');
        await port.unregister();
      }),
    restore: () =>
      serial(async () => {
        const state = await status();
        if (!state.enabled || !state.permissionGranted) {
          await port.unregister();
          return null;
        }
        return currentToken();
      }),
  };
};
