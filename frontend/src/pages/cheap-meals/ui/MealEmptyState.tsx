import type { ReactNode } from 'react';

import EmptyState from '@/shared/ui/empty-state/EmptyState';

type MealEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  /** 예전 호출과 맞추려고 받기만 한다. 저렴한 한 끼의 빈 상태는 늘 테두리 없이 그린다. */
  variant?: 'plain';
};

/** 저렴한 한 끼 세 탭이 함께 쓰는 빈 상태. 다른 화면처럼 공용 빈 상태에 오리 그림을 둔다. */
const MealEmptyState = ({ title, description, action }: MealEmptyStateProps) => (
  <EmptyState variant="plain" illustration="empty-search" title={title} description={description} action={action} />
);

export default MealEmptyState;
