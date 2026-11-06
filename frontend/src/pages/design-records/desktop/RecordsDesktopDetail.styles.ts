import { css } from '@emotion/css';

/* 상세 패널에서만 사용하는 스타일은 첫 화면 뼈대와 분리해 불러온다. */
export const detail = css`
  label: RecordsDesktopPage-detail;
  min-height: 0;
  overflow: hidden;
  background: white;
  &[data-checklist-replacement='true'] {
    transform: translateZ(0);
  }
`;

export const detailScroll = css`
  label: RecordsDesktopPage-detailScroll;
  height: 100%;
  overflow-y: auto;
`;
