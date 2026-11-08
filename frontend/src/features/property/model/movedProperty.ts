type MovedProperty = { propertyId: number; latitude: number; longitude: number };

/** 지도 idle 때 같은 좌표가 다시 들어와도 다른 위치로 보지 않는다. */
const COORDINATE_EPSILON = 1e-6;

let movedProperty: MovedProperty | null = null;

/**
 * 위치를 바꿔 저장한 매물을 기억한다. 본 방 기록 지도는 이 매물의 새 좌표가 목록에 들어오면 그 자리로 옮겨 핀을 보인다.
 * 휴대폰은 상세에서 돌아오며 기록 화면을 새로 그리므로 화면 상태가 아닌 모듈 값으로 넘긴다.
 */
export const rememberMovedProperty = (moved: MovedProperty) => {
  movedProperty = moved;
};

/** 기억한 매물이 목록에 새 좌표로 들어왔으면 꺼내 돌려주고 잊는다. 아직 옛 목록이면 null을 돌려주고 계속 기억한다. */
export const takeMovedProperty = (
  findCoordinate: (propertyId: number) => { latitude: number | null; longitude: number | null } | undefined,
): MovedProperty | null => {
  if (movedProperty === null) return null;
  const coordinate = findCoordinate(movedProperty.propertyId);
  if (coordinate === undefined || coordinate.latitude === null || coordinate.longitude === null) return null;
  if (
    Math.abs(coordinate.latitude - movedProperty.latitude) > COORDINATE_EPSILON ||
    Math.abs(coordinate.longitude - movedProperty.longitude) > COORDINATE_EPSILON
  )
    return null;
  const taken = movedProperty;
  movedProperty = null;
  return taken;
};

/** 테스트끼리 기억이 섞이지 않게 비운다. */
export const resetMovedPropertyForTests = () => {
  movedProperty = null;
};
