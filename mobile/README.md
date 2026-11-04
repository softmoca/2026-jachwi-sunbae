# 자취선배 모바일

자취선배 웹을 iOS·Android에서 제공하는 React Native WebView 셸이다. 팀 모노레포의 `mobile/`에서 관리하며, 앱 버전은 웹·백엔드 제품 버전과 별도로 관리한다.

| 항목            | iOS                   | Android            |
| --------------- | --------------------- | ------------------ |
| 앱 ID           | `kr.jachwisunbae.app` | `com.jachwisunbae` |
| 준비 중 버전    | `2.1.1`               | `2.1.1`            |
| 빌드 번호       | `8`                   | `8`                |
| 푸시            | FCM → APNs            | FCM                |
| 네이티브 로그인 | Apple, 카카오         | 카카오             |

두 앱에 같은 확대 크롭 오리 아이콘을 적용했다. 네이티브 하단 탭바는 사용하지 않고 웹 UI를 표시한다. 웹 라우팅·로그인·기존 서비스 기능은 웹 배포를 따른다.

## 실행

Node.js 22.11 이상, npm, Xcode/CocoaPods 또는 Android SDK/JDK가 필요하다. React Native Community CLI 기반이며 Expo 앱이 아니다.

```bash
npm ci
```

Firebase 프로젝트 `jachwi-sunbae-de`의 앱 설정 파일을 아래 위치에 넣는다. 파일과 인증 키는 Git에서 제외된다.

- `ios/JachwiSunbaeMobile/GoogleService-Info.plist`
- `android/app/google-services.json`

```bash
npm run check:firebase
cd ios && pod install && cd ..
npm start
# 다른 터미널에서 npm run ios 또는 npm run android
```

Debug는 `https://dev.jachwi-sunbae.kr`, Release는 `https://www.jachwi-sunbae.kr`을 연다. 기존 서비스 도메인 밖의 링크는 시스템 브라우저로 이동한다. 앱 시작만으로 위치 권한을 요청하지 않는다.

## 푸시 알림

앱 권한·토큰·토픽·알림 이동 모듈과 서버용 Firebase Admin 발송 예제를 포함한다. 서버 발송은 기본 dry-run이고, 실제 운영 발송에는 명시적인 플래그가 필요하다.

**설정 파일, APNs 인증 연결, 실제 기기 수신 검증이 완료되기 전에는 배포하지 않는다.** 사용자별 발송은 웹/서버의 인증된 토큰 등록·로그아웃 해제 연동이 추가로 필요하다. 현재 준비 범위와 서버 연동 규약은 [푸시 운영 문서](docs/push-notifications.md)를 따른다.

## 네이티브 로그인

웹이 `{type:'auth', action:'login', requestId, provider, nonce}`를 보내면 앱이 Apple 로그인 시트나 카카오 SDK로 `id_token`을 받아 `jachwi-auth` 이벤트로 돌려준다. 앱은 서버를 부르지 않는다. 브리지 계약은 `src/auth/policy.ts`에 있고, 앱이 나간 뒤에는 필드를 지우거나 뜻을 바꾸지 않는다. 웹은 `window.__JACHWI_NATIVE_APP__`의 `features`에 `auth`가 있고 `authProviders`에 제공자가 있을 때만 이 경로를 쓴다.

`window.__JACHWI_NATIVE_APP__`의 `version`은 브리지 프로토콜 버전(2)이고, 설치된 앱의 버전과 빌드 번호는 `appVersion`, `appBuild`로 따로 알린다. 두 값은 네이티브(`JachwiAppInfo` 모듈)가 iOS `CFBundleShortVersionString`, `CFBundleVersion`과 Android `versionName`, `versionCode`에서 읽고, 읽지 못하면 `null`이다.

카카오 네이티브 앱 키는 커밋하지 않는다. 비어 있어도 빌드되며, 그때 앱은 카카오 요청에 `not_configured`로 답한다.

- iOS: `ios/Config/Kakao.local.xcconfig`에 `KAKAO_NATIVE_APP_KEY = <키>`를 적는다. Info.plist의 `KAKAO_NATIVE_APP_KEY`와 URL 스킴 `kakao<키>`가 이 값을 쓴다.
- Android: `android/local.properties`나 `~/.gradle/gradle.properties`에 `KAKAO_NATIVE_APP_KEY=<키>`를 적는다.

## 검사

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
node --test server/message.test.mjs
npm run check:versions
npm run format:docs
npm run format:docs:check
```

`VERSION`, package/lock 파일, Android versionName, iOS MARKETING_VERSION을 맞춘다. 앱 배포 빌드 번호는 Android versionCode와 iOS CURRENT_PROJECT_VERSION을 함께 올린다. 앱 버전은 루트 `VERSION`과 맞추지 않으며, 웹·백엔드 릴리스와 별도로 올린다.

## 스토어 준비

- iOS는 `.xcworkspace`로 열고 Push Notifications, Sign in with Apple entitlement를 포함한 올바른 팀/프로파일로 서명한다. APNs 키를 Firebase에 연결한 후 실기기에서 확인한다.
- Android는 기존 업로드 키를 유지한다. 환경 변수 또는 개인 Gradle 설정에 `JACHWI_UPLOAD_STORE_FILE`, `JACHWI_UPLOAD_STORE_PASSWORD`, `JACHWI_UPLOAD_KEY_ALIAS`, `JACHWI_UPLOAD_KEY_PASSWORD`를 제공한 뒤 `cd android && ./gradlew bundleRelease`로 만든다.
- Play Store 등록용 아이콘은 `store-assets/android/play-store-icon-512.png`, App Store 아이콘은 iOS AppIcon asset catalog에 있다.
- 스토어 스크린샷은 `store-assets/ios/6.7-inch/`와 `store-assets/android/phone/`에 있고, `store-assets/template/render.sh`로 다시 만든다. 자세한 방법은 [스토어 스크린샷](store-assets/ios/README.md)을 따른다.
- 키스토어, APNs 키, 서비스 계정 키, IPA/AAB/아카이브는 커밋하지 않는다. 기존 스토어 앱 ID를 바꾸지 않는다.
- 푸시 목적·토큰 처리에 맞춰 개인정보처리방침과 스토어 수집 데이터 답변을 출시 전에 검토한다.

이 작업에서는 스토어 제출이나 운영 사용자 대상 발송을 하지 않았다.
