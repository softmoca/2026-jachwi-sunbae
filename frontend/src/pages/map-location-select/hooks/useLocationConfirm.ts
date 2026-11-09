import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { MapAddress } from '@/features/map/model/Map';
import { getPropertyDetailQueryOptions } from '@/features/property/api/useProperties';
import { useUpdateProperty } from '@/features/property/api/usePropertyMutations';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';

/**
 * 고른 위치를 확정한다. `propertyId`가 있으면(매물 상세에서 위치를 바꾸러 온 경우) 그 매물에 바로 저장하고 돌아간다.
 * 없으면 주소와 좌표를 들고 수정 화면(`returnTo`)으로 돌아간다.
 */
const useLocationConfirm = (returnTo: string, propertyId?: number) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const config = usePublicConfig();
  const updateProperty = useUpdateProperty(propertyId ?? 0);
  const [failed, setFailed] = useState(false);

  const confirm = async (selected: MapAddress) => {
    const address = selected.roadAddress ?? selected.jibunAddress ?? selected.address;
    if (propertyId === undefined) {
      navigate(returnTo, {
        replace: true,
        state: { address: address ?? '', latitude: selected.latitude, longitude: selected.longitude },
      });
      return;
    }
    setFailed(false);
    try {
      const current = await queryClient.fetchQuery(getPropertyDetailQueryOptions(config, propertyId));
      await updateProperty.mutateAsync({
        current,
        changes: { address: address ?? '', latitude: selected.latitude, longitude: selected.longitude },
      });
      navigate(returnTo, { replace: true });
    } catch {
      setFailed(true);
    }
  };

  return { confirm, isSaving: updateProperty.isPending, failed };
};

export default useLocationConfirm;
