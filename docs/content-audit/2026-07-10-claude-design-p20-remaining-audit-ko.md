# Claude Design P20 번호/잔여 항목 감사

- 작성일: 2026-07-10
- 범위: Claude Design P20 백로그 원문 번호 정합성, P20-01/P20-02/P20-04 완료 evidence 대조, P20-03 및 P20-05 이후 잔여 실행 순서 결정
- 비범위: 앱 UI 수정, AI API 연동, 저장/실행/export 스키마 변경

## 확인한 원문

- 최신 GitHub ZIP: `FlowMe UXUI 전체 검토.zip`
- ZIP 내부 원문: `FlowMe UX 재검토 P19 마감 (P20 백로그).dc.html`
- 로컬 임시 추출본: `C:\Users\HUBERT\AppData\Local\Temp\flowme-p20-backlog.html`

로컬 `claude_work/FlowMe UXUI 전체 검토 (6)` 및 `(7)`에는 P20 백로그 원문이 없었고, GitHub의 최신 ZIP에서 P20 원문을 확인했다.

## 결론

Claude 원문 P20 백로그는 P20-01부터 P20-06까지 6개 항목이다. 원문 P20-07/P20-08은 확인되지 않았다.

현재 완료 evidence 기준으로 P20-01, P20-02, P20-04는 닫힌 상태다. 남은 구현/정리 항목은 P20-03, P20-05, P20-06이다. 다음 구현 목표는 P20-03 `스튜디오 "초안" 탭을 초안 선반으로 연결`이 가장 타당하다.

## P20 원문 항목 대조

| 항목 | 원문 우선순위 | 원문 문제 | 영향 route | 현재 판정 |
| --- | --- | --- | --- | --- |
| P20-01 | High | URL-first miss가 정리본 복사로 끝나 앱 안 초안 실행 흐름으로 이어지지 않음 | `/flows` miss/candidate, `/my` | 완료 |
| P20-02 | High | P20-01 초안이 착지할 My Flow 편집 방이 draft 원본, wide 기준일 입구, 기준일/항목 override 충돌을 충분히 받지 못함 | `/my`, `/calendar`, export | 완료 |
| P20-03 | Medium | Studio의 `초안` 탭이 이미 있으나 URL-first draft 흐름과 연결되지 않음 | `/u/my-flow-studio`, `/flows` candidate | 잔여 |
| P20-04 | Medium | public `/f` 저장 전 preview 체크가 저장 후 실제 완료 체크로 전환되는 evidence가 없음 | `/f/[slug]`, `/my` | 완료 |
| P20-05 | Low | Calendar 월 그리드에서 같은 Flow 중복 라벨, 잘림, 3~5 Flow fixture 정책이 남음 | `/calendar` | 잔여 |
| P20-06 | Low | 실제 AI 생성 slice는 P20-01/P20-02 배관 완료 뒤 spec/gate로만 열어야 함 | `/flows`, `/u/*` 초안 탭 | 잔여 |
| P20-07 | 없음 | 원문 항목 없음 | - | 만들지 않음 |
| P20-08 | 없음 | 원문 항목 없음 | - | 만들지 않음 |

## 완료 항목 evidence

### P20-01 URL-first miss draft flow

완료 evidence:

- `docs/content-audit/2026-07-10-claude-design-p20-01-url-first-draft-flow-evidence/README.md`
- `docs/content-audit/2026-07-10-claude-design-p20-01-url-first-draft-flow-evidence/route-evidence.json`

주요 marker:

- `urlFirstMissDraftEntryVisible: true`
- `urlFirstMissDraftImpliesLiveAi: false`
- `urlFirstMissDraftEditableItemCount: 1`
- `urlFirstMissDraftSavePathVisible: true`
- `urlFirstMissDraftInternalHitCount: 0`
- `urlFirstVisibleMarkdownHitCount: 0`
- `urlFirstCandidateUserCopyInternalHitCount: 0`
- `normalRouteInternalHitCount: 0`

판정: 원문 P20-01의 핵심인 "miss가 복사로 끝나지 않고 앱 안 초안 흐름으로 이어짐"이 evidence로 닫혔다. 실제 AI 생성처럼 과장하지 않는 기준도 유지된다.

### P20-02 My Flow draft landing/edit room

완료 evidence:

- `docs/content-audit/2026-07-10-claude-design-p20-02-my-flow-draft-edit-evidence/README.md`
- `docs/content-audit/2026-07-10-claude-design-p20-02-my-flow-draft-edit-evidence/route-evidence.json`

주요 marker:

- `draftFlowMyFlowLandingVisible: true`
- `draftFlowEditEntryVisible: true`
- `draftFlowAnchorEditVisibleByViewport: {"390":2,"1024":1}`
- `draftFlowItemEditEntryVisible: true`
- `draftFlowAnchorOverrideConflictPolicyVisible: true`
- `draftFlowCalendarProjectionUpdated: true`
- `draftFlowExportProjectionUpdated: true`
- `urlFirstMissDraftImpliesLiveAi: false`
- `normalRouteInternalHitCount: 0`

판정: 원문 P20-02의 핵심인 draft Flow 착지, 모바일/wide 기준일 입구, 항목 수정, 기준일/항목 override 정책, Calendar/export 반영이 evidence로 닫혔다.

### P20-04 public `/f` 저장 전/후 경계

완료 evidence:

- `docs/content-audit/2026-07-10-claude-design-p20-04-public-post-save-boundary-evidence/README.md`
- `docs/content-audit/2026-07-10-claude-design-p20-04-public-post-save-boundary-evidence/route-evidence.json`

주요 marker:

- `publicPreSaveCheckboxCompletionLikeLabelCount: 0`
- `publicPreSaveCheckboxPreviewLabelCount: 89`
- `publicPostSaveCompletionControlVisible: true`
- `publicPostSaveCompletionControlPattern: "checkbox"`
- `publicPostSaveCompletionControlActive: true`
- `publicPostSaveCompletionButtonCount: 0`
- `publicFlowItemLevelExportLikeLabelCount: 0`
- `publicShareSecondaryBrowseFocusableCount: 10`
- `publicShareSecondaryBrowseAfterPrimaryCount: 10`
- `taskCompleteButtonCount: 0`
- `taskCompleteMixedControlCount: 0`

판정: 원문 P20-04의 핵심인 public `/f` 저장 전 preview와 저장 후 My Flow 완료 체크의 경계가 닫혔다. Flow 단위 저장/export 위계와 항목 단위 export 미신설 기준도 유지된다.

## 잔여 항목

### P20-03 Studio 초안 탭 연결

- 상태: 잔여
- 우선순위: 다음 구현 1순위
- 목표: `/u/my-flow-studio`의 기존 `초안` 탭을 URL-first draft의 보조 선반으로 연결한다.
- 핵심 문제: P20-01/P20-02로 miss draft가 앱 안에서 생성/저장/편집될 수 있게 되었지만, Studio의 `초안` 탭과 draft 흐름은 아직 연결되지 않았다.
- 영향 route:
  - `/u/my-flow-studio`
  - `/flows` candidate/miss draft
  - `/my` draft save/edit
- 구현 범위:
  - draft status Flow가 Studio `초안` 탭에 나타나는지 확인/연결
  - Studio card action이 P20-01/P20-02 draft edit/save path와 같은 경로를 쓰게 함
  - Studio를 5번째 탭으로 승격하지 않음
  - noindex/creator-profile 보조 표면 정책 유지
- 건드리면 안 되는 기준선:
  - 4탭 IA
  - `/u/my-flow-studio` creator-profile 보조 표면
  - `/flow-lab` internal-console 분리
  - `urlFirstMissDraftImpliesLiveAi: false`
  - `normalRouteInternalHitCount: 0`
- 필요한 검증:
  - Studio `초안` 탭에서 URL-first draft가 보임
  - Studio draft card에서 편집/저장으로 이어짐
  - Studio가 normal IA/nav에 추가되지 않음
  - P20-01/P20-02 marker 유지

### P20-05 Calendar 월 그리드 라벨 정책

- 상태: 잔여
- 우선순위: P20-03 이후 Low
- 목표: `/calendar` 월 그리드 셀에서 같은 Flow 중복 라벨과 잘림을 줄이고, 3~5 Flow fixture에서도 견디는 marker/evidence를 만든다.
- 핵심 문제: P19/P18로 agenda 밀도와 Flow group은 닫혔지만, 월 그리드 셀에서는 같은 Flow 라벨이 반복되거나 긴 이름이 잘릴 수 있다.
- 영향 route:
  - `/calendar`
- 구현 범위:
  - 같은 Flow는 grid cell에서 Flow당 marker 1개로 축약
  - 3~5 Flow fixture로 `+N` 또는 안정적 짧은 label 정책 확인
  - selected-day agenda의 Flow group 기준 유지
- 건드리면 안 되는 기준선:
  - P18-01 Calendar Flow 구별
  - P19-01 Calendar 모바일 agenda 밀도
  - P19-02 완료 체크박스 1종
  - `agendaGroupRepeatedTimingMetaRowCount: 0`
- 필요한 검증:
  - `calendarSameDateDistinctFlowGroupCount` 유지
  - grid 같은 Flow 중복 라벨 0
  - 3~5 Flow screenshot/evidence 추가

### P20-06 실제 AI 생성 slice spec/gate

- 상태: 잔여
- 우선순위: P20-03 이후 Low 또는 P20 final 전 spec 정리
- 목표: 실제 AI 생성 기능을 구현하기 전, "AI 제안 초안 -> 사용자가 반드시 확인/수정 -> 내 Flow 저장" gate를 spec으로 고정한다.
- 핵심 문제: P20-01은 deterministic draft skeleton으로 live AI 과장을 피했다. 실제 AI를 얹으려면 source/AI/user 수정 경계, 사용자의 확인 의무, 저장 전/후 반영 규칙이 필요하다.
- 영향 route:
  - `/flows`
  - `/u/my-flow-studio`
  - `/my`
- 구현 범위:
  - 실제 AI API 연동 없음
  - spec/gate 문서 작성
  - live AI implied false 유지 조건 정리
  - AI 제안물의 사용자 확인/수정 필수 정책 정리
- 건드리면 안 되는 기준선:
  - `urlFirstMissDraftImpliesLiveAi: false`
  - 사용자-facing 내부어 0
  - P18/P19/P20-01/P20-02 저장/실행/export 구조
- 필요한 검증:
  - spec 문서만 추가
  - 앱 UI/스키마 변경 없음
  - docs:check 통과

## 원문 없음 또는 이미 닫힌 항목

- P20-07: 원문 항목 없음. 임의로 만들지 않는다.
- P20-08: 원문 항목 없음. 임의로 만들지 않는다.
- "완료 후 상태", "빈/에러/오프라인", "접근성/키보드"는 원문 P20 번호 항목이 아니라 evidence 부족 시나리오로 언급되어 있다. P20 final review 또는 P21/P20 후속 backlog 요청에서 Claude Design이 별도 우선순위로 재분류하게 두는 것이 안전하다.

## 권장 실행 순서

1. P20-03: Studio `초안` 탭을 URL-first draft 보조 선반으로 연결한다.
2. P20-06: 실제 AI 생성 slice는 구현하지 않고 spec/gate로 정리한다.
3. P20-05: Calendar 월 그리드 3~5 Flow 라벨 정책과 evidence를 보강한다.
4. P20 final review package: 위 잔여가 닫힌 뒤 P21 백로그 요청용 package를 생성한다.

P20-05는 Low 시각/fixture 정책이므로 core draft flow의 다음 연결점인 P20-03보다 뒤에 둔다. P20-06은 실제 AI 구현 전에 반드시 spec으로 닫아야 하지만, 앱 UI 기능 구현은 아니다.

## 다음 /goal 후보

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Claude Design P20 백로그의 P20-03을 해결한다. `/u/my-flow-studio`의 기존 `초안` 탭을 URL-first miss draft 흐름의 보조 선반으로 연결한다. 새 Studio 기능 확장이나 5번째 탭 승격은 하지 않고, P20-01/P20-02에서 만든 draft Flow가 Studio 초안 탭에 보이고, 같은 edit/save path로 My Flow에 저장될 수 있게 한다. live AI 생성처럼 과장하지 않고, P20-01/P20-02/P20-04 및 P18/P19 기준선은 유지한다.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. docs/SERVICE_STRUCTURE.md
5. claude_work 또는 GitHub ZIP의 `FlowMe UX 재검토 P19 마감 (P20 백로그).dc.html`
6. docs/content-audit/2026-07-10-claude-design-p20-remaining-audit-ko.md
7. docs/content-audit/2026-07-10-claude-design-p20-01-url-first-draft-flow-evidence/README.md
8. docs/content-audit/2026-07-10-claude-design-p20-02-my-flow-draft-edit-evidence/README.md
9. docs/content-audit/2026-07-10-claude-design-p20-04-public-post-save-boundary-evidence/README.md
10. components/flow/AppClient.tsx
11. lib/flow/url-first-supply-queue.ts
12. lib/flow/source-backed-my-flow.ts
13. lib/flow/storage.ts
14. tests/e2e/flow-mvp.spec.ts
15. tests/e2e/url-first-user-surface.spec.ts

핵심 작업:
- `/flows` miss draft가 생성/저장 전 상태에서 Studio `초안` 탭에 나타나는지 확인한다.
- Studio `초안` 카드가 P20-01/P20-02 draft edit/save path와 연결되게 한다.
- `/u/my-flow-studio`는 creator-profile 보조 표면으로 유지하고 5번째 탭으로 승격하지 않는다.
- noindex/보조 진입 정책과 normal route guardrail 0을 유지한다.
- live AI implied false, URL-first visible Markdown 0, candidate user copy internal hit 0을 유지한다.

검증:
- 모바일 390px `/flows` miss draft 생성 확인
- 모바일 390px `/u/my-flow-studio` 초안 탭 확인
- wide 1024px `/u/my-flow-studio` 초안 탭 확인
- Studio draft card에서 편집/저장 path 확인
- `/my` 저장 후 착지/편집 유지 확인
- tests/e2e/url-first-user-surface.spec.ts
- 관련 tests/e2e/flow-mvp.spec.ts targeted
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- capture script 재실행
- git diff --check
- 커밋 및 푸시

완료 기준:
- URL-first draft가 Studio `초안` 탭에 보인다.
- Studio는 draft 보조 선반으로만 동작하고 4탭 IA를 바꾸지 않는다.
- draft 편집/저장 path는 P20-01/P20-02와 같은 모델을 쓴다.
- live AI 생성처럼 과장하지 않는다.
- P20-01/P20-02/P20-04 및 P18/P19 기준선이 유지된다.
```

## P20 final review로 바로 가도 되는가?

아직 이르다. 원문 P20-03, P20-05, P20-06이 남아 있다. 다만 P20-01/P20-02/P20-04는 최신 evidence 기준으로 닫혔으므로, 다음 구현은 P20-03부터 진행하면 된다.
