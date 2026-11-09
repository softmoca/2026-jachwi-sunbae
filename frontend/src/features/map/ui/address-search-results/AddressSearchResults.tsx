import { css, cx } from '@emotion/css';

import type { AddressSearchStatus } from '../../model/AddressSearch';
import type { MapAddress } from '../../model/Map';

type AddressSearchResultsProps = {
  results: MapAddress[];
  status: AddressSearchStatus;
  onSelect: (address: MapAddress) => void;
  dropdown?: boolean;
  errorMessage?: string;
};
/** API와 라우터 없이 검색 결과·로딩·오류를 표현한다. 지도와 위치 선택에서 함께 쓴다. */
const AddressSearchResults = ({
  results,
  status,
  onSelect,
  dropdown = false,
  errorMessage = '주소를 찾지 못했어요. 다시 시도해 주세요.',
}: AddressSearchResultsProps) => {
  if (dropdown && status === 'idle') return null;
  const content = (
    <>
      {status === 'loading' && (
        <p className={styles.state} role="status">
          주소를 찾는 중이에요…
        </p>
      )}
      {status === 'error' && (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      )}
      {status === 'success' && results.length === 0 && <p className={styles.state}>검색 결과가 없어요.</p>}
      {status === 'success' && results.length > 0 && (
        <ul className={styles.results} aria-label="주소 검색 결과">
          {results.map((result) => {
            const primary = result.roadAddress ?? result.jibunAddress ?? result.address ?? '주소 정보 없음';
            const secondary = result.roadAddress !== null && result.jibunAddress !== null ? result.jibunAddress : null;

            return (
              <li key={`${result.latitude}-${result.longitude}`}>
                <button type="button" className={styles.item} onClick={() => onSelect(result)}>
                  <span className={styles.text}>
                    <strong>{primary}</strong>
                    {secondary !== null && <small>{secondary}</small>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
  return dropdown ? <div className={styles.dropdown}>{content}</div> : content;
};

const styles = {
  dropdown: css`
    position: absolute;
    top: calc(100% + 0.4rem);
    right: 0;
    left: 0;
    z-index: 40;
    max-height: 16rem;
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-tile);
    background: var(--color-surface);
    box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 14%);
    pointer-events: auto;
  `,
  state: css`
    label: AddressSearchResults-state;
    padding: 2rem 1rem;
    font-size: 0.85rem;
    text-align: center;
    color: var(--color-muted, #868b94);
  `,

  error: css`
    label: AddressSearchResults-error;
    padding: 2rem 1rem;
    font-size: 0.85rem;
    text-align: center;
    color: var(--color-error, #e53e3e);
  `,

  // 다른 요소의 선택자에서 `.AddressSearchResults-results`로 가리킨다.
  results: cx(
    css`
      label: AddressSearchResults-results;
      display: grid;
      gap: 0;
      margin: 0;
      padding: 0;
      border-top: 1px solid var(--color-border, #eaebed);
      border-bottom: 1px solid var(--color-border, #eaebed);
      background: var(--color-surface, #fff);
      list-style: none;
    `,
    'AddressSearchResults-results',
  ),

  item: css`
    label: AddressSearchResults-item;
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border: 0;
    border-bottom: 1px solid var(--color-border, #eaebed);
    background: transparent;
    color: var(--color-ink, #212124);
    text-align: left;
    cursor: pointer;
    transition: background 0.15s ease;

    .AddressSearchResults-results li:last-child & {
      border-bottom: 0;
    }

    &:hover {
      background: var(--color-surface-muted, #f2f3f5);
    }
  `,

  text: css`
    label: AddressSearchResults-text;
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 0.15rem;

    & strong,
    & small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    & strong {
      font-size: 0.85rem;
      font-weight: 700;
    }

    & small {
      color: var(--color-muted, #868b94);
      font-size: 0.72rem;
    }
  `,
};

export default AddressSearchResults;
