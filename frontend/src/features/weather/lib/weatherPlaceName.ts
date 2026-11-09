/** 지번 주소에서 시·도를 뺀 구, 동 정도만 남긴다. 예: "서울 중구 태평로1가 31" → "중구 태평로1가" */
export const toPlaceName = (address: string | null): string | null => {
  const words = (address ?? '').split(' ').filter((word) => word.length > 0 && !/^\d/.test(word));
  return words.length > 1 ? words.slice(1, 3).join(' ') : null;
};
