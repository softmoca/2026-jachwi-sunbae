import type { FormEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { requestCurrentMapLocation } from '@/features/map/lib/mapLocation';
import type { MapAddress } from '@/features/map/model/Map';
import { trackExplorationSaved } from '@/features/onboarding/lib/explorationJourney';
import type { PropertyInputDto } from '@/features/property/api/dtos/PropertyDto';
import { useCreateProperty } from '@/features/property/api/usePropertyMutations';
import { trackPropertyEvent } from '@/features/property/lib/propertyAnalytics';
import { addressOf, toQuickPropertyInput } from '@/features/property/lib/propertyForm';
import { trackPostHogEvent } from '@/shared/lib/analytics/posthog';
import { propertyDetailPath } from '@/shared/lib/navigation/appPaths';

import useAddressSearch from './useAddressSearch';
import usePropertyLocation from './usePropertyLocation';

export type PropertyCreationRouteState = {
  registrationDraft?: PropertyInputDto;
  selectedLocation?: MapAddress;
  fromExploration?: boolean;
};
/**
 * 위치만 골라 매물을 바로 만든다. 이름은 고른 주소로 채운다.
 * 지도에서 위치를 골라 들어왔다면 그 위치로 지도를 연다.
 */
export const usePropertyCreationForm = (
  routeState: PropertyCreationRouteState,
  { onCreated }: { onCreated?: (propertyId: number) => void } = {},
) => {
  const navigate = useNavigate();
  const hasPresetLocation = routeState.selectedLocation !== undefined && !routeState.fromExploration;
  const entrypoint = hasPresetLocation ? 'map' : 'form';
  const hasTrackedStart = useRef(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createProperty = useCreateProperty(entrypoint);
  const clearCreateError = useCallback(() => setCreateError(null), []);
  const location = usePropertyLocation(routeState.selectedLocation, clearCreateError);
  const search = useAddressSearch();

  useEffect(() => {
    if (hasTrackedStart.current) return;
    hasTrackedStart.current = true;
    trackPropertyEvent('property_creation_started', { entrypoint });
  }, [entrypoint]);

  useEffect(() => {
    if (location.locationStatus !== 'ready') return;
    const address = addressOf(location.selectedLocation);
    if (address !== null && address !== undefined && address !== '') search.setInitialQuery(address);
  }, [location.locationStatus, location.selectedLocation, search.setInitialQuery]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (location.locationStatus !== 'ready') {
      setCreateError(
        location.locationStatus === 'loading'
          ? '주소를 확인하는 중이에요. 잠시 뒤에 다시 눌러 주세요.'
          : '주소를 확인하지 못했어요. 지도를 움직이거나 주소를 검색해 위치를 다시 선택해 주세요.',
      );
      return;
    }
    setCreateError(null);
    trackPostHogEvent('property_creation_address_completed');
    const { selectedLocation } = location;
    const quick = toQuickPropertyInput(selectedLocation);
    try {
      const created = await createProperty.mutateAsync(
        routeState.registrationDraft === undefined
          ? quick
          : {
              ...routeState.registrationDraft,
              address: quick.address,
              latitude: quick.latitude,
              longitude: quick.longitude,
            },
      );
      if (routeState.fromExploration) trackExplorationSaved();
      if (onCreated) onCreated(created.propertyId);
      else navigate(propertyDetailPath(created.propertyId), { replace: true });
    } catch {
      setCreateError('매물을 등록하지 못했어요. 다시 시도해 주세요.');
    }
  };

  /** 현재 위치 확인도 주소 검색 영역에 진행 상태를 보여 준다. */
  const moveToCurrentLocation = async () => {
    search.setStatus('loading');
    try {
      const coordinate = await requestCurrentMapLocation();
      await location.resolveLocation(coordinate.latitude, coordinate.longitude);
      search.setStatus('idle');
    } catch {
      trackPostHogEvent('address_search_failed', { error_kind: 'location' });
      search.setStatus('error');
    }
  };

  const selectSearchResult = (result: MapAddress) => {
    location.selectAddress(result);
    search.pick(result);
  };

  return {
    hasPresetLocation,
    createError,
    isCreating: createProperty.isPending,
    submit: (event: FormEvent) => void submit(event),
    location: {
      selected: location.selectedLocation,
      status: location.locationStatus,
      onCenterChange: location.handleCenterChange,
      onMoveToCurrentLocation: () => void moveToCurrentLocation(),
    },
    search: {
      query: search.query,
      results: search.results,
      status: search.status,
      onQueryChange: search.changeQuery,
      onSubmit: () => void search.submit(),
      onClear: search.clear,
      onSelect: selectSearchResult,
    },
  };
};
