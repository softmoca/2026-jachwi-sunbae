import { useQueries } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { usePublicConfig } from '@/shared/config/PublicConfigContext';

import { fetchPropertyPhotoContent } from '../api/photoApi';
import { propertyQueryKeys } from '../api/propertyQueryKeys';
import { isExampleProperty } from '../model/exampleProperty';

/** 마커 사진이 필요한 매물의 최소 정보. 매물 번호는 숫자나 숫자 문자열이다. */
type PhotoMarkerSource = {
  id: string | number;
  latitude: number | null;
  longitude: number | null;
  representativePhoto: { photoId: number; contentUrl: string } | null;
};

/** 마커 사진을 받는 매물 수의 상한. 많은 매물의 사진을 한꺼번에 받지 않게 앞쪽 일부만 쓴다. */
const MAX_PHOTO_MARKERS = 30;

/**
 * 대표 사진이 있는 매물의 지도 마커에 쓸 사진 주소를 돌려준다(매물 번호 → 주소).
 * 사진은 로그인한 요청으로 받아야 해서 받은 내용을 임시 주소로 바꿔 쓰고, 화면을 떠나거나 사진이 바뀌면 주소를 풀어 준다.
 * 아직 받지 못한 매물은 목록에 없고, 그동안 마커는 기본 집 핀으로 그려진다.
 * 예시 매물의 사진은 서버가 아니라 번들에 든 그림(또는 이 기기에서 고른 사진의 임시 주소)이라 받지 않고 그 주소를 그대로 쓴다.
 */
const usePropertyMarkerPhotos = (records: readonly PhotoMarkerSource[]): ReadonlyMap<string, string> => {
  const config = usePublicConfig();
  const located = records.filter(
    (record) => record.representativePhoto !== null && record.latitude !== null && record.longitude !== null,
  );
  const examples = located.filter((record) => isExampleProperty(Number(record.id)));
  const exampleSignature = examples.map((record) => `${record.id}:${record.representativePhoto?.contentUrl}`).join(',');
  const withPhoto = located.filter((record) => !isExampleProperty(Number(record.id))).slice(0, MAX_PHOTO_MARKERS);
  const results = useQueries({
    queries: withPhoto.map((record) => {
      const photo = record.representativePhoto as NonNullable<PhotoMarkerSource['representativePhoto']>;
      return {
        queryKey: propertyQueryKeys.photoContent(Number(record.id), photo.photoId),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchPropertyPhotoContent(config, photo.contentUrl, signal),
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: 0,
      };
    }),
  });
  const blobs = results.map((result) => result.data);
  const [urls, setUrls] = useState<ReadonlyMap<string, string>>(new Map());

  const signature = withPhoto.map((record, index) => `${record.id}:${blobs[index] === undefined ? 0 : 1}`).join(',');
  useEffect(() => {
    const next = new Map<string, string>();
    const fetched: string[] = [];
    withPhoto.forEach((record, index) => {
      const blob = blobs[index];
      if (blob === undefined) return;
      const url = URL.createObjectURL(blob);
      fetched.push(url);
      next.set(String(record.id), url);
    });
    examples.forEach((record) => {
      if (record.representativePhoto !== null) next.set(String(record.id), record.representativePhoto.contentUrl);
    });
    setUrls(next);
    // 예시 사진의 주소는 여기서 만든 것이 아니라 풀지 않는다.
    return () => fetched.forEach((url) => URL.revokeObjectURL(url));
    // 어느 매물의 사진이 도착했는지, 예시 사진이 무엇인지가 바뀔 때만 임시 주소를 다시 만든다.
  }, [signature, exampleSignature]);

  return urls;
};

export default usePropertyMarkerPhotos;
