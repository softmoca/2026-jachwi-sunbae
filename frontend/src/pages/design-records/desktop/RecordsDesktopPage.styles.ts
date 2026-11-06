import { css } from '@emotion/css';

/* 데스크탑 본 방 기록: 화면 전체를 쓰며 왼쪽에 리스트, 그 옆에 매물 등록·상세 칸, 오른쪽에 지도를 나란히 둔다. */
export const page = css`
  label: RecordsDesktopPage-page;
  height: 100dvh;
  background: #f0f2f5;
  color: #25282d;
`;

export const frame = css`
  label: RecordsDesktopPage-frame;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: white;
  overflow: hidden;

  & button:focus-visible {
    outline: 2px solid #25282d;
    outline-offset: 3px;
  }
`;

/* 지도 위쪽 동네 뱃지 줄 아래에 상세 닫기 버튼을 둔다. */
export const body = css`
  label: RecordsDesktopPage-body;
  --list-detail-close-top: 4.5rem;
  flex: 1;
  height: auto;
`;

export const list = css`
  label: RecordsDesktopPage-list;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem 1.5rem 1.5rem;
  background: white;
`;

/* 매물 등록·상세는 자체 여백을 가지므로 칸에는 스크롤만 둔다. */
export const detail = css`
  label: RecordsDesktopPage-detail;
  min-height: 0;
  overflow: hidden;
  background: white;
  &[data-checklist-replacement='true'] {
    transform: translateZ(0);
  }
`;

export const headerSearch = css`
  label: RecordsDesktopPage-headerSearch;
  max-width: 32rem;
`;

export const map = css`
  label: RecordsDesktopPage-map;
  height: 100%;
`;

export const notice = css`
  label: RecordsDesktopPage-notice;
  right: 1.5rem;
  bottom: 1.5rem;
  left: auto;
  width: 22rem;
`;

export const detailScroll = css`
  label: RecordsDesktopPage-detailScroll;
  height: 100%;
  overflow-y: auto;
`;
