const webpack = require('webpack');
const packageVersion = require('../package.json').version;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const createPlugins = ({ isProduction, buildEnvironment }) => [
  new webpack.DefinePlugin({
    __API_BASE_URL__: JSON.stringify(buildEnvironment.apiBaseUrl),
    __MAP_PROVIDER_MODE__: JSON.stringify(buildEnvironment.mapProviderMode),
    __NAVER_MAP_CLIENT_ID__: JSON.stringify(buildEnvironment.naverMapClientId),
    __POSTHOG_PROJECT_TOKEN__: JSON.stringify(buildEnvironment.posthogProjectToken),
    __POSTHOG_HOST__: JSON.stringify(buildEnvironment.posthogHost),
    __APP_VERSION__: JSON.stringify(buildEnvironment.appVersion ?? packageVersion),
    __APP_ENVIRONMENT__: JSON.stringify(buildEnvironment.appEnvironment),
    __PAGES_BASE_PATH__: JSON.stringify(buildEnvironment.pagesBasePath),
    __ENABLE_MSW__: JSON.stringify(buildEnvironment.isMockingEnabled),
  }),
  new HtmlWebpackPlugin({
    template: './index.html',
    filename: 'index.html',
    inject: true,
  }),
  ...(isProduction
    ? [
        new MiniCssExtractPlugin({
          filename: '[name].[contenthash].css',
          chunkFilename: '[name].[contenthash].css',
        }),
      ]
    : []),
  new BundleAnalyzerPlugin({
    analyzerMode: process.env.ANALYZE === 'true' ? 'static' : 'disabled',
    reportFilename: 'bundle-report.html',
    openAnalyzer: false,
  }),
];

module.exports = { createPlugins };
