import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

import { currentMemberQueryKey } from '@/shared/api/queryClient';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import { fetchCurrentMember } from './memberApi';

export const getCurrentMemberQueryOptions = (config: PublicConfig) => ({
  queryKey: currentMemberQueryKey,
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchCurrentMember(config, signal),
  staleTime: 5 * 60 * 1_000,
});

export const useCurrentMember = (isEnabled = true) => {
  const config = usePublicConfig();
  return useQuery({
    ...getCurrentMemberQueryOptions(config),
    enabled: isEnabled,
  });
};

/**
 * 회원 화면 입구(`ProtectedRoute`) 안에서 회원 정보가 필요할 때 쓴다. 자동 로그인이 끝날 때까지는 Suspense로 기다린다.
 * 로그인이나 회원 조회가 실패하면 입구가 이 화면 대신 오류 화면을 그린다.
 */
export const useMember = () => {
  const config = usePublicConfig();
  return useSuspenseQuery(getCurrentMemberQueryOptions(config)).data;
};
