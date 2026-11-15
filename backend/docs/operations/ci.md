# Backend CI·CD

개인 Fork는 [Backend CI](../../../.github/workflows/backend-ci.yml)와 [Backend CD](../../../.github/workflows/backend-cd.yml)를 분리한다. CI는 PR에서 앱 빌드와 `property` 테스트를 수행하고, CD는 `develop` 반영·개인 브랜치 수동 실행에서 테스트 없이 JAR를 빌드해 lab에 배포한다. SSH 설정과 장애 대응은 [lab README](../../lab/README.md#github-actions-최소-cd)를 따른다.

## 실행 조건과 명령

| 이벤트                   | CI                                            | CD                                       |
| ------------------------ | --------------------------------------------- | ---------------------------------------- |
| PR 생성·추가 커밋·재오픈 | 백엔드 관련 변경이면 빌드 + `property` 테스트 | 실행하지 않음                            |
| `develop` push·병합      | 실행하지 않음                                 | 실행 JAR 빌드 + lab 배포                 |
| `main`·작업 브랜치 push  | 실행하지 않음                                 | 실행하지 않음                            |
| Backend CD 수동 실행     | 실행하지 않음                                 | 선택한 개인 브랜치의 JAR 빌드 + lab 배포 |

- PR 경로 필터는 `backend/**`, `.github/gradle/**`, `backend-ci.yml`, `backend-cd.yml`이다. 백엔드 문서 변경도 포함하며 PR 대상 브랜치는 제한하지 않는다.
- CI의 같은 PR에서 새 실행은 이전 `Build` job을 취소한다. 검사 이름 `Build`, `ubuntu-latest`, 제한 시간 10분, `contents: read` 권한을 유지한다.
- CD는 `softmoca/2026-jachwi-sunbae`에서만 실행하며 수동 실행의 태그 ref는 제외한다. 같은 lab을 사용하는 모든 브랜치의 빌드·배포를 직렬화하고 진행 중 배포를 취소하지 않는다. 새 요청은 기존 대기 요청을 대체할 수 있다.
- CD는 CI 결과를 별도로 조회하거나 테스트를 재실행하지 않는다. `develop`에는 PR CI를 통과한 변경을 병합하며, 필수 검사 `Build` 등 브랜치 보호는 개인 Fork에서 관리한다. 수동 배포도 테스트 없이 실행한다.

두 워크플로 모두 Temurin 21과 Gradle Wrapper를 사용하고 `SOURCE_COMMIT_ID=github.sha`를 JAR에 기록한다. CI는 `backend`에서 다음 명령을 실행한다.

```bash
./gradlew clean build --no-daemon --build-cache --console=plain --init-script ../.github/gradle/backend-ci.init.gradle
```

`test`는 `com.jachwisunbae.property.*`만 선택하고 기존 `acceptance` 태그 제외 조건을 유지한다. 테스트 실패는 CI 실패다. `testAll`은 패키지 필터와 태그 제외 없이 전체 테스트를 유지한다.

CD는 다음 명령으로 테스트 없이 실행 JAR만 빌드한다. 같은 runner에서 SCP Action으로 전송하므로 워크플로·job 사이 artifact 업로드·다운로드는 없다. EC2에서는 Gradle을 실행하지 않는다.

```bash
./gradlew clean bootJar --no-daemon --build-cache --console=plain
```

배포는 `appleboy/scp-action@v1`로 JAR·스크립트를 전송하고 `appleboy/ssh-action@v1`로 기존 `deploy.sh`를 실행한다. 두 Action 모두 `LAB_SSH_FINGERPRINT`로 서버 호스트 키를 검증하며 이전 `LAB_SSH_KNOWN_HOSTS`는 사용하지 않는다. JAR 백업·교체, systemd 재시작, health·실행 SHA 확인은 그대로 유지한다. PR CI에는 SSH Secrets를 전달하지 않는다. 배포 실패는 Actions 실패로 반환하고 Flyway 호환성을 확인하지 않은 자동 JAR 롤백은 하지 않는다.

## 병렬 실행과 캐시

[build.gradle](../../build.gradle)의 모든 `Test` 작업은 `min(2, CPU 수)`개 JVM을 사용한다. 로컬 `test`·`testAll`과 CI에 동일하게 적용하며 JUnit 메서드 병렬 실행은 추가하지 않는다. 기존 클래스별 Testcontainers 수명주기와 테스트 검증 로직은 유지한다.

캐시는 `setup-gradle@v6` 하나로 관리한다. Gradle User Home의 의존성·Wrapper 배포본·로컬 빌드 캐시를 저장·복원하고 `--build-cache`로 컴파일 결과 재사용을 활성화한다. 별도 `actions/cache`, `setup-java cache: gradle`, 사용자 지정 캐시 디렉터리는 추가하지 않는다.

| 실행 종류                                 | 캐시 읽기·저장 정책                            |
| ----------------------------------------- | ---------------------------------------------- |
| 같은 저장소 PR                            | 읽기·저장 허용. 해당 PR의 후속 실행에서 재사용 |
| 외부 Fork PR                              | 읽기만 허용                                    |
| CD의 `develop` push·개인 브랜치 수동 실행 | 해당 ref에서 읽기·저장 허용                    |

PR 캐시는 해당 merge ref에 속하므로 CD가 PR의 캐시를 그대로 받는 것은 아니다. `develop` CD에서 저장한 캐시는 `develop`을 대상으로 하는 PR에서도 활용할 수 있다. [setup-gradle 캐시 정책](https://github.com/gradle/actions/blob/main/docs/setup-gradle.md#common-cache-configuration)과 [GitHub 캐시 접근 범위](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching#restrictions-for-accessing-a-cache)를 따른다.

[CI 초기화 스크립트](../../../.github/gradle/backend-ci.init.gradle)는 테스트 결과 캐시와 up-to-date 생략을 비활성화한다. 컴파일이 `FROM-CACHE`여도 선택된 `property` 테스트는 매번 실제로 실행한다. `CI_TEST_CONFIG`에서 병렬 수를, `CI_TEST_SUMMARY`에서 실행·실패·생략 수를 확인한다. CD는 테스트 작업 자체를 실행하지 않으며 이 초기화 스크립트도 필요하지 않다.

## 제거한 워크플로와 원격 설정

기존 프론트엔드 검사·mutation, 모바일 검사, Storybook Pages 배포, 태그·GitHub Release 발행, Markdown CI의 6개 워크플로는 제거한 상태를 유지한다. 현재 개인 백엔드는 `backend-ci.yml`과 `backend-cd.yml` 두 파일로 관리한다. 프론트엔드·모바일·QA 소스와 공용 스크립트는 보존하며 Markdown 정렬·검사는 루트에서 실행한다.

```bash
npm run format:docs
npm run format:docs:check
```

GitHub 경로 필터로 생략된 워크플로가 필수 검사라면 PR 검사가 Pending에 남을 수 있다. 삭제한 `Check frontend`·`Check mobile`·`Check Markdown` 등 필수 검사와 `Build` 필수 여부는 개인 Fork에서 확인한다. 이 작업은 원격 브랜치 보호·Secrets·AWS 설정을 변경하지 않으며 실제 Actions 실행과 배포는 별도 확인이 필요하다.
