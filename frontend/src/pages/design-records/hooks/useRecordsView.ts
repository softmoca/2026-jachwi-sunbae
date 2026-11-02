import { useSearchParams } from 'react-router-dom';

import {
  parseRecordsView,
  readLastRecordsView,
  RECORDS_VIEW_PARAM,
  type RecordsView,
  writeLastRecordsView,
} from '../model/recordsView';

/** 휴대폰 본 방 기록의 보기 방식(지도, 리스트). 주소에 없으면 마지막으로 고른 보기로 연다. */
const useRecordsView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = parseRecordsView(searchParams.get(RECORDS_VIEW_PARAM)) ?? readLastRecordsView();
  // 보기 방식을 주소에 남겨, 상세나 체크리스트에서 뒤로 돌아와도 보던 보기(리스트 등)로 열리게 한다.
  const setView = (next: RecordsView) => {
    writeLastRecordsView(next);
    setSearchParams(
      (current) => {
        current.set(RECORDS_VIEW_PARAM, next);
        return current;
      },
      { replace: true },
    );
  };
  return [view, setView] as const;
};

export default useRecordsView;
