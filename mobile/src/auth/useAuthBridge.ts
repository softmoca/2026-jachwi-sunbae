import { useCallback, useRef } from 'react';
import { NativeModules } from 'react-native';
import { isAllowedWebAppUrl } from '../navigationPolicy';
import {
  AUTH_CALLBACK_SCHEME,
  createAuthReplyScript,
  isAuthCallbackUrl,
  parseAuthRequest,
  toAuthSessionError,
} from './policy';

/**
 * 네이티브 인증 모듈. iOS는 `ios/JachwiNativeUI/Sources/JachwiAuthModule.m`(ASWebAuthenticationSession),
 * Android는 `android/app/src/main/java/com/jachwisunbae/app/auth/JachwiAuthModule.kt`(Custom Tabs)다.
 * 실패는 `cancelled`, `busy`, `failed` 코드로 거절한다.
 */
type JachwiAuthNativeModule = {
  openAuthSession(url: string, callbackScheme: string): Promise<string>;
  completeAuthSession(callbackUrl: string): void;
};

const getNativeAuthModule = (): JachwiAuthNativeModule | null =>
  (NativeModules.JachwiAuth as JachwiAuthNativeModule | undefined) ?? null;

/**
 * 웹의 `{ type: 'auth', action: 'open', requestId, url }` 요청을 처리한다. 인증 화면을 열고,
 * 돌아온 `jachwisunbae://` 주소나 실패 종류를 `jachwi-auth` 이벤트로 돌려준다.
 */
export const useAuthBridge = (inject: (script: string) => void) => {
  // 인증 화면이 열려 있는 동안에만 우리 스킴 딥링크를 인증 결과로 가로챈다.
  const isSessionOpen = useRef(false);

  const onMessageFromWeb = useCallback(
    async (raw: string, sourceUrl: string): Promise<boolean> => {
      const request = parseAuthRequest(raw);
      if (!request) return false;
      // 우리 웹 화면이 보낸 요청만 처리하고, 응답은 요청한 화면의 출처로만 보낸다.
      if (sourceUrl === 'about:blank' || !isAllowedWebAppUrl(sourceUrl))
        return true;
      const origin = new URL(sourceUrl).origin;
      const reply = (value: object) =>
        inject(
          createAuthReplyScript(origin, {
            type: 'auth:response',
            requestId: request.requestId,
            ...value,
          }),
        );

      const nativeAuth = getNativeAuthModule();
      if (!nativeAuth) {
        reply({ ok: false, error: 'failed' });
        return true;
      }
      isSessionOpen.current = true;
      try {
        const callbackUrl = await nativeAuth.openAuthSession(
          request.url,
          AUTH_CALLBACK_SCHEME,
        );
        reply({ ok: true, callbackUrl });
      } catch (error) {
        reply({ ok: false, error: toAuthSessionError(error) });
      } finally {
        isSessionOpen.current = false;
      }
      return true;
    },
    [inject],
  );

  /**
   * Android Custom Tabs는 콜백을 앱 딥링크로 돌려준다. 인증 화면이 열려 있으면 그 결과로 넘기고 웹 화면으로는 열지 않는다.
   * 보통은 네이티브가 먼저 받아 끝내므로 이 호출은 아무 일도 하지 않는다. iOS는 인증 화면이 직접 받는다.
   */
  const handleDeepLink = useCallback((url: string): boolean => {
    if (!isSessionOpen.current || !isAuthCallbackUrl(url)) return false;
    getNativeAuthModule()?.completeAuthSession(url);
    return true;
  }, []);

  return { onMessageFromWeb, handleDeepLink };
};
