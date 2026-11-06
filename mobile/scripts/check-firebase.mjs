import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

// 빌드 구성별 Firebase 설정 파일 위치와 기대 프로젝트.
// 사용법: npm run check:firebase [-- dev|prod] [ios|android]  (생략하면 모두 검사)
const root = new URL('../', import.meta.url);
const ENVIRONMENTS = {
  dev: {
    projectId: process.env.FIREBASE_DEV_PROJECT_ID || 'jachwi-sunbae-de',
    ios: 'ios/firebase/dev/GoogleService-Info.plist',
    android: [
      'android/app/src/debug/google-services.json',
      'android/app/src/staging/google-services.json',
    ],
  },
  prod: {
    projectId: process.env.FIREBASE_PROD_PROJECT_ID || 'jachwi-sunbae-prod',
    ios: 'ios/firebase/prod/GoogleService-Info.plist',
    android: ['android/app/src/release/google-services.json'],
  },
};

const readIos = path =>
  JSON.parse(
    execFileSync(
      'plutil',
      ['-convert', 'json', '-o', '-', new URL(path, root).pathname],
      { encoding: 'utf8' },
    ),
  );

const checkEnvironment = (name, { projectId, ios, android }, platforms) => {
  const problems = [];
  const check = (path, fn) => {
    if (!existsSync(new URL(path, root))) {
      problems.push(`${path} 파일이 없습니다.`);
      return;
    }
    try {
      fn();
    } catch (error) {
      problems.push(`${path}: ${error.message.split('\n')[0]}`);
    }
  };

  let iosConfig;
  if (platforms.includes('ios'))
    check(ios, () => {
      iosConfig = readIos(ios);
      assert.equal(iosConfig.BUNDLE_ID, 'kr.jachwisunbae.app', 'iOS 번들 ID');
      assert.equal(iosConfig.PROJECT_ID, projectId, 'Firebase 프로젝트');
    });
  for (const path of platforms.includes('android') ? android : []) {
    check(path, () => {
      const config = JSON.parse(readFileSync(new URL(path, root), 'utf8'));
      assert.equal(
        config.project_info.project_id,
        projectId,
        'Firebase 프로젝트',
      );
      assert.ok(
        config.client.some(
          client =>
            client.client_info.android_client_info.package_name ===
            'com.jachwisunbae',
        ),
        'Android 패키지 com.jachwisunbae 앱이 없습니다',
      );
      if (iosConfig) {
        assert.equal(
          iosConfig.GCM_SENDER_ID,
          config.project_info.project_number,
          'iOS와 Android 발신자 ID',
        );
      }
    });
  }

  if (problems.length) {
    console.error(`[${name}] Firebase 설정 문제 (기대 프로젝트 ${projectId})`);
    for (const problem of problems) console.error(`  - ${problem}`);
    return false;
  }
  console.log(`[${name}] Firebase 프로젝트 ${projectId}, 앱 ID 일치`);
  return true;
};

const args = process.argv.slice(2);
const PLATFORMS = ['ios', 'android'];
const requestedPlatforms = args.filter(arg => PLATFORMS.includes(arg));
const platforms = requestedPlatforms.length ? requestedPlatforms : PLATFORMS;
const requested = args.filter(arg => !PLATFORMS.includes(arg));
const names = requested.length ? requested : Object.keys(ENVIRONMENTS);
let ok = true;
for (const name of names) {
  if (!ENVIRONMENTS[name]) {
    console.error(
      `모르는 인자 ${name}. dev, prod, ios, android 중에서 넘기세요.`,
    );
    ok = false;
    continue;
  }
  ok = checkEnvironment(name, ENVIRONMENTS[name], platforms) && ok;
}
if (ok) {
  console.log('APNs 키와 실기기 발송은 별도로 확인해야 합니다.');
} else {
  console.error('docs/push-notifications.md를 확인하세요.');
  process.exitCode = 1;
}
