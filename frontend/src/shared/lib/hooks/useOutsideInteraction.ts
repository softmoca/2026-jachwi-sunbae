import { type RefObject, useEffect } from 'react';

type Options = {
  readonly ref: RefObject<HTMLElement | null>;
  readonly onOutside: () => void;
  readonly enabled?: boolean;
};

/** 라벨을 누를 때 잠깐 포커스가 사라져도 내부 클릭으로 취급하고, 바깥 클릭이나 키보드 포커스 이동만 알린다. */
const useOutsideInteraction = ({ ref, onOutside, enabled = true }: Options) => {
  useEffect(() => {
    if (!enabled) return;
    let isPointerInteraction = false;
    const isOutside = (target: EventTarget | null) =>
      target instanceof Node && ref.current !== null && !ref.current.contains(target);
    const pointerDown = (event: PointerEvent) => {
      isPointerInteraction = event.button === 0;
    };
    const click = (event: MouseEvent) => {
      isPointerInteraction = false;
      if (event.button === 0 && isOutside(event.target)) onOutside();
    };
    const focus = (event: FocusEvent) => {
      if (!isPointerInteraction && isOutside(event.target)) onOutside();
    };
    const keyboard = () => {
      isPointerInteraction = false;
    };
    document.addEventListener('pointerdown', pointerDown, true);
    document.addEventListener('click', click, true);
    document.addEventListener('focusin', focus, true);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('pointerdown', pointerDown, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('focusin', focus, true);
      document.removeEventListener('keydown', keyboard, true);
    };
  }, [enabled, onOutside, ref]);
};

export default useOutsideInteraction;
