# Claude Design P19-08 AI Draft Gate 감사

작성일: 2026-07-10

## 결론

P19-08은 새 AI 기능 구현 항목이 아니라, 첫 AI draft slice를 열기 전의 제품/UX/data gate 항목이다. Claude 원문은 `/flows` miss/candidate와 `/u/*` 스튜디오 초안 탭을 대상으로, 지금은 실제 AI draft를 열지 말고 `"AI 제안 -> 사용자가 13c overlay에서 확인/수정 -> 내 Flow 저장"` 흐름과 개방 조건만 spec으로 정의하라고 요구한다.

현재 기준으로 P19-08은 P18-08에서 이미 핵심 gate가 닫혔다. P19-07까지 완료되면서 My Flow의 기준일/항목 수정 entry도 발견 가능해졌으므로, P19-08은 추가 UI나 새 AI 기능 없이 `P18-08에서 닫힘 / P19 final review에서 재검증`으로 처리한다.

## Claude 원문 P19-08 요약

- 번호: P19-08
- 우선순위: Low
- Route: `/flows` miss/candidate, `/u/*` 스튜디오 `초안` 탭
- 문제: miss의 종착이 아직 "보관"이라 초안을 만들어 손보는 흐름이 없다.
- 판단: 지금 AI draft를 열면 실행 화면 손잡이/라벨/숫자가 정리되기 전에 신기능을 얹게 된다.
- 기대 산출물: 첫 slice를 `"AI 제안 -> 13c overlay 확인/수정 -> 내 Flow 저장"` 흐름으로 정의하고, 실제 생성은 과장하지 않는다.
- 유지 기준선:
  - `miss draft gate implies live AI: false`
  - miss는 URL+메모 비실행 저장 상태로 유지
  - candidate 사용자어 및 internal hit 0
  - Studio는 보조 표면, 5번째 탭 승격 금지
  - 사용자 표면 변화 0

## P18-08 Coverage 판단

P18-08 spec과 evidence는 P19-08 원문 요구를 이미 충족한다.

| P19-08 요구 | 현재 coverage | 판단 |
| --- | --- | --- |
| 실제 AI draft를 지금 열지 않음 | P18-08 spec이 실제 AI API 연동 금지, 자동 생성 금지, 저장 전 full editor 금지를 명시 | 충족 |
| miss 상태를 draft 준비 요청으로 프레이밍 | `/flows` miss marker가 `urlFirstMissDraftGateVisible: true`와 `urlFirstMissDraftCtaLabel: "초안 요청 저장"`을 기록 | 충족 |
| live AI처럼 과장하지 않음 | `urlFirstMissDraftImpliesLiveAi: false` | 충족 |
| candidate 사용자 복사 산출물 내부어 제거 | `urlFirstMissCandidateCopyInternalHitCount: 0`, `urlFirstCandidateUserCopyInternalHitCount: 0` | 충족 |
| 사용자 수정 모델 선행 | P18-05 personal overlay, P18-07 기준일/항목 날짜 모델, P19-07 edit entry 발견성으로 제목/날짜/메모 수정入口가 확보됨 | 충족 |
| Studio를 보조 표면으로 유지 | P15/P18/P19 evidence가 creator-profile tier, noindex current-user studio, 4탭 IA 밖 보조 표면을 유지 | 충족 |

## Evidence 기준

최신 P19-06 evidence package 기준:

- `urlFirstMissDraftGateVisible: true`
- `urlFirstMissDraftCtaLabel: "초안 요청 저장"`
- `urlFirstMissDraftImpliesLiveAi: false`
- `urlFirstMissCandidateCopyInternalHitCount: 0`
- `urlFirstVisibleMarkdownHitCount: 0`
- `urlFirstCandidateUserCopyInternalHitCount: 0`
- `homeUrlFirstEntryVisible: true`
- `homeUrlFirstEntryDestination: ["/flows"]`
- `myFlowAnchorEditEntryVisible: true`
- `myFlowItemEditEntryVisible: true`
- `normalRouteInternalHitCount: 0`

참조 package:

- `docs/content-audit/2026-07-09-claude-design-p18-08-url-first-draft-gate-evidence/`
- `docs/content-audit/2026-07-10-claude-design-p19-06-home-url-entry-evidence/`
- `docs/content-audit/2026-07-10-claude-design-p19-07-edit-entry-evidence/`

## P19 완료/닫힘 상태

| Claude 원문 번호 | 상태 | 근거 |
| --- | --- | --- |
| P19-01 Calendar 모바일 다중 Flow 밀도 | 완료 | `2026-07-09-claude-design-p19-01-calendar-mobile-density-evidence` |
| P19-02 완료 컨트롤 통일 | 완료 | `2026-07-09-claude-design-p19-02-completion-control-evidence` |
| P19-03 진행 숫자 맥락화 | 완료 | `2026-07-09-claude-design-p19-03-progress-metric-evidence` |
| P19-04 Calendar wide 헤더/라벨 중복 | 완료 | `2026-07-10-claude-design-p19-numbering-remaining-audit-ko.md`, `calendarHeadingDuplicateCount: 0` |
| P19-05 public `/f` 저장 전 체크 preview 정책 | 완료 | `2026-07-09-claude-design-p19-04-public-presave-checkbox-evidence`가 실제 P19-05 성격을 닫음 |
| P19-06 홈 URL/memo entry 발견성 | 완료 | `2026-07-10-claude-design-p19-06-home-url-entry-evidence` |
| P19-07 My Flow 수정入口 발견성 | 완료 | `2026-07-10-claude-design-p19-07-edit-entry-evidence` |
| P19-08 AI draft slice spec/gate | 닫힘 | P18-08 spec/evidence가 원문 요구를 충족. 이번 감사에서 추가 UI/기능 없이 닫힘 처리 |

## 하지 않은 것

- 실제 AI API 연동 없음
- 자동 초안 생성 없음
- 저장 전 full editor 없음
- 저장/실행/export 스키마 변경 없음
- `/u/my-flow-studio` 5번째 탭 승격 없음
- 사용자 화면에 `P0`, `대기열`, `파이프라인`, `Canonical URL`, `handoff`, `source-backed`, `Step`, `Item`, `Markdown` 재노출 없음

## 다음 목표 후보

P19-01~P19-08은 번호상 잔여 없이 닫힌 상태다. 다음 작업은 P19 final review package 생성이 맞다.

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Claude Design P19 백로그 P19-01~P19-08 개선 루프를 마감 감사한다. 새 기능을 추가하지 않고, Calendar 모바일/와이드, 완료 컨트롤, 진행 숫자, public /f 저장 전 preview 정책, 홈 URL/memo entry, My Flow 수정入口, URL-first AI draft gate 기준선이 유지되는지 확인한 뒤, Claude Design이 GitHub 소스/문서/시나리오별 screenshot만 보고 P20 백로그를 산출할 수 있는 최신 P19 final review package를 만든다.
```
