import { css } from '@emotion/css';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { resetAuthentication } from '@/features/auth/api/apiClient';
import { createAccountDeletionMailto } from '@/shared/config/accountDeletion';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import ConfirmDialog from '@/shared/ui/confirm-dialog/ConfirmDialog';
import Icon from '@/shared/ui/icon/Icon';

import * as styles from '../my-row-card/MyRowCard.styles';

type AccountResetCardProps = { memberId: number };

type ResetStatus = 'idle' | 'resetting' | 'failed';

/**
 * 초기화. 확인하면 새 익명 아이디를 받고 홈으로 간다. 이전 기록은 볼 수 없게 되고 서버가 90일 보관 뒤 파기한다.
 * 계정과 데이터를 바로 지우는 것은 아래 링크로 메일 요청을 받는다.
 */
const AccountResetCard = ({ memberId }: AccountResetCardProps) => {
  const config = usePublicConfig();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<ResetStatus>('idle');
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setIsOpen(false);
    setStatus('idle');
  };

  const confirmReset = async () => {
    setStatus('resetting');
    try {
      await resetAuthentication(config);
    } catch {
      setStatus('failed');
      return;
    }
    // 새 회원으로 바뀌면 회원 캐시는 인증 저장소가 지운다. 회원과 무관해 보이는 캐시까지 남기지 않는다.
    queryClient.clear();
    void navigate('/', { replace: true });
  };

  return (
    <div className={localStyles.group}>
      <button ref={triggerRef} className={styles.notice} type="button" onClick={() => setIsOpen(true)}>
        <span className={styles.noticeIcon}>
          <Icon name="refresh" size={16} />
        </span>
        <span>
          <strong>초기화</strong>
          <small>새 아이디로 다시 시작해요.</small>
        </span>
        <Icon name="arrow-right" size={15} />
      </button>
      {/* 메일 앱을 여는 외부 주소라 라우터 링크 대신 일반 링크로 연다. */}
      <a className={localStyles.mailLink} href={createAccountDeletionMailto(memberId)}>
        계정과 데이터를 완전히 지우려면 메일로 요청해 주세요
      </a>
      <ConfirmDialog
        isOpen={isOpen}
        title="초기화할까요?"
        confirmLabel="초기화"
        isConfirming={status === 'resetting'}
        returnFocusRef={triggerRef}
        onCancel={close}
        onConfirm={() => void confirmReset()}
        description={<p>새 아이디로 다시 시작해요. 지금까지의 기록은 더 이상 볼 수 없고, 90일 뒤 파기돼요.</p>}
      >
        {status === 'failed' && (
          <p role="alert" className={localStyles.error}>
            초기화하지 못했어요. 지금 아이디와 기록은 그대로예요. 잠시 후 다시 시도해 주세요.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
};

const localStyles = {
  group: css`
    label: AccountResetCard-group;
    display: grid;
    gap: 0.5rem;
  `,

  /* 카드 아래 작은 글씨 링크. 초기화보다 눈에 덜 띄게 둔다. */
  mailLink: css`
    label: AccountResetCard-mailLink;
    justify-self: start;
    padding: 0.25rem 0.35rem;
    color: var(--color-muted);
    font-size: var(--my-subtext-size, 0.78rem);
    text-decoration: underline;
    text-underline-offset: 0.2em;
    word-break: keep-all;

    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }
  `,

  error: css`
    label: AccountResetCard-error;
    margin: 0.75rem 0 0;
    color: var(--color-error);
    font-size: 0.78rem;
    line-height: 1.5;
  `,
};

export default AccountResetCard;
