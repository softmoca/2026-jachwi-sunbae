import { useLocation, useOutlet } from 'react-router-dom';

import useIsDesktop from '@/shared/lib/hooks/useIsDesktop';
import SidePanelLayout from '@/shared/ui/side-panel-layout/SidePanelLayout';

import ChecklistManagement from './ui/ChecklistManagement';

const ChecklistListPage = () => {
  const isDesktop = useIsDesktop();
  const editor = useOutlet();
  const location = useLocation();
  if (!isDesktop) return editor ?? <ChecklistManagement />;
  return (
    <SidePanelLayout
      list={<ChecklistManagement />}
      panel={editor}
      panelLabel="체크리스트 편집 패널"
      panelKey={`${location.pathname}${location.search}`}
    />
  );
};

export default ChecklistListPage;
