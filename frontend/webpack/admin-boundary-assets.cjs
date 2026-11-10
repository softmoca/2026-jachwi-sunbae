const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { simplifyBoundaryLevels } = require('./simplify-boundaries.cjs');

// 원본 좌표는 소수점 15자리(나노미터 수준)다. 6자리(위도 약 0.11m)면 지도에서 차이가 보이지 않고 파일은 절반이 된다.
// 같은 값은 같게 반올림되므로 이웃 행정동이 공유하는 꼭짓점과 닫힌 링이 그대로 맞물린다.
// 좌표 개수는 바뀌지 않아 줌별 정점 인덱스(lod)도 그대로 쓴다.
const COORDINATE_SCALE = 1e6;
const roundCoordinates = (value) =>
  typeof value[0] === 'number'
    ? value.map((number) => Math.round(number * COORDINATE_SCALE) / COORDINATE_SCALE)
    : value.map(roundCoordinates);

const createBoundaryAssets = (source) => {
  const geojson = JSON.parse(source.toString('utf8'));
  if (geojson.type !== 'FeatureCollection' || !geojson.features?.length)
    throw new Error('행정동 원본 형식을 확인해주세요.');
  const dates = [...new Set(geojson.features.map((feature) => feature.properties.baseDate))];
  if (dates.length !== 1 || !/^\d{8}$/.test(dates[0])) throw new Error('행정동 기준일을 확인해주세요.');
  const version = dates[0];
  const hash = crypto.createHash('sha256').update(source).digest('hex').slice(0, 12);
  const filename = `admin-dongs.${version}.${hash}.geojson`;
  // SGIS 시도 코드(앞 두 자리)마다 한 파일. 결과에 나온 시도만 받게 한다.
  const groups = {};
  for (const feature of simplifyBoundaryLevels(geojson)) {
    const prefix = feature.properties.code?.slice(0, 2);
    if (!/^\d{2}$/.test(prefix ?? '')) throw new Error('행정동 코드를 확인해주세요.');
    (groups[prefix] ??= []).push({
      ...feature,
      geometry: { ...feature.geometry, coordinates: roundCoordinates(feature.geometry.coordinates) },
    });
  }
  const partitions = Object.keys(groups)
    .sort()
    .map((region) => {
      const features = groups[region];
      const source = Buffer.from(JSON.stringify({ ...geojson, features }));
      const hash = crypto.createHash('sha256').update(source).digest('hex').slice(0, 12);
      return {
        region,
        filename: `admin-dongs.${region}.${version}.${hash}.geojson`,
        source,
        gzip: zlib.gzipSync(source),
      };
    });
  return {
    filename,
    source,
    gzip: zlib.gzipSync(source),
    partitions,
    manifest: JSON.stringify({
      version,
      file: filename,
      files: Object.fromEntries(partitions.map(({ region, filename }) => [region, filename])),
    }),
  };
};

module.exports = { createBoundaryAssets };
