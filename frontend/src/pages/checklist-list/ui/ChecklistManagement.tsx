import { css } from '@emotion/css';
import { useParams } from 'react-router-dom';

import { describeChecklistLoadError } from '@/features/checklist/api/checklistErrorMessages';
import { useChecklistList } from '@/features/checklist/api/useChecklists';
import { USER_CHECKLIST_STAGE } from '@/features/checklist/model/checklist';
import useIsDesktop from '@/shared/lib/hooks/useIsDesktop';
import { CHECKLIST_CREATE_PATH, checklistDetailPath, HOME_PATH } from '@/shared/lib/navigation/appPaths';
import { Button, ButtonLink } from '@/shared/ui/button/Button';
import Icon from '@/shared/ui/icon/Icon';
import QueryState from '@/shared/ui/query-state/QueryState';
import Skeleton from '@/shared/ui/skeleton/Skeleton';
import TopNavigation from '@/shared/ui/top-navigation/TopNavigation';

const describeError = describeChecklistLoadError('체크리스트를 불러오지 못했어요.', {});

const ChecklistManagement = () => {
  const list = useChecklistList(USER_CHECKLIST_STAGE);
  const params = useParams();
  const isDesktop = useIsDesktop();
  return (
    <main className={styles.page}>
      {/* 데스크탑은 공용 헤더가 있어 휴대폰용 뒤로가기 제목줄을 두지 않는다. */}
      {!isDesktop && <TopNavigation title="체크리스트 관리" backTo={HOME_PATH} backLabel="홈으로 돌아가기" />}
      <ButtonLink to={CHECKLIST_CREATE_PATH} variant="secondary" fullWidth className={styles.create}>
        <Icon name="plus" size={16} /> 사용자 체크리스트 만들기
      </ButtonLink>
      <QueryState
        query={list}
        loadingTitle="체크리스트를 불러오는 중이에요."
        describeError={describeError}
        skeleton={
          <div className={styles.items}>
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} shape="card" height="5rem" />
            ))}
          </div>
        }
      >
        {(data) => {
          const items = data.pages.flatMap((page) => page.content);
          return (
            <>
              <h2 className={styles.heading}>
                사용자 체크리스트 <span>{items.length}개</span>
              </h2>
              {items.length === 0 ? (
                <p className={styles.empty}>저장된 체크리스트가 없어요. 나만의 체크리스트를 만들어 보세요.</p>
              ) : (
                <ul className={styles.items}>
                  {items.map((item) => (
                    <li key={item.checklistId}>
                      <ButtonLink
                        to={checklistDetailPath(item.checklistId)}
                        variant="secondary"
                        fullWidth
                        className={styles.bundle}
                        aria-current={params.checklistId === String(item.checklistId) ? 'page' : undefined}
                      >
                        <Icon name="checklist" size={20} />
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.itemCount}개 항목</small>
                        </span>
                        <Icon
                          name={params.checklistId === String(item.checklistId) ? 'edit' : 'chevron-right'}
                          size={16}
                        />
                      </ButtonLink>
                    </li>
                  ))}
                </ul>
              )}
              {list.hasNextPage && (
                <Button
                  variant="secondary"
                  fullWidth
                  disabled={list.isFetchingNextPage}
                  onClick={() => void list.fetchNextPage()}
                >
                  체크리스트 더 보기
                </Button>
              )}
            </>
          );
        }}
      </QueryState>
    </main>
  );
};

const styles = {
  page: css`
    label: ChecklistManagement-page;
    padding: 0 1rem 2rem;

    /* 데스크탑은 목록 칸에 카드가 꽉 차지 않게 좌우 여백을 넓혀 카드 가로 길이를 줄인다. */
    @media (min-width: 1024px) {
      padding: 0 2rem 2rem;
    }
  `,
  create: css`
    label: ChecklistManagement-create;
    margin: var(--space-lg) 0;
    & > span {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
    }
  `,
  heading: css`
    label: ChecklistManagement-heading;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: 0.9375rem;
    & span {
      color: var(--color-muted);
      font-size: 0.75rem;
      font-weight: 500;
    }
  `,
  items: css`
    label: ChecklistManagement-items;
    display: grid;
    gap: var(--space-md);
    padding: 0;
    list-style: none;
  `,
  bundle: css`
    label: ChecklistManagement-bundle;
    padding: var(--space-md);
    text-align: left;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-md);
    & > span {
      display: block;
      min-width: 0;
    }
    & strong,
    & small {
      display: block;
      overflow-wrap: anywhere;
    }
    & strong {
      font-size: 0.875rem;
    }
    & small {
      margin-top: var(--space-sm);
      color: var(--color-muted);
      font-size: 0.75rem;
    }
    &[aria-current='page'] {
      background: var(--color-surface-muted);
      color: var(--color-ink);
    }
  `,
  empty: css`
    label: ChecklistManagement-empty;
    color: var(--color-muted);
    font-size: 0.875rem;
    line-height: 1.6;
  `,
};

export default ChecklistManagement;
