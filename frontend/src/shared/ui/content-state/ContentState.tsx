import type { ReactNode } from 'react';

import { Button } from '@/shared/ui/button/Button';
import RefreshIcon from '@/shared/ui/icon/icons/RefreshIcon';
import StateIllustration from '@/shared/ui/state-illustration/StateIllustration';

type ContentStateProps = {
  /** 화면 전체를 차지하는 상태인지. 목록 안에 끼워 넣을 때는 끈다. */
  page?: boolean;
  tone?: 'info' | 'error';
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  /** 돌아가기 링크처럼 상태에 딸린 추가 동작. */
  children?: ReactNode;
};

/** 오류나 빈 주소처럼 화면 대신 보여 주는 안내를 한 곳에서 그린다. 로딩은 뼈대나 Progress Circle로 그리고 여기서 맡지 않는다. */
const ContentState = ({
  page = true,
  tone = 'info',
  title,
  description,
  onRetry,
  retryLabel = '다시 시도',
  children,
}: ContentStateProps) => {
  const body = (
    <div
      className={`content-state ${tone === 'error' ? 'content-state--error' : ''} ${page ? 'content-state--page' : ''}`.trim()}
      role={tone === 'error' ? 'alert' : undefined}
    >
      {tone === 'error' && <StateIllustration name="error" size={page ? 13 : 9} />}
      {title !== undefined && <strong>{title}</strong>}
      {description !== undefined && <span>{description}</span>}
      {onRetry !== undefined && (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshIcon size={16} />
          {retryLabel}
        </Button>
      )}
      {children}
    </div>
  );

  if (!page) return body;

  return (
    // 화면 전체를 차지하는 안내는 카드에 담지 않고 화면의 가로, 세로 가운데에 둔다.
    <main className="property-page content-state-screen">
      <div className="page-container">{body}</div>
    </main>
  );
};

export default ContentState;
