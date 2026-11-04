import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import WebView, {
  type WebViewMessageEvent,
  type WebViewNavigation,
} from 'react-native-webview';
import { version as appVersion } from './package.json';
import { getIsHeadless } from '@react-native-firebase/messaging';
import { getConfiguredMessaging } from './src/push/service';
import { usePushNotifications } from './src/push/usePushNotifications';
import { startLaunchGate } from './src/push/launchGate';
import { WEB_APP_URL } from './src/config';
import { isAllowedWebAppUrl, toWebAppUrl } from './src/navigationPolicy';
import { createNativeContextScript } from './src/webBridge';
import { restoreAuthSession, useAuthBridge } from './src/auth/useAuthBridge';

// 네이티브 탭바를 광고하지 않는다. 웹의 탭바가 그대로 표시된다.
// 'auth'는 시스템 인증 화면과 Refresh 쿠키 백업을 지원한다는 뜻이다. 웹은 이 값으로 계정 연결을 보여 준다.
const NATIVE_FEATURES = ['push', 'auth'] as const;

type ErrorViewProps = {
  onRetry: () => void;
};

const ErrorView = ({ onRetry }: ErrorViewProps) => (
  <View style={styles.stateContainer} accessibilityRole="alert">
    <Text style={styles.stateSymbol}>!</Text>
    <Text style={styles.stateTitle}>화면을 불러오지 못했어요</Text>
    <Text style={styles.stateDescription}>
      인터넷 연결을 확인한 뒤 다시 시도해 주세요.
    </Text>
    <Pressable
      accessibilityRole="button"
      onPress={onRetry}
      style={({ pressed }) => [
        styles.retryButton,
        pressed && styles.retryButtonPressed,
      ]}
    >
      <Text style={styles.retryButtonText}>다시 시도</Text>
    </Pressable>
  </View>
);

const LoadingView = () => (
  <View style={styles.stateContainer}>
    <ActivityIndicator color="#333333" size="large" />
    <Text style={styles.loadingText}>자취선배를 불러오는 중이에요</Text>
  </View>
);

const AppContent = () => {
  const webViewRef = useRef<WebView<object>>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [appUrl, setAppUrl] = useState(WEB_APP_URL);
  const navigateFromPush = useCallback((url: string) => {
    setFailed(false);
    setAppUrl(url);
  }, []);
  const injectPushScript = useCallback((script: string) => {
    webViewRef.current?.injectJavaScript(script);
  }, []);
  const push = usePushNotifications(navigateFromPush, injectPushScript);
  const auth = useAuthBridge(injectPushScript);
  const { handleDeepLink: handleAuthDeepLink } = auth;

  const openDeepLink = useCallback(
    (url: string) => {
      // 인증 화면의 콜백은 웹 화면으로 열지 않고 진행 중인 인증에 넘긴다.
      if (handleAuthDeepLink(url)) return;
      const nextUrl = toWebAppUrl(url);
      if (nextUrl !== null) {
        setFailed(false);
        setAppUrl(nextUrl);
      }
    },
    [handleAuthDeepLink],
  );

  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url !== null && url !== undefined) openDeepLink(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) =>
      openDeepLink(url),
    );
    return () => subscription.remove();
  }, [openDeepLink]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!canGoBack) return false;
        webViewRef.current?.goBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [canGoBack]);

  const retry = () => {
    setFailed(false);
    setReloadKey(current => current + 1);
  };

  const handleWebMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const { data, url } = event.nativeEvent;
      // 각 브리지는 자기 type의 메시지만 처리하고 나머지는 무시한다.
      push.onMessageFromWeb(data, url).catch(() => undefined);
      auth.onMessageFromWeb(data, url).catch(() => undefined);
    },
    [push, auth],
  );

  const handleWebViewLoadEnd = useCallback(() => {
    push.onLoad().catch(() => undefined);
  }, [push]);

  const shouldStartLoad = (request: WebViewNavigation) => {
    if (isAllowedWebAppUrl(request.url)) return true;

    Linking.openURL(request.url).catch(() => {
      setFailed(true);
    });
    return false;
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {failed ? (
        <ErrorView onRetry={retry} />
      ) : (
        <>
          <WebView<object>
            key={reloadKey}
            ref={webViewRef}
            source={{ uri: appUrl }}
            originWhitelist={['https://*', 'about:blank']}
            injectedJavaScriptBeforeContentLoaded={createNativeContextScript(
              Platform.OS,
              NATIVE_FEATURES,
            )}
            onMessage={handleWebMessage}
            onShouldStartLoadWithRequest={shouldStartLoad}
            onNavigationStateChange={({ canGoBack: nextCanGoBack }) =>
              setCanGoBack(nextCanGoBack)
            }
            onLoad={handleWebViewLoadEnd}
            onError={() => setFailed(true)}
            onContentProcessDidTerminate={() => webViewRef.current?.reload()}
            renderLoading={LoadingView}
            startInLoadingState
            allowsBackForwardNavigationGestures
            allowsInlineMediaPlayback
            applicationNameForUserAgent={`JachwiSunbae/${appVersion} ${Platform.OS}`}
            automaticallyAdjustContentInsets={false}
            bounces={false}
            contentInsetAdjustmentBehavior="never"
            geolocationEnabled
            keyboardDisplayRequiresUserAction={false}
            mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
            sharedCookiesEnabled
            thirdPartyCookiesEnabled={false}
            setSupportMultipleWindows={false}
            style={styles.webView}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const App = () => {
  const [ready, setReady] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  // WebView 쿠키를 잃었으면 기기 저장소의 백업으로 되살린 뒤 웹을 연다. 웹의 자동 로그인이 그 쿠키로 같은 회원을 복원한다.
  useEffect(() => {
    restoreAuthSession().finally(() => setSessionRestored(true));
  }, []);
  useEffect(() => {
    const messaging = getConfiguredMessaging();
    if (!messaging) {
      setReady(true);
      return undefined;
    }
    // iOS 무음 푸시로 백그라운드 기동됐을 때 웹 조회/분석을 실행하지 않는다.
    return startLaunchGate({
      isHeadless: () => getIsHeadless(messaging),
      getState: () => AppState.currentState ?? null,
      subscribe: listener => {
        const subscription = AppState.addEventListener('change', listener);
        return () => subscription.remove();
      },
      onReady: () => setReady(true),
    });
  }, []);
  return ready && sessionRestored ? (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  ) : null;
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  webView: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  stateContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateSymbol: {
    backgroundColor: '#f5b91e',
    borderRadius: 28,
    color: '#111111',
    fontSize: 28,
    fontWeight: '800',
    height: 56,
    lineHeight: 56,
    marginBottom: 20,
    overflow: 'hidden',
    textAlign: 'center',
    width: 56,
  },
  stateTitle: {
    color: '#212124',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  stateDescription: {
    color: '#5f6368',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  loadingText: {
    color: '#5f6368',
    fontSize: 15,
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: '#333333',
    borderRadius: 12,
    marginTop: 24,
    minWidth: 132,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  retryButtonPressed: {
    backgroundColor: '#222222',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default App;
