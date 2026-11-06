import { css } from '@emotion/css';

export const statePage = css`
  label: PropertyChecklistPage-statePage;
  display: grid;
  min-height: 100%;
  padding: 1.5rem 1rem;
  place-items: center;
`;

export const plainState = css`
  label: PropertyChecklistPage-plainState;
  width: min(100%, 32rem);

  & .content-state {
    min-height: auto;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
  }
`;

export const stateCard = css`
  label: PropertyChecklistPage-stateCard;
  width: min(100%, 32rem);
`;

export const heading = css`
  label: PropertyChecklistPage-heading;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 0 0.65rem;

  & span {
    color: var(--color-muted);
    font-size: 0.7rem;
  }

  & h1 {
    margin: 0.2rem 0 0;
    font-size: 1rem;
  }

  & strong {
    color: var(--color-primary-dark);
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
  }
`;

/* 적용한 체크리스트를 바꾸는 진입점. 상단 헤더 오른쪽에 둔다. */
export const editAction = css`
  label: PropertyChecklistPage-editAction;
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0.25rem 0.65rem;
  border: 1px solid var(--color-border-strong, #d7c69e);
  border-radius: 999px;
  background: var(--color-surface, #fffdf8);
  color: var(--color-primary-dark, #455a27);
  font-size: 0.78rem;
  font-weight: 750;
  text-decoration: none;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover,
  &:focus-visible {
    border-color: var(--color-primary, #6c873b);
    background: var(--color-surface-muted, #f2f3eb);
    outline: none;
  }
`;

export const saveAction = css`
  label: PropertyChecklistPage-saveAction;
  position: sticky;
  bottom: 0;
  z-index: 2;
  margin: 1rem -1rem 0;
  padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
  background: linear-gradient(to bottom, transparent, var(--color-canvas) 30%);

  & a {
    display: flex;
    min-height: 2.8rem;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm, 0.5rem);
    background: var(--color-surface);
    color: var(--color-ink);
    font-size: 0.8rem;
    font-weight: 750;
    text-decoration: none;
  }
`;
