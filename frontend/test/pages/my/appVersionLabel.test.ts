import { describe, expect, it } from 'vitest';

import { formatAppVersionLabel } from '@/pages/my/lib/appVersionLabel';

describe('마이 바닥 버전 문구', () => {
  it('MVP 표기 대신 릴리스 버전을 v 접두어로 보인다', () => {
    expect(formatAppVersionLabel({ appVersion: '3.1.0', mapProviderMode: 'naver' })).toBe('자취선배 v3.1.0');
  });

  it('데모 지도일 때만 그 사실을 덧붙인다', () => {
    expect(formatAppVersionLabel({ appVersion: '3.1.0', mapProviderMode: 'demo' })).toBe('자취선배 v3.1.0 (데모 지도)');
  });

  it('버전을 모르면 앱 이름만 보인다', () => {
    expect(formatAppVersionLabel({ appVersion: '', mapProviderMode: 'naver' })).toBe('자취선배');
  });
});
