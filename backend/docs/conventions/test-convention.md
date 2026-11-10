# 테스트 컨벤션

## 목적

테스트는 코드 커버리지를 높이는 것이 아니라 변경 이후에도 시스템을 신뢰할 수 있도록 작성한다.

테스트를 선택할 때 `단위 테스트가 더 좋은가, 통합 테스트가 더 좋은가`를 먼저 묻지 않는다.

> 지금 어떤 책임을 검증하고, 어떤 신뢰를 얻고 싶은가?

## 테스트 종류

테스트는 다음 책임을 나누어 검증한다.

| 종류                       | 검증하는 책임                     |
| -------------------------- | --------------------------------- |
| Domain 단위 테스트         | 비즈니스 규칙                     |
| Service 단위 테스트        | Use Case의 분기와 협력            |
| Repository 슬라이스 테스트 | 실제 SQL과 Row 매핑               |
| 통합 테스트                | Bean 연결, 트랜잭션, DB 상태 변화 |
| 인수 테스트                | 사용자 관점의 핵심 시나리오       |

## 공통 작성 규칙

- JUnit 5와 AssertJ를 사용한다.
- 테스트 코드는 Given-When-Then 순서로 작성한다.
- private 메서드를 직접 테스트하지 않고 public 행동을 통해 검증한다.
- 별도의 Controller 테스트는 작성하지 않는다. HTTP 레벨 검증은 인수 테스트가 담당한다.
- 테스트가 실패했을 때 어떤 책임이 깨졌는지 알 수 있어야 한다.
- 같은 계약을 여러 계층에서 기계적으로 중복 테스트하지 않는다.
- 하나의 테스트는 하나의 핵심 행위를 설명한다.
- 시간, 랜덤 값과 외부 시스템은 테스트에서 통제한다.
- 테스트 데이터는 다른 테스트의 실행 순서와 로컬 DB 상태에 의존하지 않는다.
- 실패하는 테스트를 비활성화해 병합하지 않는다.

## 테스트 이름

- `@DisplayName`은 기대 행동이 드러나는 한국어 문장으로 작성한다.
- 테스트 메서드명은 간결한 영어 `lowerCamelCase`를 사용한다.

## Assertion

- 실제 결과를 우선 검증한다.
- 예외는 타입뿐 아니라 ErrorCode함께 검증한다.
- 내부 구현 방식에 대한 `verify()`는 필요한 경우에만 사용한다.

## 실행 범위

| 명령                | 범위                      |
| ------------------- | ------------------------- |
| `./gradlew test`    | 인수 테스트를 제외한 전체 |
| `./gradlew testAll` | 인수 테스트를 포함한 전체 |

- CI는 `./gradlew clean build`로 실행하므로 인수 테스트가 제외된다.

## 아키텍처 검사

[src/test/java/com/jachwisunbae/architecture](../../src/test/java/com/jachwisunbae/architecture/)에서 JUnit 5와 ArchUnit으로 백엔드 프로덕션 클래스를 검사한다. 아키텍처 테스트 자체는 Spring 컨텍스트와 DB를 실행하지 않으며, 테스트 클래스패스에서 프로덕션 클래스를 읽고 테스트 코드는 검사에서 제외한다.

기존 `test` 작업에 포함되므로 `./gradlew test`, `./gradlew testAll`, `./gradlew check`, `./gradlew build`와 GitHub CI의 `clean build`에서 함께 실행한다. 별도 모듈이나 작업 간 연결은 필요하지 않다. 아키텍처 검사만 실행하려면 `backend`에서 다음 명령을 사용한다.

```bash
./gradlew test --tests 'com.jachwisunbae.architecture.*'
```

### 검사 범위와 규칙

`architecture` 패키지에는 `*Test` 클래스를 두고, `architecture.support`에는 규칙 정의(`ArchitectureRules`), 검사 실행(`ArchitectureTestSupport`), 한글 메시지 변환(`KoreanArchRule`, `KoreanViolationMessages`)과 동결 저장소(`GroupedViolationStore`)를 둔다. 지원 기능 자체를 검증하는 테스트도 `architecture` 패키지에 둔다.

규칙은 [ArchitectureRules](../../src/test/java/com/jachwisunbae/architecture/support/ArchitectureRules.java)에 정의하고 책임별 테스트 클래스에서 실행한다. `service`, `repository`, `domain`, `entity`, `controller`와 그 하위 패키지에 있는 DTO·변환기도 각 규칙의 대상에 포함된다.

| 규칙                                             | 검사 범위                                                                              | 적용 방식      |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- | -------------- |
| Service의 Controller 및 Controller DTO 의존 금지 | `..service..` → `..controller..` 직접 의존                                             | 기존 위반 동결 |
| Service의 HTTP 응답 타입 의존 금지               | `ResponseEntity`, `HttpStatus`                                                         | 즉시 강제      |
| Repository의 상위 계층 의존 금지                 | `..repository..` → `..service..`, `..controller..` 직접 의존                           | 기존 위반 동결 |
| Controller의 Repository 직접 호출 금지           | `repository` 패키지에서 이름이 `Repository`로 끝나는 타입의 메서드 호출                | 즉시 강제      |
| Domain·Entity의 Controller DTO 의존 금지         | `..domain..`, `..entity..` → `..controller.dto..` 직접 의존                            | 즉시 강제      |
| Domain·Entity의 HTTP 응답 타입 의존 금지         | `ResponseEntity`, `HttpStatus`                                                         | 즉시 강제      |
| Domain·Entity의 public setter 금지               | public `setXxx` 메서드 선언                                                            | 즉시 강제      |
| ErrorCode의 HTTP 상태 타입 의존 금지             | `HttpStatus`, `HttpStatusCode`                                                         | 즉시 강제      |
| 공통 Client·Server 예외의 상속 구조              | `common.exception.client`, `common.exception.server`의 클래스가 `JachwiException` 상속 | 즉시 강제      |
| 업무 패키지 간 순환 의존 금지                    | `com.jachwisunbae` 바로 아래 패키지를 단위로 검사                                      | 기존 순환 동결 |

직접 의존은 필드, 매개변수, 반환 타입과 메서드 호출 등에 나타나는 의존을 포함한다. 한글 규칙 이름과 안내 문구 아래에 실제 클래스·메서드·소스 위치를 출력한다. 위반 상세와 동결 파일 본문은 [KoreanArchRule](../../src/test/java/com/jachwisunbae/architecture/support/KoreanArchRule.java)에서 한글 설명으로 변환한다. 기본 규칙의 검사 결과와 위반 객체를 유지하며, 클래스 전체 이름·메서드 시그니처·제네릭 타입·소스 위치는 그대로 보존한다. 메서드명을 기준으로 확인하는 setter 규칙은 상태 변경의 적절성까지 보장하지 않는다. 패키지 순환 의존과 Spring Bean 순환 참조는 서로 다른 개념이다.

모든 HTTP 관련 타입, Provider 의존, Lombok, import 스타일이나 비즈니스 동작을 검사하는 것은 아니다. 소스 형식은 소스 분석 도구로, 기능 동작은 기능 테스트로, 설계의 적절성은 리뷰로 검토한다.

### 동결 파일 구조

```text
src/test/resources/
├── archunit.properties
└── archunit_store/
    ├── stored.rules
    └── <UUID>
```

- [archunit.properties](../../src/test/resources/archunit.properties): 동결 저장소 경로와 생성·갱신 정책을 설정한다.
- [archunit_store](../../src/test/resources/archunit_store/): `stored.rules`는 규칙 설명과 UUID 파일을 연결하고, UUID 파일은 허용한 개별 위반의 상세 문장을 담는다. 클래스나 메서드 전체를 제외하는 목록은 아니다.
- 의존 위반 UUID 파일은 규칙을 상단에 한 번 기록하고, 같은 메서드·필드·생성자의 위반을 `선언` 아래에 묶는다. 같은 문제와 대상이 반복되면 위치 목록을 합친다. 각 항목은 한글 `문제`, `위치`, 의존 유형과 대상을 담은 `상세`로 표시한다. 순환 의존은 경로와 의존 목록으로 기록한다. 매개변수 목록은 한 줄로 유지한다. 전체 패키지명과 시그니처는 서로 다른 위반을 구별하기 위해 보존한다.
- [GroupedViolationStore](../../src/test/java/com/jachwisunbae/architecture/support/GroupedViolationStore.java)는 저장할 때만 공통 내용을 묶고, 읽을 때 원래의 개별 위반으로 복원한다. 같은 선언 아래의 신규 위반도 실패하며, 해결한 위반의 위치만 제거된다. UUID 파일의 묶음 수는 개별 위반 수와 다르다. 동결 검사는 반드시 이 저장소를 통해 실행한다.
- 줄 끝의 `\`는 ArchUnit이 여러 줄을 하나의 저장 항목으로 읽기 위한 형식이므로 임의로 제거하지 않는다. `파일.java:0`은 선언 위치의 줄 번호를 바이트코드에서 얻지 못한 경우이며 실제 0번째 줄을 뜻하지 않는다. `stored.rules`의 한글은 Java Properties 형식에 따라 `\uXXXX`로 저장될 수 있으며, 읽을 때 원래 한글로 복원된다.

### 동결 파일 관리

- 테스트 규칙, 설정과 동결 파일을 같은 변경으로 공유한다. 신규 위반은 실패하며, 기존 위반이 동결되어 있다는 이유로 담당 클래스의 새 위반까지 허용하지 않는다.
- 새로운 위반을 통과시키려고 동결 파일을 늘리거나 `freeze.refreeze`를 켜지 않는다. 기준선 변경이 필요한 경우 별도로 합의하고 변경 근거를 남긴다.
- OAuth 계정 연결 통합(#523)은 기존 직접 호출 구조를 유지하기로 합의해 `auth ↔ member` 순환의 상세 목록을 현재 구현에 맞춰 동결한다. 인증은 회원 조회·기록 통합을 수행하고, 회원 탈퇴는 인증 저장소를 직접 호출해 토큰과 외부 계정 연결을 정리한다. 이번 기준선 갱신은 이 순환 한 건에 한정하며, 이후 추가되는 의존은 계속 검사한다.
- 기존 위반을 해결한 뒤 테스트를 실행하면 해당 동결 항목이 자동 제거된다. 감소한 파일을 같은 변경에 포함한다.
- `backend` 작업 디렉터리를 기준으로 `src/test/resources/archunit_store` 원본을 읽고 갱신한다. 테스트 실행 후 diff를 확인한다. `build/resources/test` 복사본을 저장소로 사용하지 않는다.
- 동결 파일은 테스트 리소스로 추적하므로 파일 변경도 테스트 재실행 판단에 반영된다.
- 재동결은 비활성화한다. 테스트는 `stored.rules`의 규칙 등록 여부도 확인하며, 기준선이 누락되면 실패한다.
- 줄 번호 이동은 기본 매칭에서 무시하지만 메서드명과 시그니처 변경은 기존 위반과의 매칭에 영향을 줄 수 있다. 순환 경로도 의존 관계가 바뀌면 다시 검출될 수 있으므로 상세 내용을 검토한다.
- 동결 목록은 정확한 상세 기록으로 관리하고, 개선할 문제와 완료 조건·담당자는 이슈로 관리한다. 동결 자체는 부채를 해결하지 않는다.
