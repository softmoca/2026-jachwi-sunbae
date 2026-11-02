type LaunchGateOptions = {
  isHeadless(): Promise<boolean>;
  getState(): string | null;
  subscribe(listener: (state: string) => void): () => void;
  onReady(): void;
};

/** 무음 푸시 기동은 숨기되, 나중에 사용자가 앱을 열면 정상 화면을 표시한다. */
export const startLaunchGate = ({
  isHeadless,
  getState,
  subscribe,
  onReady,
}: LaunchGateOptions) => {
  let disposed = false;
  let ready = false;
  const reveal = () => {
    if (!disposed && !ready) {
      ready = true;
      onReady();
    }
  };
  const stop = subscribe(state => {
    if (state === 'active') reveal();
  });
  isHeadless()
    .then(headless => {
      if (!headless || getState() === 'active') reveal();
    })
    .catch(() => {
      if (getState() === 'active') reveal();
    });
  return () => {
    disposed = true;
    stop();
  };
};
