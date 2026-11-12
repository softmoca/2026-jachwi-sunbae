# 브랜치와 커밋

> 개인 실험 Fork에서는 `develop`에서 작업 브랜치를 만들고 `main`·`develop`에 직접 push하지 않는 규칙을 유지한다. 아래 팀 자동 배포·필수 검사 정책은 참고용이다. Fork는 [Backend CI](../../backend/docs/operations/ci.md)의 경로 필터와 [lab 수동 배포](../../backend/lab/README.md)를 사용하며, 삭제된 워크플로의 필수 검사는 원격 설정에서 별도 확인한다.

## 브랜치 전략

`main`과 `develop` 두 브랜치를 유지하고, 작업은 짧은 작업 브랜치에서 한다.

| 브랜치      | 역할                                                                       | 배포 대상 |
| ----------- | -------------------------------------------------------------------------- | --------- |
| `main`      | 운영에 배포되는 가장 안정적인 코드를 관리한다                              | prod      |
| `develop`   | 기본 브랜치. 작업 브랜치가 모이는 통합 지점이다                            | dev       |
| 작업 브랜치 | 기능 추가·수정 단위로 `develop`에서 분기해 PR로 되돌린다. 병합 후 삭제한다 | —         |

- 작업은 짧은 작업 브랜치에서 진행한다.
- `main`과 `develop`에 직접 작업하거나 푸시하지 않는다.
- **두 브랜치 모두 병합이 배포 트리거다.** `develop` 병합은 dev에, `main` 병합은 prod에 배포된다.
- `main`으로는 `develop`에서 **PR로 승격**한다. 작업 브랜치를 `main`에 직접 병합하지 않는다.

```text
작업 브랜치 ─PR→ develop ─PR→ main
                  ↓            ↓
                 dev          prod
```

운영으로 나가는 것을 diff로 확인하기 위해 승격도 PR로 한다. dev에서 실제 인프라로 확인한 뒤 올린다.

## 브랜치 보호 규칙

`main`과 `develop`에 같은 보호 규칙을 적용한다.

- PR을 거쳐야 하며 승인 1명 이상과 필수 리뷰 해결을 요구한다.
- 브랜치를 최신 상태로 맞춘 뒤 필수 상태 검사를 다시 통과해야 한다.
- `Build`, `Check frontend`를 필수 상태 검사로 지정한다.
- `Check Markdown`은 각 브랜치에 Markdown CI가 반영되어 정상 실행된 것을 확인한 뒤 필수 상태 검사에 추가한다. 등록 순서는 [Markdown CI 안내](markdown-formatting.md#필수-검사-등록)를 따른다.
- 관리자와 별도 역할도 규칙을 우회하지 않는다.
- 강제 푸시와 브랜치 삭제를 허용하지 않는다.

필수 검사로 사용하는 워크플로의 트리거에는 경로 필터를 두지 않는다. 워크플로 자체가 생략되면 검사가 `Pending`에 남아 관련 없는 변경도 병합할 수 없기 때문이다. 백엔드와 프론트엔드 워크플로는 내부 변경 감지 단계에서 수정 디렉터리를 확인하고 관련 검사만 수행한다. Frontend CI는 버전 검사, lint와 format, typecheck, 테스트(vitest 2개 샤드), 빌드 job을 병렬로 돌린다. 각 job은 처음에 공용 액션 `detect-frontend-changes`로 변경을 판정하고, 프론트엔드 변경이 없으면 검사 단계만 건너뛰고 성공으로 끝난다. 필수 검사인 `Check frontend` job은 `needs`와 `if: always()`로 모든 job의 결과를 모아 성공이나 실패를 정한다. 그래서 job을 추가하거나 이름을 바꿀 때도 `Check frontend` job은 남기고 새 job을 `needs`에 넣어야 한다. Markdown CI는 변경 경로와 관계없이 매번 관리 대상 문서 전체를 검사한다.

## 브랜치 이름

```text
<type>/<issue-number>-<description>
```

예시:

```text
feat/12-create-reservation
fix/24-prevent-duplicate-booking
refactor/31-separate-validation
```

| type       | 용도        |
| ---------- | ----------- |
| `feat`     | 기능 추가   |
| `fix`      | 버그 수정   |
| `refactor` | 구조 개선   |
| `test`     | 테스트 추가 |
| `docs`     | 문서 수정   |
| `chore`    | 설정 변경   |

## 커밋 메시지

커밋 메시지는 Conventional Commits를 사용하며, 타입은 브랜치 이름과 같은 값을 쓴다.

```text
<type>: 변경 내용을 작성한다
```

예시:

```text
feat: 예약 생성 기능을 구현한다
fix: 중복 예약 문제를 수정한다
refactor: 검증 책임을 도메인으로 이동한다
test: 예약 예외 테스트를 추가한다
```

- 커밋 본문이 필요하면 한국어로 간결하게 작성한다.
- `수정`, `피드백 반영`처럼 목적이 드러나지 않는 메시지는 사용하지 않는다.
