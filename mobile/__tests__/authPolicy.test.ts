import { createAuthReplyScript, parseAuthMessage } from '../src/auth/policy';

const message = (value: object) => JSON.stringify(value);
const login = {
  type: 'auth',
  action: 'login',
  requestId: 'req_1',
  provider: 'kakao',
  nonce: 'n0nce-from-web.~_',
};

describe('auth 브리지 메시지 해석', () => {
  it('로그인 요청을 해석하고 nonce를 바꾸지 않는다', () => {
    expect(parseAuthMessage(message(login))).toEqual({
      kind: 'login',
      request: login,
    });
    expect(
      parseAuthMessage(message({ ...login, provider: 'apple', extra: 1 })),
    ).toEqual({
      kind: 'login',
      request: { ...login, provider: 'apple' },
    });
  });

  it('auth가 아니거나 requestId가 틀리면 답하지 않고 무시한다', () => {
    expect(parseAuthMessage('not json')).toBeNull();
    expect(parseAuthMessage('null')).toBeNull();
    expect(parseAuthMessage(message({ ...login, type: 'push' }))).toBeNull();
    expect(
      parseAuthMessage(message({ ...login, requestId: 'a b' })),
    ).toBeNull();
    expect(
      parseAuthMessage(message({ ...login, requestId: 'x'.repeat(65) })),
    ).toBeNull();
    expect(
      parseAuthMessage(message({ ...login, nonce: 'x'.repeat(3000) })),
    ).toBeNull();
  });

  it('requestId는 맞지만 내용이 틀리면 웹이 기다리지 않게 오류 응답을 만든다', () => {
    expect(parseAuthMessage(message({ ...login, action: 'logout' }))).toEqual({
      kind: 'invalid',
      requestId: 'req_1',
      reply: {
        status: 'error',
        provider: 'kakao',
        code: 'unavailable',
        message: 'unsupported_action',
      },
    });
    expect(
      parseAuthMessage(message({ ...login, provider: 'google' })),
    ).toMatchObject({
      kind: 'invalid',
      reply: { provider: 'google', code: 'unavailable' },
    });
    for (const nonce of ['', 'has space', 'tab\t', 'x'.repeat(257), 42]) {
      expect(parseAuthMessage(message({ ...login, nonce }))).toMatchObject({
        kind: 'invalid',
        reply: { code: 'failed', message: 'invalid_nonce' },
      });
    }
  });
});

describe('auth 응답 직렬화', () => {
  type DispatchedEvent = { type: string; detail: unknown };
  const run = (script: string, origin: string) => {
    const events: DispatchedEvent[] = [];
    const window = {
      location: { origin },
      dispatchEvent: (event: DispatchedEvent) => events.push(event),
    };
    class FakeCustomEvent {
      constructor(readonly type: string, readonly init: { detail: unknown }) {}
      get detail() {
        return this.init.detail;
      }
    }
    // eslint-disable-next-line no-new-func
    new Function('window', 'CustomEvent', script)(window, FakeCustomEvent);
    return events;
  };

  it('우리 출처에서만 jachwi-auth 이벤트로 requestId와 결과를 넘긴다', () => {
    const script = createAuthReplyScript('https://app.example', 'req_1', {
      status: 'success',
      provider: 'apple',
      idToken: 'id.token.value',
      authorizationCode: 'code',
      nonce: 'n',
    });
    const events = run(script, 'https://app.example');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('jachwi-auth');
    expect(events[0].detail).toEqual({
      requestId: 'req_1',
      status: 'success',
      provider: 'apple',
      idToken: 'id.token.value',
      authorizationCode: 'code',
      nonce: 'n',
    });
    expect(run(script, 'https://evil.example')).toHaveLength(0);
  });

  it('제공자 이름에 따옴표가 있어도 스크립트를 깨지 않는다', () => {
    const script = createAuthReplyScript('https://app.example', 'req_1', {
      status: 'error',
      provider: '"});alert(1);//',
      code: 'unavailable',
    });
    expect(run(script, 'https://app.example')[0].detail).toEqual({
      requestId: 'req_1',
      status: 'error',
      provider: '"});alert(1);//',
      code: 'unavailable',
    });
  });
});
