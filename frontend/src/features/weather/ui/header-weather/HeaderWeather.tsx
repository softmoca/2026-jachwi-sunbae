import { css, keyframes } from '@emotion/css';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useRecentEdit } from '@/features/property/hooks/useRecentEdit';
import { openNativeSettings, supportsNativePush } from '@/shared/lib/native-app/nativePush';
import { MY_PATH } from '@/shared/lib/navigation/appPaths';

import { weatherLabel } from '../../lib/weatherPresentation';
import { useHeaderWeather } from '../../model/useHeaderWeather';
import { useWeatherPushSync } from '../../model/useWeatherPushSync';
import WeatherSymbol from '../weather-symbol/WeatherSymbol';

const ROTATE_MS = 5000;
/** 처음 들어왔을 때 고치던 매물 안내를 보이는 시간. */
const RESUME_EDIT_MS = 4000;
type Slide = { key: string; node: (isActive: boolean) => ReactNode };

/**
 * 헤더 가운데에 띄우는 안내. 카드 없이 `[아이콘] 18°`를 크게, 위치와 상태는 옅은 글씨로 잇는다.
 * - 위치 권한이 있으면 현재 위치 날씨, 없으면 `위치를 허용하면 …` 멘트와 아래 `위치 허용하기` 버튼.
 * - 앱에서 알림이 꺼져 있으면 `알림 켜기`(마이로 이동)를, 기기 알림 권한이 꺼져 있으면 `알림 허용하기`(기기 설정)를 같은 모양으로 더한다.
 * - 처음 들어왔을 때 10분 안에 고치던 매물이 있으면 `이어서 보기`를 4초만 먼저 보여 주고 그 화면으로 바로 돌아가게 한다.
 * 안내가 둘이면 5초마다 번갈아 보이고, 마우스를 올리면 멈춘다.
 */
const HeaderWeather = ({ className }: { className?: string }) => {
  const { isAllowed, requestPermission, placeName, hour, precipitation } = useHeaderWeather();
  const settings = useWeatherPushSync();
  const resumeEdit = useRecentEdit();
  const [isResumeDone, setIsResumeDone] = useState(false);
  const showsResume = resumeEdit !== null && !isResumeDone;
  useEffect(() => {
    if (!showsResume) return;
    const timer = window.setTimeout(() => setIsResumeDone(true), RESUME_EDIT_MS);
    return () => window.clearTimeout(timer);
  }, [showsResume]);
  const [slide, setSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides: Slide[] = [];
  if (showsResume) {
    slides.push({
      key: 'resume-edit',
      node: (isActive) => (
        <Link
          className={`${styles.item} ${styles.prompt}`}
          data-active={isActive}
          to={resumeEdit.path}
          tabIndex={isActive ? 0 : -1}
        >
          <span className={styles.promptMessage}>
            {resumeEdit.name} {resumeEdit.kind === 'checklist' ? '체크리스트' : '기록'}를 고치던 중이었어요
          </span>
          <span className={styles.promptAction}>이어서 보기</span>
        </Link>
      ),
    });
  }
  if (hour !== null) {
    slides.push({
      key: 'weather',
      node: (isActive) => (
        <section
          className={`${styles.item} ${styles.stack}`}
          data-active={isActive}
          aria-label={`${placeName ?? '내 위치'} 날씨`}
        >
          <span className={styles.place}>{placeName ?? '내 위치'}</span>
          <span className={styles.now}>
            <WeatherSymbol hour={hour} size={20} />
            <strong>{Math.round(hour.tmp as number)}°</strong>
            <span className={styles.condition}>{weatherLabel(hour)}</span>
            {precipitation !== null && <span className={styles.condition}>오늘 강수 {precipitation.pop}%</span>}
          </span>
        </section>
      ),
    });
  } else if (!isAllowed) {
    slides.push({
      key: 'location-permission',
      node: (isActive) => (
        <button
          type="button"
          className={`${styles.item} ${styles.prompt}`}
          data-active={isActive}
          tabIndex={isActive ? 0 : -1}
          onClick={() => void requestPermission()}
        >
          <span className={styles.promptMessage}>위치를 허용하면 더 많은 기능을 이용할 수 있어요</span>
          <span className={styles.promptAction}>위치 허용하기</span>
        </button>
      ),
    });
  }

  if (supportsNativePush() && settings.data !== undefined && !settings.data.enabled) {
    const needsDeviceSetting = settings.data.problem === 'permission';
    const content = (
      <>
        <span className={styles.promptMessage}>
          {needsDeviceSetting ? '알림을 허용하면 유용한 소식을 미리 받아요' : '알림을 켜면 유용한 소식을 미리 받아요'}
        </span>
        <span className={styles.promptAction}>{needsDeviceSetting ? '알림 허용하기' : '알림 켜기'}</span>
      </>
    );
    slides.push({
      key: 'notification',
      node: (isActive) =>
        needsDeviceSetting ? (
          <button
            type="button"
            className={`${styles.item} ${styles.prompt}`}
            data-active={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => void openNativeSettings().catch(() => undefined)}
          >
            {content}
          </button>
        ) : (
          <Link
            className={`${styles.item} ${styles.prompt}`}
            data-active={isActive}
            to={MY_PATH}
            tabIndex={isActive ? 0 : -1}
          >
            {content}
          </Link>
        ),
    });
  }

  const activeIndex = showsResume ? 0 : slide % Math.max(slides.length, 1);
  const isRotating = slides.length > 1 && !isPaused && !showsResume;
  useEffect(() => {
    if (!isRotating || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setSlide((current) => current + 1), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [isRotating, slide]);

  if (slides.length === 0) return null;

  return (
    <div
      className={`${styles.root} ${className ?? ''}`.trim()}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((item, index) => (
        <div key={item.key} className={styles.cell}>
          {item.node(index === activeIndex)}
        </div>
      ))}
    </div>
  );
};

/* 안내가 처음 생길 때 아래에서 위로 올라온다. */
const riseKeyframes = keyframes`
  from {
    opacity: 0;
    transform: translateY(0.9rem);
  }
`;

const styles = {
  /* 안내들을 같은 칸에 겹쳐 두고 하나만 보이게 해, 바뀔 때 헤더 폭이 흔들리지 않는다. */
  root: css`
    label: HeaderWeather-root;
    display: grid;
    min-width: 0;
    justify-items: center;
    color: #25282d;
  `,

  cell: css`
    label: HeaderWeather-cell;
    grid-area: 1 / 1;
    display: grid;
    min-width: 0;
    justify-items: center;
    animation: ${riseKeyframes} 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `,

  item: css`
    label: HeaderWeather-item;
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 0.9rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-decoration: none;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transform: translateY(0.6rem);
    transition:
      opacity 0.35s ease,
      transform 0.35s ease;

    &[data-active='true'] {
      opacity: 1;
      pointer-events: auto;
      transform: none;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `,

  now: css`
    label: HeaderWeather-now;
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 0.3rem;
    font-size: 1rem;
    line-height: 1;

    & strong {
      font-weight: 700;
      letter-spacing: -0.02em;
    }
  `,

  /* 날씨: 윗줄에 장소, 아랫줄에 아이콘과 기온, 상태를 둔다. */
  stack: css`
    label: HeaderWeather-stack;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
  `,

  place: css`
    label: HeaderWeather-place;
    max-width: 100%;
    overflow: hidden;
    color: #6b7079;
    font-size: 0.78rem;
    font-weight: 500;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  condition: css`
    label: HeaderWeather-condition;
    color: #6b7079;
    font-size: 0.85rem;
    font-weight: 500;
  `,

  /* 권한 안내: 무엇을 쓸 수 있는지 한 줄, 그 아래에 허용 버튼을 둔다. 헤더 높이(2.5rem) 안에 들어간다. */
  prompt: css`
    label: HeaderWeather-prompt;
    flex-direction: column;
    justify-content: center;
    gap: 0.2rem;
  `,

  promptMessage: css`
    label: HeaderWeather-promptMessage;
    max-width: 100%;
    overflow: hidden;
    color: #6b7079;
    font-size: 0.78rem;
    font-weight: 500;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  promptAction: css`
    label: HeaderWeather-promptAction;
    padding: 0.2rem 0.7rem;
    border-radius: 999px;
    background: #eef3fd;
    color: var(--color-brand-blue);
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.1;
  `,
};

export default HeaderWeather;
