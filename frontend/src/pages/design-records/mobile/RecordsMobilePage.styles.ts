import { css } from '@emotion/css';

/* 휴대폰·태블릿 본 방 기록: 화면 틀, 리스트 칸, 헤더(뒤로가기·지도/리스트 전환), 지도 위에 뜬 헤더. 매물은 지도를 눌러 기록한다. */
export const page = css`
  label: RecordsMobilePage-page;
  height: 100dvh;
  background: #f0f2f5;
  color: #25282d;
`;

export const frame = css`
  label: RecordsMobilePage-frame;
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(100%, 48rem);
  height: 100%;
  margin: 0 auto;
  background: white;
  overflow: hidden;

  & button:focus-visible {
    outline: 2px solid #25282d;
    outline-offset: 3px;
  }
`;

export const body = css`
  label: RecordsMobilePage-body;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
`;

export const list = css`
  label: RecordsMobilePage-list;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem 1rem 1.5rem;
  background: white;

  /* 태블릿 너비부터는 배치는 그대로 두고 글자와 여백만 키운다. */
  @media (min-width: 768px) {
    padding: 1rem 1.5rem 2rem;
  }
`;

export const header = css`
  label: RecordsMobilePage-header;
  display: grid;
  grid-template-columns: 2.5rem 1fr 2.5rem;
  align-items: center;
  padding: max(0.85rem, env(safe-area-inset-top)) 1rem 0.7rem;

  @media (min-width: 768px) {
    padding: max(1.1rem, env(safe-area-inset-top)) 1.5rem 0.8rem;
  }
`;

/* 검색 중에는 헤더와 같은 자리에 검색창만 둔다. */
export const searchHeader = css`
  label: RecordsMobilePage-searchHeader;
  display: flex;
  padding: max(0.85rem, env(safe-area-inset-top)) 1rem 0.7rem;

  @media (min-width: 768px) {
    padding: max(1.1rem, env(safe-area-inset-top)) 1.5rem 0.8rem;
  }
`;

/* 뒤로가기와 보기 전환은 지도·리스트 어느 쪽에서도 같은 모양이어서, 보기를 바꿔도 움직이거나 바뀌지 않는다. */
export const back = css`
  label: RecordsMobilePage-back;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid #e3e5e9;
  border-radius: 50%;
  padding: 0;
  background: white;
  box-shadow: 0 2px 10px #00000018;
  color: #383c43;
  text-decoration: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid #25282d;
    outline-offset: 3px;
  }
`;

export const viewSwitch = css`
  label: RecordsMobilePage-viewSwitch;
  display: flex;
  padding: 0.3rem;
  width: max-content;
  justify-self: center;
  border: 1px solid #e3e5e9;
  background: white;
  border-radius: 2rem;
  box-shadow: 0 2px 10px #00000018;

  & button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    min-width: 5.1rem;
    padding: 0.6rem 0.7rem;
    border: 0;
    border-radius: 1.5rem;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: #a2a4a9;
    background: transparent;
    cursor: pointer;
  }

  & button[aria-pressed='true'] {
    color: white;
    background: #3e4048;
  }

  @media (min-width: 768px) {
    & button {
      min-width: 6rem;
      font-size: 0.95rem;
    }
  }
`;

/*
 * 지도 보기에서는 헤더와 동네 뱃지를 흰 배경 없이 지도 위에 띄운다.
 * 빈 자리는 지도 조작을 막지 않는다. 뒤로가기·보기 전환은 흰 바탕과 테두리·그림자로 지도 위에서도 잘 보인다.
 */
export const mapChrome = css`
  label: RecordsMobilePage-mapChrome;
  position: absolute;
  z-index: 15;
  top: 0;
  right: 0;
  left: 0;
  pointer-events: none;

  & a,
  & button,
  & nav {
    pointer-events: auto;
  }
`;
