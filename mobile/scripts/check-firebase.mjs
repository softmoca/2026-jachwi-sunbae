import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const expectedProject = process.env.FIREBASE_PROJECT_ID || 'jachwi-sunbae';
try {
  const android = JSON.parse(
    readFileSync(new URL('android/app/google-services.json', root), 'utf8'),
  );
  assert.equal(android.project_info.project_id, expectedProject);
  assert.ok(
    android.client.some(
      client =>
        client.client_info.android_client_info.package_name ===
        'com.jachwisunbae',
    ),
  );
  const ios = JSON.parse(
    execFileSync(
      'plutil',
      [
        '-convert',
        'json',
        '-o',
        '-',
        new URL('ios/JachwiSunbaeMobile/GoogleService-Info.plist', root)
          .pathname,
      ],
      { encoding: 'utf8' },
    ),
  );
  assert.equal(ios.BUNDLE_ID, 'kr.jachwisunbae.app');
  assert.equal(ios.PROJECT_ID, android.project_info.project_id);
  assert.equal(ios.GCM_SENDER_ID, android.project_info.project_number);
  console.log(
    'Firebase 프로젝트·앱 ID 일치. APNs 키/실기기 발송은 별도 검증 필요.',
  );
} catch {
  console.error(
    'Firebase 설정 파일이 없거나 앱 ID가 다릅니다. docs/push-notifications.md를 확인하세요.',
  );
  process.exitCode = 1;
}
