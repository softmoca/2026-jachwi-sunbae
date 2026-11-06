import { css, keyframes } from '@emotion/css';

export const retry = css`
  label: PropertyChecklistSection-retry;
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  margin: 0;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
`;

export const mainAction = css`
  label: PropertyChecklistSection-mainAction;
  gap: 0.4rem;
  margin-top: 0.9rem;
`;

export const expandedChecklist = css`
  label: PropertyChecklistSection-expandedChecklist;
  /* 체크리스트 이름과 항목을 둥근 묶음 하나에 담는다. 항목은 카드로 띄우지 않고 줄로만 나눈다. */
  margin-top: 0.9rem;
  padding: 0.95rem 1rem 0.2rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
`;

const shimmerKeyframes = keyframes`
  to {
    background-position: -200% 0;
  }
`;

export const skeleton = css`
  label: PropertyChecklistSection-skeleton;
  display: block;
  height: 0.8rem;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--color-surface-muted) 25%,
    var(--color-border) 50%,
    var(--color-surface-muted) 75%
  );
  background-size: 200% 100%;
  animation: ${shimmerKeyframes} 1.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* 진행 링(ChecklistProgressRing)과 같은 크기와 간격으로 둔다. */
export const skeletonSummary = css`
  label: PropertyChecklistSection-skeletonSummary;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 0.9rem;
`;

export const skeletonRing = css`
  label: PropertyChecklistSection-skeletonRing;
  flex: 0 0 auto;
  width: 76px;
  height: 76px;
`;

export const skeletonLegend = css`
  label: PropertyChecklistSection-skeletonLegend;
  display: grid;
  width: 6rem;
  gap: 0.6rem;
`;

export const skeletonTitle = css`
  label: PropertyChecklistSection-skeletonTitle;
  width: 45%;
  height: 1.05rem;
  margin-bottom: 0.4rem;
`;

export const skeletonItems = css`
  label: PropertyChecklistSection-skeletonItems;
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;

  & li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 4.4rem;
    border-top: 1px solid var(--color-border);
  }

  & li:first-child {
    border-top: 0;
  }

  & li > span:first-child {
    flex: 1 1 auto;
    max-width: 60%;
  }
`;

export const skeletonAction = css`
  label: PropertyChecklistSection-skeletonAction;
  flex: 0 0 auto;
  width: 8.5rem;
  height: 2.4rem;
  border-radius: var(--radius-sm);
`;

export const skeletonPlaceholder = css`
  label: PropertyChecklistSection-skeletonPlaceholder;
  visibility: hidden;
`;
