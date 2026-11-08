/** 작성자가 메모를 처음 쓸 때 고르는 좋아요·싫어요. 서버 코드를 그대로 쓴다. */
export type StreetMemoPreference = 'LIKE' | 'DISLIKE';

/** 지도 위 한 지점에 남긴 동네 정보. 작성자 식별 정보는 받지 않고 본인 메모인지만 안다. */
export type StreetMemo = {
  id: number;
  latitude: number;
  longitude: number;
  memo: string;
  preference: StreetMemoPreference;
  isMine: boolean;
  /** 메모 위치가 속한 8자리 행정동 코드. 서버가 동을 찾지 못한 메모는 null이다. 동네 찾기 지도는 멀리 볼 때 이 코드로 묶는다. */
  adminDongCode?: string | null;
};

export type StreetMemoDraft = {
  latitude: number;
  longitude: number;
  memo: string;
  preference: StreetMemoPreference;
};

export const PREFERENCE_LABELS: Record<StreetMemoPreference, string> = {
  LIKE: '좋아요',
  DISLIKE: '싫어요',
};
