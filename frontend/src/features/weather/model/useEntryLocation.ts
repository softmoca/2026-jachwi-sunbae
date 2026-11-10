import { useEffect } from 'react';

/**
 * 앱(웹)에 들어올 때 현재 위치를 한 번 받는다(`requestEntryLocation`).
 * 모든 화면의 첫 번들에 위치 코드가 실리지 않게, 들어온 뒤 따로 불러 실행한다.
 */
export const useEntryLocation = () => {
  useEffect(() => {
    void import('./entryLocation').then(({ requestEntryLocation }) => requestEntryLocation()).catch(() => undefined);
  }, []);
};
