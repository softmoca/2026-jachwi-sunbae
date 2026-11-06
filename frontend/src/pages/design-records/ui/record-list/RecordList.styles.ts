import { css } from '@emotion/css';

/* 리스트 위 필터 줄. 아직 기능 구현 전이라 칩은 흐리게 두고 '필터 준비 중'을 붙인다. */
export const toolbar = css`
  label: RecordList-toolbar;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

export const filters = css`
  label: RecordList-filters;
  display: flex;
  min-width: 0;
  gap: 0.35rem;
  overflow-x: auto;
  scrollbar-width: none;

  & button {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 0.2rem;
    padding: 0.45rem 0.7rem;
    border: 1px solid #e3e5e9;
    border-radius: 0.5rem;
    background: #fff;
    color: #9499a2;
    font: inherit;
    font-size: 0.75rem;
    cursor: not-allowed;
  }
`;

export const comingSoon = css`
  label: RecordList-comingSoon;
  flex: none;
  padding: 0.2rem 0.45rem;
  border-radius: 0.35rem;
  background: #f3f4f6;
  color: #9499a2;
  font-size: 0.65rem;
  font-weight: 600;
  white-space: nowrap;
`;

/* 툴바 오른쪽 묶음. 지금은 '필터 준비 중' 표시만 둔다. */
export const toolbarActions = css`
  label: RecordList-toolbarActions;
  display: flex;
  flex: none;
  gap: 0.35rem;
`;

export const items = css`
  label: RecordList-items;
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  /* 목록 칸이 화면 폭에 따라 좁아져도 카드가 칸을 넘지 않게, 긴 주소는 줄여 보이고 오른쪽 메뉴는 칸 안에 남긴다. */
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
`;

export const actions = css`
  label: RecordList-actions;
  position: relative;
  z-index: 2;
`;

export const menuToggle = css`
  label: RecordList-menuToggle;
  display: grid;
  width: 2rem;
  height: 2rem;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #7c828b;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }

  &:focus-visible {
    outline: 2px solid #25282d;
    outline-offset: 3px;
  }

  @media (max-width: 360px) {
    width: 1.6rem;
    height: 1.6rem;
  }
`;

export const menu = css`
  label: RecordList-menu;

  & button:focus-visible {
    outline: 2px solid #25282d;
    outline-offset: 3px;
  }

  & {
    position: absolute;
    top: 2.1rem;
    right: 0;
    z-index: 5;
    min-width: 6rem;
    padding: 0.3rem;
    border: 1px solid #eceef1;
    border-radius: 0.7rem;
    background: white;
    box-shadow: 0 0.3rem 0.85rem #1e2b3d24;
  }

  & button {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.6rem;
    border: 0;
    border-radius: 0.45rem;
    background: transparent;
    color: #c44e4e;
    font: inherit;
    font-size: 0.78rem;
    text-align: left;
    cursor: pointer;
  }

  & button:hover {
    background: #fff3f3;
  }
`;

/* 툴바 오른쪽의 삭제 모드 버튼. 켜면 빨갛게 칠하고 글자를 '완료'로 바꾼다. */
export const deleteToggle = css`
  label: RecordList-deleteToggle;
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.25rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid #e3e5e9;
  border-radius: 999px;
  background: #fff;
  color: #41444b;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;

  &[aria-pressed='true'] {
    border-color: #c44e4e;
    background: #c44e4e;
    color: #fff;
  }

  &:focus-visible {
    outline: 2px solid #25282d;
    outline-offset: 3px;
  }
`;

/* 삭제 모드에서 카드 오른쪽 위에 띄우는 삭제 버튼. 더보기(⋮) 버튼과 같은 크기라 카드 글이 좁아지지 않는다. */
export const cardDelete = css`
  label: RecordList-cardDelete;
  display: grid;
  width: 2rem;
  height: 2rem;
  padding: 0;
  place-items: center;
  border: 1px solid #f1c9c9;
  border-radius: 50%;
  background: #fff3f3;
  color: #c44e4e;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }

  &:focus-visible {
    outline: 2px solid #25282d;
    outline-offset: 3px;
  }

  @media (max-width: 360px) {
    width: 1.6rem;
    height: 1.6rem;
  }
`;
