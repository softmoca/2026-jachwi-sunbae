import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { usePublicConfig } from '@/shared/config/PublicConfigContext';

import { getPropertyDetailQueryOptions } from '../api/useProperties';
import type { RecentEdit } from '../lib/recentEdit';
import { readActiveRecentEdit, RECENT_EDIT_WINDOW_MS, recentEditPath } from '../lib/recentEdit';

/**
 * 10분 안에 고치던 매물이 있으면 그 이름과 돌아갈 주소를 준다. 지금 그 매물 화면이면 주지 않는다. 없으면 `null`이다.
 * 화면이 바뀔 때, 탭이나 앱으로 돌아올 때 다시 확인하고, 10분이 지나는 순간 스스로 `null`이 된다.
 */
export const useRecentEdit = () => {
  const { pathname } = useLocation();
  const [edit, setEdit] = useState<RecentEdit | null>(() => readActiveRecentEdit(pathname));
  const config = usePublicConfig();
  const detail = useQuery({ ...getPropertyDetailQueryOptions(config, edit?.propertyId ?? 0), enabled: edit !== null });

  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState === 'visible') setEdit(readActiveRecentEdit(pathname));
    };
    recheck();
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [pathname]);

  // 10분이 지나면 안내를 내린다.
  const at = edit?.at;
  useEffect(() => {
    if (at === undefined) return;
    const timer = window.setTimeout(
      () => setEdit(readActiveRecentEdit(pathname)),
      Math.max(0, at + RECENT_EDIT_WINDOW_MS - Date.now()) + 50,
    );
    return () => window.clearTimeout(timer);
  }, [at, pathname]);

  const name = edit === null ? undefined : detail.data?.name;
  if (edit === null || name === undefined) return null;
  return { name, kind: edit.kind, path: recentEditPath(edit), at: edit.at };
};
