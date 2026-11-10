// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = path.join(frontendDir, 'deploy/prepare-seo-files.sh');
const noindex = '<meta name="robots" content="noindex, nofollow" />';
const dirs: string[] = [];

const createDist = () => {
  const dist = mkdtempSync(path.join(tmpdir(), 'seo-dist-'));
  dirs.push(dist);
  copyFileSync(path.join(frontendDir, 'index.html'), path.join(dist, 'index.html'));
  copyFileSync(path.join(frontendDir, 'public/robots.txt'), path.join(dist, 'robots.txt'));
  copyFileSync(path.join(frontendDir, 'public/sitemap.xml'), path.join(dist, 'sitemap.xml'));
  return dist;
};

const run = (environment: string, dist: string) => execFileSync('bash', [script, environment, dist], { stdio: 'pipe' });

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

it('원본 index.html에는 noindex가 없다', () => {
  expect(readFileSync(path.join(frontendDir, 'index.html'), 'utf8')).not.toMatch(/name="robots"/);
});

it('dev는 크롤링을 열고 index.html head에 noindex를 넣되 사이트 확인 태그는 남긴다', () => {
  const dist = createDist();
  run('dev', dist);
  run('dev', dist);

  const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
  expect(html.split(noindex)).toHaveLength(2);
  expect(html.indexOf(noindex)).toBeLessThan(html.indexOf('</head>'));
  expect(html).toContain('name="naver-site-verification"');
  expect(readFileSync(path.join(dist, 'robots.txt'), 'utf8')).toBe('User-agent: *\nAllow: /\n');
  expect(existsSync(path.join(dist, 'sitemap.xml'))).toBe(false);
});

it('prod는 파일을 바꾸지 않는다', () => {
  const dist = createDist();
  const before = readFileSync(path.join(dist, 'index.html'), 'utf8');
  run('prod', dist);

  expect(readFileSync(path.join(dist, 'index.html'), 'utf8')).toBe(before);
  expect(existsSync(path.join(dist, 'sitemap.xml'))).toBe(true);
});

it('prod index.html에 noindex가 있으면 배포를 멈춘다', () => {
  const dist = createDist();
  const indexPath = path.join(dist, 'index.html');
  writeFileSync(indexPath, readFileSync(indexPath, 'utf8').replace('<head>', `<head>${noindex}`));

  expect(() => run('prod', dist)).toThrow();
});
