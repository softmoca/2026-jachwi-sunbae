import type { ReactNode } from 'react';

import useDelayedLoading from '@/shared/lib/hooks/useDelayedLoading';

import ContentState from '../content-state/ContentState';
import PageLoading from '../page-loading/PageLoading';
import LoadingRegion from '../skeleton/LoadingRegion';

type QueryLike<TData> = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: TData | undefined;
  refetch: () => unknown;
};

export type QueryErrorView = {
  title: string;
  description?: ReactNode;
  /** 다시 시도해도 결과가 같은 오류(없는 리소스 등)는 끈다. */
  canRetry: boolean;
};

type QueryStateProps<TData> = {
  query: QueryLike<TData>;
  /** 기다리는 동안 읽기 프로그램에만 알리는 안내. 화면에는 글자를 띄우지 않는다. */
  loadingTitle: string;
  /** 페이지 레이아웃 뼈대. 주면 기다리는 동안 뼈대를 그리고, 없으면 가운데에 Progress Circle(40)을 둔다. */
  skeleton?: ReactNode;
  describeError: (error: unknown) => QueryErrorView;
  /**
   * 켜면 빠른 응답(약 300ms 안)에는 로딩 UI 없이 빈 자리만 두었다가 바로 내용을 보여 준다. 느릴 때만 뼈대를 그린다.
   * 같은 화면 안에서 항목을 넘기며 다시 불러오는 곳(이전, 다음)에서 뼈대가 깜빡이지 않게 할 때 쓴다.
   */
  delayLoading?: boolean;
  /** 오류 화면에 함께 보여 줄 돌아가기 링크 같은 동작. */
  errorAction?: ReactNode;
  children: (data: TData) => ReactNode;
};

/**
 * 페이지 전체를 조회 결과로 그릴 때, 기다리는 동안과 실패했을 때의 화면을 대신 그린다.
 * 페이지를 바꾸는 중이라 남겨 둘 내용이 없으므로 로딩을 늦추지 않고 바로 보여 준다. 글자로만 된 로딩은 두지 않는다.
 */
const QueryState = <TData,>({
  query,
  loadingTitle,
  skeleton,
  describeError,
  errorAction,
  delayLoading = false,
  children,
}: QueryStateProps<TData>) => {
  const isLoadingVisible = useDelayedLoading(query.isPending && delayLoading);
  if (query.isPending) {
    // 빠른 응답을 기다리는 동안은 로딩 UI를 아직 그리지 않는다. 읽기 프로그램에는 기다리는 중임을 알린다.
    if (delayLoading && !isLoadingVisible) return <div role="status" aria-label={loadingTitle} />;
    return skeleton === undefined ? (
      <PageLoading label={loadingTitle} />
    ) : (
      <LoadingRegion label={loadingTitle}>{skeleton}</LoadingRegion>
    );
  }

  if (query.isError || query.data === undefined) {
    const { title, description, canRetry } = describeError(query.error);
    return (
      <ContentState
        tone="error"
        title={title}
        description={description}
        onRetry={canRetry ? () => void query.refetch() : undefined}
      >
        {errorAction}
      </ContentState>
    );
  }

  return children(query.data);
};

export default QueryState;
