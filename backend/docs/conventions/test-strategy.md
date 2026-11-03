# 테스트 전략

테스트 종류별 작성 기준을 정한다.

## Domain 단위 테스트

Domain 단위 테스트는 Spring과 외부 시스템 없이 순수 Java 객체로 실행한다.

- 비즈니스 규칙의 정상 및 예외를 검증한다

## Service 단위 테스트

기본은 실제 DB를 사용하는 통합 테스트다.
Service 단위 테스트는 Service의 분기와 협력 방식 자체가 중요한 경우에만 예외적으로 작성한다.

### 사용하는 경우

- Repository 응답에 따른 Service 분기를 검증할 때
- 외부 API 응답에 따른 후속 행동을 검증할 때
- 특정 조건에서 저장이나 외부 호출을 생략해야 할 때
- 실패 시 다른 협력이 호출되지 않아야 할 때
- 실제 DB 없이 Service 책임만 빠르게 검증할 가치가 있을 때

### 사용하지 않는 경우

- 실제 SQL의 정확성을 확인하려는 경우
- 트랜잭션과 롤백을 검증하려는 경우
- DB UNIQUE 제약을 검증하려는 경우
- 동시성을 검증하려는 경우
- Service가 단순히 Repository 메서드를 순서대로 호출하는 경우
- Mock 설정이 테스트 본문 대부분을 차지하는 경우

## Repository 슬라이스 테스트

순수 `JdbcTemplate`을 사용하므로 Repository 테스트에는 `@JdbcTest`를 사용한다.

### 직접 작성한 핵심 SQL을 검증한다

`JdbcTemplate`에서는 SQL과 RowMapper를 직접 작성하므로 Repository 테스트의 가치가 크다.

**다음 내용을 선택으로 고려해서 검증한다.**

- SQL 문법
- 컬럼명
- Parameter Binding
- RowMapper
- Insert 후 생성 ID
- 결과가 없을 때 `Optional.empty()`
- 목록 결과가 없을 때 빈 List
- 정렬
- Filtering
- Pagination
- DB UNIQUE와 FK 제약
- 날짜와 시간 자료형
- 여러 조건 중 하나만 다른 경계값
- 반복 Query 발생 여부

Service 통합 테스트가 Repository를 사용하더라도 복잡한 SQL의 경계 조건까지 검증하지 않는다면 Repository 테스트를 별도로 작성한다.

## 통합 테스트

여러 계층과 실제 DB가 협력해 Use Case가 끝까지 동작하는지 검증할 때 `@SpringBootTest`를 사용한다. 공통 설정은 `IntegrationTest`를 상속해 받는다.

기본 `@SpringBootTest`는 Application Context를 로딩하지만 실제 서버를 시작하지 않는다. 실제 서버가 필요하면 `RANDOM_PORT`를 사용한다.

### 검증 대상

- Spring Bean 연결
- Service와 Repository 협력
- Command·Result 변환
- 실제 SQL과 DB 상태 변화
- Service 트랜잭션
- 여러 Repository가 참여하는 Use Case
- 외부 Client와의 통합

### 작성 기준

- 모든 Domain 경계값을 통합 테스트에서 반복하지 않는다.
- 핵심 Use Case의 정상 흐름과 대표 실패 흐름을 검증한다.
- 외부 API는 실제 운영 서버 대신 Stub Server를 사용한다.

## 인수 테스트

인수 테스트는 사용자 관점의 핵심 시나리오를 검증한다.

### 작성 대상 - 정책 문서기반

### 작성 기준

- 기술적인 클래스명보다 사용자 행동의 언어를 사용한다.
- 핵심 정상 시나리오와 중요한 실패 시나리오만 작성한다.
- HTTP 상태, Response Body, 오류 코드를 검증한다.
- 모든 Validation과 Domain 경계값을 인수 테스트에서 반복하지 않는다.
- 구현 내부의 Service나 Repository 호출 여부를 검증하지 않는다.
