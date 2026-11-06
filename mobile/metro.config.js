const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // babel이 JACHWI_APP_ENV를 번들에 박아 넣으므로 값이 바뀌면 변환 캐시를 새로 쓴다.
  cacheVersion: `app-env-${process.env.JACHWI_APP_ENV ?? 'default'}`,
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
