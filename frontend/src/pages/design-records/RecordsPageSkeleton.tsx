import useIsDesktop from '@/shared/lib/hooks/useIsDesktop';
import DesktopHeader from '@/shared/ui/desktop-header/DesktopHeader';
import { DesktopHeaderSlotProvider } from '@/shared/ui/desktop-header/DesktopHeaderSlot';
import ListDetailLayout from '@/shared/ui/list-detail-layout/ListDetailLayout';

import useRecordsView from './hooks/useRecordsView';
import RecordsMobileHeader from './mobile/RecordsMobileHeader';
import RecordDistricts from './ui/record-districts/RecordDistricts';
import RecordListSkeleton from './ui/record-list/RecordListSkeleton';

import * as desktopStyles from './desktop/RecordsDesktopPage.styles';
import * as mobileStyles from './mobile/RecordsMobilePage.styles';

/**
 * 본 방 기록 화면의 코드를 받는 동안 Suspense fallback으로 보여 주는 뼈대.
 * 처음 여는 화면이라 남겨 둘 내용이 없으므로 늦추지 않고 바로 보여 준다.
 * 화면이 그려진 뒤 기록을 받는 동안에도 같은 자리에 같은 뼈대를 두어, 로딩에서 뼈대로 한 번 더 바뀌지 않고 뼈대에서 목록으로 한 번만 바뀐다.
 */
const RecordsPageSkeleton = () => (useIsDesktop() ? <DesktopSkeleton /> : <MobileSkeleton />);

const DesktopSkeleton = () => (
  <DesktopHeaderSlotProvider>
    <main className={desktopStyles.page}>
      <div className={desktopStyles.frame}>
        <DesktopHeader />
        <ListDetailLayout className={desktopStyles.body} list={<RecordListSkeleton className={desktopStyles.list} />}>
          {null}
        </ListDetailLayout>
      </div>
    </main>
  </DesktopHeaderSlotProvider>
);

const MobileSkeleton = () => {
  const [view, setView] = useRecordsView();
  return (
    <main className={mobileStyles.page}>
      <div className={mobileStyles.frame}>
        <RecordsMobileHeader view={view} onViewChange={setView} />
        {/* 기록을 받기 전에도 화면은 '전체' 뱃지 하나를 두므로 같은 줄을 미리 둔다. */}
        <RecordDistricts districts={['전체']} district="전체" onSelect={() => undefined} />
        <div className={mobileStyles.body}>
          <RecordListSkeleton className={mobileStyles.list} />
        </div>
      </div>
    </main>
  );
};

export default RecordsPageSkeleton;
