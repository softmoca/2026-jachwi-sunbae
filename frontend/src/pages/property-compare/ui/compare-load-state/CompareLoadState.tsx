import { css } from '@emotion/css';
import type { ReactNode } from 'react';

import { getPropertyErrorMessage } from '@/features/property/api/propertyErrorMessages';
import type { usePropertyList } from '@/features/property/api/useProperties';
import { Button } from '@/shared/ui/button/Button';
import InlineNotice from '@/shared/ui/inline-notice/InlineNotice';
import PageLoading from '@/shared/ui/page-loading/PageLoading';

type CompareLoadStateProps = {
  properties: ReturnType<typeof usePropertyList>;
  /** 매물을 받은 뒤에만 그리는 비교 화면 내용. */
  children: () => ReactNode;
};

/**
 * 비교할 매물을 불러오는 동안과 불러오지 못했을 때의 안내를 맡고, 받은 뒤에만 내용을 그린다.
 * 새로 연 비교 화면의 본문 전체라 남겨 둘 내용이 없으므로, 늦추지 않고 가운데에 Progress Circle(40)을 바로 둔다.
 */
const CompareLoadState = ({ properties, children }: CompareLoadStateProps) => {
  if (properties.isPending) return <PageLoading label="매물을 불러오는 중이에요." />;
  if (properties.isError) {
    return (
      <div className={styles.errorState}>
        <InlineNotice tone="error">{getPropertyErrorMessage(properties.error)}</InlineNotice>
        <Button variant="secondary" fullWidth onClick={() => void properties.refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }
  return <>{children()}</>;
};

const styles = {
  errorState: css`
    label: CompareLoadState-errorState;
    display: grid;
    gap: 0.75rem;
  `,
};

export default CompareLoadState;
