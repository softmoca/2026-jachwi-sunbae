import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = path =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const version = read('VERSION').trim();
assert.match(version, /^\d+\.\d+\.\d+$/);
const lock = JSON.parse(read('package-lock.json'));
assert.equal(JSON.parse(read('package.json')).version, version);
assert.equal(lock.version, version);
assert.equal(lock.packages[''].version, version);
const android = read('android/app/build.gradle');
const ios = read('ios/JachwiSunbaeMobile.xcodeproj/project.pbxproj');
assert.equal(android.match(/versionName "([^"]+)"/)[1], version);
for (const match of ios.matchAll(/MARKETING_VERSION = ([^;]+);/g))
  assert.equal(match[1], version);
const code = android.match(/versionCode (\d+)/)[1];
for (const match of ios.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g))
  assert.equal(match[1], code);
console.log(`Android·iOS 버전 ${version}, 빌드 ${code} 일치`);
