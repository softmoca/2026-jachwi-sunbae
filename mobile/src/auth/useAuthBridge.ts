import { useCallback } from 'react';
import { isAllowedWebAppUrl } from '../navigationPolicy';
import { getNativeAuthModule, toAuthSessionError } from './nativeAuthModule';
import {
  AUTH_CALLBACK_SCHEME,
  createAuthReplyScript,
  isAuthCallbackUrl,
  parseAuthRequest,
} from './policy';

/**
 * 웹의 `type: 'auth'` 요청을 처리한다.
 * - open: 시스템 인증 화면을 열고 콜백 주소를 그대로 돌려준다.
 * - persist-session: 로그인으로 바뀐 Refresh 쿠키를 기기 저장소에 백업한다. 웹은 로그인할 때마다 보낸다.
 */
export const useAuthBridge = (inject: (script: string) => void) => {
  const onMessageFromWeb = useCallback(
    async (raw: string, sourceUrl: string): Promise<boolean> => {
      const request = parseAuthRequest(raw);
      if (!request) return false;
      // 우리 웹 화면이 보낸 요청만 처리한다. 응답은 요청한 화면의 출처로만 보낸다.
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
        reply({ ok: false, error: 'unavailable' });
        return true;
      }

      if (request.action === 'persist-session') {
        try {
          const { origin: apiOrigin, name, path, maxAge } = request;
          const saved = await nativeAuth.saveSession({
            origin: apiOrigin,
            name,
            path,
            maxAge,
          });
          reply({ ok: true, saved });
        } catch {
          reply({ ok: false, error: 'unavailable' });
        }
        return true;
      }

      try {
        const callbackUrl = await nativeAuth.openAuthSession(
          request.url,
          AUTH_CALLBACK_SCHEME,
        );
        reply({ ok: true, callbackUrl });
      } catch (error) {
        reply({ ok: false, error: toAuthSessionError(error) });
      }
      return true;
    },
    [inject],
  );

  /**
   * 딥링크로 들어온 인증 콜백을 가로챈다. Android Custom Tabs는 콜백을 앱 딥링크로 돌려주므로
   * 진행 중인 인증 화면에 넘기고, 웹 화면으로는 열지 않는다. iOS는 인증 화면이 직접 받아 보통 여기로 오지 않는다.
   */
  const handleDeepLink = useCallback((url: string): boolean => {
    if (!isAuthCallbackUrl(url)) return false;
    getNativeAuthModule()?.completeAuthSession?.(url);
    return true;
  }, []);

  return { onMessageFromWeb, handleDeepLink };
};

/** 앱을 시작할 때 WebView를 띄우기 전에 부른다. 실패해도 앱 시작을 막지 않는다. */
export const restoreAuthSession = async (): Promise<void> => {
  try {
    await getNativeAuthModule()?.restoreSession();
  } catch {
    // 복원하지 못하면 웹의 자동 로그인이 남은 쿠키로 복원하거나 새 익명 회원을 받는다.
  }
};
