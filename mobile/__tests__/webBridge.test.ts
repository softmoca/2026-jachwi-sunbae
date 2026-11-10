import {
  createNativeContextScript,
  createSelectTabScript,
  createTabBarHeightScript,
  parseWebMessage,
} from '../src/webBridge';

describe('webBridge', () => {
  it('웹이 보낸 라우트 메시지를 해석하고 모르는 메시지는 무시한다', () => {
    expect(parseWebMessage('{"type":"route","path":"/map","activeTab":"map","isTabBarVisible":true}')).toEqual({
      type: 'route',
      activeTab: 'map',
      isTabBarVisible: true,
    });
    expect(parseWebMessage('{"type":"route","activeTab":null,"isTabBarVisible":false}')).toEqual({
      type: 'route',
      activeTab: null,
      isTabBarVisible: false,
    });
    expect(parseWebMessage('{"type":"other"}')).toBeNull();
    expect(parseWebMessage('not json')).toBeNull();
  });

  it('앱 기능 목록을 웹에 알리는 스크립트를 만든다', () => {
    const script = createNativeContextScript('ios', ['tab-bar']);
    expect(script).toContain('"ios"');
    expect(script).toContain('["tab-bar"]');
  });

  it('version은 2로 두고 로그인 제공자, 앱 버전, 빌드 번호를 더한다', () => {
    const read = (script: string) => {
      const window: Record<string, unknown> = { dispatchEvent: () => true };
      class FakeCustomEvent {}
      // eslint-disable-next-line no-new-func
      new Function('window', 'CustomEvent', script)(window, FakeCustomEvent);
      return window.__JACHWI_NATIVE_APP__;
    };
    expect(
      read(
        createNativeContextScript('ios', ['push', 'auth'], {
          authProviders: ['apple', 'kakao'],
          appVersion: '2.2.0',
          appBuild: '9',
        }),
      ),
    ).toEqual({
      platform: 'ios',
      version: 2,
      features: ['push', 'auth'],
      authProviders: ['apple', 'kakao'],
      appVersion: '2.2.0',
      appBuild: '9',
    });
    // 네이티브에서 읽지 못하면 null로 알린다. 브리지 버전(version)은 앱 버전과 섞지 않는다.
    expect(read(createNativeContextScript('android', ['push']))).toEqual({
      platform: 'android',
      version: 2,
      features: ['push'],
      authProviders: [],
      appVersion: null,
      appBuild: null,
    });
    expect(
      read(createNativeContextScript('ios', [], { appVersion: '"});alert(1);//' })),
    ).toMatchObject({ appVersion: '"});alert(1);//' });
  });

  it('탭 키와 높이를 안전하게 스크립트에 넣는다', () => {
    expect(createSelectTabScript('map')).toContain('selectTab("map")');
    expect(createSelectTabScript('");alert(1);("')).toContain('selectTab("\\");alert(1);(\\"")');
    expect(createTabBarHeightScript(49.4)).toContain("'49px'");
  });
});
