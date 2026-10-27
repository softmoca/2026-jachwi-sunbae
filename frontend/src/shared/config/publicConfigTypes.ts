export type PublicConfig = {
  apiBaseUrl: string;
  goodPriceApiBaseUrl?: string;
  mapProviderMode?: 'demo' | 'naver';
  naverMapClientId?: string;
  posthogProjectToken?: string;
  posthogHost?: string;
  appVersion?: string;
  appEnvironment?: 'production' | 'development';
};
