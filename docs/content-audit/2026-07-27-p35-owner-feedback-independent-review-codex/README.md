# FlowMe P35 owner feedback independent review

작성일: 2026-07-27
검토자 역할: `codex_independent`
실제 관찰 사용자 수: `0`

## 전체 판정

- P35 방향: `revise`
- 최종 권고: `bounded_composition_revision`
- 앱 코드 변경: 없음
- 데이터 migration: 권고 범위에서는 불필요

P35의 3탭 entry router, public result-first, 한 번에 한 종류만 여는 조정,
My Flow library와 focused workspace 분리, 날짜 중심 Calendar는 유지한다.
Production보다 첫 화면의 역할과 실제 결과가 명확해졌다.

다만 아래 여섯 연결은 publish 전에 보완해야 한다.

1. public preview가 약속한 primary artifact와 실제 외부 가져가기 형식이 일치하지 않는다.
2. 저장 receipt 뒤에 다시 4개 행동을 고르는 post-save hub가 나타나 저장 확인을 중복시킨다.
3. My Flow 모바일의 `다음 행동 / 전체 계획 / 기록`은 콘텐츠 형태와 무관한 고정 분류다.
4. 저장 전 항목은 포함 여부만 바꿀 수 있고 제목·상세·개별 날짜는 저장 후에만 수정된다.
5. 메모 초안은 14개 입력을 펼치는 긴 폼으로 남아 P35 공통 문법을 따르지 않는다.
6. 반복 Flow는 시작일 미확정 상태의 날짜 있는 미리보기가 저장 후 날짜 없는 1개
   항목으로 바뀌어 preview·receipt·Calendar·export 계약이 끊긴다.

전면 재설계나 저장 계약 재작성은 필요하지 않다. 권장안은 구조 C인
`Artifact preflight + contextual personalization`이며, 현재 P35 composition을
제한적으로 고치는 방식이다.

## Evidence 경계

- Preview URL: Vercel 인증 화면으로 전환되어 직접 상호작용 불가
  - `evidenceKind: inaccessible`
- P35 후보 상호작용:
  - 현재 미커밋 worktree를 production build 후 로컬 런타임에서 조작
  - `evidenceKind: current_automated_test`
- current source:
  - branch `codex/p35-mece-ux-reset`
  - baseline SHA `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
  - P35 구현은 이 SHA 위의 미커밋 변경
- Production 비교:
  - `https://flowme2605.vercel.app`
  - `evidenceKind: production_comparison`
- 자동화와 screenshot은 실제 사용자 검증으로 표현하지 않았다.

## 현재 검증

- `npm.cmd run build`: 통과
- P35 targeted Playwright: `30 passed`
- 브라우저 확인 viewport:
  - 390x844
  - 1024x768
- 직접 연결한 대표 shape:
  - Calendar timeline
  - undated checklist
  - routine occurrence
  - sheet progress
  - memo/guide
- 표본 route에서 horizontal overflow: 없음
- 표본 route에서 accessible name 없는 visible control: 없음
- Preview deployment interaction: 미검증

## 파일

- [review.html](./review.html): findings, 비교 wireframe, 여정, 구현 순서
- [audit.md](./audit.md): severity 순 상세 finding
- [decision-matrix.json](./decision-matrix.json): P35 및 F01-F07 판정
- [persona-journey-scorecard.json](./persona-journey-scorecard.json): J01-J05 세션 결과
- [journey-direct-evidence.json](./journey-direct-evidence.json): 5개 shape의 Session A/B/C 직접 조작 근거
- [surface-ownership.json](./surface-ownership.json): 최종 surface 소유권
- [keep-move-remove-command-matrix.json](./keep-move-remove-command-matrix.json): command별 유지·이동·제거
- [next-program.md](./next-program.md): 단계별 구현 프로그램
- [completion-audit.md](./completion-audit.md): 요청 항목별 완료 증거와 final gate
- [screenshots](./screenshots): local P35 candidate와 Production 비교 evidence

## 바로 다음 slice

`P35-R1: Primary artifact preflight parity`

public preview에 표시한 primary artifact를 같은 이름, 같은 수량, 같은 effective
개인 수정본으로 외부에 가져갈 수 있게 한다. 고정 5탭을 만들지 않고 primary 1개와
eligible secondary 최대 2개만 사용한다.
