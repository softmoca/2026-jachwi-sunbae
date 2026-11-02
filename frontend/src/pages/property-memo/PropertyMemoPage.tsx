import { css } from '@emotion/css';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { getPropertyErrorMessage } from '@/features/property/api/propertyErrorMessages';
import { usePropertyDetail } from '@/features/property/api/useProperties';
import { parsePositiveId } from '@/features/property/lib/propertyFormat';
import useDelayedLoading from '@/shared/lib/hooks/useDelayedLoading';
import { HOME_PATH, propertyDetailPath } from '@/shared/lib/navigation/appPaths';
import ContentState from '@/shared/ui/content-state/ContentState';
import TopNavigation from '@/shared/ui/top-navigation/TopNavigation';

import PropertyAdditionalInfoForm from './ui/property-additional-info-form/PropertyAdditionalInfoForm';

const PropertyMemoPage = () => {
  const propertyId = parsePositiveId(useParams().propertyId);
  if (propertyId === null) {
    return (
      <ContentState title="올바른 매물 주소가 아니에요.">
        <Link to={HOME_PATH}>홈으로 돌아가기</Link>
      </ContentState>
    );
  }
  return <ResolvedPropertyMemoPage propertyId={propertyId} />;
};

const ResolvedPropertyMemoPage = ({ propertyId }: { propertyId: number }) => {
  const navigate = useNavigate();
  const property = usePropertyDetail(propertyId);
  // 빠른 응답에는 로딩 화면 없이 바로 부가 정보를 보여 주고, 오래 걸릴 때만 알린다.
  const isLoadingVisible = useDelayedLoading(property.isPending);

  if (property.isError) {
    return (
      <ContentState
        tone="error"
        title="부가 정보를 불러오지 못했어요."
        description={getPropertyErrorMessage(property.error)}
        onRetry={() => void property.refetch()}
      />
    );
  }
  if (property.isPending || isLoadingVisible) {
    return isLoadingVisible ? <ContentState loading title="부가 정보를 불러오는 중이에요." /> : null;
  }

  return (
    <main className={styles.page}>
      <TopNavigation
        title={`${property.data.name} 부가 정보`}
        backTo={propertyDetailPath(propertyId)}
        backLabel="매물 상세로 돌아가기"
      />
      <PropertyAdditionalInfoForm
        property={property.data}
        onSaved={() => navigate(propertyDetailPath(propertyId), { replace: true })}
      />
    </main>
  );
};

const styles = {
  page: css`
    label: PropertyMemoPage-page;
    min-height: 100%;
    padding: 0 1rem 1.5rem;
    background: var(--color-canvas);
  `,
};

export default PropertyMemoPage;
