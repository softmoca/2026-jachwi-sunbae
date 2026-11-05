/**
 * 트랙패드 핀치는 브라우저에 ctrl이 붙은 휠 이벤트로 온다. Chrome은 손가락을 벌린 비율(scale)을
 * `deltaY = -100 * ln(scale)`로 바꿔 보내므로, 확대 단계(2배마다 1단계)는 `-deltaY / (100 * ln 2)`만큼 바꾸면
 * 지도가 손가락을 그대로 따라온다. Naver 지도 기본 처리는 같은 핀치에 이보다 9배쯤 덜 움직인다(deltaY -400에 0.64단계).
 */
export const PINCH_LEVELS_PER_DELTA = 1 / (100 * Math.LN2);
/** 휠 deltaMode가 줄(1)이면 한 줄을 이만큼(px)으로 본다. */
const LINE_HEIGHT_PX = 16;
/** ctrl을 누른 채 마우스 휠 한 칸(deltaY 100 안팎)을 굴리는 경우에도 한 번에 너무 멀리 가지 않게 이벤트 하나를 이 단계까지로 자른다. */
const MAX_LEVELS_PER_EVENT = 1;

/** ctrl+휠 이벤트 하나가 바꿀 앱 확대 단계(음수면 가까이). 앱 단계는 Naver zoom과 방향이 반대라 deltaY 부호를 그대로 쓴다. */
export const pinchLevelDelta = (deltaY: number, deltaMode = 0): number => {
  const pixels = deltaMode === 1 ? deltaY * LINE_HEIGHT_PX : deltaY;
  const levels = pixels * PINCH_LEVELS_PER_DELTA;
  return Math.max(-MAX_LEVELS_PER_EVENT, Math.min(MAX_LEVELS_PER_EVENT, levels));
};
