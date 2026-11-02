import type { ReactNode } from 'react';
import { lazy } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';

import PropertyAppLayout from '@/app/layouts/property-app-layout/PropertyAppLayout';
import PublicExploreLayout from '@/app/layouts/public-explore-layout/PublicExploreLayout';
import RecordsPageSkeleton from '@/pages/design-records/RecordsPageSkeleton';
import useIsDesktop from '@/shared/lib/hooks/useIsDesktop';
import { RECORDS_PATH } from '@/shared/lib/navigation/appPaths';

import LazyRouteBoundary from './LazyRouteBoundary';
import ProtectedRoute from './ProtectedRoute';

const CheapMealsPage = lazy(() => import('@/pages/cheap-meals/CheapMealsPage'));
const DesignHomePage = lazy(() => import('@/pages/design-home/DesignHomePage'));
const DesignRecordsPage = lazy(() => import('@/pages/design-records/DesignRecordsPage'));
const NeighborhoodPreviewPage = lazy(() => import('@/pages/neighborhood-preview/NeighborhoodPreviewPage'));
const NeighborhoodRoutePage = lazy(() => import('@/pages/neighborhood-preview/NeighborhoodRoutePage'));
const UsageGuidePage = lazy(() => import('@/pages/usage-guide/UsageGuidePage'));
const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const PrivacyPage = lazy(() => import('@/pages/privacy/PrivacyPage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));
const CreatePropertyPage = lazy(() => import('@/pages/create-property/CreatePropertyPage'));
const PropertyDetailPage = lazy(() => import('@/pages/property-detail/PropertyDetailPage'));
const EditPropertyPage = lazy(() => import('@/pages/edit-property/EditPropertyPage'));
const PropertyPhotosPage = lazy(() => import('@/pages/property-photos/PropertyPhotosPage'));
const PropertyMemoPage = lazy(() => import('@/pages/property-memo/PropertyMemoPage'));
const ChecklistListPage = lazy(() => import('@/pages/checklist-list/ChecklistListPage'));
const PropertyActiveChecklistPage = lazy(() => import('@/pages/property-active-checklist/PropertyActiveChecklistPage'));
const PropertyChecklistPage = lazy(() => import('@/pages/property-checklist/PropertyChecklistPage'));
const MyPage = lazy(() => import('@/pages/my/MyPage'));
const MapLocationSelectPage = lazy(() => import('@/pages/map-location-select/MapLocationSelectPage'));
const NearbyAnalysisPage = lazy(() => import('@/pages/nearby-analysis/NearbyAnalysisPage'));
const PropertyComparePage = lazy(() => import('@/pages/property-compare/PropertyComparePage'));
const UpcomingFeaturePage = lazy(() => import('@/pages/upcoming-feature/UpcomingFeaturePage'));

const lazyPage = (page: ReactNode, fallback?: ReactNode) => (
  <LazyRouteBoundary fallback={fallback}>{page}</LazyRouteBoundary>
);

/**
 * 본 방 기록(`/properties`)과 매물 상세(`/properties/:propertyId`).
 * 데스크탑은 두 주소 모두 기록 화면이 그리고 상세를 왼쪽 칸에 연다. 휴대폰 상세는 앱 레이아웃 안 상세 화면이다.
 */
const RecordsRoute = () => {
  const isDesktop = useIsDesktop();
  const propertyId = useParams().propertyId;
  // 처음 여는 기록 화면은 진행 표시 대신 화면 뼈대를 바로 보여, 화면 코드와 기록을 받는 동안 같은 뼈대가 이어지게 한다.
  if (isDesktop || propertyId === undefined) return lazyPage(<DesignRecordsPage />, <RecordsPageSkeleton />);
  return <PropertyAppLayout />;
};

/** 인프라 지도는 본 방 기록 지도로 합쳤다. 예전 주소(`/map`, `/map/:propertyId`)로 들어오면 기록 화면으로 보낸다. */
const LegacyMapRoute = () => {
  const propertyId = useParams().propertyId;
  return <Navigate to={propertyId === undefined ? RECORDS_PATH : `${RECORDS_PATH}/${propertyId}`} replace />;
};

/**
 * 동네 찾기는 통근과 월세를 한 지도에서 함께 본다. 기준을 고르던 예전 주소(`/explore/commute`, `/explore/price`,
 * `/neighborhoods/map?mode=`)로 들어오면 새 주소로 보낸다. 통근 동네 상세는 그대로 잇고, 법정동 월세 상세는 지도로 보낸다.
 */
const LegacyNeighborhoodRoute = ({ base }: { base: '/explore' | '/neighborhoods' }) => {
  const rest = useParams()['*'] ?? '';
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.delete('mode');
  const query = params.toString();
  return (
    <Navigate
      to={{ pathname: rest.startsWith('areas/') ? `${base}/${rest}` : base, search: query ? `?${query}` : '' }}
      replace
    />
  );
};
const AppRoutes = () => (
  <Routes>
    <Route element={<PublicExploreLayout />}>
      <Route path="/explore" element={lazyPage(<NeighborhoodPreviewPage />)}>
        <Route path="areas/:adminDongCode" element={lazyPage(<NeighborhoodRoutePage />)} />
        <Route path="areas/:adminDongCode/details" element={lazyPage(<NeighborhoodRoutePage />)} />
      </Route>
      <Route path="/explore/commute/*" element={<LegacyNeighborhoodRoute base="/explore" />} />
      <Route path="/explore/price/*" element={<LegacyNeighborhoodRoute base="/explore" />} />
      <Route path="/explore/nearby" element={lazyPage(<NearbyAnalysisPage />)} />
    </Route>
    <Route element={<PropertyAppLayout />}>
      <Route path="/guide" element={lazyPage(<UsageGuidePage />)} />
      <Route path="/neighborhoods" element={lazyPage(<NeighborhoodPreviewPage />)}>
        <Route path="areas/:adminDongCode" element={lazyPage(<NeighborhoodRoutePage />)} />
        <Route path="areas/:adminDongCode/details" element={lazyPage(<NeighborhoodRoutePage />)} />
      </Route>
      <Route path="/neighborhoods/map/*" element={<LegacyNeighborhoodRoute base="/neighborhoods" />} />
      <Route path="/neighborhoods/nearby" element={lazyPage(<NearbyAnalysisPage />)} />
    </Route>
    {/* 생활권 탐색 광고 랜딩. 회원이 아니어도 보고, 웹으로 시작하면 홈으로 잇는다. */}
    <Route path="/landing" element={lazyPage(<LandingPage />)} />
    <Route path="/about" element={<Navigate to="/guide" replace />} />
    <Route path="/privacy" element={lazyPage(<PrivacyPage />)} />
    {/* 로그인 화면은 없다. 예전 주소로 들어오면 홈에서 자동 로그인한다. */}
    <Route path="/login" element={<Navigate to="/" replace />} />
    {/* 첫 주소(`/`)를 포함한 회원 화면은 자동 로그인(복원 또는 익명 회원 생성)을 마친 뒤 그린다. */}
    <Route element={<ProtectedRoute />}>
      <Route path="/cheap-meals" element={lazyPage(<CheapMealsPage />)} />
      <Route path="/" element={lazyPage(<DesignHomePage />)} />
      <Route path="/properties/:propertyId?" element={<RecordsRoute />}>
        <Route index element={lazyPage(<PropertyDetailPage />)} />
      </Route>
      <Route element={<PropertyAppLayout />}>
        <Route path="/properties/new" element={lazyPage(<CreatePropertyPage />)} />
        <Route path="/properties/:propertyId/edit" element={lazyPage(<EditPropertyPage />)} />
        <Route path="/properties/:propertyId/photos" element={lazyPage(<PropertyPhotosPage />)} />
        <Route path="/properties/:propertyId/memo" element={lazyPage(<PropertyMemoPage />)} />
        <Route path="/properties/:propertyId/nearby" element={lazyPage(<NearbyAnalysisPage />)} />
        <Route
          path="/properties/:propertyId/active-checklists/:stage"
          element={lazyPage(<PropertyActiveChecklistPage />)}
        />
        <Route
          path="/properties/:propertyId/checklists/:propertyChecklistId"
          element={lazyPage(<PropertyChecklistPage />)}
        />
        <Route path="/checklists" element={lazyPage(<ChecklistListPage />)} />
        {/* 사용자마다 체크리스트를 하나만 쓰므로 예전 만들기·개별 편집·단계별 주소는 모두 내 체크리스트 편집으로 보낸다. */}
        <Route path="/checklists/*" element={<Navigate to="/checklists" replace />} />
        <Route path="/me" element={lazyPage(<MyPage />)} />
        <Route path="/map/:propertyId?" element={<LegacyMapRoute />} />
        <Route path="/map/select-location" element={lazyPage(<MapLocationSelectPage />)} />
        <Route path="/compare" element={lazyPage(<PropertyComparePage />)} />
        <Route path="/export" element={lazyPage(<UpcomingFeaturePage feature="export" />)} />
        <Route path="/tips" element={lazyPage(<UpcomingFeaturePage feature="tips" />)} />
      </Route>
    </Route>
    <Route path="*" element={lazyPage(<NotFoundPage />)} />
  </Routes>
);

export default AppRoutes;
