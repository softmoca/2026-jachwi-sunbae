import { useEffect, useState } from 'react';

/** 값이 `delayMs` 동안 바뀌지 않으면 그 값을 돌려준다. 지도가 멈춘 뒤 잠깐 기다렸다가 조회할 때 쓴다. null은 곧바로 넘긴다. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (value === null) {
      setDebounced(value);
      return;
    }
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return value === null ? value : debounced;
}

export default useDebouncedValue;
