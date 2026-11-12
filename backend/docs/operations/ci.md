# Backend CI

개인 Fork의 [워크플로](../../../.github/workflows/backend-ci.yml)는 Java 21로 기존 백엔드 빌드·일반 테스트를 수행한다. 자동 배포는 하지 않는다.

## 실행 조건과 명령

- `backend/**`, `.github/gradle/**` 또는 `.github/workflows/backend-ci.yml` 변경이 있을 때 실행하며, 백엔드 문서 변경도 포함한다.
- 작업 브랜치는 PR 생성·재개 또는 새 커밋 반영 시 검사한다. PR 대상 브랜치에는 제한을 두지 않는다.
- push 검사는 `main`·`develop`에서만 실행한다. PR 병합 후에도 검사하며, 작업 브랜치 push로는 실행하지 않아 PR 검사와의 중복을 피한다.
- `workflow_dispatch` 수동 실행은 경로 필터와 관계없이 지원한다.
- 같은 워크플로와 ref의 새 실행은 진행 중인 이전 실행을 취소한다.
- 검사 이름 `Build`, `ubuntu-latest`, 제한 시간 10분, `contents: read` 권한을 유지한다.
- Temurin 21과 저장소의 Gradle Wrapper를 사용한다. Docker는 기존 Testcontainers 테스트에 필요하다.

`backend` 작업 디렉터리에서 실행하는 명령:

```bash
./gradlew clean build --no-daemon --build-cache --console=plain --init-script ../.github/gradle/backend-ci.init.gradle
```

`build.gradle`은 변경하지 않았다. `test`는 `acceptance` 태그를 제외하고 단위·SQL·통합·아키텍처 테스트를 수행한다. 실패를 무시하는 옵션이나 `continue-on-error`는 없으며 테스트 실패는 CI 실패다. 인수 테스트를 포함하려면 로컬에서 `./gradlew testAll --no-daemon --console=plain`을 실행한다.

## 병렬 실행과 캐시

[CI 초기화 스크립트](../../../.github/gradle/backend-ci.init.gradle)는 테스트 JVM을 `min(2, CPU 수)`개 사용한다. 서로 다른 테스트 클래스를 별도 프로세스에서 실행하며 JUnit의 메서드 병렬 실행 설정은 바꾸지 않는다. 테스트 코드·Testcontainers 수명주기·`build.gradle`은 유지한다. 초기화 스크립트를 지정하지 않는 로컬 빌드에는 이 설정을 적용하지 않는다.

캐시는 `setup-gradle@v6` 하나로 관리한다. Gradle User Home에 있는 의존성·Wrapper 배포본·로컬 빌드 캐시를 저장·복원하고, `--build-cache`로 컴파일 등 캐시 가능한 작업의 결과 재사용을 활성화한다. 별도 `actions/cache`, `setup-java cache: gradle`, 사용자 지정 캐시 디렉터리는 추가하지 않는다.

| 실행 종류                    | 캐시 읽기·저장 정책                                       |
| ---------------------------- | --------------------------------------------------------- |
| 같은 저장소 작업 브랜치의 PR | 읽기·저장 허용. 해당 PR의 후속 실행에서 재사용            |
| `main`·`develop` push        | 읽기·저장 허용. 해당 브랜치를 대상으로 하는 PR에서도 활용 |
| `workflow_dispatch`          | 선택한 ref에서 읽기·저장 허용                             |
| 외부 Fork에서 들어온 PR      | 읽기만 허용                                               |

`cache-read-only` 조건을 명시해 기본 브랜치 외 실행에서도 캐시를 저장한다. 캐시가 없는 최초 실행은 다운로드·컴파일 후 캐시를 채운다. PR에서 저장한 캐시는 해당 PR의 merge ref에 속하므로 다른 PR이나 기준 브랜치에서는 사용할 수 없다. 여러 PR이 공유할 캐시는 `main`·`develop` push 실행에서 채워진다. [setup-gradle 캐시 정책](https://github.com/gradle/actions/blob/main/docs/setup-gradle.md#common-cache-configuration)과 [GitHub 캐시 접근 범위](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching#restrictions-for-accessing-a-cache)를 따른다.

테스트 작업에는 결과 캐시와 up-to-date 생략을 모두 비활성화한다. 따라서 컴파일이 `FROM-CACHE`여도 일반 테스트는 매번 실제로 실행한다. 로그의 `CI_TEST_CONFIG`에서 병렬 수를, `CI_TEST_SUMMARY`에서 실행·실패·건너뛰기 수를 확인한다. `Set up Gradle` 및 후처리 단계에서는 캐시 복원·저장 여부를 확인한다. 실행 시간 단축 정도는 원격 Actions에서 캐시가 채워진 후 비교한다.

## 이전 CI와의 차이

| 항목                  | 이전 팀 CI                                         | 개인 실험 CI                                           |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| 변경 감지             | 전체 checkout 후 Git diff·조건부 단계              | GitHub Actions `paths`; 수동 실행 지원                 |
| 브랜치                | `main`·`develop` push 및 대상 PR                   | `main`·`develop` push 및 모든 대상 PR                  |
| 무관한 변경           | job은 성공, 빌드 단계 생략                         | 워크플로 자체 생략                                     |
| 백엔드 문서만 변경    | 빌드 생략                                          | 빌드 실행                                              |
| 캐시                  | `cache-provider: external`, 별도 복원·저장·키 계산 | `setup-gradle@v6`, 같은 저장소 PR·브랜치에서 읽기·저장 |
| 작업 결과 캐시        | `--build-cache`와 별도 디렉터리                    | `--build-cache`와 Gradle 기본 디렉터리                 |
| 테스트 JVM            | `min(2, CPU 수)`                                   | 동일                                                   |
| 테스트 강제 실행 정책 | 초기화 스크립트에서 캐시·up-to-date 생략 금지      | 동일                                                   |
| 로그                  | `CI_TASK`, `CI_TEST_CONFIG`, `CI_TEST_SUMMARY`     | 테스트 설정·결과 요약과 Gradle 기본 로그·리포트        |
| 검사 범위             | 일반 테스트, 인수 태그 제외                        | 동일                                                   |
| 배포                  | Actions 빌드와 별개인 팀 AWS 파이프라인            | Actions 자동 배포 없음, lab 수동 배포                  |

## 제거한 워크플로와 원격 설정

프론트엔드 검사·mutation, 모바일 검사, Storybook Pages 배포, 태그·GitHub Release 발행, Markdown CI의 6개 워크플로를 제거했다. 추가 워크플로는 없었으며 `backend-ci.yml`만 남긴다. 프론트엔드·모바일·QA 소스와 공용 스크립트는 보존한다. Markdown 정렬·검사는 계속 루트에서 수동 실행한다.

```bash
npm run format:docs
npm run format:docs:check
```

GitHub 경로 필터로 생략된 워크플로가 필수 검사라면 해당 PR의 검사가 Pending에 남을 수 있다. 삭제한 `Check frontend`·`Check mobile`·`Check Markdown` 등 필수 검사와 `Build` 필수 여부는 개인 Fork에서 사용자가 확인한다. 이 작업은 GitHub 브랜치 보호나 AWS 파이프라인을 변경하지 않는다. 실제 원격 Actions 실행도 별도 확인이 필요하다.
