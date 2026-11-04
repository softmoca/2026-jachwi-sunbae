# 푸시 알림 운영 준비

## 현재 범위

- 개인 저장소로 분리했던 앱 코드를 팀 저장소 `mobile/`로 다시 옮겼다.
- 앱 ID는 iOS `kr.jachwisunbae.app`, Android `com.jachwisunbae`를 유지한다.
- 양쪽 앱은 `2.1.1`, 빌드 `8`이다. iOS는 심사를 통과해 배포 준비됨 상태이고, Android 프로덕션 트랙에서 활성 상태다.
- Firebase 프로젝트는 팀 프로젝트 `jachwi-sunbae-de`다. `2.1.0(6)`까지는 이전 프로젝트 `jachwi-sunbae`로 빌드했다. Firebase Analytics SDK는 설치하지 않았다.
- 첫 정상 웹 로드 후 안내에서 사용자가 알림 받기를 선택하면 OS 권한을 요청한다. 나중에를 선택해도 서비스 이용은 그대로 가능하다.
- 동의 전에는 FCM 토큰 자동 발급과 iOS 원격 알림 자동 등록을 끈다.
- OS 권한과 앱 선택이 유효한 경우에만 토큰을 발급하고 공개 서비스 안내 토픽에 구독한다. 토큰 변경 및 앱 재진입 때 상태를 복구한다.
- 백그라운드 알림 표시는 OS에 맡긴다. 알림 클릭은 현재 환경의 서비스 내부 경로만 연다.
- 앱이 켜져 있을 때도 알림을 시스템 배너로 보여 준다. 앱 안 확인/닫기 안내는 쓰지 않는다.
  - iOS는 `firebase.json`의 `messaging_ios_foreground_presentation_options`(`banner`, `list`, `sound`, `badge`)로 OS가 배너를 띄운다. 배너를 누르면 FCM `onNotificationOpenedApp`으로 이동한다.
  - Android는 포그라운드 FCM을 OS가 띄우지 않아 `@notifee/react-native`로 띄운다(`src/push/foreground.ts`). notifee는 Android에만 링크한다(`react-native.config.js`).
  - Android 알림 채널은 id `default`, 이름 `알림`, 중요도 높음이다. 백그라운드 FCM 알림도 같은 채널로 오도록 `firebase.json`의 `messaging_android_notification_channel_id`를 `default`로 두고, 앱이 켜질 때 채널을 먼저 만든다.
  - notifee가 더하는 예약 알림, 부팅 후 복원, 포그라운드 서비스용 권한과 구성 요소는 앱 매니페스트에서 `tools:node="remove"`로 뺀다.

## 계정 설정과 파일

1. [Firebase 프로젝트](https://console.firebase.google.com/project/jachwi-sunbae/overview)에서 두 앱을 등록한다.
2. iOS 설정 파일을 `ios/JachwiSunbaeMobile/GoogleService-Info.plist`, Android 파일을 `android/app/google-services.json`에 둔다. 두 파일은 Git에서 제외한다.
3. Apple Developer에서 기존 App ID의 Push Notifications capability를 활성화한다. Firebase 프로젝트 설정 → Cloud Messaging → iOS 앱에 해당 팀의 APNs 인증 키를 등록한다. 키 생성/권한 부여는 소유자 확인 후 진행한다.
4. APNs `.p8`은 Firebase 설정과 안전한 키 보관소에만 둔다. 저장소·앱 번들·PostHog에 넣지 않는다. 팀 ID와 키 ID가 일치해야 한다.
5. `npm run check:firebase`, `npm run check:versions` 후 `cd ios && pod install`을 실행한다. iOS 서명 프로파일에도 `aps-environment`가 포함되어야 한다. 배포 서명 시 APNs 환경이 production으로 변환됐는지 확인한다.
6. 실기기에서 권한 허용/거절, 설정에서 철회, 토큰 갱신, 종료 상태 클릭 이동, 개발/운영 분리를 확인한다. 계정 등록이나 정적 테스트 통과만으로 실제 수신 성공이라 판단하지 않는다.

## 서버 발송

`server/`는 Firebase Admin SDK 기반 발송 모듈이다. 공개 HTTP 발송 엔드포인트를 만들지 않았다. 서버의 Application Default Credentials(ADC)를 사용하며, 실제 서버에 최소 발송 권한을 부여하는 작업은 별도로 필요하다. 서비스 계정 키를 앱에 넣지 않는다.

```bash
cd server
npm ci
# ADC는 서버의 워크로드 자격 증명 또는 안전한 환경 설정으로 제공한다.
PUSH_TITLE='서비스 안내' PUSH_BODY='테스트 안내입니다.' npm run send
```

기본값은 개발 환경이며 FCM dry-run으로만 검증한다. 실제 개발 기기에 보내려면 `npm run send -- --send`를 사용한다. 운영은 `PUSH_ENVIRONMENT=production`과 `--send --confirm-production`을 모두 지정해야 한다. 자동으로 운영 사용자에게 테스트 알림을 보내지 않는다.

- `PUSH_PATH`: `/properties` 같은 내부 경로. 기본 `/`.
- `PUSH_TARGET_TOKEN`: 개별 FCM 토큰. 없으면 환경별 공개 서비스 안내 토픽으로 보낸다. 토큰을 셸 이력/CI 로그에 직접 적지 말고 비밀 환경 변수로 주입한다.
- 토픽 `jachwi-service-dev`, `jachwi-service-prod`는 비공개 사용자 그룹이나 권한 검증 수단이 아니다. 개인 매물·닉네임·민감 정보를 포함한 알림에는 사용하지 않는다.
- FCM 접수 성공은 기기 도착 보장이 아니다. APNs 키 누락, OS 권한/절전 설정, 만료 토큰 등의 영향을 받는다.

## 웹 브리지와 사용자별 발송 경계

앱 기능 목록 `window.__JACHWI_NATIVE_APP__.features`에 `push`를 제공한다. 웹은 신뢰한 서비스 origin에서만 다음 메시지를 보낼 수 있다.

```js
window.ReactNativeWebView.postMessage(
  JSON.stringify({
    type: 'push',
    action: 'status',
    requestId: 'push-status-1',
  }),
);
window.addEventListener('jachwi-push', event => {
  // event.detail: push:response / push:token-changed
  // 토큰을 콘솔이나 분석 도구에 출력하지 않는다.
});
```

`action`은 `status`, `enable`, `disable`, `token`, `settings`다. `token`은 동의와 OS 권한이 있을 때만 FCM 토큰을 반환한다. 자동 토큰 갱신 이벤트에는 토큰을 싣지 않으며 웹이 필요할 때 다시 요청한다. 요청 ID는 영문·숫자·밑줄·하이픈 1~64자다. 응답 스크립트도 현재 origin을 다시 확인한다.

**웹의 설정 UI와 서버의 사용자-토큰 저장 API는 아직 구현하지 않았다.** 사용자별 알림에는 아래 연동이 필요하다. 현재 모듈만으로 로그인 사용자별 발송이 완성됐다고 보지 않는다.

- 서버는 인증 세션에서 사용자 ID를 결정하고, 토큰을 여러 설치 단위로 저장한다. 클라이언트가 지정한 타인의 사용자 ID를 신뢰하지 않는다.
- 로그인/계정 전환 시 현재 설치 토큰을 인증된 사용자에 연결한다. 로그아웃/탈퇴 시 이전 사용자 연결을 먼저 제거하고 필요하면 `disable`로 기기 토큰도 삭제한다.
- 토큰 갱신 시 upsert하고 마지막 확인 시간을 저장한다. FCM `UNREGISTERED` 등 영구 오류 토큰을 제거한다.
- 서버에서 수신 거부/탈퇴 여부와 발송 권한을 검사하고 개인 데이터는 토픽으로 발송하지 않는다.
- 운영 개인정보처리방침·스토어 수집 데이터 답변에 기기 푸시 토큰의 사용 목적·보관·삭제 정책이 맞는지 출시 전에 점검한다.

## 검증 기록 (2026-10-19)

- iOS·Android Firebase 앱 등록과 설정 파일의 프로젝트/앱 ID 검사를 통과했다. 설정 파일은 로컬에만 있고 Git에는 포함하지 않는다.
- 앱 테스트 18개, 서버 메시지 검증 3개, TypeScript, ESLint, 버전·문서 검사를 통과했다.
- iOS 시뮬레이터 Debug 빌드는 성공했다. 서명된 실기기 빌드·APNs 발송 성공을 뜻하지 않는다.
- Android Debug APK 빌드도 성공했다 (`:app:assembleDebug`, 158개 작업). Firebase 설정과 네이티브 모듈 컴파일은 확인했지만 실기기 알림 수신은 아직 검증하지 않았다.
- APNs 키는 사용자 승인 후 발급했다. Apple 팀 `LH59GZPLYF`에서 두 키 모두 `kr.jachwisunbae.app` 하나에만 허용한다. 기존 다른 앱 키는 변경하지 않았다.
  - Sandbox: `Z783A8P5PR` (`Jachwi Sunbae Push Development`)
  - Production: `3BARXR8Y6V` (`Jachwi Sunbae Push Production`)
- 두 키의 `.p8`은 Git 저장소 밖의 로컬 보관 경로에 저장했고 파일 권한 `0600`과 EC 개인 키 형식을 확인했다. 키 내용은 문서·로그·앱 번들에 포함하지 않는다. 보관 경로는 소유자가 별도 비밀 보관소에도 백업해야 한다.
- 2026-10-20 Firebase Cloud Messaging 화면에서 개발 키 `Z783A8P5PR`, 운영 키 `3BARXR8Y6V`와 팀 ID `LH59GZPLYF`가 저장된 것을 확인했다. 이전 브라우저 조회 오류와 달리 현재는 두 키의 등록을 확인한 상태다.
- 서버 ADC/IAM 발송 권한, 로그인 사용자별 토큰 등록 API, 실기기 수신은 아직 미완료다. 앱 모듈·Firebase/APNs 등록과 실제 서버 발송 성공은 구분한다. 운영 사용자에게 알림을 보내지 않았다.
- 개인 저장소의 [Mobile checks CI](https://github.com/iftype/jachwi-sunbae-mobile/actions/runs/39246418108)는 통과했다.
- Firebase 간접 의존성의 gRPC는 보안 패치 버전 `1.14.6`으로 고정했다. 서버 발송 패키지의 production audit는 0건이다. 앱 도구 체인의 `braces` 간접 의존성에는 수정 버전이 없는 보안 경고가 남아 있어 출시 전 영향 범위를 검토해야 한다. 경고를 없애려고 React Native를 강제 다운그레이드하지 않는다.

## 스토어 제출 기록 (2026-10-20)

- 양쪽 릴리스 빌드 `2.1.0(6)`을 생성했다. iOS Archive와 App Store Connect 업로드, Android 업로드 키 서명 AAB 빌드가 성공했다.
- Android는 대한민국 프로덕션 트랙에 새 아이콘·데이터 보안 답변과 함께 검토를 위해 전송했다. Play Console의 `검토 중인 변경사항`에서 확인했으며 자동 사전 검사가 진행 중이다. 심사 승인·공개 완료를 뜻하지 않는다.
- iOS도 빌드 처리 후 `2.1.0(6)`을 연결해 심사 제출했다. App Store Connect의 `심사 대기 중`에서 확인했다. [제출 상세](https://appstoreconnect.apple.com/apps/6816321229/distribution/reviewsubmissions/details/ad62fdfa-9517-4226-acf9-74f5278edf87)의 제출 ID는 `ad62fdfa-9517-4226-acf9-74f5278edf87`이다. App Store 개인정보 표시에는 기기 ID의 앱 기능·분석 목적을 반영했다.
- 배포 서명 과정의 로그에서 iOS `aps-environment=production`을 확인했다. 개발 아카이브의 development 값과 최종 App Store 배포 서명 값을 구분한다.
- 업로드 과정에서 React·ReactNativeDependencies·Hermes 프레임워크 dSYM 누락 경고가 있었지만 업로드는 성공했다. 이 프레임워크의 네이티브 충돌 분석에는 제약이 남는다.
- 새 아이콘 적용 외에 웹 서비스 기능이나 팀 백엔드를 변경하지 않았다.

## 참고 자료

- [React Native Firebase 설치](https://rnfirebase.io/)
- [FCM 수신과 권한](https://rnfirebase.io/messaging/usage)
- [Apple 플랫폼 FCM 설정](https://firebase.google.com/docs/cloud-messaging/ios/get-started)
- [FCM 토큰 수명 관리](https://firebase.google.com/docs/cloud-messaging/manage-tokens)
