import { useEffect, useRef, useState } from 'react';

type DelayedLoadingOptions = {
  delayMs?: number;
  minimumVisibleMs?: number;
};

const DEFAULT_DELAY_MS = 300;
const DEFAULT_MINIMUM_VISIBLE_MS = 250;

/**
 * 짧은 요청에는 로딩 표시를 생략하고, 표시된 로딩은 너무 빠르게 사라지지 않게 한다.
 */
const useDelayedLoading = (
  isLoading: boolean,
  { delayMs = DEFAULT_DELAY_MS, minimumVisibleMs = DEFAULT_MINIMUM_VISIBLE_MS }: DelayedLoadingOptions = {},
) => {
  const [isVisible, setIsVisible] = useState(false);
  const visibleSince = useRef<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isLoading && !isVisible) {
      timer = setTimeout(() => {
        visibleSince.current = Date.now();
        setIsVisible(true);
      }, delayMs);
    }

    if (!isLoading && isVisible) {
      const elapsed = visibleSince.current === null ? minimumVisibleMs : Date.now() - visibleSince.current;
      const remaining = Math.max(minimumVisibleMs - elapsed, 0);

      timer = setTimeout(() => {
        visibleSince.current = null;
        setIsVisible(false);
      }, remaining);
    }

    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [delayMs, isLoading, isVisible, minimumVisibleMs]);

  return isVisible;
};

export default useDelayedLoading;
