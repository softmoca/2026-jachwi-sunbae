import { css } from '@emotion/css';

import { Button } from '@/shared/ui/button/Button';

import type { WeatherTestPushStatus } from '../../model/useWeatherTestPush';

type WeatherTestPushButtonProps = {
  status: WeatherTestPushStatus;
  secondsLeft: number;
  onSend: () => void;
};

const MESSAGES: Record<WeatherTestPushStatus, string | null> = {
  idle: null,
  waiting: '지금 홈 화면으로 나가면 푸시 알림으로 받을 수 있어요.',
  sending: null,
  sent: '테스트 알림을 보냈어요. 기기 알림을 확인해 주세요.',
  'not-sent': '테스트 알림을 보내지 못했어요. 기기 연결을 확인해 주세요.',
  failed: '테스트 알림 요청에 실패했어요. 잠시 뒤 다시 시도해 주세요.',
};

/** dev 서버에서 등록된 내 기기로 테스트 푸시 알림을 보내는 버튼 */
const WeatherTestPushButton = ({ status, secondsLeft, onSend }: WeatherTestPushButtonProps) => {
  const message = MESSAGES[status];

  return (
    <div>
      <Button variant="secondary" disabled={status === 'waiting' || status === 'sending'} onClick={onSend}>
        {status === 'waiting' ? `${secondsLeft}초 뒤 보내요` : status === 'sending' ? '보내는 중' : '푸시 알림 테스트'}
      </Button>
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
    </div>
  );
};

const styles = {
  message: css`
    label: WeatherTestPushButton-message;
    margin: 0.6rem 0 0;
    color: var(--color-ink-soft);
    font-size: 0.65rem;
  `,
};

export default WeatherTestPushButton;
