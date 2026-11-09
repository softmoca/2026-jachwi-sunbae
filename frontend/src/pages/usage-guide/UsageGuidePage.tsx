import { css } from '@emotion/css';
import { useLocation } from 'react-router-dom';

import { LogScreen } from '@/shared/lib/analytics/logging';
import { HOME_PATH } from '@/shared/lib/navigation/appPaths';
import { ButtonLink } from '@/shared/ui/button/Button';
import PageHeading from '@/shared/ui/page-heading/PageHeading';

import UsageDemo from './ui/usage-demo/UsageDemo';

const RECORD_NOTES = [
  '가입이나 로그인 없이 바로 기록할 수 있어요.',
  '같은 브라우저나 앱으로 다시 오면 기록이 이어져요.',
];

/** 예전 랜딩을 대신하는 사용 방법. 회원 여부와 상관없이 볼 수 있고, 단계마다 실제 기능으로 이어 준다. */
const UsageGuidePage = () => {
  // 같은 화면에 다시 들어올 때마다(주소 이동마다) 한 번 진입 로그를 남긴다.
  const { key } = useLocation();

  return (
    <LogScreen key={key} event="usage_guide_viewed">
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.introduction}>
            <PageHeading title="사용 방법" />
            <p>자취할 동네를 찾고, 직접 본 방을 기록해요.</p>
          </header>
          <section className={styles.recordNotice} aria-labelledby="record-notice-heading">
            <h2 id="record-notice-heading">로그인 없이 바로 시작해요</h2>
            <ul>
              {RECORD_NOTES.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
          <UsageDemo />
          <div className={styles.actions}>
            <ButtonLink to={HOME_PATH} fullWidth>
              홈에서 시작하기
            </ButtonLink>
          </div>
        </div>
      </main>
    </LogScreen>
  );
};

const styles = {
  page: css`
    label: UsageGuidePage-page;
    min-height: 100%;
    background: var(--color-canvas);
    color: var(--color-ink);
  `,

  container: css`
    label: UsageGuidePage-container;
    width: min(100%, 56rem);
    margin: 0 auto;
    padding: 0 var(--page-inline-padding) 0;
  `,

  introduction: css`
    label: UsageGuidePage-introduction;

    & p {
      margin: 0 0 1.25rem;
      color: var(--color-ink-soft);
      font-size: 0.9rem;
      line-height: 1.5;
    }
  `,

  recordNotice: css`
    label: UsageGuidePage-recordNotice;
    margin-bottom: 2rem;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-muted);

    & h2 {
      margin: 0 0 0.6rem;
      font-size: 0.9rem;
    }

    & ul {
      display: grid;
      gap: 0.4rem;
      margin: 0;
      padding-left: 1.1rem;
      color: var(--color-ink-soft);
      font-size: 0.78rem;
      line-height: 1.5;
    }
  `,

  actions: css`
    label: UsageGuidePage-actions;
    position: sticky;
    bottom: 0;
    margin: 0 calc(var(--page-inline-padding) * -1);
    padding: 0.75rem var(--page-inline-padding) max(0.75rem, env(safe-area-inset-bottom));
    background: linear-gradient(to bottom, rgb(255 255 255 / 0%), var(--color-canvas) 1rem);

    @media (min-width: 48rem) {
      position: static;
      max-width: 20rem;
      margin: 0 auto;
      padding-inline: 0;
      background: none;
    }
  `,
};

export default UsageGuidePage;
