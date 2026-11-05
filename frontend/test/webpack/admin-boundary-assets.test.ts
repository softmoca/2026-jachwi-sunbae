// @vitest-environment node
import { createRequire } from 'node:module';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';

const { createBoundaryAssets } = createRequire(import.meta.url)('../../webpack/admin-boundary-assets.cjs');
const features = ['11230640', '31023780', '23010510'].map((code) => ({
  type: 'Feature',
  properties: { code, baseDate: '20250630' },
  geometry: {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [127, 37],
          [128, 37],
          [127, 37],
        ],
        [
          [127.1, 37.1],
          [127.2, 37.1],
          [127.1, 37.1],
        ],
      ],
    ],
  },
}));

it('시도 코드별로 빠짐없이 분할하고 좌표·내부 링·속성과 기존 전체 파일을 보존한다', () => {
  const source = Buffer.from(JSON.stringify({ type: 'FeatureCollection', features }));
  const assets = createBoundaryAssets(source);
  const manifest = JSON.parse(assets.manifest);
  expect(assets.source).toEqual(source);
  expect(manifest.file).toMatch(/^admin-dongs\.20250630\.[a-f0-9]{12}\.geojson$/);
  expect(assets.partitions).toHaveLength(3);
  expect(Object.keys(manifest.files)).toEqual(['11', '23', '31']);
  for (const [index, region] of ['11', '31', '23'].entries()) {
    const part = assets.partitions.find((item: { region: string }) => item.region === region);
    expect(part.filename).toMatch(new RegExp(`^admin-dongs\\.${region}\\.20250630\\.[a-f0-9]{12}\\.geojson$`));
    expect(manifest.files[region]).toBe(part.filename);
    const generated = JSON.parse(part.source.toString());
    expect(generated.features).toHaveLength(1);
    expect(generated.features[0]).toMatchObject(features[index]);
    expect(generated.features[0].lod).toHaveProperty('overview');
    expect(gunzipSync(part.gzip)).toEqual(part.source);
  }
  expect(createBoundaryAssets(source).manifest).toBe(assets.manifest);
  const changed = createBoundaryAssets(
    Buffer.from(
      JSON.stringify({
        type: 'FeatureCollection',
        features: [
          { ...features[0], properties: { ...features[0].properties, name: '변경' } },
          features[1],
          features[2],
        ],
      }),
    ),
  );
  const next = JSON.parse(changed.manifest);
  expect(next.files['11']).not.toBe(manifest.files['11']);
  expect(next.files['31']).toBe(manifest.files['31']);
  expect(next.files['23']).toBe(manifest.files['23']);
});

it('시도 파일의 좌표는 소수점 6자리로 줄이고 공유 꼭짓점, 링 길이, 줌별 인덱스는 지킨다', () => {
  // 두 행정동이 꼭짓점 (127.123456789012, 37.987654321098)을 공유한다.
  const shared = [127.123456789012, 37.987654321098];
  const ring = (points: number[][]) => [[[...points, points[0]]]];
  const precise = [
    { code: '11230640', points: [[127.000000400001, 37.000000400001], [127.200000000001, 37.000000000001], shared] },
    { code: '11230650', points: [shared, [127.300000000001, 37.900000000001], [127.300000000001, 38.100000000001]] },
  ].map(({ code, points }) => ({
    type: 'Feature',
    properties: { code, baseDate: '20250630' },
    geometry: { type: 'MultiPolygon', coordinates: ring(points) },
  }));
  const source = Buffer.from(JSON.stringify({ type: 'FeatureCollection', features: precise }));
  const assets = createBoundaryAssets(source);
  expect(assets.source).toEqual(source);
  const [first, second] = JSON.parse(assets.partitions[0].source.toString()).features;
  expect(first.geometry.coordinates[0][0][0]).toEqual([127, 37]);
  expect(first.geometry.coordinates[0][0][2]).toEqual([127.123457, 37.987654]);
  expect(second.geometry.coordinates[0][0][0]).toEqual(first.geometry.coordinates[0][0][2]);
  for (const [index, feature] of [first, second].entries()) {
    const generated = feature.geometry.coordinates[0][0];
    expect(generated).toHaveLength(precise[index].geometry.coordinates[0][0].length);
    expect(generated.at(-1)).toEqual(generated[0]);
    for (const level of ['overview', 'medium'])
      for (const i of feature.lod[level][0][0]) expect(i).toBeLessThan(generated.length);
  }
});
