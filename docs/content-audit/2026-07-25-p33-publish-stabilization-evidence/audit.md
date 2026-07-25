# P33 Publish Stabilization Audit

## 1. 범위

이번 감사 범위는 `codex/p33-integrated-program-plan` branch의 P33 변경뿐이다.
원래 `D:\flowme2605\flow-mvp` dirty worktree는 읽거나 수정하지 않았다. P34 UX
재설계, dependency upgrade, main merge, production deploy는 포함하지 않는다.

## 2. 개인 메모와 제외 상태

### 원인

이전 경로는 `FlowItemState.note`에 사용자 메모와 내부 sentinel
`excluded_on_start`를 함께 저장했다. 제외 시 메모를 sentinel로 덮고, 복구 시
`note`를 삭제할 수 있었다.

### 수정

- 명시적인 `personalExcluded` 상태를 사용한다.
- public 조정, My Flow 단건 제외, batch 제외, 설정 재조정, 복구와 projection
  판정을 공통 helper로 통일한다.
- legacy `{ skipped: true, note: "excluded_on_start" }`는 제외 상태로 읽되,
  sentinel을 사용자 메모나 export text로 취급하지 않는다.
- execution skip은 personal exclusion과 계속 다른 상태다.

### 결과

- 메모 작성 -> 제외 -> reload -> 복구 후 메모 보존
- batch 제외/복구 후 메모 보존
- 제외 중 Calendar/export 미포함
- 복구 후 Calendar/export 재포함
- source Item mutation `0`

## 3. Canonical ID factory

### 원인

registry의 수기 ID와 `createCanonicalFlowId`의 결과가 달라 동일한
source/job/variant triple이 서로 다른 canonical ID를 만들 수 있었다.

### 수정

- registry identity가 공통 factory의 결과만 사용한다.
- alias, origin metadata, reconciliation, backup/restore가 factory ID를 사용한다.
- 이전 P33 preview ID는 compatibility read alias로만 지원한다.
- P33은 production에 들어간 적이 없으므로 production migration은 추가하지 않았다.

### 현재 AJD ID

`canonical:source:ajd:moving-checklist:23363|job:prepare-move-by-dday|variant:ajd-moving:comprehensive-calendar-v1`

24개 canonical copy와 5개 legacy copy는 자동 병합하지 않는다. 둘 다 있으면 사용자
선택과 archive/restore 경계를 유지한다.

## 4. My Flow 저장 draft 안정화

### 재현

source-backed `middle-school-math-1`에서 Item 메모를 저장하고 `/my`를 새로
열었을 때, localStorage에는 메모가 있는데 editor가 source fallback 메모를
표시하는 간헐 실패가 있었다.

초기 loading gate 시도는 서버 HTML에서 `Flow 목록`을 제거해 P27 SSR 회귀를
만들었으므로 폐기했다.

### 최종 수정

- 서버 문서는 기존 canonical 4탭 shell을 유지한다.
- client의 committed draft resolver는 demo가 아닌 실제 저장 Flow에서 현재
  localStorage draft를 읽는다.
- 편집 진입 경계에서 저장 draft를 다시 동기화하고 다음 frame에 editor를 연다.
- E2E는 reload 뒤 저장소에 메모가 남았는지 먼저 확인하고, 이후 editor value가
  같은지 확인한다.

### 안정성 결과

- 동일 memo reload 시나리오 반복 `30 / 30`
- full E2E `320 / 320` 연속 두 번
- SSR shell `1 / 1`

Timeout 증가는 사용하지 않았다.

## 5. 검증 이력

최종 수정 전 full E2E 한 번은 `318 / 320`이었다.

- source-backed memo editor가 source fallback을 표시
- 임시 loading gate가 `/my` server document shell을 제거

두 실패를 원인별로 수정한 뒤 다음 현재 검증을 새로 실행했다.

| 검증 | 현재 결과 |
| --- | --- |
| pretest | 64 / 64 |
| unit | 588 / 588 |
| memo reload repeat | 30 / 30 |
| P24 journey frame | 6 / 6 |
| P27 server document | 1 / 1 |
| full E2E run 1 | 320 / 320 |
| full E2E run 2 | 320 / 320 |
| build | 18 / 18 |
| BUILD_ID | present |
| diff check | pass |

이전 실패와 현재 통과를 섞지 않았다.

## 6. 남은 외부 gate

- GitHub CI는 final documentation push 뒤 최신 SHA에서 다시 확인해야 한다.
- Vercel preview가 READY인지와 익명 접근 가능 여부를 별도로 확인해야 한다.
- dependency audit gate가 실패하면 P33 코드 실패와 분리해 기록한다. 이번 범위에서
  dependency upgrade를 섞지 않는다.
- 실제 관찰 사용자 수는 `0`이다.

## 7. 권장 다음 상태

Local verdict는 `publish_ready_for_preview`다. Draft PR과 preview에서 독립 검토를
진행한 뒤에만 merge 결정을 내린다. main merge와 production deploy는 별도 승인
없이는 수행하지 않는다.
