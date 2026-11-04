import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * 네이티브 로그인 결과. 실패해도 reject하지 않고 `status: 'error'`로 돌려준다.
 * - success: `idToken`(Apple은 `authorizationCode`도)
 * - cancelled: 사용자가 로그인 화면을 닫음
 * - error: `code`는 'unavailable' | 'not_configured' | 'failed', `message`는 짧은 원인 코드
 */
export type NativeAuthResult = {
  status: string;
  idToken?: string;
  authorizationCode?: string;
  code?: string;
  message?: string;
};

export interface Spec extends TurboModule {
  /** 이 기기에서 지금 바로 쓸 수 있는 제공자. 키가 없으면 빠진다. */
  getProviders(): Array<string>;
  /** `nonce`는 해시하지 않고 그대로 제공자에 넘긴다. */
  login(provider: string, nonce: string): Promise<NativeAuthResult>;
}

// 모듈이 없는 빌드(테스트, 예전 네이티브 코드)에서도 앱이 죽지 않도록 get을 쓴다.
export default TurboModuleRegistry.get<Spec>('JachwiAuth');
