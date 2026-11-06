import { css } from '@emotion/css';

import AddressSearchResults from '@/features/map/ui/address-search-results/AddressSearchResults';
import DesktopHeaderSlot, { useHasDesktopHeaderSlot } from '@/shared/ui/desktop-header/DesktopHeaderSlot';
import Icon from '@/shared/ui/icon/Icon';
import SearchField from '@/shared/ui/search-field/SearchField';

import type { NeighborhoodPreviewContext } from '../../hooks/useNeighborhoodPreview';

import * as shared from '../../NeighborhoodPreviewPage.styles';

type NeighborhoodMapSearchProps = {
  preview: Pick<
    NeighborhoodPreviewContext,
    | 'leave'
    | 'query'
    | 'changeQuery'
    | 'searchDestination'
    | 'shouldFocusMapSearch'
    | 'hasChosenMapPoint'
    | 'addressResults'
    | 'isSearching'
    | 'searchError'
    | 'selectAddress'
  >;
};

/**
 * 출퇴근 장소 검색창. 휴대폰은 인프라 지도처럼 지도 위 검색창 왼쪽에 흰 원형 홈 버튼을 두고,
 * 데스크탑은 검색창만 공용 헤더 가운데로 옮긴다. 헤더 메뉴로 화면을 오가므로 뒤로가기는 두지 않는다.
 * 헤더가 없는 공개 탐색은 휴대폰처럼 제자리에 홈 버튼과 함께 그린다.
 */
const NeighborhoodMapSearch = ({ preview }: NeighborhoodMapSearchProps) => {
  const searchInHeader = useHasDesktopHeaderSlot();
  return (
    <DesktopHeaderSlot>
      <div className={searchInHeader ? shared.headerMapSearch : shared.mapSearch}>
        {!searchInHeader && (
          <button type="button" className={shared.mapBack} aria-label="홈으로 돌아가기" onClick={preview.leave}>
            <Icon name="home" size={22} />
          </button>
        )}
        <div className={styles.search}>
          <SearchField
            className={shared.activeSearchField}
            shape="pill"
            showSubmitButton
            label="출퇴근 장소"
            placeholder="출퇴근하는 장소 검색"
            value={preview.query}
            onValueChange={preview.changeQuery}
            onSubmit={() => {
              preview.searchDestination();
            }}
            autoFocus={preview.shouldFocusMapSearch}
          />
          {!preview.hasChosenMapPoint && (
            <AddressSearchResults
              results={preview.addressResults}
              dropdown
              status={
                preview.isSearching
                  ? 'loading'
                  : preview.searchError
                    ? 'error'
                    : preview.addressResults.length > 0
                      ? 'success'
                      : 'idle'
              }
              errorMessage={preview.searchError ?? undefined}
              onSelect={preview.selectAddress}
            />
          )}
        </div>
      </div>
    </DesktopHeaderSlot>
  );
};

const styles = {
  search: css`
    position: relative;
    flex: 1;
    min-width: 0;
    pointer-events: auto;
  `,
};
export default NeighborhoodMapSearch;
