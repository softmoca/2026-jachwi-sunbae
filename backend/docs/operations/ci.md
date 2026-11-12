# Backend CI

개인 Fork의 [워크플로](../../../.github/workflows/backend-ci.yml)는 Java 21로 기존 백엔드 빌드·일반 테스트를 수행한다. 자동 배포는 하지 않는다.

## 실행 조건과 명령

- 모든 브랜치의 push·PR에서 `backend/**` 또는 `.github/workflows/backend-ci.yml` 변경이 있으면 실행한다. 백엔드 문서 변경도 포함한다.
- `workflow_dispatch` 수동 실행은 경로 필터와 관계없이 지원한다.
- 같은 워크플로와 ref의 새 실행은 진행 중인 이전 실행을 취소한다.
- 검사 이름 `Build`, `ubuntu-latest`, 제한 시간 10분, `contents: read` 권한을 유지한다.
- Temurin 21과 저장소의 Gradle Wrapper를 사용한다. Docker는 기존 Testcontainers 테스트에 필요하다.

`backend` 작업 디렉터리에서 실행하는 명령:

```bash
./gradlew clean build --no-daemon --console=plain
```

`build.gradle`은 변경하지 않았다. `test`는 `acceptance` 태그를 제외하고 단위·SQL·통합·아키텍처 테스트를 수행한다. 실패를 무시하는 옵션이나 `continue-on-error`는 없으며 테스트 실패는 CI 실패다. 인수 테스트를 포함하려면 로컬에서 `./gradlew testAll --no-daemon --console=plain`을 실행한다.

## 이전 CI와의 차이

| 항목                  | 이전 팀 CI                                         | 개인 실험 CI                            |
| --------------------- | -------------------------------------------------- | --------------------------------------- |
| 변경 감지             | 전체 checkout 후 Git diff·조건부 단계              | GitHub Actions `paths`; 수동 실행 지원  |
| 브랜치                | `main`·`develop` push 및 대상 PR                   | 모든 브랜치 push·PR의 백엔드 관련 경로  |
| 무관한 변경           | job은 성공, 빌드 단계 생략                         | 워크플로 자체 생략                      |
| 백엔드 문서만 변경    | 빌드 생략                                          | 빌드 실행                               |
| 캐시                  | `cache-provider: external`, 별도 복원·저장·키 계산 | `setup-gradle@v6` 기본 캐시             |
| 작업 결과 캐시        | `--build-cache`와 별도 디렉터리                    | 명시적 활성화·사용자 지정 디렉터리 제거 |
| 테스트 JVM            | `min(2, CPU 수)`                                   | Gradle 기본 1개                         |
| 테스트 강제 실행 정책 | 초기화 스크립트에서 캐시·up-to-date 생략 금지      | Gradle 기본 정책                        |
| 로그                  | `CI_TASK`, `CI_TEST_CONFIG`, `CI_TEST_SUMMARY`     | Gradle 기본 로그와 테스트 리포트        |
| 검사 범위             | 일반 테스트, 인수 태그 제외                        | 동일                                    |
| 배포                  | Actions 빌드와 별개인 팀 AWS 파이프라인            | Actions 자동 배포 없음, lab 수동 배포   |

`.github/gradle/backend-ci.init.gradle`은 호출이 없어져 삭제했다. 강제 재실행 정책이 사라지지만 현재 CI는 매번 `clean`하고 저장소 설정에서 Gradle 빌드 캐시를 활성화하지 않으므로 일반 테스트를 실행한다. 향후 `org.gradle.caching=true`나 `--build-cache`를 별도로 도입하면 테스트 결과도 캐시될 수 있다. `clean` 없는 로컬 반복 실행은 Gradle 기본 up-to-date 판단을 따른다.

`setup-gradle`의 Gradle User Home 캐시와 Gradle의 작업 결과 캐시 활성화는 별개다. 기본 캐시 쓰기는 저장소 기본 브랜치에서 수행되고 다른 브랜치·PR은 읽기 위주 정책을 따른다. 별도 `actions/cache`, `setup-java cache: gradle`은 중복 추가하지 않는다. [setup-gradle 공식 캐시 정책](https://github.com/gradle/actions/blob/main/docs/setup-gradle.md#common-cache-configuration)을 따른다.

## 제거한 워크플로와 원격 설정

프론트엔드 검사·mutation, 모바일 검사, Storybook Pages 배포, 태그·GitHub Release 발행, Markdown CI의 6개 워크플로를 제거했다. 추가 워크플로는 없었으며 `backend-ci.yml`만 남긴다. 프론트엔드·모바일·QA 소스와 공용 스크립트는 보존한다. Markdown 정렬·검사는 계속 루트에서 수동 실행한다.

```bash
npm run format:docs
npm run format:docs:check
```

GitHub 경로 필터로 생략된 워크플로가 필수 검사라면 해당 PR의 검사가 Pending에 남을 수 있다. 삭제한 `Check frontend`·`Check mobile`·`Check Markdown` 등 필수 검사와 `Build` 필수 여부는 개인 Fork에서 사용자가 확인한다. 이 작업은 GitHub 브랜치 보호나 AWS 파이프라인을 변경하지 않는다. 실제 원격 Actions 실행도 별도 확인이 필요하다.
