import { writeLastDetailTab } from '@/pages/property-detail/model/detailTab';
import type { MapAddress } from '@/features/map/model/Map';
import { useCreateProperty } from '@/features/property/api/usePropertyMutations';
import { toQuickPropertyInput } from '@/features/property/lib/propertyForm';

type Options = {
  /** 만든 매물 번호와 만든 위치를 넘긴다. 지도는 그 자리로 다가가 새 매물을 알린다. */
  onCreated: (propertyId: number, location: MapAddress) => void;
  onError: () => void;
};

/**
 * 본 방 기록 지도에서 고른 위치로 등록 화면 없이 바로 매물을 만든다.
 * 이름은 `새 매물`, 보증금과 월세는 0으로 만들고 나머지는 상세에서 채운다.
 * 상세는 마지막으로 본 탭으로 열리므로, 체크리스트를 보다가 만들어도 채울 정보가 먼저 보이게 정보 탭을 마지막 탭으로 둔다.
 */
const useQuickCreateProperty = ({ onCreated, onError }: Options) => {
  const createProperty = useCreateProperty('map');

  const create = (location: MapAddress) => {
    if (createProperty.isPending) return;
    createProperty
      .mutateAsync(toQuickPropertyInput(location))
      .then((created) => {
        writeLastDetailTab('details');
        onCreated(created.propertyId, location);
      })
      .catch(onError);
  };

  return { create, isCreating: createProperty.isPending };
};

export default useQuickCreateProperty;
