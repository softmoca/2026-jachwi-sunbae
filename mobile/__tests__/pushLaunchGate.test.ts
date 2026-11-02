import { startLaunchGate } from '../src/push/launchGate';

describe('push launch gate', () => {
  it('무음 푸시만으로 웹을 띄우지 않고 직접 앱을 열면 표시한다', async () => {
    let listener = (_state: string) => {};
    const ready = jest.fn();
    const stop = jest.fn();
    const dispose = startLaunchGate({
      isHeadless: async () => true,
      getState: () => 'background',
      subscribe: next => {
        listener = next;
        return stop;
      },
      onReady: ready,
    });
    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();
    listener('active');
    listener('active');
    expect(ready).toHaveBeenCalledTimes(1);
    dispose();
    expect(stop).toHaveBeenCalledTimes(1);
  });
  it('이미 전경인 상태라면 이전 headless 여부와 무관하게 표시한다', async () => {
    const ready = jest.fn();
    startLaunchGate({
      isHeadless: async () => true,
      getState: () => 'active',
      subscribe: () => () => {},
      onReady: ready,
    });
    await Promise.resolve();
    expect(ready).toHaveBeenCalledTimes(1);
  });
  it('해제 후 늦게 온 결과가 화면을 띄우지 않는다', async () => {
    const ready = jest.fn();
    const dispose = startLaunchGate({
      isHeadless: async () => false,
      getState: () => 'active',
      subscribe: () => () => {},
      onReady: ready,
    });
    dispose();
    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();
  });
});
