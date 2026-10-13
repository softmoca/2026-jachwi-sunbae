import type { MapCoordinate } from './mapLocation';

const worldSize = (level: number) => 256 * 2 ** Math.max(6, 20 - level);
const mercatorY = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));

/** 데모에서도 핀·반경·클릭 위치에 같은 축척을 사용한다. */
export const demoMapOffset = (coordinate: MapCoordinate, center: MapCoordinate, level: number) => {
  const pixels = worldSize(level);
  return {
    x: ((coordinate.longitude - center.longitude) * pixels) / 360,
    y: ((mercatorY(center.latitude) - mercatorY(coordinate.latitude)) * pixels) / (2 * Math.PI),
  };
};

export const demoMapCoordinate = (center: MapCoordinate, level: number, x: number, y: number): MapCoordinate => {
  const pixels = worldSize(level);
  return {
    longitude: center.longitude + (x * 360) / pixels,
    latitude: (Math.atan(Math.sinh(mercatorY(center.latitude) - (y * 2 * Math.PI) / pixels)) * 180) / Math.PI,
  };
};

export const demoRadiusDiameter = (meters: number, latitude: number, level: number): number =>
  (meters * 2 * worldSize(level)) / (2 * Math.PI * 6_378_137 * Math.cos((latitude * Math.PI) / 180));
