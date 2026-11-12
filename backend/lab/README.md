# 자취선배 개인 백엔드 실험 환경

## 목적과 기준선

향후 5주 동안 문제 발견·재현·분석·개선·검증을 수행하기 위한 독립 실행 환경이다. 이번 단계는 실행 설정과 CI·배포 경로만 분리한다.

- 원본: [woowacourse-teams/2026-jachwi-sunbae](https://github.com/woowacourse-teams/2026-jachwi-sunbae)
- 개인 Fork: [softmoca/2026-jachwi-sunbae](https://github.com/softmoca/2026-jachwi-sunbae)
- 기준 브랜치: `develop`
- 기준 커밋: `40e65bcc3b5a2ce3c035004f5a0792041144d61d`
- 작업 브랜치: `codex/backend-lab-environment`
- 작업 시작 시 추적 파일 변경 없음. 기존 로컬 `.env` 파일은 읽거나 수정하지 않았다.

`PropertyPhotoService`, 사진 30장 제한, 비관적 락·트랜잭션 경계, S3 업로드·삭제·보상, 대표사진 처리, 체크리스트·매물 도메인, Repository SQL, 기존 Flyway V1–V18과 모든 기존 테스트를 보존한다. Java 코드와 `build.gradle`을 변경하지 않는다.

## 개인 AWS 환경

아래는 사용자가 제공한 환경이며, AWS 조회나 변경으로 검증한 값이 아니다. 리전은 `ap-northeast-2`다.

| 대상             | 구성                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------- |
| 애플리케이션 EC2 | `moca-jachwi-sunbae-prod`, `t4g.small`, Amazon Linux 2023 ARM64, Java 21                 |
| EC2 IAM 역할     | 이미 연결된 `moca-jachwi-app-role`                                                       |
| RDS              | `jachwi-sunbae-db`, MySQL 8.4.9, `db.t4g.micro`, Single-AZ                               |
| RDS 엔드포인트   | `jachwi-sunbae-db.c30280sa2kfd.ap-northeast-2.rds.amazonaws.com:3306`                    |
| DB               | `jachwi_sunbae`                                                                          |
| S3               | `moca-jachwi`, 객체 키 prefix `lab/photos/`                                              |
| 모니터링 EC2     | `moca-jachwi-sunbae-monitoring-server`, `t4g.small`; Prometheus·Grafana 구축은 다음 단계 |

이름에 `prod`가 있어도 애플리케이션은 **`lab` 프로필만** 사용한다. 원본 팀 저장소·AWS·운영 데이터에는 접근하거나 변경하지 않는다. 아래 서버 준비·DB 생성·배포 명령은 사용자가 이후 직접 실행할 절차이며 이번 작업에서 실행하지 않는다.

## 설정과 환경변수

[application-lab.yml](../src/main/resources/application-lab.yml)은 공통 `application.yml` 위에 적용된다. `local`, `dev`, `prod`와 함께 활성화하지 않는다.

- 포트 8080, 기존 JDBC의 UTC·세션 시간대·instant 보존·배치 rewrite 옵션을 유지한다. `sslMode` 기본값은 `REQUIRED`다.
- Flyway 위치·검증·clean 금지 설정은 공통 설정을 따른다. HikariCP, 트랜잭션, JVM 메모리 설정은 추가로 튜닝하지 않는다.
- S3 endpoint와 정적 키를 지정하지 않는다. 기존 `PhotoStorageConfig`는 값이 비어 있으면 `DefaultCredentialsProvider`를 사용하며 EC2에서는 IAM 역할 자격증명을 사용하도록 준비한다.
- `DefaultCredentialsProvider`는 환경변수·프로필 자격증명도 먼저 찾을 수 있다. 서비스 계정에 AWS 정적 키·프로필을 설정하지 않고, `app.env`에 `PHOTO_STORAGE_ENDPOINT`, `PHOTO_STORAGE_ACCESS_KEY`, `PHOTO_STORAGE_SECRET_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_PROFILE`을 넣지 않는다.
- Actuator `health`, `info`, `prometheus` 노출은 공통 설정을 유지한다. `request_id`가 포함된 기존 콘솔 로그를 journald에서 확인한다. JSON 파일 로그는 기존대로 `dev`·`prod`에서만 활성화된다.

[.env.lab.example](.env.lab.example)을 `/etc/jachwi-lab/app.env`에 복사하고 플레이스홀더를 교체한다. Spring Boot가 이 파일을 자동으로 읽는 것은 아니며, 아래 systemd 서비스의 `EnvironmentFile`이 읽는다.

| 변수                   | 값 / 설명                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `DB_HOST`              | 기본값: 위 RDS 엔드포인트                                                                             |
| `DB_PORT`              | 기본값: `3306`                                                                                        |
| `DB_NAME`              | 기본값: `jachwi_sunbae`                                                                               |
| `DB_SSL_MODE`          | 기본값: `REQUIRED`; TLS 사용을 요구하며 서버 인증서·호스트 검증까지 의미하지는 않는다                 |
| `DB_USERNAME`          | 필수. 예시는 `jachwi_lab`; RDS 관리자 대신 애플리케이션 계정 사용                                     |
| `DB_PASSWORD`          | 필수. 애플리케이션 계정 비밀번호                                                                      |
| `JWT_SECRET`           | 필수. 최소 32바이트의 무작위 비밀값. `openssl rand -base64 32` 등으로 생성하고 저장소에 기록하지 않음 |
| `CORS_ALLOWED_ORIGINS` | 기본값: `http://localhost:3000`; 필요한 클라이언트 Origin을 쉼표로 구분                               |

파일은 `root:root`, `0600`으로 두고 `export` 없이 `KEY=value`로 작성한다. systemd는 셸의 변수 치환이나 명령 치환을 하지 않는다. 예시처럼 값을 따옴표로 감쌀 수 있으나 복잡한 따옴표·역슬래시 값은 [EnvironmentFile 문법](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html#EnvironmentFile=)을 확인한다. 실제 환경변수는 YAML보다 우선하므로 팀의 `app.env`나 로컬 MinIO용 `.env`를 재사용하지 않는다. 서비스는 실행 인자로 `lab`과 8080을 지정한다.

## 비활성화 범위와 남아 있는 동작

| 설정                                        | lab 값                                           |
| ------------------------------------------- | ------------------------------------------------ |
| `map.provider.mode`                         | `demo`                                           |
| `map.nearby.provider`                       | `demo`; Kakao 지도 클라이언트·공급자 Bean 미생성 |
| `weather.collection.enabled`                | `false`                                          |
| `weather.cleanup.enabled`                   | `false`                                          |
| `weather.notification.enabled`              | `false`; Firebase 초기화도 비활성화              |
| `promotion.collection.enabled`              | `false`                                          |
| `promotion.collection.seven-eleven.enabled` | `false`                                          |
| `delivery-discount.notification.enabled`    | `false`; 공통 기본값 `true`를 명시적으로 덮어씀  |
| `auth.oauth.unlink.enabled`                 | `false`                                          |

스케줄러 비활성화는 관련 API와 도메인 기능의 삭제를 뜻하지 않는다. 네이버 장소 검색(`/api/maps/search`)은 기존 구현상 demo 모드와 별도로 외부 API를 호출한다. 이번 단계에서는 수정하지 않았으므로 지도 demo 모드를 전체 외부 통신 차단으로 해석하지 않는다. OAuth 키를 넣지 않으면 관련 로그인 흐름은 사용할 수 없으며, 익명 인증과 사진·매물 실험을 먼저 진행한다.

## RDS 최초 DB와 계정 준비

**아래는 새 개인 실험 DB에 대해 사용자가 실행할 안내다. 기존 데이터가 있는 DB에는 먼저 상태·백업·마이그레이션 이력을 확인한다.** 이번 작업에서는 RDS에 접속하지 않는다.

RDS에 접근 가능한 호스트에서 MySQL 8.4 클라이언트로 접속한다. `-p` 프롬프트로 관리자 비밀번호를 입력한다.

```bash
mysql --host=jachwi-sunbae-db.c30280sa2kfd.ap-northeast-2.rds.amazonaws.com \
  --port=3306 --ssl-mode=REQUIRED --user=YOUR_RDS_ADMIN --password
```

다음은 최초 1회 예시다. 비밀번호를 교체하고, SQL 입력 이력도 비밀값으로 관리한다. 계정의 `%`는 접속 호스트 패턴이므로 실제 접근은 RDS 보안 그룹에서 앱 EC2로 제한해야 한다. 필요하면 자신의 네트워크에 맞는 호스트 패턴으로 좁힌다.

```sql
CREATE DATABASE jachwi_sunbae
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'jachwi_lab'@'%'
    IDENTIFIED BY 'REPLACE_WITH_DATABASE_PASSWORD' REQUIRE SSL;
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
    ON jachwi_sunbae.* TO 'jachwi_lab'@'%';
SHOW GRANTS FOR 'jachwi_lab'@'%';
```

애플리케이션 계정으로 Flyway도 실행하므로 DML과 스키마 변경 권한이 모두 필요하다. 전체 서버 권한이나 `GRANT OPTION`은 부여하지 않는다. 권한 구문은 [MySQL CREATE USER](https://dev.mysql.com/doc/refman/8.4/en/create-user.html)와 [GRANT](https://dev.mysql.com/doc/refman/8.4/en/grant.html)를 따른다.

빈 DB는 최초 앱 실행 시 기존 V1–V18을 적용한다. `baseline-on-migrate=false`, `clean-disabled=true`를 유지하고 기존 SQL을 임의로 실행하거나 `SPRING_FLYWAY_BASELINE_ON_MIGRATE=true`로 오류를 우회하지 않는다. `lab`에서는 로컬 전용 버스·CCTV 등의 샘플 적재가 실행되지 않는다. 실제 지도·배치 데이터 적재는 이후 별도 실험으로 준비한다.

## 빌드와 테스트

개발 PC에 JDK 21과 실행 중인 Docker가 필요하다. 기존 Testcontainers가 임시 MySQL을 사용하며 팀 AWS나 RDS는 필요하지 않다. 테스트 이미지 버전은 기존대로 8.0.33·8.4.0·8.4.10 등이 섞여 있으므로 RDS 8.4.9 검증과 구분한다.

저장소 루트에서:

```bash
cd backend
java -version
./gradlew clean build --no-daemon --console=plain
./gradlew testAll --no-daemon --console=plain
```

- `test`와 `clean build`: 인수 태그(`acceptance`)를 제외한 기존 단위·SQL·통합·아키텍처 테스트.
- `testAll`: 인수 테스트를 포함한 전체 테스트. CI에 새로 추가하지 않고 로컬 명령을 유지한다.
- HTML 결과: `build/reports/tests/test/index.html`, `build/reports/tests/testAll/index.html`.
- CI 변경 및 초기화 스크립트 제거 영향: [Backend CI](../docs/operations/ci.md).

배포 JAR에 소스 SHA를 넣으려면 변경 내용을 먼저 커밋한 뒤 `backend`에서 빌드한다. 미커밋 변경이 있으면 SHA만으로 해당 바이너리를 재현할 수 없으므로 diff도 별도로 기록한다.

```bash
SOURCE_COMMIT_ID="$(git rev-parse HEAD)" ./gradlew clean build --no-daemon --console=plain
```

현재 버전의 실행 JAR는 `build/libs/jachwi-sunbae-backend-4.2.0.jar`다. `-plain.jar`는 배포하지 않는다. 버전이 바뀌면 아래 전송 파일명도 실제 `bootJar` 산출물에 맞춘다.

## 수동 JAR 배포와 systemd

배포 경로는 `빌드 → SCP → JAR 교체 → systemd restart → health 확인`이다. CodePipeline, CodeDeploy `appspec.yml`, Vault 스크립트, 기존 `backend/deploy/`를 호출하지 않는다. 자동 배포·SSH 실행을 CI에 추가하지 않는다.

### 1. 개발 PC에서 파일 전송

`backend`에서 실행한다. SSH 대상과 키 경로는 개인 EC2 값으로 교체한다. 비밀값이 담긴 `app.env`는 전송 예시에 포함하지 않는다.

```bash
LAB_SSH_TARGET=ec2-user@YOUR_EC2_HOST
LAB_SSH_KEY=/absolute/path/to/your-key.pem
ssh -i "$LAB_SSH_KEY" "$LAB_SSH_TARGET" 'mkdir -p ~/jachwi-lab-upload'
scp -i "$LAB_SSH_KEY" build/libs/jachwi-sunbae-backend-4.2.0.jar \
  "$LAB_SSH_TARGET:~/jachwi-lab-upload/app.jar"
scp -i "$LAB_SSH_KEY" lab/jachwi-lab.service lab/.env.lab.example \
  "$LAB_SSH_TARGET:~/jachwi-lab-upload/"
ssh -i "$LAB_SSH_KEY" "$LAB_SSH_TARGET"
```

### 2. EC2 최초 준비

Amazon Linux 2023 ARM64에서 실행한다. [Corretto 21 설치 안내](https://docs.aws.amazon.com/corretto/latest/corretto-21-ug/amazon-linux-install.html)의 아키텍처별 경로를 서비스에 고정해 다른 Java 기본 버전에 영향받지 않게 한다.

```bash
sudo dnf install -y java-21-amazon-corretto-devel
/usr/lib/jvm/java-21-amazon-corretto.aarch64/bin/java -version
id jachwi-lab >/dev/null 2>&1 || \
  sudo useradd --system --user-group --home-dir /opt/jachwi-lab --shell /sbin/nologin jachwi-lab
sudo install -d -o root -g jachwi-lab -m 0750 /opt/jachwi-lab
sudo install -d -o root -g root -m 0700 /etc/jachwi-lab
sudo test -e /etc/jachwi-lab/app.env || \
  sudo install -o root -g root -m 0600 ~/jachwi-lab-upload/.env.lab.example /etc/jachwi-lab/app.env
sudoedit /etc/jachwi-lab/app.env
sudo install -o root -g root -m 0644 ~/jachwi-lab-upload/jachwi-lab.service \
  /etc/systemd/system/jachwi-lab.service
sudo systemd-analyze verify /etc/systemd/system/jachwi-lab.service
sudo systemctl daemon-reload
sudo systemctl enable jachwi-lab.service
```

`DB_PASSWORD`·`JWT_SECRET` 플레이스홀더를 반드시 교체한다. `systemd-analyze verify`는 서버에서 별도로 실행해야 하며, 로컬 설정 검증만으로 서버 설치가 완료된 것은 아니다.

### 3. 최초 배포 및 이후 JAR 교체

단일 서버 수동 교체이므로 중단 시간이 있다. 실행 중인 JAR를 직접 덮어쓰지 않고 별도 파일을 준비한 뒤 서비스를 정지하고 교체한다.

```bash
sudo install -o root -g jachwi-lab -m 0640 ~/jachwi-lab-upload/app.jar /opt/jachwi-lab/app.jar.next
sudo systemctl stop jachwi-lab.service
if sudo test -f /opt/jachwi-lab/app.jar; then
  sudo cp -p /opt/jachwi-lab/app.jar /opt/jachwi-lab/app.jar.previous
fi
sudo mv /opt/jachwi-lab/app.jar.next /opt/jachwi-lab/app.jar
sudo systemctl reset-failed jachwi-lab.service
sudo systemctl restart jachwi-lab.service
```

비정상 종료 시 5초 후 재시작하며 300초 동안 5회 시작 제한을 둔다. SIGTERM 종료 코드 143은 성공으로 취급한다. 연속 실패 시 환경변수·DB·Flyway 로그를 확인하고 원인을 해결한 뒤 `reset-failed`, `restart`를 실행한다. 이전 JAR는 보관하지만 Flyway 적용 이후 DB 호환성을 확인하기 전 단순 JAR 롤백을 수행하지 않는다.

### 4. Health·로그·메트릭 확인

EC2 안에서 실행한다. 시작이 완료되기 전에는 health가 연결 실패할 수 있으므로 로그를 보면서 다시 확인한다.

```bash
sudo systemctl status jachwi-lab.service --no-pager
sudo journalctl -u jachwi-lab.service -n 200 --no-pager
sudo journalctl -u jachwi-lab.service -f
```

로그 추적을 종료한 뒤:

```bash
curl --fail-with-body http://127.0.0.1:8080/actuator/health
curl --fail-with-body http://127.0.0.1:8080/actuator/info
curl --fail-with-body http://127.0.0.1:8080/actuator/prometheus
sudo systemctl restart jachwi-lab.service
```

Health의 `status: UP`, info의 빌드 버전·commit, Prometheus 텍스트 응답을 확인한다. SHA를 주입하지 않은 빌드는 commit이 `local`이다. Health 성공은 S3 업로드·삭제 성공을 보장하지 않는다. IAM 역할의 `moca-jachwi/lab/photos/*` 읽기·쓰기·삭제 권한과 IMDS 접근은 EC2에서 별도 확인하고, 실제 사진 API 검증은 실험 데이터 사용을 정한 다음 진행한다.

8080과 Actuator는 인증으로 보호된 것으로 가정하지 않는다. 앱 접근과 향후 모니터링 서버 접근에 필요한 네트워크만 허용되어 있는지 사용자가 확인한다. 이번 작업에서는 보안 그룹·IAM·버킷 설정을 변경하지 않는다.

## 기존 배포 자료와 다음 단계

`backend/deploy/` 전체를 참고 자료로 보존한다. 특히 GC 로그 옵션이 있는 `jachwi-sunbae.service`, `scripts/jachwi-thread-dump.sh`, `scripts/jachwi-thread-dumps.logrotate`, `scripts/log_service_exit.sh`, `tests/diagnostics-test.sh`와 배치 import 스크립트를 삭제하지 않는다. 기존 서비스명·경로·포트·실행 사용자·Vault 주소를 포함하므로 lab에서 그대로 실행하지 않는다. 현재 lab은 journald만 사용한다.

첫 배포 성공 후 다음을 별도 변경으로 검토한다.

- GC 로그·Thread Dump·서비스 종료 기록을 `jachwi-lab` 사용자·경로·서비스명으로 이식하고 보존 기간을 결정한다.
- 모니터링 EC2에서 Prometheus·Grafana를 구성하고 JVM·HikariCP·HTTP·CPU·메모리·재시작 기준치를 기록한다.
- 기준선부터 사진 정합성·30장 제한·락·트랜잭션·재시도·PDF·외부 API·배치·알림·다중 서버 실험을 하나씩 분리한다.
- 원본과의 비교 및 진단 스크립트 참조를 재확인한 후 `appspec.yml`, `before_install.sh`, `after_install.sh`, `prepare_vault.sh`, `fetch_env.sh`, Vault 공개 인증서 등 팀 배포 전용 파일의 보관 위치를 정리한다.
- 삭제된 워크플로에서 사용하던 `.github/actions`·`.github/scripts`, 프론트엔드·모바일·QA 파일은 다른 실행 경로의 참조를 확인한 뒤 정리한다. 이번에는 워크플로와 사용하지 않는 CI 초기화 스크립트만 삭제했다.
- Fork 브랜치 보호에 삭제한 `Check frontend`·`Check mobile`·`Check Markdown` 등이 필수 검사로 남았는지 확인한다. 경로 필터로 Backend CI가 실행되지 않는 PR은 `Build`가 Pending에 남을 수 있으므로 개인 Fork 정책에 맞춰 사용자가 조정한다. 원격 설정은 변경하지 않았다.

## 변경 파일

| 구분            | 파일                                                                                                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 추가            | `backend/src/main/resources/application-lab.yml`, `backend/lab/README.md`, `backend/lab/.env.lab.example`, `backend/lab/jachwi-lab.service`                                                                                                       |
| 수정: 실행·검사 | `.github/workflows/backend-ci.yml`, `.gitignore`, `package.json`                                                                                                                                                                                  |
| 수정: 안내 문서 | `README.md`, `backend/docs/README.md`, `backend/docs/guides/environment-variables.md`, `backend/docs/operations/ci.md`, `backend/docs/operations/deployment.md`, `docs/convention/branch-and-commit.md`, `docs/convention/markdown-formatting.md` |
| 삭제: 워크플로  | `.github/workflows/frontend-ci.yml`, `.github/workflows/frontend-mutation.yml`, `.github/workflows/mobile-ci.yml`, `.github/workflows/storybook-pages.yml`, `.github/workflows/release.yml`, `.github/workflows/markdown-format.yml`              |
| 삭제: CI 초기화 | `.github/gradle/backend-ci.init.gradle`                                                                                                                                                                                                           |

## 검증 상태와 발견 사항

2026-11-12 로컬 macOS ARM64·Temurin 21.0.12.1·Docker 29.8.2에서 검증했다. AWS RDS·S3 접속, EC2 systemd 실행, GitHub Actions 원격 실행은 수행하지 않았다.

| 검증                                                | 결과                                                                                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `./gradlew clean build --no-daemon --console=plain` | 성공, 4분 13초. 일반 테스트 1,521개, 실패·오류·건너뛰기 0개                                                                                     |
| `./gradlew testAll --no-daemon --console=plain`     | 성공, 5분 2초. 인수 테스트 포함 1,645개, 실패·오류·건너뛰기 0개                                                                                 |
| lab 컨텍스트와 실행 JAR 기동                        | 별도 임시 MySQL 8.4.10으로 통과. 충돌 방지를 위해 DB 호스트·포트와 HTTP 포트만 로컬 값으로 바꿔 실행                                            |
| 최초 DB 계정 권한·Flyway·TLS                        | 문서의 제한된 DB 권한으로 V1–V18 적용, `DB_SSL_MODE`를 생략한 기본 `REQUIRED`에서 TLS 사용 확인                                                 |
| lab Bean과 설정                                     | 요청한 스케줄러·Firebase·Kakao 공급자·로컬 샘플 Bean 미생성, demo 지도 설정 확인                                                                |
| S3 설정                                             | `moca-jachwi`, `lab/photos/`, `ap-northeast-2` 바인딩, endpoint override 없음, `DefaultCredentialsProvider` 선택 확인. AWS 요청은 수행하지 않음 |
| Actuator와 로그                                     | Health `UP`, Info 빌드 정보, Prometheus JVM 메트릭 모두 HTTP 200. 응답 요청 ID와 로그 `request_id` 일치                                         |
| CI·배포 구조                                        | YAML 파싱, 워크플로 1개 유지, lab 서비스 필드·문서 셸 구문 확인. lab 실행에서 팀 훅·Vault 호출 없음                                             |
| 코드 보존                                           | Java·기존 테스트·마이그레이션·공통/local/dev/prod 설정·`build.gradle`·`backend/deploy/` 변경 없음                                               |
| 문서 포맷                                           | Node 22.23.1로 루트 `npm run format:docs`, `npm run format:docs:check` 통과. 무관한 포맷 변경 없음                                              |

로컬 확인용 임시 DB는 제거했고 기존 Docker DB는 보존했다. EC2의 Java 경로·파일 권한·systemd 재시작과 개인 RDS 8.4.9·S3 IAM 권한·실제 사진 API는 미검증이다. 이 결과를 AWS 배포 성공으로 간주하지 않는다.

- 기존 네이버 검색이 demo 설정과 무관하게 외부 호출하는 점, 로컬 샘플 데이터가 lab에 자동 적재되지 않는 점을 확인했다. 도메인 코드는 수정하지 않았다.
- 기존 테스트의 MySQL 버전 혼재와 RDS 8.4.9의 차이를 보존한다. 사진 업로드·삭제의 정합성이나 동시성 문제는 이번 설정 작업으로 해결 또는 검증됐다고 판단하지 않는다.

- `testAll` 종료 중 Hikari의 연결 종료·재연결 실패 경고를 관찰했다. 테스트 XML은 전부 성공이며, 임시 MySQL 컨테이너와 캐시된 Spring 컨텍스트의 종료 순서 영향으로 추정한다. 재현·분석 과제로 남기고 테스트 수명주기나 Hikari 설정을 변경하지 않았다.
