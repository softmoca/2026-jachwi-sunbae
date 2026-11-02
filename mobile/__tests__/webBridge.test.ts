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

  it('탭 키와 높이를 안전하게 스크립트에 넣는다', () => {
    expect(createSelectTabScript('map')).toContain('selectTab("map")');
    expect(createSelectTabScript('");alert(1);("')).toContain('selectTab("\\");alert(1);(\\"")');
    expect(createTabBarHeightScript(49.4)).toContain("'49px'");
  });
});
