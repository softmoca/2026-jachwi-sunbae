import { createRequire } from 'node:module';
import { afterEach, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { readBuildEnvironment } = require('../../webpack/build-environment.cjs');

afterEach(() => vi.unstubAllEnvs());

it('Pages 빌드는 로컬 운영 설정이 있어도 데모 API와 지도만 사용한다', () => {
  vi.stubEnv('PAGES_BASE_PATH', '/2026-jachwi-sunbae/');
  vi.stubEnv('ENABLE_MSW', 'false');
  vi.stubEnv('API_BASE_URL', 'https://api.jachwi-sunbae.kr');
  vi.stubEnv('MAP_PROVIDER_MODE', 'naver');
  vi.stubEnv('NAVER_MAP_CLIENT_ID', 'test-map-id');
  vi.stubEnv('POSTHOG_PROJECT_TOKEN', 'test-analytics-token');
  vi.stubEnv('POSTHOG_HOST', 'https://example.com');
  expect(readBuildEnvironment({ isProduction: true })).toMatchObject({
    pagesBasePath: '/2026-jachwi-sunbae/',
    isMockingEnabled: true,
    apiBaseUrl: 'https://prototype.invalid',
    mapProviderMode: 'demo',
    naverMapClientId: '',
    posthogHost: '',
    posthogProjectToken: '',
  });
});

it('일반 운영 빌드 설정을 유지한다', () => {
  vi.stubEnv('PAGES_BASE_PATH', '');
  vi.stubEnv('ENABLE_MSW', 'false');
  vi.stubEnv('API_BASE_URL', 'https://api.jachwi-sunbae.kr');
  vi.stubEnv('MAP_PROVIDER_MODE', 'demo');
  expect(readBuildEnvironment({ isProduction: true })).toMatchObject({
    pagesBasePath: '',
    isMockingEnabled: false,
    apiBaseUrl: 'https://api.jachwi-sunbae.kr',
    mapProviderMode: 'naver',
  });
});

it('잘못된 Pages 경로로 배포 파일을 만들지 않는다', () => {
  vi.stubEnv('PAGES_BASE_PATH', 'https://example.com/');
  expect(() => readBuildEnvironment({ isProduction: true })).toThrow('PAGES_BASE_PATH');
});
