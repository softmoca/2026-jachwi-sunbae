import { css, cx } from '@emotion/css';

export const panel = css`
  label: NeighborhoodPlacePanel-panel;
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 1.25rem 1.25rem 1.5rem;
  background: white;
  color: var(--color-ink);
`;

export const stationNav = css`
  label: NeighborhoodPlacePanel-stationNav;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;

  & button {
    display: grid;
    width: 2rem;
    height: 2rem;
    padding: 0;
    place-items: center;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: white;
    color: var(--color-ink);
    cursor: pointer;
  }

  & button:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;

export const title = css`
  label: NeighborhoodPlacePanel-title;
  margin: 0 0 0.4rem;
  font-size: 1.1rem;
`;

// 다른 요소의 선택자에서 `.NeighborhoodPlacePanel-details`로 가리킨다.
export const details = cx(
  css`
    label: NeighborhoodPlacePanel-details;
    display: grid;
    gap: 0.75rem;
  `,
  'NeighborhoodPlacePanel-details',
);

/** 시트 높이를 채우고 동작 버튼을 맨 아래에 둔다. */
export const fill = css`
  label: NeighborhoodPlacePanel-fill;
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 0.75rem;

  & > .NeighborhoodPlacePanel-actions {
    margin-top: auto;
  }
`;

// 다른 요소의 선택자에서 `.NeighborhoodPlacePanel-actions`로 가리킨다.
export const actions = cx(
  css`
    label: NeighborhoodPlacePanel-actions;
    display: grid;
    gap: 0.5rem;

    & a {
      padding: 0.8rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: 0.7rem;
      color: var(--color-ink);
      font-size: 0.9rem;
      font-weight: 650;
      text-align: center;
      text-decoration: none;
    }
  `,
  'NeighborhoodPlacePanel-actions',
);

export const primary = css`
  label: NeighborhoodPlacePanel-primary;

  .NeighborhoodPlacePanel-actions &,
  .NeighborhoodPlacePanel-details > & {
    border-color: transparent;
    background: var(--color-ink);
    color: white;
  }

  .NeighborhoodPlacePanel-details > & {
    padding: 0.85rem 1rem;
    border: 0;
    border-radius: 0.7rem;
    font-size: 0.9rem;
    font-weight: 650;
    cursor: pointer;
  }

  .NeighborhoodPlacePanel-details > &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

export const empty = css`
  label: NeighborhoodPlacePanel-empty;
  margin: 0 0 0.5rem;
  color: var(--color-ink-soft);
  font-size: 0.85rem;
`;

export const lead = css`
  label: NeighborhoodPlacePanel-lead;
  margin: 0 0 0.5rem;
  color: var(--color-ink-soft);
  font-size: 0.85rem;
`;

export const phone = css`
  label: NeighborhoodPlacePanel-phone;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.7rem;

  & strong {
    font-size: 1.05rem;
    letter-spacing: 0.01em;
  }

  & button {
    padding: 0.4rem 0.7rem;
    border: 0;
    border-radius: 0.5rem;
    background: var(--color-surface-muted);
    color: var(--color-ink);
    font-size: 0.8rem;
    font-weight: 650;
    cursor: pointer;
  }

  & span {
    color: var(--color-muted);
    font-size: 0.75rem;
  }
`;

/** 장소 정보의 항목과 값(주소, 거리 등). */
export const facts = css`
  label: NeighborhoodPlacePanel-facts;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.35rem 0.75rem;
  margin: 0;
  font-size: 0.85rem;

  & dt {
    color: var(--color-muted);
  }

  & dd {
    margin: 0;
    color: var(--color-ink);
  }
`;
