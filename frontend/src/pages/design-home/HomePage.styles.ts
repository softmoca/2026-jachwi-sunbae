import { css } from '@emotion/css';

/* 홈 데스크탑·휴대폰 화면이 함께 쓰는 바탕. */
export const page = css`
  label: HomePage-page;
  height: 100dvh;
  overflow-y: auto;
  background: var(--color-surface);
  color: var(--color-ink);
`;

/** 홈 카드가 함께 쓰는 글자 크기, 위치, 간격. 값은 `--home-card-*` 토큰이 정하고, 카드마다 따로 두지 않는다. */
export const homeCardText = css`
  label: HomePage-homeCardText;
  --action-card-title-size: var(--home-card-title-size);
  --action-card-title-line-height: var(--home-card-title-line-height);
  --action-card-description-size: var(--home-card-description-size);
  --action-card-text-inset: var(--home-card-text-inset);
  --action-card-text-gap: var(--home-card-text-gap);
`;
