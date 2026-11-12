# 환경변수

> 개인 Fork의 EC2 실행은 [lab 환경변수](../../lab/README.md#설정과-환경변수)와 `backend/lab/.env.lab.example`을 사용한다. 아래 로컬·팀 dev·prod 환경변수를 lab으로 복사하지 않는다.

## 관리 원칙

Spring Boot 애플리케이션은 CORS 허용 Origin과 인증·저장소 설정을 환경변수로 주입받는다. 아래 값 중 로컬 인프라용 값은 Docker Compose에서 사용하고, 애플리케이션 설정에 연결된 값은
실행 환경에 맞게 제공한다.

- 예시와 기본값은 `backend/.env.example`에 기록하고 Git에 커밋한다.
- 개인 값은 `backend/.env`에 기록하며 Git에 커밋하지 않는다.
- 실제 비밀번호, 토큰과 운영 비밀값은 문서, 코드, 예시 파일에 기록하지 않는다.
- 환경변수를 추가하거나 이름을 변경하면 애플리케이션 설정, Compose, `.env.example`과 이 문서를 같은 PR에서 수정한다.

## 로컬 인프라용 환경변수

| 환경변수                     | 로컬 기본값             | 용도                                                                                     |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| `DB_HOST`                    | `localhost`             | MySQL 호스트                                                                             |
| `DB_PORT`                    | `3306`                  | MySQL 포트                                                                               |
| `DB_NAME`                    | `jachwi_sunbae`         | 데이터베이스 이름                                                                        |
| `DB_USERNAME`                | `jachwi_sunbae`         | 애플리케이션 계정                                                                        |
| `DB_PASSWORD`                | `local_password`        | 애플리케이션 계정 비밀번호                                                               |
| `DB_ROOT_PASSWORD`           | `local_root_password`   | 로컬 MySQL root 비밀번호                                                                 |
| `DB_SSL_MODE`                | `DISABLED`              | 운영 JDBC TLS 모드. 로컬 프로필은 별도 설정을 사용한다                                   |
| `JWT_SECRET`                 | 32바이트 이상 문자열    | HS256 서명 비밀값. 문자열 그대로 키로 쓴다. 운영 값은 `openssl rand -base64 32`로 만든다 |
| `CORS_ALLOWED_ORIGINS`       | `http://localhost:3000` | 쉼표로 구분한 프론트엔드 Origin 허용 목록                                                |
| `PHOTO_STORAGE_ENDPOINT`     | `http://localhost:9000` | S3 호환 객체 저장소 API endpoint. 정적 자격증명으로 접속하는 환경에서만 쓴다             |
| `PHOTO_STORAGE_REGION`       | `us-east-1`             | S3 서명에 사용하는 region                                                                |
| `PHOTO_STORAGE_BUCKET`       | `jachwi-sunbae-photos`  | 로컬 MinIO 사진 객체 bucket                                                              |
| `PHOTO_STORAGE_KEY_PREFIX`   | 비움                    | 객체 key 앞에 붙일 경로. 버킷을 다른 팀과 공유할 때 사용하며 로컬은 전용 버킷이라 비운다 |
| `PHOTO_STORAGE_ACCESS_KEY`   | 로컬 전용 예시 값       | 객체 저장소 access key. 정적 자격증명으로 접속하는 환경에서만 쓴다                       |
| `PHOTO_STORAGE_SECRET_KEY`   | 로컬 전용 예시 값       | 객체 저장소 secret key. 정적 자격증명으로 접속하는 환경에서만 쓴다                       |
| `PHOTO_STORAGE_PORT`         | `9000`                  | 로컬 MinIO API 포트                                                                      |
| `PHOTO_STORAGE_CONSOLE_PORT` | `9001`                  | 로컬 MinIO 관리 화면 포트                                                                |
| `MAP_PROVIDER_MODE`          | `demo`                  | `demo` 또는 `public` 주소 검색·역지오코딩 adapter 선택                                   |
| `JUSO_CONFIRM_KEY`           | 비움                    | `public` 모드의 행정안전부 도로명주소 검색 API 승인키                                    |
| `SGIS_CONSUMER_KEY`          | 비움                    | `public` 모드의 국가데이터처 SGIS 서비스 ID                                              |
| `SGIS_CONSUMER_SECRET`       | 비움                    | `public` 모드의 국가데이터처 SGIS 보안키. 백엔드 전용으로 관리한다                       |
| `NAVER_SEARCH_CLIENT_ID`     | 비움                    | 건물명 검색(NAVER API HUB 지역 검색)용 NCP Application Client ID                         |
| `NAVER_SEARCH_CLIENT_SECRET` | 비움                    | 건물명 검색용 Client Secret. 백엔드 전용으로 관리한다                                    |
| `MAP_NEARBY_PROVIDER`        | `demo`                  | `demo` 또는 `kakao` 주변 시설 adapter 선택. 비우면 `demo`로 동작한다                     |
| `KAKAO_REST_API_KEY`         | 비움                    | `kakao` 모드의 Kakao Developers REST API 키. 백엔드 전용으로 관리한다                    |
| `MAP_CONNECT_TIMEOUT_MILLIS` | `2000`                  | 지도 외부 공급자 연결 제한 시간                                                          |
| `MAP_READ_TIMEOUT_MILLIS`    | `5000`                  | 지도 외부 공급자 응답 제한 시간                                                          |
| `DEPLOYMENT_ENVIRONMENT`     | `local`                 | 구조화 로그의 실행 환경. EC2에서는 `dev` 또는 `prod`를 사용한다                          |
| `LOG_PATH`                   | `./logs`                | `dev`·`prod` 프로필에서 JSON 로그 파일을 저장할 디렉터리                                 |
| `KMA_API_KEY`                | 비움                    | 기상청 API허브 키. 날씨 수집을 켜는 Dev·Prod에서 필요하다                                |

## 사용 방법

`backend`에서 개인 파일을 생성한다.

```bash
cp .env.example .env
```

Docker Compose는 같은 디렉터리의 `.env`를 자동으로 읽는다. Spring Boot를 직접 실행할 때는 셸 또는 실행 환경에 필요한 값을 주입한다.

## dev·prod 프로필

Dev는 `SPRING_PROFILES_ACTIVE=dev`, Prod는 `SPRING_PROFILES_ACTIVE=prod`로 기동하며 `/etc/jachwi-sunbae/app.env`에서 환경변수를 읽는다. 기존 Dev도 `prod`를 사용했으므로 이 버전 배포 전에 Vault의 Dev `app_env`를 `dev`로 변경해야 한다. 저장소 수정만으로 현재 서버나 Vault 값이 바뀌지는 않는다. 애플리케이션은 80 포트를 직접 사용한다.
실제 값은 환경마다 분리하고 파일 권한은 `root:root`, `0600`으로 유지한다.

| 설정                       | dev                            | prod                           |
| -------------------------- | ------------------------------ | ------------------------------ |
| `SPRING_PROFILES_ACTIVE`   | `dev`                          | `prod`                         |
| `CORS_ALLOWED_ORIGINS`     | `https://dev.jachwi-sunbae.kr` | `https://www.jachwi-sunbae.kr` |
| `PHOTO_STORAGE_REGION`     | `ap-northeast-2`               | `ap-northeast-2`               |
| `PHOTO_STORAGE_BUCKET`     | `techcourse-project-2026`      | `techcourse-project-2026`      |
| `PHOTO_STORAGE_KEY_PREFIX` | `jachwi-sunbae/photos-dev/`    | `jachwi-sunbae/photos/`        |
| `MAP_PROVIDER_MODE`        | `public`                       | `public`                       |
| `MAP_NEARBY_PROVIDER`      | `kakao`                        | `kakao`                        |
| `DEPLOYMENT_ENVIRONMENT`   | `dev`                          | `prod`                         |
| `LOG_PATH`                 | `/var/log/jachwi-sunbae`       | `/var/log/jachwi-sunbae`       |

DB 접속값과 `JWT_SECRET`, `JUSO_CONFIRM_KEY`, `SGIS_CONSUMER_KEY`, `SGIS_CONSUMER_SECRET`, `KAKAO_REST_API_KEY`는 환경별 실제 값이
필요하다.

`JWT_SECRET`은 사람이 만든 문장 대신 `openssl rand -base64 32`로 환경마다 새로 만든 값을 넣는다.
비어 있거나 32바이트보다 짧으면 애플리케이션이 시작되지 않는다.

`JUSO_CONFIRM_KEY`는 유효기간 90일 승인키이며 2026-12-25에 만료된다.

`MAP_PROVIDER_MODE`는 `demo` 또는 `public`만 사용할 수 있다. `public` 모드에 행안부 및 SGIS 키가 없으면 애플리케이션이 시작되지 않는다.
동네 찾기와 동네 검색은 `/api/maps/search`에서 네이버 지역 검색으로 건물명과 장소를 바로 찾는다. 선행 주소 검색이나 검색 결과에 따른 재요청은 하지 않는다. 검색 키를 미리 검사하는 별도 분기는 두지 않으며, 네이버 API의 인증 오류를 포함한 HTTP 오류는 `MAP_PROVIDER_UNAVAILABLE`로 변환한다.
검색 키는 NAVER API HUB 검색(지역)을 구독한 NCP Application의 키를 넣는다.
착한가격업소 적재 스크립트도 주소를 좌표로 바꿀 때 같은 `SGIS_CONSUMER_KEY`, `SGIS_CONSUMER_SECRET`을 사용한다. 스크립트는 개발자 PC에서 실행하므로 서버 환경변수에는 추가하지 않는다.

`MAP_NEARBY_PROVIDER`를 빠뜨리면 오류 없이 `demo` 주변 시설 (가짜 데이터)로 동작하므로 dev·prod에는 반드시 `kakao`를 넣는다.
Kakao Developers 앱에 허용 IP를 설정했다면 서버가 외부로 나가는 IP (VPC NAT 게이트웨이 IP)를 등록해야 한다.

AWS S3는 EC2 `ec2-project` instance role로 접근하므로 `PHOTO_STORAGE_ENDPOINT`, `PHOTO_STORAGE_ACCESS_KEY`,
`PHOTO_STORAGE_SECRET_KEY`를 EC2에 두지 않는다. 이 세 값은 로컬 MinIO에만 사용한다. 프론트엔드에는 지도 화면용 공개 Naver Maps Client ID만 빌드 타임에 주입한다.
백엔드는 동네 찾기와 동네 검색의 건물명 검색에만 네이버 API를 사용한다. Client Secret은 백엔드 환경변수에만 둔다.

`src/main/resources/db/migration/V1__initial_schema.sql`은 기존 스키마와 시스템 체크 항목을 고정한 최초 마이그레이션이다.
백엔드 기동 시 Flyway가 아직 적용하지 않은 버전을 실행한다. 현재 목록은 V1–V5이며 새 변경은 적용 이력과 다른 브랜치의 버전을 확인한 뒤 미사용 버전으로 추가한다.
`docker/mysql/init/003-bus-stops-sample.sql`, `004-good-price-stores-sample.sql`, `005-cctvs-sample.sql`은 로컬 샘플이며 애플리케이션 JAR에 포함하지 않는다.
`local` 프로필에서는 Flyway 실행 후 각 테이블이 비어 있을 때만 자동 적재한다. 작업 디렉터리는 `backend`여야 한다.
`dev`·`prod` 프로필에서는 이 샘플 적재를 실행하지 않는다.

`spring.flyway.baseline-on-migrate`의 기본값은 `false`다. 기존 DB를 처음 연결할 때는 백업과 기준 스키마 일치를 확인한 뒤
`SPRING_FLYWAY_BASELINE_ON_MIGRATE=true`를 해당 최초 기동에만 지정한다. 기준선 등록 후에는 반드시 제거한다.
평상시 `.env`나 Vault의 `app_env`에 이 값을 상시 등록하지 않는다.
로컬과 dev·prod의 전환 명령은 [DB 마이그레이션](../operations/database-migrations.md)을 따른다.

새 환경변수를 도입하면 서버의 환경변수 파일도 함께 갱신한다.

## OAuth 계정 연결

웹 OAuth(`/start` → 제공자 인증 → `/callback`)와 앱 네이티브 로그인(`/nonce` → 카카오 SDK·Apple 로그인 → `/id-token`)은 제공자별로 설정한다.
값이 비어 있으면 해당 흐름의 API가 `503 OAUTH_PROVIDER_UNAVAILABLE`로 응답하고 회원과 인증은 바뀌지 않는다. dev·prod 값은 Vault의 `app_env`에 등록한다.

| 환경변수                       | 용도                                                                                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OAUTH_SUCCESS_REDIRECT_URI`   | 웹 콜백 뒤 이동할 프론트 HTTPS 주소(`/oauth/complete`). 성공하면 그대로 보내고, 실패하면 쿠키를 바꾸지 않은 채 `error`(`cancelled`, `session`, `failed`, `unavailable`)를 붙여 보낸다. 비우면 성공은 204, 실패는 JSON 오류로 끝난다 |
| `KAKAO_OAUTH_CLIENT_ID`        | 웹 OAuth의 카카오 REST API 키. 인가 요청 `client_id`이자 웹 ID Token의 `aud`                                                                                                                                                        |
| `KAKAO_OAUTH_CLIENT_SECRET`    | 웹 OAuth 인가 코드 교환용 카카오 Client Secret                                                                                                                                                                                      |
| `KAKAO_OAUTH_REDIRECT_URI`     | 카카오 콘솔에 등록한 `/api/auth/oauth/KAKAO/callback` 주소                                                                                                                                                                          |
| `KAKAO_OAUTH_NATIVE_AUDIENCES` | 앱 네이티브 로그인 ID Token의 `aud`로 허용할 카카오 네이티브 앱 키. 쉼표로 여러 값을 둘 수 있다                                                                                                                                     |
| `APPLE_OAUTH_CLIENT_ID`        | 웹 OAuth의 Apple Services ID. 웹 ID Token의 `aud`                                                                                                                                                                                   |
| `APPLE_OAUTH_CLIENT_SECRET`    | Services ID로 서명한 Apple Client Secret(JWT)                                                                                                                                                                                       |
| `APPLE_OAUTH_REDIRECT_URI`     | Apple 콘솔의 Services ID에 등록한 `/api/auth/oauth/APPLE/callback` 주소                                                                                                                                                             |
| `APPLE_OAUTH_NATIVE_AUDIENCES` | 앱 네이티브 로그인 ID Token의 `aud`로 허용할 iOS 앱 번들 ID. 개발용 앱 번들 ID가 다르면 쉼표로 함께 넣는다                                                                                                                          |
| `APPLE_OAUTH_TEAM_ID`          | Apple Developer Team ID. Apple `client_secret`(ES256 JWT)의 `iss`                                                                                                                                                                   |
| `APPLE_OAUTH_KEY_ID`           | Sign in with Apple을 켠 키의 Key ID                                                                                                                                                                                                 |
| `APPLE_OAUTH_PRIVATE_KEY`      | 그 키의 `.p8` 내용. 머리말을 빼고 한 줄로 넣거나 줄바꿈을 `\n` 문자로 바꿔 넣는다. 네이티브 인가 코드 교환과 탈퇴 시 토큰 철회에 쓴다                                                                                               |
| `KAKAO_OAUTH_ADMIN_KEY`        | 탈퇴 시 카카오 연결 끊기에 쓰는 서비스 앱 어드민 키                                                                                                                                                                                 |
| `OAUTH_TOKEN_ENCRYPTION_KEY`   | 철회용 Apple Refresh Token을 암호화하는 32바이트 키(Base64). `openssl rand -base64 32`로 만들고 바꾸면 이미 저장한 토큰을 철회할 수 없다                                                                                            |

네이티브 SDK가 발급한 ID Token의 `aud`는 웹과 다르다. 카카오는 토큰을 발급한 앱 키(네이티브 SDK는 네이티브 앱 키)를, Apple은 iOS 앱의 번들 ID를 넣는다.
서버는 웹과 네이티브 흐름의 `aud`를 따로 검증하므로 웹용 REST API 키나 Services ID를 네이티브 값에 넣지 않는다. 네이티브 앱 키와 번들 ID는 앱에도 들어 있는 공개 식별값이지만 허용 목록은 서버 설정으로 관리한다.
Apple은 웹·네이티브 모두 연결할 때 인가 코드를 교환해 받은 Refresh Token을 암호화해 저장하고, 탈퇴하면 이 토큰을 철회한다.
그래서 Apple 연결에는 `OAUTH_TOKEN_ENCRYPTION_KEY`와 Apple 키(`APPLE_OAUTH_TEAM_ID`, `APPLE_OAUTH_KEY_ID`, `APPLE_OAUTH_PRIVATE_KEY`)가 필요하다.
웹은 `APPLE_OAUTH_CLIENT_SECRET`이 있으면 그 값을 쓰고, 없으면 Apple 키로 만든다. 카카오는 탈퇴 시 `KAKAO_OAUTH_ADMIN_KEY`로 연결을 끊는다.
탈퇴 후 연결 해제는 dev·prod 프로필에서 1분마다 처리하며, 실패하면 간격을 늘려 다시 시도한다.

닉네임 인증은 외부 키가 필요 없다. 지도 기본 모드를 `demo`로 두면 외부 키 없이 전체 로컬 흐름을 실행할 수 있다.

실제 비밀값은 `.env.example`, 애플리케이션 설정, 문서와 Git에 커밋하지 않는다.
