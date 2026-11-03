import { useNavigate } from 'react-router-dom';

import type { MapAddress } from '@/features/map/model/Map';

/** 고른 위치를 확정하고, 그 주소와 좌표를 들고 수정 화면(`returnTo`)으로 돌아간다. */
const useLocationConfirm = (returnTo: string) => {
  const navigate = useNavigate();

  return (selected: MapAddress) => {
    const address = selected.roadAddress ?? selected.jibunAddress ?? selected.address;
    navigate(returnTo, {
      replace: true,
      state: { address: address ?? '', latitude: selected.latitude, longitude: selected.longitude },
    });
  };
};

export default useLocationConfirm;
