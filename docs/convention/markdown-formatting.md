# Markdown 작성 규칙

개발자와 AI가 작성하는 Markdown은 저장소 루트의 Prettier 설정으로 정렬한다.  
IDE의 저장 시 자동 포맷팅은 편의 기능이며, 최종 기준은 루트에서 실행한 `npm run format:docs:check` 결과다.

## 설치와 실행

Node.js는 [frontend/.nvmrc](../../frontend/.nvmrc)에 지정한 버전을 사용한다.
아래 명령은 모두 **저장소 루트**에서 실행한다.

최초 사용하거나 루트 의존성이 바뀌면 설치한다.

```bash
npm ci
```

문서를 작성 및 수정한 뒤 정렬하고, 커밋 전에 변경 내용을 확인한다.

```bash
npm run format:docs
git diff
npm run format:docs:check
```

- `format:docs`는 관리 대상 문서 전체를 정렬하고 파일을 수정한다.
- `format:docs:check`는 파일을 수정하지 않으며, 포맷 위반이 있으면 실패한다.
- 새 파일은 `git diff`에 표시되지 않을 수 있으므로 `git status --short`와 파일 내용도 확인한다.
- 작업과 무관한 변경이나 문서 의미가 달라진 부분이 없는지 확인한다.
- PR 생성 전에는 `format:docs:check`를 실행한다. AI도 같은 명령을 사용하며 포맷팅 규칙을 임의로 바꾸거나 검사를 생략하지 않는다.

## 개인 Fork의 Markdown 검사

개인 백엔드 실험에서는 `markdown-format.yml` 워크플로를 제거했다. 자동 Markdown 검사는 없지만 위 로컬 정렬·검사 명령과 PR 전 검사 규칙은 그대로 유지한다. 새 `backend/lab/**/*.md`도 루트 스크립트의 검사 대상에 포함한다. Prettier 설정은 변경하지 않는다.

기존 브랜치 보호에 `Check Markdown`이 필수 검사로 등록되어 있다면 개인 Fork 설정에서 사용자가 정리한다. 이번 작업에서는 원격 설정을 변경하지 않는다.

### 포맷 검사 실패 시

검사 로그의 파일 목록을 확인하고 루트에서 다음 순서로 실행한다.

```bash
npm run format:docs
git diff
npm run format:docs:check
```

검사가 통과하면 정렬된 파일을 커밋하고 다시 push한다. `prettier`를 찾을 수 없으면 루트에서 `npm ci`를 먼저 실행한다.  
포맷팅 후에도 검사에 실패하면 로그에서 Markdown 구문 오류나 설치 실패 여부를 확인한다.
