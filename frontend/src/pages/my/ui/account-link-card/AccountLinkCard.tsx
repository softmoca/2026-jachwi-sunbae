import { css } from '@emotion/css';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { logoutAuthentication } from '@/features/auth/api/apiClient';
import { isOAuthLinkAvailable } from '@/features/auth/model/oauthAvailability';
import { startOAuthLink } from '@/features/auth/model/oauthFlow';
import {
  OAUTH_PROVIDER_LABELS,
  OAUTH_PROVIDERS,
  type OAuthNotice,
  type OAuthProvider,
  readLinkedProvider,
} from '@/features/auth/model/oauthLink';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import { HOME_PATH } from '@/shared/lib/navigation/appPaths';
import ConfirmDialog from '@/shared/ui/confirm-dialog/ConfirmDialog';
import Icon from '@/shared/ui/icon/Icon';
import Toast from '@/shared/ui/toast/Toast';

type AccountLinkCardProps = { memberId: number };

type DialogState = { kind: 'link'; provider: OAuthProvider } | { kind: 'logout' } | null;

type Status = 'idle' | 'working' | 'failed';

/** 복귀 화면이 넘긴 결과 안내. 다른 화면 상태가 섞여 있어도 형식이 맞을 때만 쓴다. */
export const readOAuthNoticeFromState = (state: unknown): OAuthNotice | null => {
  if (typeof state !== 'object' || state === null || !('oauthNotice' in state)) return null;
  const notice = (state as { oauthNotice: unknown }).oauthNotice;
  if (typeof notice !== 'object' || notice === null) return null;
  const { title, description, tone } = notice as Record<string, unknown>;
  return typeof title === 'string' && typeof description === 'string' && (tone === 'success' || tone === 'error')
    ? { title, description, tone }
    : null;
};

/**
 * 계정 연결. 익명으로 쓰다가 필요할 때 카카오나 Apple 계정을 연결해 기록을 보관하고 다른 기기에서 이어 쓴다.
 * 연결한 회원은 다른 계정으로 바꾸거나 이 기기에서만 로그아웃할 수 있다. 취소나 실패는 지금 회원을 그대로 둔다.
 * 연결 상태는 아직 서버가 알려 주지 않아, 이 기기에서 인증을 마쳤을 때 기억한 값으로 보여 준다.
 */
const AccountLinkCard = ({ memberId }: AccountLinkCardProps) => {
  const config = usePublicConfig();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const linkedProvider = useMemo(() => readLinkedProvider(memberId), [memberId]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [notice, setNotice] = useState<OAuthNotice | null>(() => readOAuthNoticeFromState(location.state));
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);

  // 앱 WebView는 네이티브 로그인을 지원할 때까지 계정 연결과 로그아웃을 보여 주지 않는다.
  if (!isOAuthLinkAvailable()) return null;

  const open = (next: Exclude<DialogState, null>, trigger: HTMLButtonElement) => {
    returnFocusRef.current = trigger;
    setStatus('idle');
    setDialog(next);
  };

  const close = () => {
    if (status === 'working') return;
    setDialog(null);
    setStatus('idle');
  };

  const closeNotice = () => {
    setNotice(null);
    // 새로 고침이나 뒤로 가기로 같은 안내가 다시 뜨지 않게 기록의 상태를 지운다.
    if (readOAuthNoticeFromState(location.state) !== null) {
      void navigate(location.pathname, { replace: true, state: null });
    }
  };

  const confirmLink = async (provider: OAuthProvider) => {
    setStatus('working');
    const result = await startOAuthLink({ config, provider, memberId, linkedProvider });
    // 제공자 화면으로 떠나는 중에는 버튼을 진행 상태로 둔다.
    if (result.kind === 'left-page') return;
    setStatus('idle');
    setDialog(null);
    setNotice(result.notice);
  };

  const confirmLogout = async () => {
    setStatus('working');
    try {
      await logoutAuthentication(config);
    } catch {
      setStatus('failed');
      return;
    }
    // 새 익명 회원으로 바뀌었다. 회원과 무관해 보이는 캐시까지 남기지 않는다.
    queryClient.clear();
    void navigate(HOME_PATH, { replace: true });
  };

  const linkedLabel = linkedProvider === null ? null : OAUTH_PROVIDER_LABELS[linkedProvider];
  const otherProviders = OAUTH_PROVIDERS.filter((provider) => provider !== linkedProvider);

  return (
    <section className={styles.card} aria-labelledby="account-link-title">
      <div className={styles.header}>
        <span className={styles.icon}>
          <Icon name="user" size={16} />
        </span>
        <div>
          <h2 id="account-link-title" className={styles.title}>
            {linkedLabel === null ? '계정 연결' : `${linkedLabel} 계정 연결됨`}
          </h2>
          <p className={styles.description}>
            {linkedLabel === null
              ? '계정을 연결하면 기록을 보관하고 다른 기기에서도 이어서 쓸 수 있어요.'
              : '다른 기기에서도 같은 계정으로 인증하면 이 기록을 이어서 써요.'}
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        {otherProviders.map((provider) => (
          <button
            key={provider}
            type="button"
            className={`${styles.providerButton} ${provider === 'KAKAO' ? styles.kakao : styles.apple}`}
            onClick={(event) => open({ kind: 'link', provider }, event.currentTarget)}
          >
            {linkedLabel === null
              ? `${OAUTH_PROVIDER_LABELS[provider]}로 계속하기`
              : `${OAUTH_PROVIDER_LABELS[provider]} 계정으로 바꾸기`}
          </button>
        ))}
        {linkedLabel !== null && (
          <button
            type="button"
            className={styles.logoutButton}
            onClick={(event) => open({ kind: 'logout' }, event.currentTarget)}
          >
            로그아웃
          </button>
        )}
      </div>

      {dialog?.kind === 'link' && (
        <ConfirmDialog
          isOpen
          tone="primary"
          title={
            linkedLabel === null
              ? `${OAUTH_PROVIDER_LABELS[dialog.provider]} 계정을 연결할까요?`
              : `${OAUTH_PROVIDER_LABELS[dialog.provider]} 계정으로 바꿀까요?`
          }
          confirmLabel={linkedLabel === null ? '연결하기' : '바꾸기'}
          isConfirming={status === 'working'}
          returnFocusRef={returnFocusRef}
          onCancel={close}
          onConfirm={() => void confirmLink(dialog.provider)}
          description={
            linkedLabel === null ? (
              <>
                <p>지금까지의 기록을 이 계정에 보관해요. 한 번 보관한 기록은 다른 계정으로 옮길 수 없어요.</p>
                <p>이미 이 계정으로 쓰던 기록이 있으면 지금 기록을 그쪽으로 합쳐요.</p>
              </>
            ) : (
              <p>
                지금 {linkedLabel} 계정의 기록은 합치지 않고 그대로 남아요. {linkedLabel}로 다시 인증하면 돌아올 수
                있어요.
              </p>
            )
          }
        />
      )}

      {dialog?.kind === 'logout' && (
        <ConfirmDialog
          isOpen
          title="로그아웃할까요?"
          confirmLabel="로그아웃"
          isConfirming={status === 'working'}
          returnFocusRef={returnFocusRef}
          onCancel={close}
          onConfirm={() => void confirmLogout()}
          description={
            <p>
              이 기기에서만 로그아웃하고 새 기록으로 시작해요. {linkedLabel} 계정으로 다시 인증하면 지금 기록으로 돌아올
              수 있어요.
            </p>
          }
        >
          {status === 'failed' && (
            <p role="alert" className={styles.error}>
              로그아웃하지 못했어요. 지금 계정과 기록은 그대로예요. 잠시 후 다시 시도해 주세요.
            </p>
          )}
        </ConfirmDialog>
      )}

      <Toast
        className={styles.toast}
        isOpen={notice !== null}
        title={notice?.title ?? ''}
        description={notice?.description}
        onClose={closeNotice}
      />
    </section>
  );
};

const styles = {
  card: css`
    label: AccountLinkCard-card;
    display: grid;
    gap: 0.875rem;
    padding: var(--my-card-padding);
    border-radius: var(--radius-card);
    background: var(--my-card-surface, var(--color-card-surface));
    color: var(--color-ink);
  `,

  header: css`
    label: AccountLinkCard-header;
    display: grid;
    grid-template-columns: 1.5rem minmax(0, 1fr);
    gap: 0.75rem;
    align-items: start;
  `,

  icon: css`
    label: AccountLinkCard-icon;
    display: grid;
    place-items: center;
    height: 1.4rem;
  `,

  title: css`
    label: AccountLinkCard-title;
    margin: 0;
    font-size: var(--my-text-size, 0.95rem);
    letter-spacing: -0.02em;
  `,

  description: css`
    label: AccountLinkCard-description;
    margin: 0.25rem 0 0;
    color: var(--color-ink-soft);
    font-size: var(--my-subtext-size, 0.78rem);
    line-height: 1.5;
    word-break: keep-all;
  `,

  actions: css`
    label: AccountLinkCard-actions;
    display: grid;
    gap: 0.5rem;
  `,

  /* 제공자 버튼은 각 제공자의 로그인 버튼 색을 따른다(카카오 노랑, Apple 검정). */
  providerButton: css`
    label: AccountLinkCard-providerButton;
    min-height: 2.75rem;
    border: 0;
    border-radius: 0.75rem;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
    }
  `,

  kakao: css`
    label: AccountLinkCard-kakao;
    background: #fee500;
    color: rgb(0 0 0 / 85%);
  `,

  apple: css`
    label: AccountLinkCard-apple;
    background: #000000;
    color: #ffffff;
  `,

  logoutButton: css`
    label: AccountLinkCard-logoutButton;
    justify-self: start;
    padding: 0.25rem 0.35rem;
    border: 0;
    background: none;
    color: var(--color-muted);
    font: inherit;
    font-size: var(--my-subtext-size, 0.78rem);
    text-decoration: underline;
    text-underline-offset: 0.2em;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }
  `,

  error: css`
    label: AccountLinkCard-error;
    margin: 0.75rem 0 0;
    color: var(--color-error);
    font-size: 0.78rem;
    line-height: 1.5;
  `,

  /* 마이 화면은 스크롤되므로 화면 아래에 고정하고, 앱 탭바와 하단 메뉴 위에 띄운다. 등장 애니메이션이 transform을 쓰므로 가운데 정렬은 margin으로 한다. */
  toast: css`
    label: AccountLinkCard-toast;
    position: fixed;
    bottom: calc(5.5rem + var(--native-tab-bar-height, 0px) + env(safe-area-inset-bottom));
    max-width: 26rem;
    margin-right: auto;
    margin-left: auto;
  `,
};

export default AccountLinkCard;
