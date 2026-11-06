import { css } from '@emotion/css';
import type { ReactNode } from 'react';

import TopNavigation from '@/shared/ui/top-navigation/TopNavigation';

type ChecklistPageLayoutProps = {
  title: string;
  embedded?: boolean;
  children: ReactNode;
  backTo?: string;
  onBack?: () => void;
  backLabel?: string;
  navigationIcon?: 'arrow-left' | 'close';
  endSlot?: ReactNode;
  className?: string;
  containerClassName?: string;
};

const ChecklistPageLayout = ({
  title,
  embedded = false,
  children,
  backTo,
  onBack,
  backLabel,
  navigationIcon,
  endSlot,
  className,
  containerClassName,
}: ChecklistPageLayoutProps) => {
  const Root = embedded ? 'div' : 'main';
  return (
    <Root className={`${styles.page} ${className ?? ''}`}>
      <div className={`${styles.container} ${containerClassName ?? ''}`}>
        <TopNavigation
          title={title}
          backTo={backTo}
          onBack={onBack}
          backLabel={backLabel}
          navigationIcon={navigationIcon}
          endSlot={endSlot}
        />
        {children}
      </div>
    </Root>
  );
};

const styles = {
  page: css`
    label: ChecklistPageLayout-page;
    min-height: 100%;
    background: var(--color-canvas);
  `,

  container: css`
    label: ChecklistPageLayout-container;
    width: 100%;
    max-width: 39rem;
    min-height: 100%;
    margin: 0 auto;
    padding: 0 1rem 6rem;
  `,

  stageTabs: css`
    label: ChecklistPageLayout-stageTabs;
    margin: 0.25rem 0 0.65rem;
  `,
};

export default ChecklistPageLayout;
