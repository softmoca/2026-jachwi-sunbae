// 기준 브랜치 이후 바뀐 로직 파일에만 뮤테이션 테스트를 돌린다.
// 사용법: node scripts/mutation-changed.mjs [기준 ref] [--list]   (기본값 origin/develop)
// --list는 Stryker를 실행하지 않고 대상 파일만 한 줄씩 출력한다. 대상이 없으면 아무것도 출력하지 않는다.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

import config from '../stryker.config.mjs';

const base = process.argv[2] ?? process.env.MUTATION_BASE ?? 'origin/develop';
const extraArgs = process.argv.slice(3);
const listOnly = extraArgs.includes('--list');
const strykerArgs = extraArgs.filter((arg) => arg !== '--list');

const globToRegExp = (glob) => {
  const escaped = glob
    .replace(/[.+^$()|[\]\\]/g, '\\$&')
    .replace(/\{([^}]+)\}/g, (_, group) => `(?:${group.split(',').join('|')})`)
    // `**`를 먼저 자리표시자로 바꿔 둔다. 바로 `.*`로 바꾸면 뒤의 `*` 치환이 그 별표까지 바꿔
    // `src/**/hooks`가 `src/x/hooks`처럼 한 단계 깊이만 맞게 된다.
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*\*/g, '\u0001')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '(?:.*/)?')
    .replace(/\u0001/g, '.*');
  return new RegExp(`^${escaped}$`);
};

const includes = config.mutate.filter((pattern) => !pattern.startsWith('!')).map(globToRegExp);
const excludes = config.mutate.filter((pattern) => pattern.startsWith('!')).map((p) => globToRegExp(p.slice(1)));
const isMutationTarget = (file) => includes.some((re) => re.test(file)) && !excludes.some((re) => re.test(file));

const mergeBase = execFileSync('git', ['merge-base', base, 'HEAD'], { encoding: 'utf8' }).trim();
const changed = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD', '--', 'src'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)
  .filter((file) => file.startsWith('frontend/') || existsSync(file))
  .map((file) => file.replace(/^frontend\//, ''))
  .filter(isMutationTarget)
  .filter((file) => existsSync(file));

if (listOnly) {
  if (changed.length > 0) console.log(changed.join('\n'));
  process.exit(0);
}

if (changed.length === 0) {
  console.log(`${base} 이후 바뀐 뮤테이션 대상 로직 파일이 없다.`);
  process.exit(0);
}

console.log(`뮤테이션 대상 ${changed.length}개 파일:\n${changed.map((file) => `  - ${file}`).join('\n')}`);
const result = spawnSync('npx', ['stryker', 'run', '--mutate', changed.join(','), ...strykerArgs], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
