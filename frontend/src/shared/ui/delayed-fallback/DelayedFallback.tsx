import type { ReactNode } from 'react';

import useDelayedLoading from '@/shared/lib/hooks/useDelayedLoading';

type DelayedFallbackProps = {
  /** 요청이 진행 중인지. TanStack Query의 `isPending` 같은 값을 그대로 넘긴다. */
  isPending: boolean;
  /** 요청이 길어질 때 보여 줄 로딩 UI. */
  fallback: ReactNode;
  /** 로딩 UI가 나타나기 전 빈자리. 내용과 높이가 비슷한 빈 요소를 넣으면 내용이 들어올 때 아래가 밀리지 않는다. */
  placeholder?: ReactNode;
  /** 요청이 끝난 뒤에만 만든다. 요청 중에 데이터가 비어 있는 문제를 피한다. */
  children: () => ReactNode;
};

/**
 * 화면 일부를 불러오는 동안의 로딩 UI. 오류는 대신 그리지 않고, 로딩 UI를 보여 줄지만 정한다.
 * 빠른 응답(300ms 안)에는 로딩 UI 없이 바로 내용을 보여 주고, 한 번 보인 로딩 UI는 250ms는 남겨 깜빡이지 않게 한다.
 * 화면 전체를 대신 그릴 때는 오류와 다시 시도까지 맡는 `QueryState`를 쓴다.
 */
const DelayedFallback = ({ isPending, fallback, placeholder = null, children }: DelayedFallbackProps) => {
  const isLoadingVisible = useDelayedLoading(isPending);
  if (isPending || isLoadingVisible) return <>{isLoadingVisible ? fallback : placeholder}</>;
  return <>{children()}</>;
};

export default DelayedFallback;
