import { css } from '@emotion/css';

import { LogClick } from '@/shared/lib/analytics/logging';
import { isRunningInNativeApp } from '@/shared/lib/native-app/nativeApp';
import { HOME_PATH } from '@/shared/lib/navigation/appPaths';
import { ButtonLink } from '@/shared/ui/button/Button';

import { APP_STORES } from '../model/landingContent';

type LandingGetStartedProps = {
  /** 광고 유입(utm 등)을 홈까지 이어서 측정하려고 넘긴다. */
  search: string;
  position: 'top' | 'bottom';
  /** 데스크탑은 한 줄로, 휴대폰은 스토어 배지 둘을 나란히 두고 웹 바로가기를 아래 꽉 차게 둔다. */
  layout: 'row' | 'stack';
  /** 서비스 안에서 들어왔으면 돌아갈 주소. 있으면 웹 바로가기 대신 이 주소로 돌아가는 버튼을 둔다. */
  returnTo?: string;
};

const AppleLogo = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
    />
  </svg>
);

const GooglePlayLogo = () => (
  <svg viewBox="0 0 24 26" width="24" height="26" aria-hidden="true">
    <path fill="#4285F4" d="M1 .5 13.4 13 1 25.5Z" />
    <path fill="#34A853" d="M1 .5 17.6 9.9 13.4 13Z" />
    <path fill="#FBBC04" d="M17.6 9.9 23 13l-5.4 3.1-4.2-3.1Z" />
    <path fill="#EA4335" d="M13.4 13 17.6 16.1 1 25.5Z" />
  </svg>
);

/** 스토어 공식 배지처럼 검은 바탕에 로고와 두 줄 글자를 둔다. */
const BADGES = {
  app_store: { logo: <AppleLogo />, caption: 'Download on the', name: 'App Store' },
  google_play: { logo: <GooglePlayLogo />, caption: 'GET IT ON', name: 'Google Play' },
};

/**
 * 앱 받기와 웹 바로가기. 첫 화면과 마지막 화면에 같이 둔다.
 * 서비스 안에서 들어왔으면 웹 바로가기 자리에 돌아가기를 두고, 앱 안에서는 이미 설치했으므로 스토어 배지를 숨긴다.
 */
const LandingGetStarted = ({ search, position, layout, returnTo }: LandingGetStartedProps) => {
  const showsStores = !isRunningInNativeApp();
  return (
    <div className={layout === 'row' ? styles.row : styles.stack}>
      {showsStores &&
        APP_STORES.map((app) => {
          const badge = BADGES[app.store];
          return (
            <LogClick key={app.store} event="landing_app_store_clicked" params={{ store: app.store, position }}>
              <a href={app.href} target="_blank" rel="noreferrer" className={styles.badge} aria-label={app.label}>
                {badge.logo}
                <span className={styles.badgeText} aria-hidden="true">
                  <small>{badge.caption}</small>
                  {badge.name}
                </span>
              </a>
            </LogClick>
          );
        })}
      <LogClick event="landing_web_start_clicked" params={{ position }}>
        <ButtonLink
          to={returnTo ?? { pathname: HOME_PATH, search }}
          size="large"
          className={layout === 'stack' ? styles.fullRow : undefined}
        >
          {returnTo === undefined ? '웹에서 바로 시작하기' : '서비스로 돌아가기'}
        </ButtonLink>
      </LogClick>
    </div>
  );
};

const styles = {
  row: css`
    label: LandingGetStarted-row;
    display: flex;
    flex-wrap: wrap;
    gap: 0.625rem;
  `,

  stack: css`
    label: LandingGetStarted-stack;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  `,

  /* 스토어 배지 높이는 공통 Button의 large(52px)와 맞춘다. */
  badge: css`
    label: LandingGetStarted-badge;
    display: inline-flex;
    min-height: 3.25rem;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0 1.125rem 0 0.875rem;
    border: 1px solid #a6a6a6;
    border-radius: 0.6rem;
    background: #000;
    color: #fff;
    text-decoration: none;

    &:focus-visible {
      outline: 3px solid var(--color-focus);
      outline-offset: 2px;
    }
  `,

  badgeText: css`
    label: LandingGetStarted-badgeText;
    display: grid;
    font-size: 1.2rem;
    font-weight: 600;
    line-height: 1.05;
    letter-spacing: -0.01em;
    white-space: nowrap;

    & small {
      font-size: 0.66rem;
      font-weight: 500;
      letter-spacing: 0.01em;
    }
  `,

  fullRow: css`
    label: LandingGetStarted-fullRow;
    grid-column: 1 / -1;
  `,
};

export default LandingGetStarted;
