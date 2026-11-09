import { useLocation, useOutlet } from 'react-router-dom';

import useIsDesktop from '@/shared/lib/hooks/useIsDesktop';
import SidePanelLayout from '@/shared/ui/side-panel-layout/SidePanelLayout';

import ChecklistDefaultIntro from './ui/ChecklistDefaultIntro';
import ChecklistManagement from './ui/ChecklistManagement';

const ChecklistListPage = () => {
  const isDesktop = useIsDesktop();
  const editor = useOutlet();
  const location = useLocation();
  if (!isDesktop) return editor ?? <ChecklistManagement />;
  // 데스크탑은 처음 열 때 오른쪽에 기본 체크리스트 안내(그림과 항목 카드 캐러셀)를 둔다. 왼쪽 목록에서 하나를 고르면 그 체크리스트가 열린다.
  return (
    <SidePanelLayout
      list={<ChecklistManagement />}
      panel={editor ?? <ChecklistDefaultIntro />}
      panelLabel="체크리스트 편집 패널"
      panelKey={`${location.pathname}${location.search}`}
    />
  );
};

export default ChecklistListPage;
