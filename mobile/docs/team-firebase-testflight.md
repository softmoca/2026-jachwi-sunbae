# 팀 Firebase 푸시 연동 테스트

## 테스트 빌드

- 버전: iOS·Android `2.1.0(7)`.
- Firebase 프로젝트: `jachwi-sunbae-de` (발신자 ID `987875942634`).
- Android applicationId: `com.jachwisunbae`, iOS Bundle ID: `kr.jachwisunbae.app`.
- 제공된 `google-services.json`, `GoogleService-Info.plist`를 기존 위치에 복사했다. 이전 설정은 Git에서 제외된 `output/firebase-backup-2026-10-26/`에 보관했다.
- Firebase 프로젝트만 변경한다. Release/TestFlight 웹 주소는 기존 운영 웹을 유지하고, Release 토픽은 `jachwi-service-prod`를 사용한다. 팀 개발 Firebase 프로젝트의 토픽이며 기존 개인 Firebase 토픽과는 별개다.
- 이번 빌드는 TestFlight 검증용이다. App Store 배포 버전 연결 및 운영 심사 제출은 하지 않는다.

## 검증 명령

```bash
npm run check:firebase -- dev
npm run check:versions
npm run typecheck
npm run lint
npm test -- --runInBand
npm --prefix server test
```

검사는 dev 환경을 `jachwi-sunbae-de`, prod 환경을 `jachwi-sunbae-prod`로 기대한다. 다른 프로젝트로 검사하려면 `FIREBASE_DEV_PROJECT_ID`, `FIREBASE_PROD_PROJECT_ID`를 지정한다. 파일 위치는 [README](../README.md#실행)를 따른다.

## 서버 키와 발송 경계

- 제공된 Firebase Admin SDK 서비스 계정 파일은 **서버 전용 비밀 키**다. 앱 소스·번들·Git·TestFlight 첨부에 넣지 않는다.
- `server/send.mjs`를 팀 프로젝트에서 사용하는 경우 ADC를 안전하게 제공하고 `FIREBASE_PROJECT_ID=jachwi-sunbae-de`를 지정한다. 기본은 기존 프로젝트 및 dry-run이며 이 작업에서 실제 사용자에게 알림을 보내지 않는다.
- iOS에는 팀 Firebase 프로젝트의 APNs 인증 키 등록도 필요하다. 기존 개인 Firebase의 등록이 팀 프로젝트에 자동으로 복사되지는 않는다.
- 테스트할 설치에서 발급된 FCM 토큰은 새 프로젝트의 토큰이어야 한다. 이전 프로젝트의 토큰을 그대로 서버에 사용하지 않는다.
- 로그인 사용자별 토큰 등록 API 및 실기기 수신 성공 여부는 설정 파일 검사·빌드 성공과 별개로 검증한다.

## TestFlight

- 외부 그룹: `푸시 알림 연동 테스트`.
- 외부 테스터는 App Store Connect 관리 권한을 부여하지 않고 이메일로 추가한다.
- 외부 테스트는 Apple 베타 앱 심사가 필요할 수 있다. 그룹 추가·업로드만으로 설치 가능 또는 초대 메일 발송 완료로 기록하지 않는다.

## 로컬 환경 점검

- 초기 여유 공간은 약 23GiB로, 사용자 파일을 삭제하지 않았다.
- Xcode에서 iOS 26.5 미설치 오류가 발생해 Apple 공식 `xcodebuild -downloadPlatform iOS -architectureVariant arm64`로 구성요소 설치를 진행한다.
- Android 서명 AAB 빌드와 앱 18개·서버 3개 테스트는 성공했다. iOS 업로드·외부 테스트 배포 상태는 완료 후 기록한다.
