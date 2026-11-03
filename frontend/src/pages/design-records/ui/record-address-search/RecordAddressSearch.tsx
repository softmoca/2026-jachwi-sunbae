import { css } from '@emotion/css';
import { useEffect, useRef } from 'react';

import type { MapAddress } from '@/features/map/model/Map';
import useAddressSearch from '@/features/property/hooks/useAddressSearch';
import SearchField from '@/shared/ui/search-field/SearchField';

type Props = {
  /** 고른 주소로 지도를 옮긴다. */
  onSelect: (address: MapAddress) => void;
  autoFocus?: boolean;
  /** 넘기면 검색창 왼쪽에 뒤로가기를 두고 누르면 부른다. 휴대폰에서 검색을 접을 때 쓴다. */
  onBack?: () => void;
  /** 검색창 이름과 안내 문구. 기본은 지도를 옮기는 주소 검색이다. */
  label?: string;
  placeholder?: string;
  className?: string;
};

/** 입력을 멈추고 이만큼 지나면 검색한다. */
const SEARCH_DEBOUNCE_MS = 300;

const formatAddress = (address: MapAddress) => address.roadAddress ?? address.jibunAddress ?? address.address ?? '';

/** 본 방 기록 지도에서 주소를 찾아 그 자리로 지도를 옮기는 검색창. 결과는 검색창 바로 아래에 띄운다. */
const RecordAddressSearch = ({
  onSelect,
  autoFocus = false,
  onBack,
  label = '주소 검색',
  placeholder = '주소로 지도 이동',
  className,
}: Props) => {
  const search = useAddressSearch();
  const { query } = search;
  // 결과를 고르면 검색어가 그 주소로 바뀐다. 이때는 다시 검색하지 않는다.
  const pickedRef = useRef<string | null>(null);
  // submit은 렌더마다 새로 만들어진다. 검색어가 바뀔 때만 검색하도록 최신 것을 ref로 들고 있는다.
  const submitRef = useRef(search.submit);
  submitRef.current = search.submit;

  // 따로 제출하지 않고 입력할 때마다 검색한다. 입력이 멈춘 뒤에만 요청한다.
  useEffect(() => {
    if (query.trim() === '' || query === pickedRef.current) return;
    const timer = window.setTimeout(() => void submitRef.current(), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className={`${styles.root} ${className ?? ''}`.trim()}>
      <SearchField
        className={styles.field}
        shape="pill"
        label={label}
        placeholder={placeholder}
        value={search.query}
        showSubmitButton={false}
        autoFocus={autoFocus}
        onBack={onBack}
        onValueChange={search.changeQuery}
        onSubmit={() => void search.submit()}
        onClear={search.clear}
      />
      {(search.status !== 'idle' || search.results.length > 0) && (
        <div className={styles.dropdown}>
          {search.status === 'loading' && <p className={styles.status}>주소를 찾는 중이에요.</p>}
          {search.status === 'error' && (
            <p className={styles.status} role="alert">
              주소를 찾지 못했어요. 다시 시도해 주세요.
            </p>
          )}
          {search.results.length > 0 && (
            <ul className={styles.results} aria-label="주소 검색 결과">
              {search.results.map((result) => (
                <li key={`${result.latitude}-${result.longitude}`}>
                  <button
                    type="button"
                    onClick={() => {
                      pickedRef.current = formatAddress(result);
                      search.pick(result);
                      onSelect(result);
                    }}
                  >
                    {formatAddress(result)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  root: css`
    label: RecordAddressSearch-root;
    position: relative;
    flex: 1;
    min-width: 0;
    /* 지도 위에 띄운 헤더는 빈 자리 클릭을 지도로 넘기므로, 검색창과 결과는 직접 받는다. */
    pointer-events: auto;
  `,

  field: css`
    label: RecordAddressSearch-field;
    min-width: 0;
    background: white;
    box-shadow: 0 0.2rem 0.6rem rgb(0 0 0 / 8%);
  `,

  dropdown: css`
    label: RecordAddressSearch-dropdown;
    position: absolute;
    top: calc(100% + 0.4rem);
    right: 0;
    left: 0;
    z-index: 40;
    max-height: 16rem;
    overflow-y: auto;
    border: 1px solid #e3e5e9;
    border-radius: 1rem;
    background: white;
    box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 14%);
  `,

  status: css`
    label: RecordAddressSearch-status;
    margin: 0;
    padding: 0.85rem 1rem;
    color: #868b94;
    font-size: 0.82rem;
  `,

  results: css`
    label: RecordAddressSearch-results;
    margin: 0;
    padding: 0.3rem 0;
    list-style: none;

    & button {
      display: block;
      width: 100%;
      padding: 0.7rem 1rem;
      border: 0;
      background: transparent;
      color: #25282d;
      font: inherit;
      font-size: 0.85rem;
      text-align: left;
      cursor: pointer;
    }

    & button:hover {
      background: #f5f6f8;
    }
  `,
};

export default RecordAddressSearch;
