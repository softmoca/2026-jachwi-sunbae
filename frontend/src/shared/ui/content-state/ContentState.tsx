import type { ReactNode } from 'react';

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
      className={`content-state ${tone === 'error' ? 'content-state--error' : ''}`.trim()}
      role={tone === 'error' ? 'alert' : undefined}
    >
      {tone === 'error' && <StateIllustration name="error" size={8} />}
      {title !== undefined && <strong>{title}</strong>}
      {description !== undefined && <span>{description}</span>}
      {onRetry !== undefined && (
        <button type="button" className="inline-button" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
      {children}
    </div>
  );

  if (!page) return body;

  return (
    <main className="property-page">
      <div className="page-container">{body}</div>
    </main>
  );
};

export default ContentState;
