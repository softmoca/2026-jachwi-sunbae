import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { WEB_APP_URL } from '../config';
import NativeJachwiAuth from '../native/NativeJachwiAuth';
import { createAuthController, type AuthPort } from './controller';
import {
  createAuthReplyScript,
  isAuthProvider,
  parseAuthMessage,
  type AuthProvider,
} from './policy';

const ORIGIN = new URL(WEB_APP_URL).origin;

/** Apple 로그인은 iOS에서만 넣는다. Android는 카카오만 쓴다. */
export const SUPPORTED_AUTH_PROVIDERS: Record<string, readonly AuthProvider[]> =
  {
    ios: ['apple', 'kakao'],
    android: ['kakao'],
  };

const createAuthPort = (): AuthPort | null => {
  const native = NativeJachwiAuth;
  if (!native) return null;
  const supported = SUPPORTED_AUTH_PROVIDERS[Platform.OS] ?? [];
  let configured: AuthProvider[] = [];
  try {
    configured = native
      .getProviders()
      .filter(isAuthProvider)
      .filter(provider => supported.includes(provider));
  } catch {
    configured = [];
  }
  return {
    supported,
    configured,
    login: (provider, nonce) => native.login(provider, nonce),
  };
};

/**
 * 웹이 요청하면 Apple 로그인 시트나 카카오 SDK로 id_token을 받아 웹에 넘긴다.
 * 앱은 서버를 직접 부르지 않는다. 토큰을 로그나 분석 도구로 보내지 않는다.
 */
export const useNativeAuth = (inject: (script: string) => void) => {
  const [state] = useState(() => {
    const port = createAuthPort();
    return {
      available: port !== null,
      providers: port?.configured ?? [],
      controller: createAuthController(port),
    };
  });

  const onMessageFromWeb = useCallback(
    async (raw: string, sourceUrl: string): Promise<boolean> => {
      const parsed = parseAuthMessage(raw);
      if (!parsed) return false;
      try {
        if (new URL(sourceUrl).origin !== ORIGIN) return true;
      } catch {
        return true;
      }
      if (parsed.kind === 'invalid') {
        inject(createAuthReplyScript(ORIGIN, parsed.requestId, parsed.reply));
        return true;
      }
      const reply = await state.controller.handle(parsed.request);
      inject(createAuthReplyScript(ORIGIN, parsed.request.requestId, reply));
      return true;
    },
    [state, inject],
  );

  return useMemo(
    () => ({
      available: state.available,
      providers: state.providers,
      onMessageFromWeb,
    }),
    [state, onMessageFromWeb],
  );
};
