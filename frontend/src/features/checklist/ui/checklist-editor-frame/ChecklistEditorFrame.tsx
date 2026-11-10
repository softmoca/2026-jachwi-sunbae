import { css } from '@emotion/css';
import type { ReactNode } from 'react';

type Props = {
  /** 데스크탑 화면인지. 페이지가 `useIsDesktop`으로 한 번 골라 넘긴다. */
  isDesktop: boolean;
  children: ReactNode;
  /** 화면마다 다른 바깥 여백. */
  className?: string;
};

/**
 * 체크리스트 편집 화면의 틀. 휴대폰은 앱 열의 가로 폭을 그대로 쓰고, 데스크탑은 방 비교, 사용 방법처럼
 * 관리 목록 오른쪽 편집 패널의 폭을 채운다.
 */
const ChecklistEditorFrame = ({ isDesktop, children, className }: Props) => (
  <main className={`property-page checklist-page checklist-editor-page ${styles.page} ${className ?? ''}`.trim()}>
    <div className={isDesktop ? styles.desktopContainer : styles.container}>{children}</div>
  </main>
);

const styles = {
  page: css`
    label: ChecklistEditorFrame-page;
    background: var(--color-canvas);
  `,

  container: css`
    label: ChecklistEditorFrame-container;
    --checklist-action-width: 100vw;
    width: 100%;

    @media (min-width: 768px) {
      --checklist-action-width: 36rem;
      max-width: 34rem;
      margin-right: auto;
      margin-left: auto;
    }

    & > [data-full-bleed='true'] {
      margin-top: -0.15rem;
    }
  `,

  desktopContainer: css`
    label: ChecklistEditorFrame-desktopContainer;
    --checklist-action-width: 100%;
    width: 100%;
    margin: 0 auto;
    padding-top: 0;
  `,
};

export default ChecklistEditorFrame;
