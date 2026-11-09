import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { usePublicConfig } from '@/shared/config/PublicConfigContext';

import { getPropertyDetailQueryOptions } from '../api/useProperties';
import type { RecentEdit } from '../lib/recentEdit';
import { readRecentEdit, recentEditPath } from '../lib/recentEdit';

const SHOWN_KEY = 'jachwi-resume-edit-checked';

/** 이 탭에서 처음 앱에 들어왔을 때 한 번만 기록을 읽는다. 이후 고친 것은 띄우지 않는다. */
const readOnFirstEntry = (): RecentEdit | null => {
  try {
    if (window.sessionStorage.getItem(SHOWN_KEY) !== null) return null;
    window.sessionStorage.setItem(SHOWN_KEY, '1');
  } catch {
    // 저장소를 못 쓰면 처음 들어온 것으로 보고 읽는다.
  }
  return readRecentEdit();
};

/** 처음 들어왔을 때 10분 안에 고치던 매물이 있으면 그 이름과 돌아갈 주소를 준다. 없으면 `null`이다. */
export const useRecentEdit = () => {
  const [edit] = useState<RecentEdit | null>(readOnFirstEntry);
  const config = usePublicConfig();
  const detail = useQuery({ ...getPropertyDetailQueryOptions(config, edit?.propertyId ?? 0), enabled: edit !== null });
  if (edit === null || detail.data === undefined) return null;
  return { name: detail.data.name, kind: edit.kind, path: recentEditPath(edit) };
};
