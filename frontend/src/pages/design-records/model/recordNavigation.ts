type Identified = { id: string };

/** 고른 매물의 앞뒤 매물. 목록(매물 번호) 순서를 따르고, 처음이나 마지막이면 그쪽은 없다. */
export type RecordNeighbors<T extends Identified> = {
  previous: T | null;
  next: T | null;
  /** 1부터 센 지금 매물의 자리. */
  position: number;
  total: number;
};

/** 목록에서 `selectedId` 매물의 앞뒤를 찾는다. 목록에 없으면 `null`을 돌려준다. */
export const recordNeighbors = <T extends Identified>(
  records: readonly T[],
  selectedId: string | null,
): RecordNeighbors<T> | null => {
  const index = selectedId === null ? -1 : records.findIndex((record) => record.id === selectedId);
  if (index < 0) return null;
  return {
    previous: records[index - 1] ?? null,
    next: records[index + 1] ?? null,
    position: index + 1,
    total: records.length,
  };
};
