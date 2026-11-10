import { trackPostHogEvent, trackPostHogOutboundEvent } from '@/shared/lib/analytics/posthog';

import type { OAuthOutcome, OAuthProvider } from '../model/oauthLink';

/** 이벤트의 제공자 값. 복귀 화면에서 시작 정보를 잃으면 `unknown`이다. */
export type OAuthAnalyticsProvider = 'kakao' | 'apple' | 'unknown';

/** 매물 수는 그 시점에 알 때만 싣는다(`first_property`와 같은 기준). 추정하지 않는다. */
type PropertyCount = { property_count?: number };

type OAuthLinkEvents = {
  /** 확인 창에서 연결을 눌러 제공자 화면으로 떠나기 직전. */
  oauth_link_started: PropertyCount & { provider: OAuthAnalyticsProvider; already_linked: boolean };
  /** 복귀 화면에서 새 쿠키로 다시 로그인한 뒤. 매물 수는 바뀐 회원(통합 뒤) 기준이다. */
  oauth_link_completed: PropertyCount & {
    provider: OAuthAnalyticsProvider;
    outcome?: Exclude<OAuthOutcome, 'completed'>;
  };
  /**
   * 제공자 화면으로 떠났다가 완료 없이 마이로 돌아왔을 때. #570은 취소와 콜백 실패를 웹으로 돌려보내지 않아
   * 둘을 구분하지 못하고, 사용자가 돌아와 마이를 다시 볼 때만 남는다.
   */
  oauth_link_cancelled: PropertyCount & { provider: OAuthAnalyticsProvider };
  /**
   * 시작 API가 실패했을 때. `session`은 Refresh 쿠키 확인 실패(401), `unavailable`은 제공자 설정 누락이나 장애,
   * 네트워크(503 등), `failed`는 그 밖이다.
   */
  oauth_link_failed: PropertyCount & {
    provider: OAuthAnalyticsProvider;
    reason: 'session' | 'unavailable' | 'failed';
  };
};

export const toAnalyticsProvider = (provider: OAuthProvider | null | undefined): OAuthAnalyticsProvider => {
  if (provider === 'KAKAO') return 'kakao';
  if (provider === 'APPLE') return 'apple';
  return 'unknown';
};

/** 토큰, 인가 코드, 제공자 응답은 싣지 않는다. */
export const trackOAuthLinkEvent = <Event extends keyof OAuthLinkEvents>(
  event: Event,
  properties: OAuthLinkEvents[Event],
) => trackPostHogEvent(event, properties);

/** 시작 이벤트 뒤 바로 제공자 화면으로 떠나므로 SDK 배치 전송 대신 Beacon으로 보낸다. */
export const trackOAuthLinkStarted = (properties: OAuthLinkEvents['oauth_link_started']) =>
  trackPostHogOutboundEvent('oauth_link_started', properties);
