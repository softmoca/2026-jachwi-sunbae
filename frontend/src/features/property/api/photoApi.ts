import { apiBlobRequest, apiRequest } from '@/features/auth/api/apiClient';
import type { PublicConfig } from '@/shared/config/publicConfigTypes';

import { addExamplePhoto, getExampleProperty, isExampleProperty, removeExamplePhoto } from '../model/exampleProperty';
import type { PropertyPhoto, PropertyPhotoList } from '../model/Property';
import { parseNoContent, parsePropertyPhotoList, parsePropertyPhotoResponse } from './propertyParsers';

export const fetchPropertyPhotos = (
  config: PublicConfig,
  propertyId: number,
  signal?: AbortSignal,
): Promise<PropertyPhotoList> =>
  isExampleProperty(propertyId)
    ? Promise.resolve().then(() => ({
        photos: structuredClone(getExampleProperty(config).photos),
        totalCount: getExampleProperty(config).photos.length,
      }))
    : apiRequest({ config, path: `/api/properties/${propertyId}/photos`, signal, parseData: parsePropertyPhotoList });

export const uploadPropertyPhoto = (config: PublicConfig, propertyId: number, file: File): Promise<PropertyPhoto> => {
  if (isExampleProperty(propertyId)) return Promise.resolve().then(() => addExamplePhoto(config, file));
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest({
    config,
    path: `/api/properties/${propertyId}/photos`,
    method: 'POST',
    formData,
    parseData: parsePropertyPhotoResponse,
  });
};

export const fetchPropertyPhotoContent = (
  config: PublicConfig,
  contentUrl: string,
  signal?: AbortSignal,
): Promise<Blob> => apiBlobRequest({ config, path: contentUrl, signal });

export const removePropertyPhoto = (config: PublicConfig, propertyId: number, photoId: number): Promise<undefined> =>
  isExampleProperty(propertyId)
    ? Promise.resolve().then(() => {
        removeExamplePhoto(config, photoId);
        return undefined;
      })
    : apiRequest({
        config,
        path: `/api/properties/${propertyId}/photos/${photoId}`,
        method: 'DELETE',
        parseData: parseNoContent,
      });

export const setRepresentativePropertyPhoto = (
  config: PublicConfig,
  propertyId: number,
  photoId: number,
): Promise<undefined> =>
  isExampleProperty(propertyId)
    ? Promise.resolve().then(() => {
        getExampleProperty(config).photos.forEach((photo) => {
          photo.representative = photo.photoId === photoId;
        });
        return undefined;
      })
    : apiRequest({
        config,
        path: `/api/properties/${propertyId}/photos/${photoId}/representative`,
        method: 'PUT',
        parseData: parseNoContent,
      });
