# 백엔드 패키지 구조

## 기본 구조

기술 레이어보다 업무 도메인을 먼저 나누고 각 도메인 안에서 레이어를 구분한다.

```text
com.jachwisunbae
├── member
│   ├── controller
│   │   └── dto
│   │       ├── request
│   │       └── response
│   ├── service
│   │   └── dto
│   │       ├── command
│   │       └── result
│   ├── repository
│   ├── domain
│   └── client
├── property
│   ├── controller
│   │   └── dto
│   │       ├── request
│   │       └── response
│   ├── service
│   │   └── dto
│   │       ├── command
│   │       └── result
│   ├── repository
│   ├── domain
│   └── storage
├── checklist
│   ├── controller
│   │   └── dto
│   │       ├── request
│   │       └── response
│   ├── service
│   │   └── dto
│   │       ├── command
│   │       └── result
│   ├── repository
│   └── domain
├── visit
│   ├── controller
│   │   └── dto
│   │       ├── request
│   │       └── response
│   ├── service
│   │   └── dto
│   │       ├── command
│   │       └── result
│   ├── repository
│   └── domain
└── common
    ├── config
    ├── exception/{client,server,errorcode}
    ├── page
    ├── response
    ├── security
    ├── resolver
    └── observability
```

업무 패키지는 회원을 담당하는 `member`, 매물을 담당하는 `property`, 체크리스트를 담당하는 `checklist`, 방문을 담당하는 `visit`로 나눈다.

## 의존 방향

```text
controller → service → repository
                 ↓
               domain
```

- Controller는 Repository를 직접 호출하지 않는다.
- Repository는 Service와 Controller를 참조하지 않는다.
- Domain 객체는 Controller DTO를 참조하지 않는다.
- Service는 Controller Request·Response DTO를 참조하지 않는다.
- 도메인 간 협력이 필요하면 해당 도메인의 Service를 통해 수행한다.
- 도메인 간 순환 의존이 발생하면 책임과 경계를 재검토한다.
- `property`는 활성 연결 때 `ChecklistReferenceQueryService`만 호출하고 `visit`는 `PropertyAccessService`와 `ChecklistSnapshotSourceService`만 호출한다. 반대 방향 호출은 만들지 않는다.

## 패키지별 책임

### Controller

- HTTP 요청 역직렬화
- Bean Validation
- 인증된 사용자 정보 추출
- Request를 Command로 변환
- Service 호출
- Result를 Response로 변환
- HTTP 상태 코드와 Header 결정

Controller에는 비즈니스 판단을 작성하지 않는다.

### Service

- 사용자 Use Case 실행
- 트랜잭션 관리
- Domain 객체와 Repository의 실행 순서 조율
- 권한, 중복, 리소스 존재 여부와 상태 전이 검증
- Command 입력과 Result 출력

하나의 Domain 객체가 스스로 판단할 수 있는 규칙은 Service가 아니라 Domain 객체에 둔다.

### Repository

- `JdbcTemplate`을 이용한 SQL 실행
- DB Row와 Domain 객체 간 변환
- 저장, 수정, 삭제와 조회
- 조회 결과가 없을 때의 처리
- DB 예외를 애플리케이션에서 이해할 수 있는 형태로 변환

Repository에는 비즈니스 규칙을 작성하지 않는다.

### Domain

- Entity와 Value Object
- 불변 조건
- 상태 변경 규칙
- 비즈니스 판단
- Domain Policy

Domain 객체는 getter와 setter만 가진 데이터 묶음으로 만들지 않는다.

### Common

여러 도메인이 함께 사용하는 기술 공통 코드만 둔다.

- Spring 설정
- 전역 예외 처리
- 공통 성공·오류 응답과 민감한 검증값 제거 정책
- Stateless JWT 발급·검증과 인증 실패 응답
- Argument Resolver
- 요청 ID와 요청 메서드·경로·상태·소요 시간만 남기는 안전한 요청 로깅

특정 Domain의 규칙은 `common`에 두지 않는다. `common`을 이름을 정하기 어려운 코드의 임시 보관소로 사용하지 않는다.
