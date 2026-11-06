import { css, cx } from '@emotion/css';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import Icon from '../icon/Icon';

type BottomSheetProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  showCloseButton?: boolean;
  initialHeightPercent?: number;
  resizable?: boolean;
  /** 끝까지 끌어 올리면 모서리와 위 여백 없이 화면 전체를 덮는 페이지로 연다. 기본으로 켜고, 페이지로 열면 안 되는 화면만 끈다. */
  fullPage?: boolean;
  /** 값이 바뀔 때마다 제목만 보이는 높이로 내린다. 지도 빈 곳을 찍으면 시트를 비키게 할 때 쓴다. */
  peekSignal?: number;
  /** 있으면 제목 왼쪽에 뒤로가기를 둔다. 시트 안에서 목록→정보로 넘어갔을 때 목록으로 돌아가게 한다. */
  onBack?: () => void;
  /** 제목 오른쪽 끝에 둘 동작(외부 링크 아이콘 등). 페이지로 열려 닫기가 생기면 그 왼쪽에 둔다. */
  headerEnd?: ReactNode;
  /** 제목 아래 작은 한 줄(주소 등). */
  subtitle?: string;
  /**
   * 시트 바로 위 오른쪽에 띄울 것(지도 확대 축소, 현재 위치 버튼 등). 시트와 함께 오르내려 시트에 가리지 않는다.
   * 페이지로 열면 숨긴다.
   */
  floating?: ReactNode;
  /** 시트 상자에 덧붙일 클래스. 내용이 바뀔 때 다시 올라오는 전환처럼 화면마다 다른 움직임만 덧붙인다. */
  className?: string;
};

/** 시트 높이 단계. 낮은 것부터 제목만(peek), 처음 높이(default), 크게(expanded), 화면 전체(full). */
type SheetMode = 'peek' | 'default' | 'expanded' | 'full';

const BottomSheet = ({
  title,
  children,
  onClose,
  closeLabel = '상세 닫기',
  showCloseButton = true,
  initialHeightPercent = 58,
  resizable = true,
  fullPage = true,
  peekSignal,
  onBack,
  headerEnd,
  subtitle,
  floating,
  className,
}: BottomSheetProps) => {
  const [mode, setMode] = useState<SheetMode>('default');
  const modes: SheetMode[] = fullPage ? ['peek', 'default', 'expanded', 'full'] : ['peek', 'default', 'expanded'];
  const lastPeekSignal = useRef(peekSignal);
  useEffect(() => {
    if (peekSignal === lastPeekSignal.current) return;
    lastPeekSignal.current = peekSignal;
    setMode('peek');
  }, [peekSignal]);
  // frame: 끌기 시작에 한 번 늘려 둔 시트 실제 높이. 끄는 동안은 이 높이를 그대로 두고 transform으로만 움직인다.
  const gesture = useRef<{ startY: number; height: number; limit: number; frame: number | null } | null>(null);
  const dragged = useRef(false);
  const sheetRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const isFullPage = mode === 'full';
  useEffect(() => {
    (showCloseButton ? closeButtonRef.current : resizable ? handleRef.current : sheetRef.current)?.focus({
      preventScroll: true,
    });
  }, [showCloseButton, resizable]);
  // 페이지로 열리면 끌개가 사라지므로 헤더의 뒤로가기·닫기로 다룬다.
  const back = onBack ?? (isFullPage ? () => setMode('default') : undefined);
  // 끄는 동안 직접 넣은 인라인 높이와 위치를 지운다. 놓은 뒤 높이는 mode가 정한다.
  const clearDrag = () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.style.removeProperty('--sheet-height');
    sheet.style.removeProperty('transform');
    delete sheet.dataset.dragging;
  };
  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    const start = gesture.current;
    gesture.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    clearDrag();
    if (!start || !dragged.current) return;
    const released = start.height + start.startY - event.clientY;
    if (released < start.limit * 0.25) onClose();
    else if (fullPage && released > start.limit * 0.85) setMode('full');
    else setMode(released > start.limit * 0.6 ? 'expanded' : 'default');
  };
  return (
    <section
      ref={sheetRef}
      className={className ? cx(styles.sheet, className) : styles.sheet}
      aria-label={title}
      tabIndex={-1}
      data-resizable={resizable}
      data-expanded={mode === 'expanded' || mode === 'full' || undefined}
      data-mode={mode}
      style={
        {
          '--sheet-default-height': `${Math.max(25, Math.min(88, initialHeightPercent))}%`,
        } as CSSProperties
      }
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      {floating && !isFullPage && <div className={styles.floating}>{floating}</div>}
      {resizable && !isFullPage && (
        <button
          ref={handleRef}
          className={styles.grabber}
          type="button"
          aria-label="상세 패널 높이 조절"
          aria-expanded={mode === 'expanded'}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            dragged.current = false;
            const sheet = sheetRef.current;
            if (!sheet) return;
            gesture.current = {
              startY: event.clientY,
              height: sheet.getBoundingClientRect().height,
              limit: sheet.parentElement?.getBoundingClientRect().height ?? window.innerHeight,
              frame: null,
            };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = gesture.current;
            const sheet = sheetRef.current;
            if (!start || !sheet || Math.abs(event.clientY - start.startY) < 6) return;
            dragged.current = true;
            const max = start.limit * (fullPage ? 1 : 0.9);
            const target = Math.max(80, Math.min(max, start.height + start.startY - event.clientY));
            // 높이를 바꾸면 움직일 때마다 시트 안 전체를 다시 배치하고 그린다. 시작에 한 번만 최대 높이로 늘리고,
            // 그 뒤로는 보이는 높이만큼만 올라오게 아래로 밀어(transform) 합성만 일어나게 한다.
            if (start.frame === null) {
              sheet.dataset.dragging = 'true';
              sheet.style.setProperty('--sheet-height', `${max}px`);
              // max-height에 걸리면 덜 늘어나므로 실제 높이를 기준으로 민다.
              start.frame = sheet.getBoundingClientRect().height;
            }
            sheet.style.transform = `translateY(${Math.max(0, start.frame - Math.min(target, start.frame))}px)`;
          }}
          onPointerUp={finish}
          onPointerCancel={(event) => {
            gesture.current = null;
            clearDrag();
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          }}
          // 누르기만 해서는 높이를 바꾸지 않는다. 끌어서 바꾸고, 키보드는 위·아래 화살표로 한 단계씩 바꾼다.
          onClick={() => {
            dragged.current = false;
          }}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
            event.preventDefault();
            const index = modes.indexOf(mode);
            setMode(modes[Math.max(0, Math.min(modes.length - 1, index + (event.key === 'ArrowUp' ? 1 : -1)))]);
          }}
        >
          <span />
        </button>
      )}
      <header className={styles.header}>
        {back && (
          <button type="button" className={styles.back} aria-label="뒤로 가기" onClick={back}>
            <Icon name="chevron-left" size={22} />
          </button>
        )}
        <div className={styles.titles}>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {headerEnd}
        {(showCloseButton || isFullPage) && (
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label={closeLabel}>
            <Icon name="close" size={20} />
          </button>
        )}
      </header>
      <div className={styles.content}>{children}</div>
    </section>
  );
};

const styles = {
  // 다른 요소의 선택자에서 `.BottomSheet-sheet`로 가리킨다.
  sheet: cx(
    css`
      label: BottomSheet-sheet;
      position: absolute;
      left: 0;
      right: 0;
      bottom: var(--map-sheet-bottom, 0px);
      height: var(--sheet-height, var(--sheet-default-height, 58%));
      max-height: calc(100% - var(--map-sheet-bottom, 0px) - 1rem);
      display: flex;
      flex-direction: column;
      z-index: 35;
      border-radius: 1.25rem 1.25rem 0 0;
      background: var(--color-surface);
      color: var(--color-ink);
      box-shadow: 0 -0.35rem 1.4rem rgb(0 0 0 / 12%);
      /* 아이폰 사파리는 GL 지도 캔버스 위에 겹친 시트를 겹침 때문에 뒤늦게 레이어로 올리면서, 첫 터치 전까지 배경을 칠하지 않아
         양옆이 비어 보였다(#546). 처음부터 시트를 자기 레이어로 올려 만들 때 칠하게 한다. 끄는 동안은 인라인 translateY가 이 값을 덮는다. */
      transform: translateZ(0);
      backface-visibility: hidden;
      /* 시트 위로 띄운 버튼(floating)이 잘리지 않게 넘치는 것은 자르지 않는다. 내용은 content 안에서 스크롤한다. */

      &[data-mode='expanded'] {
        height: var(--sheet-height, 88%);
      }

      /* 제목만 남기고 내린다. */
      &[data-mode='peek'] {
        height: var(--sheet-height, 5.5rem);
      }

      /* 끄는 동안은 transform만 바꾸므로 미리 레이어로 올려 둔다. */
      &[data-dragging='true'] {
        will-change: transform;
      }

      /* 끝까지 올리면 화면 전체를 덮는 페이지가 된다. 시트가 지도 칸 안에 있어도(저렴한 한 끼처럼 위에 머리와 탭이 있는 화면)
         그 칸이 아니라 화면 맨 위까지 덮는다. */
      &[data-mode='full'] {
        position: fixed;
        inset: 0;
        z-index: 50;
        height: auto;
        max-height: none;
        border-radius: 0;
        box-shadow: none;
      }

      /* 태블릿(768~1023px)은 휴대폰 화면 구성을 써서 시트도 화면 폭을 채운다. 데스크탑만 30rem 폭으로 가운데에 띄운다. */
      @media (min-width: 1024px) {
        max-width: 30rem;
        margin-right: auto;
        margin-left: auto;
      }
    `,
    'BottomSheet-sheet',
  ),

  /* 시트 위 가장자리 바로 위 오른쪽. 시트와 같은 상자 안에 있어 끄는 동안 transform으로 함께 움직인다. */
  floating: css`
    label: BottomSheet-floating;
    position: absolute;
    right: 0.85rem;
    bottom: calc(100% + 0.75rem);
  `,

  grabber: css`
    label: BottomSheet-grabber;
    flex: none;
    display: grid;
    place-items: center;
    width: 100%;
    height: 1.75rem;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: ns-resize;
    touch-action: none;

    & span {
      width: 2.5rem;
      height: 0.25rem;
      border-radius: 999px;
      background: var(--color-border-strong);
    }
  `,

  header: css`
    label: BottomSheet-header;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.25rem;
    padding: 0.35rem 1.25rem 0.7rem;
    flex: none;

    & h2 {
      overflow: hidden;
      font-size: 1.05rem;
      margin: 0;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .BottomSheet-sheet[data-resizable='false'] & {
      padding-top: 1.25rem;
    }

    .BottomSheet-sheet[data-mode='full'] & {
      padding-top: calc(env(safe-area-inset-top) + 0.5rem);
    }

    & button {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      background: none;
      color: inherit;
      border: 0;
      cursor: pointer;
    }
  `,

  titles: css`
    label: BottomSheet-titles;
    display: grid;
    flex: 1;
    gap: 0.15rem;
    min-width: 0;

    & p {
      margin: 0;
      overflow: hidden;
      color: var(--color-muted);
      font-size: 0.78rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,

  back: css`
    label: BottomSheet-back;

    .BottomSheet-sheet & {
      margin-left: -0.5rem;
    }
  `,

  content: css`
    label: BottomSheet-content;
    overflow-y: auto;
    overscroll-behavior: contain;
    min-height: 0;
    flex: 1;
    padding: 0 1.25rem 1.5rem;
  `,
};

export default BottomSheet;
