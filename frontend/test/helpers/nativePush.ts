/** 저장소 모바일 2.1.1(8)의 실제 메시지 규격을 사용하는 테스트 브리지. 값은 가짜다. */
export const installNativePush = () => {
  const state = {
    enabled: true,
    permissionGranted: true,
    token: 'fake-test-fcm-token',
    actions: [] as string[],
    paused: false,
    replies: [] as (() => void)[],
  };
  window.__JACHWI_NATIVE_APP__ = { platform: 'ios', version: 2, features: ['push'] };
  window.ReactNativeWebView = {
    postMessage: (raw) => {
      const request = JSON.parse(raw) as { action: string; requestId: string };
      state.actions.push(request.action);
      const reply = () => {
        if (request.action === 'enable' && state.permissionGranted) state.enabled = true;
        window.dispatchEvent(
          new CustomEvent('jachwi-push', {
            detail: {
              type: 'push:response',
              requestId: request.requestId,
              ok: true,
              ...(request.action === 'token'
                ? { token: state.token }
                : { enabled: state.enabled, permissionGranted: state.permissionGranted }),
            },
          }),
        );
      };
      if (state.paused) state.replies.push(reply);
      else queueMicrotask(reply);
    },
  };
  return state;
};
