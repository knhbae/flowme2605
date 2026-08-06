# AI 캘린더·할 일·일정관리 리서치 출처 대장

- 기준일: 2026-07-30 (Asia/Seoul)
- 상태: `strategy_recommendation_not_user_validated`
- 목적: AI 일정관리 시장의 현재 발전 방향을 공식 출처로 확인하고, FlowMe의 제품 경계·우선 사용자 여정·검증 실험으로 번역한다.
- 범위: Motion, Reclaim 2.0, Clockwise, Sunsama, Akiflow, Todoist, Google, Microsoft, Apple, Notion
- 근거 원칙: 공식 제품 페이지·공식 도움말·공식 변경 이력만 사용했다. 제품사가 공개한 사용자 수·절감 시간·효과 수치는 `자체 주장`으로 표시하며 독립 검증치로 취급하지 않는다.
- 코딩 원칙: 현재 공식 문서에서 명확히 확인되는 기능만 `Y`, 특정 흐름·수동 실행·별도 설정에 한정되면 `P`, 확인되지 않으면 `N`으로 코딩했다. 2026-03-27 종료된 Clockwise는 현재 운영 제품 집계에서 제외하고 종료 위험 사례로 별도 취급했다.

## 한 문장 결론

> AI 일정관리의 기회는 캘린더를 대신 조작하는 데 있지 않다. FlowMe는 원본 콘텐츠를 출처가 보존된 Item과 검토 가능한 일정 후보로 바꾸고, 사용자가 승인한 결과를 기존 Calendar·Todo·Sheet·Memo로 옮기는 `source-grounded scheduling layer`가 되어야 한다.

## 1. 현재 운영 9개 제품 capability coding

기호:

- `Y`: 현재 기능이 공식 문서에서 명확히 확인됨
- `P`: 특정 흐름, 수동 실행 또는 별도 설정에 한정됨
- `N`: 공식 문서 범위에서 확인되지 않음

| 제품 | A 외부 맥락→action | B 자연어 생성·수정 | C Preview·승인·Undo | D 지속·자동 재스케줄 | E 일정·이벤트 trigger agent |
|---|:---:|:---:|:---:|:---:|:---:|
| Motion | Y | Y | P | Y | P |
| Reclaim 2.0 | Y | Y | Y | Y | Y |
| Sunsama | P | Y | Y | P | N |
| Akiflow | Y | Y | Y | P | Y |
| Todoist | Y | Y | P | N | N |
| Google | Y | Y | Y | N | Y |
| Microsoft | Y | Y | Y | P | Y |
| Apple | Y | P | Y | N | N |
| Notion | Y | Y | Y | P | Y |
| **합계** | **Y 8 / P 1** | **Y 8 / P 1** | **Y 7 / P 2** | **Y 2 / P 4 / N 3** | **Y 5 / P 1 / N 3** |

해석:

1. 외부 맥락 추출과 자연어 입력은 9개 중 8개가 명확히 지원한다. 차별화 기능이라기보다 기본 기대치에 가깝다.
2. 9개 중 7개가 명시적인 preview·approval·undo를 제공한다. AI 제안에 안전장치를 두는 것이 시장 기본 계약으로 수렴하고 있다.
3. 지속 자동 재스케줄을 명확히 제공하는 제품은 Motion과 Reclaim 2개뿐이다. 정확한 제약조건과 외부 캘린더 read/write 없이 약속하기 어려운 고난도 영역이다.
4. trigger agent는 Google·Microsoft·Notion 같은 계정·플랫폼 사업자가 빠르게 차지하고 있다.

### 셀별 공식 근거

#### Motion

- A: [AI Notetaker가 회의 action item을 추출](https://www.usemotion.com/help/knowledge-management/ai-notetaker)
- B: [AI Chat으로 task 생성·수정](https://www.usemotion.com/help)
- C: [Notetaker action item 검토·승인](https://www.usemotion.com/help/knowledge-management/ai-notetaker)
- D: [일정 변화 시 task 자동 재배치](https://www.usemotion.com/help/time-management/auto-scheduling)
- E: [매일 생성되는 AI Agenda](https://www.usemotion.com/blog/ai-agenda)
- Task/Event 의미 경계: [Tasks와 Events의 차이](https://www.usemotion.com/help/project-management/task/reference-tasks/the-difference-between-tasks-and-events-in-motion)

#### Reclaim 2.0

- A·C: [회의 action item 전환과 Preview Mode](https://help.reclaim.ai/en/articles/15280604-reclaim-2-0-faq)
- B·D·E: [Assistant, Agents, Planner, Preview Mode 개요](https://help.reclaim.ai/en/articles/14846468-reclaim-ai-2-0-overview)
- ChatGPT 연결: [Reclaim 2.0 ChatGPT integration](https://help.reclaim.ai/en/articles/15264261-reclaim-2-0-chatgpt-integration)
- 가격: [Reclaim pricing](https://reclaim.ai/pricing)

#### Sunsama

- A: [Gmail에서 task 가져오기](https://help.sunsama.com/docs/integrations/gmail/)
- B·E: [Sunny 사용 가이드](https://help.sunsama.com/docs/usage-guides/sunny/)
- C·D: [Task Projection과 사용자 timebox](https://www.sunsama.com/features/timeboxing)
- 가격: [Sunsama pricing](https://sunsama.com/pricing)

#### Akiflow

- A: [Meeting Assistant의 action item 추출](https://product.akiflow.com/help/articles/9068850-meeting-assistant)
- B: [Aki가 할 수 있는 task·event 작업](https://product.akiflow.com/help/articles/5330825-what-can-aki-do)
- C·D: [Schedule Optimizer와 Undo](https://product.akiflow.com/en/help/articles/3161671-schedule-optimizer)
- E: [Morning·Midday·Wrap-up Brief](https://product.akiflow.com/en/help/articles/7855441-daily-dashboard)
- 가격: [Akiflow pricing](https://akiflow.com/pricing)

#### Todoist

- A·D·E: [Todoist Assist 공식 범위](https://www.todoist.com/help/articles/introduction-to-todoist-assist-KgPP22q5O)
- B·C: [Ramble의 음성 task 생성·수정·제거](https://www.todoist.com/help/articles/turn-your-scattered-thoughts-into-clear-tasks-ramble-jan-21-HhmP8ue8R)

#### Google

- A: [이미지·이메일 맥락에서 Task·Calendar 정보 추출](https://support.google.com/gemini/answer/15230285)
- B·C: [Gemini로 Calendar event와 Task 생성·수정, Undo](https://support.google.com/gemini/answer/15305236)
- D: [Help me schedule의 후보 제안·사용자 선택](https://support.google.com/calendar/answer/16865189)
- E: [Gemini Spark의 시간·Gmail·topic trigger](https://support.google.com/gemini/answer/17094710)

#### Microsoft

- A·B·C: [Planner Agent의 이메일 기반 task 초안, 생성·수정, interactive card](https://support.microsoft.com/en-us/planner/what-can-you-do-with-planner-agent-in-copilot)
- D: [Copilot 자동 일정 재조정의 대상과 제한](https://support.microsoft.com/en-US/Office/automatically-reschedule-events-with-copilot-in-microsoft-outlook-and-microsoft-teams)
- E: [Calendar Instructions의 자동 반응과 action history](https://support.microsoft.com/en-US/Outlook/calendar-instructions-in-outlook-and-copilot)
- 회의 생성: [Outlook Copilot로 회의 예약](https://support.microsoft.com/en-us/outlook/schedule-a-meeting-using-copilot)

#### Apple

- A·C·D·E: [Safari·Mail·Notes 텍스트에서 suggested reminder 생성, Add/Include All](https://support.apple.com/guide/iphone/use-apple-intelligence-in-reminders-iphcb580b580/26/ios/26)
- B: [Siri로 reminder 생성](https://support.apple.com/en-gb/guide/iphone/iph88463e18/26/ios/26)

#### Notion

- A: [AI Meeting Notes의 transcript·summary·action item](https://www.notion.com/en-US/product/ai-meeting-notes)
- B·C·E: [Calendar-connected Custom Agents와 confirmation](https://www.notion.com/help/connect-calendar-to-custom-agents)
- D: [Custom Agent로 inbox·calendar 관리](https://www.notion.com/help/guides/manage-your-inbox-and-calendar-with-custom-agents)
- Notion Calendar 연결: [Notion Calendar와 Notion 사용](https://www.notion.com/help/use-notion-calendar-with-notion)

## 2. 종료 사례: Clockwise

Clockwise는 2026-03-27 서비스를 영구 종료했다.

- 공식 누적치: 조직 40,000개, Focus Time 8,000,000시간 생성, 회의 23,000,000건 재배치
- 종료 후 변화: Smart Hold 삭제, Flexible Meeting 중지, 사용자 데이터 삭제 예정
- 근거:
  - [Clockwise 종료 공지](https://getclockwise.com/)
  - [Clockwise status](https://status.getclockwise.com/)
  - [과거 Flexible Meetings](https://support.getclockwise.com/article/184-flexible-meetings)
  - [과거 대화형 Calendar](https://support.getclockwise.com/article/205-prompting-clockwise-calendar)

시사점: 자동화 성능과 채택 지표가 높아도 독립 일정 서비스는 종료될 수 있다. FlowMe는 직접 쓰기보다 export, change history, rollback, source provenance, vendor portability를 신뢰 계약으로 가져가야 한다.

## 3. 대표 서비스별 작동 방식

| 서비스 | 사용자에게 보이는 AI | 실제 작동 계약 | 자동화 수준 | FlowMe가 배울 점 |
|---|---|---|---|---|
| Motion | “지금 할 일”과 자동 최적화 일정 | duration·deadline·priority·availability로 유연한 Task를 재배치, Event는 고정 | 높음 | 대화보다 Task/Event와 제약조건이 핵심 |
| Reclaim 2.0 | Assistant와 background agents | Planner에서 변경안을 만든 뒤 Preview Mode에서 Apply/Discard | 높음 + 승인 | schedule diff를 안전 계약으로 사용 |
| Sunsama | Sunny와 Task Projection | 예측은 외부 캘린더에 쓰지 않고, 사용자가 drag해 timebox | 보조형 | 비파괴 preview도 충분한 가치가 있음 |
| Akiflow | Aki, Brief, Optimizer | 사용자가 Optimize를 눌러 재배치하고 Undo 가능 | 사용자 호출형 | 명시적 trigger와 즉시 복구 |
| Google | Gemini와 Spark | 계정·Gmail·Calendar 맥락에서 생성·trigger, 실행 후 Undo | 플랫폼형 | 계정 맥락은 플랫폼 사업자가 유리 |
| Microsoft | Copilot, Planner Agent, Calendar Instructions | 초안·interactive card·제한된 자동 재조정·action history | 플랫폼형 | 자동화 범위와 제외 조건을 UI에 노출 |
| Apple | Suggested Reminders | 원문에서 제안하고 사용자가 Add 또는 Include All | 제안형 | source context에서 action을 제안하되 확정은 사용자 |
| Notion | Meeting Notes와 Custom Agents | 회의→action item, Calendar trigger, require confirmation | workspace agent | 콘텐츠→action→schedule의 닫힌 루프 |

## 4. 시장 발전을 설명하는 4단계

1. **자연어 capture**: 타이핑·음성·채팅으로 task/event를 생성한다.
2. **맥락 extraction**: 이메일·회의·이미지·문서에서 action item과 날짜를 추출한다.
3. **constraint scheduling**: duration·deadline·priority·flexibility·availability를 바탕으로 후보를 계산한다.
4. **reviewable agent loop**: preview/approval/undo와 trigger를 통해 계속 실행하고 재조정한다.

핵심 구조:

```text
email / meeting / source
  -> source-backed action
  -> explicit constraints
  -> deterministic scheduling proposal
  -> editable diff
  -> approval
  -> external apply
  -> receipt / undo / replan
```

## 5. FlowMe 현재 기준선

확정 원칙:

- FlowMe는 Calendar·Todo·Notion·Sheet를 대체하는 무거운 workspace가 아니라 외부 콘텐츠를 portable execution artifact로 바꾸는 action compiler다.
- canonical 구조는 `SourceRow -> Item -> Step -> Flow -> Bundle/Flow Map`이고, Calendar/ICS·Todo·Sheet·Memo는 같은 Item의 projection이다.
- 날짜 없는 Item은 유효하며 Calendar/ICS로 강제 투영하지 않는다.
- 직접 external Calendar/Todo write와 양방향 round-trip은 아직 제품 계약이 아니다.

현재 저장소 근거:

- `docs/PRODUCT_PRINCIPLES.md`
- `docs/SERVICE_STRUCTURE.md`
- `docs/DECISIONS.md`
- `docs/STATUS.md`
- `docs/specs/2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/architecture-comparison-v1.json`
- `docs/specs/2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/validation-results-v1.json`
- `docs/specs/2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/classification-comparison-v1.json`
- `docs/specs/2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/user-pacing-schedule-contract-v1.json`

정량 기준선:

- 일정·event corpus: 기존 42 + 신규 21 = 63 fixtures
- projection 5종 기준 비교 셀: 63 × 5 = 315
- 자동 계약 검증: 32 / 32
- 분류기 agreement: Checklist/Todo 92.86%, primary projection 97.62%
- canonical Item + destination grouping architecture score: 94 / 100
- fixed wrapper 대안 score: 41 / 100
- 실제 Google·Outlook·Apple Calendar 및 VTODO client round-trip: `NOT_RUN`
- observed users: 0

위 수치는 코드·fixture·자동 검증 근거이며 관찰 사용자 검증이나 production integration 성공을 의미하지 않는다.

## 6. FlowMe의 제품 경계

### 지금 구축할 것

- source text와 source row를 보존한 action extraction
- duration·deadline·priority·flexibility·availability의 명시적 개인 제약
- deterministic schedule proposal
- 변경된 Item만 보여 주는 editable diff
- 승인 후 Calendar·Todo·Sheet·Memo export
- export receipt, version history, undo/replan

### 검증 전 보류할 것

- 외부 Calendar read를 전제로 한 conflict-free 약속
- 양방향 sync와 account persistence
- background agent의 자동 쓰기
- cross-device trigger
- creator update가 개인 실행본에 미치는 자동 병합

### 만들지 않을 것

- 범용 AI Calendar 대체재
- 원문에 없는 날짜·duration·준비물 발명
- 날짜 없는 Item의 Calendar 강제 배치
- 사용자 승인 없는 외부 일정 변경
- 전체 Flow를 숨긴 채 “추천 3개”만 강제

## 7. 사용자 페르소나와 대표 시나리오

### P1. 준호 — 자기주도 학습자

- 상황: 2주짜리 강의·커리큘럼을 발견했지만 현실적인 학습 속도를 정하기 어렵다.
- 입력: 시작일 2026-08-03, 주 3회, 월·수·금
- AI 역할: 자연어 제약을 필드로 해석하고 누락·충돌을 설명한다.
- deterministic 역할: 원문 lesson 순서를 유지한 일정 후보를 계산한다.
- 결과: Todo + Progress Sheet + 선택적 Calendar
- 금지: 원문에 없는 강의, 학습시간, 마감일 발명

### P2. 민지 — 이사 D-30 실행자

- 상황: 공식·제작자 체크리스트의 D-30, D-14, D-7 anchor를 자신의 이사일로 바꾸고 싶다.
- 입력: 이사일
- AI 역할: 각 날짜가 왜 그렇게 계산됐는지 설명하고 비슷한 일을 묶는다.
- deterministic 역할: source anchor offset을 보존해 개인 날짜를 계산한다.
- 결과: Checklist + 필요한 핵심 Calendar anchor
- 금지: source anchor 변경, 이미 완료한 과거 Item 자동 이동

### P3. 수진 — 직장인·부모

- 상황: 여러 Flow의 오늘 할 일에서 지금 처리할 3개를 고르고 싶다.
- 입력: 사용 가능한 시간, 반드시 해야 할 일, FlowMe 내부 일정
- AI 역할: 3개 후보와 이유를 제안한다.
- deterministic 역할: 전체 목록과 완료·날짜 상태를 보존한다.
- 결과: accept / replace / remove date
- 금지: 외부 캘린더를 읽었다고 암시, 숨은 완료 처리, 전체 목록 제거

## 8. 우선 검증 실험

### E1. Study pacing preview — 우선순위 1

- 참가자: 자기주도 학습자 12명
- 과제: source curriculum에 “8월 3일 시작, 주 3회, 월·수·금”을 적용해 실행 일정 저장
- 성공 게이트:
  - median usable schedule ≤ 3분
  - manual 대비 ≥ 35% 빠름
  - invented source item/date/duration = 0
  - 10 / 12가 source와 personal schedule을 구분
  - 9 / 12가 수정 ≤ 2회 안에 저장·export

### E2. Today top 3 brief

- 참가자: 여러 Flow를 가진 사용자 15명, 7일 crossover
- 성공 게이트:
  - first action 선택 시간 ≥ 25% 단축
  - median ≤ 20초
  - 추천 이유 이해 ≥ 80%
  - 전체 목록 찾기 성공 ≥ 90%
  - 추천 수용 ≥ 60%
  - hidden/auto-completed Item = 0

### E3. Missed schedule replanning

- 참가자: 일정 이탈 경험 사용자 12명
- 성공 게이트:
  - 완료·과거·source schedule 변경 = 0
  - 변경된 행 식별 ≥ 90%
  - undo 성공 = 100%
  - manual 대비 ≥ 40% 빠름
  - 10 / 12가 수정 ≤ 2회 안에 수용

### 외부 통합 gate

- 대표 event 8개 × Google·Outlook·Apple = 24 round-trips
- timezone, all-day, recurrence, update, delete, title/description source receipt를 확인한 뒤에만 direct integration 또는 conflict-free 표현을 허용한다.

## 9. 제한과 해석 주의

- 가격·plan·지역·계정 자격은 변경될 수 있다.
- Reclaim 2.0, Gemini Spark, Notion Custom Agents 등은 rollout·plan·region에 따라 사용 가능 범위가 다를 수 있다.
- 공식 마케팅 페이지의 사용자 수·절감 시간은 자체 주장이다.
- 이 문서는 전략 권고이며 실제 FlowMe 사용자 관찰 결과가 아니다.
- UI 화면은 공식 페이지에서 직접 보이는 행동만 설명하며, 보이지 않는 기능을 캡션으로 확대 해석하지 않는다.
