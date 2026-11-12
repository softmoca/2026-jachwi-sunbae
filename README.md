# 자취선배

> **집은 매물 앱에서 찾고, 결정은 자취선배에서.**

여러 플랫폼에서 찾은 매물 후보를 한곳에 모으고, 방문 전·현장·계약 전 확인 내용을 사진과 메모로 기록해 비교하도록 돕는 임차인용 집 선택 도구입니다.

외부 계정이나 입력 없이 익명 회원으로 바로 시작하고, 마이 화면에서 회원 탈퇴를 할 수 있습니다. 매물별 체크리스트, 실제 사진 업로드, 주소·지도·주변 시설 분석, 선택 매물 비교 PDF와 외부 사용자용 공개 소개
화면을 제공합니다.

## 개인 백엔드 실험 환경

이 Fork는 [개인 실험 가이드](backend/lab/README.md)에 따라 `lab` 프로필·8080·EC2 IAM 역할을 사용합니다. CI는 백엔드 빌드만 수행하고 배포는 JAR 전송과 systemd로 수동 실행합니다. 기존 팀 배포 자료와 다른 파트의 소스는 비교·참고를 위해 보존합니다.

## 원본 팀 실행 환경

| 환경 | 브랜치    | 프론트엔드                     | 백엔드                             |
| ---- | --------- | ------------------------------ | ---------------------------------- |
| dev  | `develop` | `https://dev.jachwi-sunbae.kr` | `https://dev-api.jachwi-sunbae.kr` |
| prod | `main`    | `https://www.jachwi-sunbae.kr` | `https://api.jachwi-sunbae.kr`     |

위 표는 원본 팀 서비스의 참고 정보이며 개인 Fork의 배포 대상이 아닙니다. 개인 실험에서는 팀 CodePipeline·CodeDeploy·Vault를 호출하지 않습니다. 실제 비밀값은 저장소에 커밋하지 않습니다.

## 문서

### 제품

- [제품 문서 안내](docs/product/README.md) — 기능별 요구사항·정책·인수 기준

### QA

- [QA 안내](qa/README.md) — AI E2E QA 사이클, 정답 기준, 사용자 흐름, Scenario, 실행 결과 형식과 판정 기준, 실행 방법

### 개발과 운영

- [컨벤션](docs/convention/README.md) — 브랜치·커밋, 이슈·PR, 코드 리뷰
- [Markdown 작성 규칙](docs/convention/markdown-formatting.md) — 루트 포맷팅 명령, IDE 주의사항, 로컬 포맷 검사
- [변경 내역](CHANGELOG.md) — 릴리스별 기능·수정·성능 개선
- [버전 관리](docs/convention/versioning.md) — SemVer, Git 태그, 릴리스와 롤백 기준
- [백엔드 문서](backend/docs/README.md) — 코드·API·예외 컨벤션, 패키지 구조, 환경변수·로컬 실행·운영
- [환경변수](backend/docs/guides/environment-variables.md)와 [프론트엔드 공개 빌드 설정](frontend/README.md#공개-빌드-설정)
- [백엔드 배포](backend/docs/operations/deployment.md)와 [프론트엔드 배포](frontend/docs/deployment.md)
- [모바일 앱](mobile/README.md) — React Native WebView 앱 셸, 푸시 알림, 스토어 배포

## 저장소 구조

```text
2026-jachwi-sunbae/
├── .github/              # Issue·PR 템플릿, 개인 백엔드 CI
├── backend/              # Spring Boot, lab 수동 배포, 기존 CodeDeploy 참고 자료
├── frontend/             # React, TypeScript, Webpack, S3·CloudFront 배포 파일
├── mobile/               # React Native WebView 앱 셸(iOS·Android), 푸시 발송 스크립트
├── qa/                   # AI E2E QA 기준 문서(docs/)와 Playwright 실행 코드
├── docs/
│   ├── convention/       # 저장소 공통 규칙
│   └── product/          # 제품 기능 명세
├── .editorconfig
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── AGENTS.md
├── CLAUDE.md
├── package.json          # Markdown 포맷팅 도구와 실행 명령
├── package-lock.json
└── README.md
```

## 로컬 실행

외부 키 없이 demo 지도와 MinIO를 사용합니다.

```bash
cd backend
cp .env.example .env
set -a
source .env
set +a
docker compose up -d
./gradlew bootRun
```

다른 터미널에서 실행합니다.

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

- 앱: `http://localhost:3000`
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- MinIO 콘솔: `http://localhost:9001`

앱을 처음 열면 입력 없이 새 익명 회원으로 시작합니다. 같은 브라우저나 앱에서는 HttpOnly Refresh 쿠키로 같은 회원의 기록을 이어 사용합니다.
