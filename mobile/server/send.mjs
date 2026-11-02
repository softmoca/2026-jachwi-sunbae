import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { buildMessage } from './message.mjs';

const args = new Set(process.argv.slice(2));
const environment = process.env.PUSH_ENVIRONMENT || 'development';
const send = args.has('--send');
try {
  if (
    environment === 'production' &&
    send &&
    !args.has('--confirm-production')
  ) {
    throw new Error(
      '운영 발송은 --send --confirm-production을 함께 지정하세요.',
    );
  }
  const message = buildMessage({
    environment,
    token: process.env.PUSH_TARGET_TOKEN,
    title: process.env.PUSH_TITLE,
    body: process.env.PUSH_BODY,
    path: process.env.PUSH_PATH || '/',
  });
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || 'jachwi-sunbae',
  });
  // 기본값은 FCM dry-run: 실제 기기에 전달하지 않는다.
  await getMessaging().send(message, !send);
  console.log(
    send
      ? 'FCM 발송 요청 접수 완료'
      : 'FCM dry-run 검증 완료: 실제 발송하지 않았습니다.',
  );
} catch {
  // SDK 오류 객체에 토큰·본문·서비스 계정 정보가 포함될 수 있어 그대로 출력하지 않는다.
  console.error(
    '푸시 요청 실패: 입력값, 서버 ADC 권한, APNs 연결을 확인하세요. 운영은 --confirm-production이 필요합니다.',
  );
  process.exitCode = 1;
}
