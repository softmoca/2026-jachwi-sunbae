import type { ReactNode } from 'react';
import { lazy } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';

import PropertyAppLayout from '@/app/layouts/property-app-layout/PropertyAppLayout';
import PublicExploreLayout from '@/app/layouts/public-explore-layout/PublicExploreLayout';
import RecordsPageSkeleton from '@/pages/design-records/RecordsPageSkeleton';
import NeighborhoodPageSkeleton from '@/pages/neighborhood-preview/NeighborhoodPageSkeleton';
import useIsDesktop from '@/shared/lib/hooks/useIsDesktop';
import {
  ABOUT_PATH,
  CHEAP_MEALS_PATH,
  CHECKLISTS_PATH,
  COMPARE_PATH,
  EXPLORE_NEARBY_PATH,
  EXPLORE_PATH,
  EXPORT_PATH,
  GUIDE_PATH,
  HOME_PATH,
  LANDING_PATH,
  LOGIN_PATH,
  MAP_SELECT_LOCATION_PATH,
  MY_PATH,
  type NeighborhoodBasePath,
  NEIGHBORHOODS_NEARBY_PATH,
  NEIGHBORHOODS_PATH,
  PRIVACY_PATH,
  PROPERTY_NEW_PATH,
  propertyDetailPath,
  RECORDS_MAP_PATH,
  RECORDS_PATH,
  ROUTE_PATTERNS,
  TIPS_PATH,
} from '@/shared/lib/navigation/appPaths';

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
  return <Navigate to={propertyId === undefined ? RECORDS_PATH : propertyDetailPath(propertyId)} replace />;
};

/**
 * 동네 찾기는 통근과 월세를 한 지도에서 함께 본다. 기준을 고르던 예전 주소(`/explore/commute`, `/explore/price`,
 * `/neighborhoods/map?mode=`)로 들어오면 새 주소로 보낸다. 통근 동네 상세는 그대로 잇고, 법정동 월세 상세는 지도로 보낸다.
 */
const LegacyNeighborhoodRoute = ({ base }: { base: NeighborhoodBasePath }) => {
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
      <Route path={EXPLORE_PATH} element={lazyPage(<NeighborhoodPreviewPage />, <NeighborhoodPageSkeleton />)}>
        <Route path={ROUTE_PATTERNS.area} element={lazyPage(<NeighborhoodRoutePage />)} />
        <Route path={ROUTE_PATTERNS.areaDetails} element={lazyPage(<NeighborhoodRoutePage />)} />
      </Route>
      <Route path={ROUTE_PATTERNS.legacyExploreCommute} element={<LegacyNeighborhoodRoute base={EXPLORE_PATH} />} />
      <Route path={ROUTE_PATTERNS.legacyExplorePrice} element={<LegacyNeighborhoodRoute base={EXPLORE_PATH} />} />
      <Route path={EXPLORE_NEARBY_PATH} element={lazyPage(<NearbyAnalysisPage />)} />
    </Route>
    <Route element={<PropertyAppLayout />}>
      <Route path={GUIDE_PATH} element={lazyPage(<UsageGuidePage />)} />
      <Route path={NEIGHBORHOODS_PATH} element={lazyPage(<NeighborhoodPreviewPage />, <NeighborhoodPageSkeleton />)}>
        <Route path={ROUTE_PATTERNS.area} element={lazyPage(<NeighborhoodRoutePage />)} />
        <Route path={ROUTE_PATTERNS.areaDetails} element={lazyPage(<NeighborhoodRoutePage />)} />
      </Route>
      <Route
        path={ROUTE_PATTERNS.legacyNeighborhoodsMap}
        element={<LegacyNeighborhoodRoute base={NEIGHBORHOODS_PATH} />}
      />
      <Route path={NEIGHBORHOODS_NEARBY_PATH} element={lazyPage(<NearbyAnalysisPage />)} />
    </Route>
    {/* 생활권 탐색 광고 랜딩. 회원이 아니어도 보고, 웹으로 시작하면 홈으로 잇는다. */}
    <Route path={LANDING_PATH} element={lazyPage(<LandingPage />)} />
    <Route path={ABOUT_PATH} element={<Navigate to={GUIDE_PATH} replace />} />
    <Route path={PRIVACY_PATH} element={lazyPage(<PrivacyPage />)} />
    {/* 로그인 화면은 없다. 예전 주소로 들어오면 홈에서 자동 로그인한다. */}
    <Route path={LOGIN_PATH} element={<Navigate to={HOME_PATH} replace />} />
    {/* 매물은 본 방 기록 지도에서 바로 등록한다. 예전 매물 등록 주소로 들어오면 기록 지도로 보낸다. */}
    <Route path={PROPERTY_NEW_PATH} element={<Navigate to={RECORDS_MAP_PATH} replace />} />
    {/* 첫 주소(`/`)를 포함한 회원 화면은 자동 로그인(복원 또는 익명 회원 생성)을 마친 뒤 그린다. */}
    <Route element={<ProtectedRoute />}>
      <Route path={CHEAP_MEALS_PATH} element={lazyPage(<CheapMealsPage />)} />
      <Route path={HOME_PATH} element={lazyPage(<DesignHomePage />)} />
      <Route path={ROUTE_PATTERNS.propertyRecords} element={<RecordsRoute />}>
        <Route index element={lazyPage(<PropertyDetailPage />)} />
      </Route>
      <Route element={<PropertyAppLayout />}>
        <Route path={ROUTE_PATTERNS.propertyEdit} element={lazyPage(<EditPropertyPage />)} />
        <Route path={ROUTE_PATTERNS.propertyPhotos} element={lazyPage(<PropertyPhotosPage />)} />
        <Route path={ROUTE_PATTERNS.propertyMemo} element={lazyPage(<PropertyMemoPage />)} />
        <Route path={ROUTE_PATTERNS.propertyNearby} element={lazyPage(<NearbyAnalysisPage />)} />
        <Route path={ROUTE_PATTERNS.propertyActiveChecklist} element={lazyPage(<PropertyActiveChecklistPage />)} />
        <Route path={ROUTE_PATTERNS.propertyChecklist} element={lazyPage(<PropertyChecklistPage />)} />
        <Route path={CHECKLISTS_PATH} element={lazyPage(<ChecklistListPage />)} />
        {/* 사용자마다 체크리스트를 하나만 쓰므로 예전 만들기·개별 편집·단계별 주소는 모두 내 체크리스트 편집으로 보낸다. */}
        <Route path={ROUTE_PATTERNS.legacyChecklists} element={<Navigate to={CHECKLISTS_PATH} replace />} />
        <Route path={MY_PATH} element={lazyPage(<MyPage />)} />
        <Route path={ROUTE_PATTERNS.legacyMap} element={<LegacyMapRoute />} />
        <Route path={MAP_SELECT_LOCATION_PATH} element={lazyPage(<MapLocationSelectPage />)} />
        <Route path={COMPARE_PATH} element={lazyPage(<PropertyComparePage />)} />
        <Route path={EXPORT_PATH} element={lazyPage(<UpcomingFeaturePage feature="export" />)} />
        <Route path={TIPS_PATH} element={lazyPage(<UpcomingFeaturePage feature="tips" />)} />
      </Route>
    </Route>
    <Route path={ROUTE_PATTERNS.notFound} element={lazyPage(<NotFoundPage />)} />
  </Routes>
);

export default AppRoutes;
