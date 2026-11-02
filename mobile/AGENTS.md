# 자취선배 모바일

- iOS·Android WebView 셸과 앱 전용 동작만 관리한다. 웹과 백엔드 변경은 각 파트의 PR로 나눈다.
- 앱 버전은 루트 `VERSION`의 제품 버전과 별도로 관리한다.
- `develop`에서 작업 브랜치를 분기하고 `main`, `develop`에 직접 푸시하지 않는다.
- 커밋은 한국어 Conventional Commits를 사용한다.
- `VERSION`, npm 패키지, Android versionName, iOS MARKETING_VERSION을 일치시킨다.
- 빌드 번호는 Android versionCode와 iOS CURRENT_PROJECT_VERSION을 함께 올린다.
- Firebase 설정 파일·APNs 키·서버 인증 키·토큰·릴리스 산출물을 커밋하지 않는다.
- 푸시 토큰을 로그, PostHog, 오류 보고 도구에 전송하지 않는다.
- 검증: `npm run typecheck`, `npm run lint`, `npm test -- --runInBand`, `npm run check:versions`.
- 문서 수정 후 `npm run format:docs`, PR 전 `npm run format:docs:check`를 실행한다.
- `AGENTS.md`와 `CLAUDE.md`는 동일하게 유지한다.
