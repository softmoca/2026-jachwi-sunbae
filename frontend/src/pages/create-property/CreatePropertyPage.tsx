import { css, cx } from '@emotion/css';
import { type CSSProperties, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import type { MapAddress } from '@/features/map/model/Map';
import { trackExplorationRecordView } from '@/features/onboarding/lib/explorationJourney';
import { useKeyboardInset } from '@/shared/lib/hooks/useKeyboardInset';
import { HOME_PATH } from '@/shared/lib/navigation/appPaths';
import BottomActionArea from '@/shared/ui/bottom-action-area/BottomActionArea';
import { Button } from '@/shared/ui/button/Button';
import TopNavigation from '@/shared/ui/top-navigation/TopNavigation';

import { type PropertyCreationRouteState, usePropertyCreationForm } from './hooks/usePropertyCreationForm';
import PropertyLocationPicker from './ui/property-location-picker/PropertyLocationPicker';

/** 다른 화면 옆 패널로 열 때 쓴다. 닫기와 등록 뒤 이동을 패널을 연 화면이 정한다. */
export type PropertyCreationPanel = {
  /** 지도에서 찍은 위치로 열면 그 주소·좌표를 미리 채운다. */
  initialLocation?: MapAddress;
  onClose: () => void;
  onCreated: (propertyId: number) => void;
};

const CreatePropertyPage = ({ panel }: { panel?: PropertyCreationPanel }) => {
  const routeState = (useLocation().state as PropertyCreationRouteState | null) ?? {};
  const keyboardInset = useKeyboardInset();
  const form = usePropertyCreationForm(panel ? { selectedLocation: panel.initialLocation } : routeState, {
    onCreated: panel?.onCreated,
  });
  useEffect(() => {
    if (routeState.fromExploration) trackExplorationRecordView();
  }, [routeState.fromExploration]);
  const Root = panel ? 'div' : 'main';

  return (
    // 패널로 열면 패널을 연 화면의 main 안에 들어가므로 main을 겹치지 않는다.
    <Root className={styles.page} data-panel={panel ? 'true' : undefined}>
      <div className={styles.content}>
        <TopNavigation
          className={styles.createNavigation}
          title="새 매물 등록"
          backTo={panel ? undefined : HOME_PATH}
          onBack={panel?.onClose}
          backLabel="매물 등록 닫기"
          navigationIcon="close"
        />
        {routeState.fromExploration && (
          <p className={styles.stepNotice}>찾아본 동네에서 기록을 시작해요. 실제 방문한 방의 위치를 골라 주세요.</p>
        )}
        <form
          className={styles.formContainer}
          style={{ '--keyboard-inset': `${keyboardInset}px` } as CSSProperties}
          onSubmit={form.submit}
        >
          <PropertyLocationPicker location={form.location} search={form.search} />
          {form.createError !== null && (
            <p className={styles.errorNotice} role="alert">
              {form.createError}
            </p>
          )}
          <p className={styles.stepNotice}>
            고른 위치로 새 매물을 만들어요. 보증금, 월세 같은 정보는 매물 상세에서 항목을 눌러 채워 주세요.
          </p>
          <BottomActionArea>
            <Button variant="primary" type="submit" fullWidth isLoading={form.isCreating}>
              매물 등록
            </Button>
          </BottomActionArea>
        </form>
      </div>
    </Root>
  );
};

const styles = {
  // 다른 요소의 선택자에서 `.CreatePropertyPage-page`로 가리킨다.
  page: cx(
    css`
      label: CreatePropertyPage-page;
      min-height: 100%;
      background: var(--color-canvas, #fff);
    `,
    'CreatePropertyPage-page',
  ),

  content: css`
    label: CreatePropertyPage-content;
    padding: 0 1.25rem calc(6rem + env(safe-area-inset-bottom));

    /* 패널로 열면 화면 맨 아래가 아닌 패널 스크롤 영역 아래에 버튼을 붙인다. */
    .CreatePropertyPage-page[data-panel='true'] & {
      padding-bottom: 1rem;
    }
  `,

  createNavigation: css`
    label: CreatePropertyPage-createNavigation;

    &[data-has-back='true'] h1 {
      font-size: 1.08rem;
    }
  `,

  formContainer: css`
    label: CreatePropertyPage-formContainer;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin-top: 0.6rem;

    & > [data-divider] {
      position: fixed;
      right: 0;
      bottom: var(--keyboard-inset, 0px);
      left: 0;
      z-index: 20;
      box-sizing: border-box;
      width: 100%;
      max-width: var(--app-max-width);
      margin: 0 auto;
      padding: 0.75rem 1.25rem calc(0.75rem + env(safe-area-inset-bottom));
      transition: bottom 0.18s ease-out;
    }

    .CreatePropertyPage-page[data-panel='true'] & > [data-divider] {
      position: sticky;
      bottom: 0;
      max-width: none;
      margin: 0 -1.25rem;
    }
  `,

  errorNotice: css`
    label: CreatePropertyPage-errorNotice;
    margin: 0;
    color: var(--color-error, #e53e3e);
    font-size: 0.8rem;
    font-weight: 600;
  `,

  stepNotice: css`
    label: CreatePropertyPage-stepNotice;
    margin: 0;
    color: var(--color-muted, #868b94);
    font-size: 0.78rem;
    line-height: 1.55;
  `,
};

export default CreatePropertyPage;
