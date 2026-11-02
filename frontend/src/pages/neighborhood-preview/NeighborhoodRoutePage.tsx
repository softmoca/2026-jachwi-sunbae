import { useMatch, useNavigate, useOutletContext, useParams } from 'react-router-dom';

import useIsDesktop from '@/shared/lib/hooks/useIsDesktop';
import { ROUTE_PATTERNS } from '@/shared/lib/navigation/appPaths';
import { Button } from '@/shared/ui/button/Button';

import NeighborhoodRouteDesktopPage from './desktop/NeighborhoodRouteDesktopPage';
import useNeighborhoodDetailAnalytics from './hooks/useNeighborhoodDetailAnalytics';
import type { NeighborhoodPreviewContext } from './hooks/useNeighborhoodPreview';
import NeighborhoodRouteMobilePage from './mobile/NeighborhoodRouteMobilePage';

import * as styles from './NeighborhoodRoutePage.styles';

/** 동네 대중교통 상세(`areas/:adminDongCode/details`). 데스크탑·휴대폰 화면을 여기서 한 번만 고르고, 본문은 두 화면이 함께 쓴다. */
const NeighborhoodRoutePage = () => {
  const preview = useOutletContext<NeighborhoodPreviewContext>();
  const navigate = useNavigate();
  const { adminDongCode } = useParams();
  const isDesktop = useIsDesktop();
  const isDetailPage = useMatch(`${preview.mapPath}/${ROUTE_PATTERNS.areaDetails}`);
  const area = preview.selected?.adminDongCode === adminDongCode ? preview.selected : undefined;
  useNeighborhoodDetailAnalytics({
    mock: preview.isMockData,
    ready: !!isDetailPage && !!area && !!preview.route && !preview.isRouteLoading && !preview.routeError,
    failed: !!isDetailPage && !!area && !!preview.routeError,
    itemKey: area && preview.selectedStation ? `${area.adminDongCode}:${preview.selectedStation.stopId}` : null,
    hasRent: !!area?.rent,
  });

  if (!area)
    return (
      <main className={styles.page}>
        <h1>동네를 먼저 선택해주세요</h1>
        <Button onClick={() => navigate(preview.mapPath, { replace: true })}>지도로 돌아가기</Button>
      </main>
    );

  if (!isDetailPage) return null;

  return isDesktop ? (
    <NeighborhoodRouteDesktopPage preview={preview} area={area} />
  ) : (
    <NeighborhoodRouteMobilePage preview={preview} area={area} />
  );
};

export default NeighborhoodRoutePage;
