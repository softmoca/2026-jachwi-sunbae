import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { usePublicConfig } from '@/shared/config/PublicConfigContext';

import { prefetchMetroBoundaries } from './adminBoundaryQueries';

const IDLE_TIMEOUT_MS = 2000;
/** requestIdleCallback이 없는 브라우저(iOS Safari 등)는 짧게 쉬었다가 진행한다. */
const IDLE_FALLBACK_MS = 200;

const waitForIdle = () =>
  new Promise<void>((resolve) => {
    if (typeof window.requestIdleCallback === 'function')
      window.requestIdleCallback(() => resolve(), { timeout: IDLE_TIMEOUT_MS });
    else window.setTimeout(resolve, IDLE_FALLBACK_MS);
  });

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/** 데이터 절약 모드이거나 2G급 연결이면 쓰지 않을 수도 있는 1.5MB를 받지 않는다. */
const isConstrainedNetwork = () => {
  // Network Information API는 Chromium 계열에만 있어 lib.dom 타입에 없다.
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return connection?.saveData === true || /(^|-)2g$/.test(connection?.effectiveType ?? '');
};

type Options = {
  /** 검색 중에는 검색이 필요한 파일만 받도록 미리 받기를 시작하지 않고, 진행 중이면 남은 파일을 멈춘다. */
  isSearching: boolean;
};

/**
 * 동네 찾기에서 장소를 고르는 동안 수도권 행정동 경계를 미리 받아 둔다.
 * 돌려준 함수는 지도가 처음 그려진 뒤 부르며, 화면마다 한 번만 동작한다.
 */
export const usePrefetchMetroBoundaries = ({ isSearching }: Options) => {
  const config = usePublicConfig();
  const client = useQueryClient();
  const hasStarted = useRef(false);
  const isUnmounted = useRef(false);
  const isSearchingRef = useRef(isSearching);
  useEffect(() => {
    isSearchingRef.current = isSearching;
  }, [isSearching]);
  useEffect(() => {
    isUnmounted.current = false;
    return () => {
      isUnmounted.current = true;
    };
  }, []);
  return useCallback(() => {
    if (hasStarted.current || isSearchingRef.current || isConstrainedNetwork()) return;
    hasStarted.current = true;
    void prefetchMetroBoundaries(client, config.boundaryBaseUrl, {
      shouldStop: () => isUnmounted.current || isSearchingRef.current,
      waitForIdle,
    });
  }, [client, config.boundaryBaseUrl]);
};
