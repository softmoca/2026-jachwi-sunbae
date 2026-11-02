module.exports = {
  preset: '@react-native/jest-preset',
  // React Native's Flow/ESM sources need to pass through Babel in npm's
  // flat node_modules layout.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-webview)/)',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/ios/Pods/',
    '<rootDir>/ios/build/',
    '<rootDir>/android/.gradle/',
    '<rootDir>/server/node_modules/',
  ],
};
