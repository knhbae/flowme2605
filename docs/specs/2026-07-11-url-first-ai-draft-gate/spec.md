# URL-first AI Draft Gate Spec

**Date:** 2026-07-11
**Status:** Approved, implementation gated
**Owner:** FlowMe product/engineering
**Related roadmap:** Claude Design P21-02; P21-01 deterministic draft fallback

## Goal

URL-first miss에서 실제 AI가 원문 SourceRow에 근거한 실행 항목을 제안하는 미래 slice의 제품·데이터·안전 계약을 고정한다. 항목 수는 원문이 정하며, 대화형 초안의 기본 처리 상한은 7개다. 상한을 넘는 원문은 행을 누락해 완성본처럼 만들지 않고 `partial` 또는 source-import 경로로 보낸다. AI 결과는 사용자가 검토하고 수정하는 `제안 초안`이며, 사용자 확인 전 My Flow 저장, Calendar 반영, export, 공개 발행, 완료 처리를 자동으로 수행하지 않는다.

이번 P21-02는 API, 모델 SDK, 비밀키, 생성 버튼을 구현하지 않는다. P21-01의 결정론적 파싱을 현재 기본 동작이자 AI 실패 시 fallback으로 유지한다.

## Stage Fit

FlowMe의 현재 핵심은 URL/메모를 실행 가능한 개인 Flow로 바꾸고 My Flow, Calendar, 외부 도구로 이어주는 것이다. 구조가 약한 URL과 짧은 메모를 더 구체적인 실행 항목으로 제안하는 것은 이 흐름에 맞지만, 자동 발행·대규모 creator 생성·자율 실행은 현재 범위를 벗어난다.

허용되는 다음 단계는 `제안 생성 → 사용자 검토/수정 → 명시적 저장`뿐이다.

## User Need

준비된 Flow가 없는 URL이나 메모를 넣은 사용자는 빈 요청 카드가 아니라 손볼 수 있는 실행 초안을 받고 싶다. 사용자는 AI가 어디까지 제안했고 자신이 무엇을 바꿨는지 알 수 있어야 하며, 저장 전에는 Calendar나 My Flow가 바뀌지 않아야 한다.

## Scope

### In

- provider-neutral 생성 요청/응답 계약
- source-derived draft Item 제안과 Item별 SourceRow 근거·생략 사유
- 기준일과 상대 날짜 제안
- source 원본, AI 제안, 사용자 overlay의 분리
- 사용자 검토·수정·포함 여부 선택·명시적 저장 gate
- 실패, timeout, 부분 응답, 중복, 취소, fallback 정책
- 민감 콘텐츠 안전 gate
- 비용·입력 길이·개인정보·로그 최소화 기준
- My Flow, Calendar, export projection 조건

### Out

- 실제 AI API/SDK/키 연결
- 특정 모델 또는 provider 고정
- 자동 발행, 자동 완료, 자동 Calendar 등록
- 백그라운드 생성 queue와 알림
- source 원문을 AI 결과로 덮어쓰기
- public `/f`에서 AI 생성 시작
- Studio를 5번째 탭으로 승격
- 건강·법률·재무 판단을 대신하는 생성

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | `/flows` miss에서 사용자가 `제안 초안 받기`를 명시적으로 선택한다. 실제 구현 전에는 이 CTA를 노출하지 않는다. |
| Completion signal | 원문이 정한 수의 제안 항목이 검토 화면에 나타나고 각 항목의 근거를 확인·수정·제외할 수 있다. 생성 자체는 저장 완료가 아니다. |
| Artifact destination | 사용자 저장 후에만 My Flow, Calendar, checklist/sheet/memo/calendar export가 같은 사용자 수정본을 읽는다. |
| Source/risk boundary | 원문 snapshot, AI 제안, 사용자 overlay를 분리한다. 민감 콘텐츠는 source 근거와 중단 조건 없이는 저장 gate를 열지 않는다. |
| Natural artifact | 제목, 필요한 경우의 날짜, 메모, 원문 링크가 있는 source-derived Item과 Calendar/checklist/sheet/memo 결과물 |
| Verification | contract unit test, failure fixture, P21 lifecycle E2E, guardrail scan, 390/1024px browser QA, 비용/개인정보 review |

## Current Baseline

P21-01은 다음을 이미 제공한다. 이 3~7개 동작은 짧은 사용자 메모를 손볼 수 있게 만드는 compatibility fallback이며, URL 원문을 정확히 변환했다는 source-backed 품질 기준은 아니다.

- 사용자 제목/메모에서 결정론적으로 3~7개 항목 제안
- `day_offset` 기반 기준일 날짜 배치
- 저장 후 My Flow에서 포함 여부, 제목, 날짜, 메모 수정
- Calendar와 export projection
- `urlFirstMissDraftImpliesLiveAi: false`

AI slice가 실패하거나 gate를 통과하지 못하면 이 동작으로 돌아간다.

## Input Contract

```ts
type AiDraftRequest = {
  requestId: string;
  canonicalUrl?: string;
  sourceText?: string;
  userTitle: string;
  userMemo?: string;
  anchorDate?: string;
  categoryHint?: string;
  riskLevel: 'low' | 'medium' | 'sensitive';
  locale: 'ko-KR';
  /** Interactive proposal cap, not a target count. */
  maxItems: 7;
};
```

규칙:

- URL과 source text는 필요한 범위만 전달한다.
- 로그인 토큰, 쿠키, 폼 입력, 개인 식별 정보는 전달하지 않는다.
- 사용자 메모는 전송 전 길이 제한과 민감정보 경고를 적용한다.
- source text가 없으면 URL 내용을 읽었다고 주장하지 않는다.
- 요청별 `requestId`는 중복 응답을 식별하며 사용자 화면에는 노출하지 않는다.

## Output Contract

```ts
type AiDraftProposal = {
  requestId: string;
  proposalTitle: string;
  items: Array<{
    proposalId: string;
    title: string;
    dayOffset?: number;
    memo?: string;
    includedByDefault: boolean;
    sourceSupport: 'direct' | 'inferred' | 'user-request';
  }>;
  cautions: string[];
  incompleteReason?: string;
};
```

유효 조건:

- item은 1개 이상 `maxItems` 이하다. 개수는 SourceRow와 독립 상태 경계가 정한다.
- 원문에 `maxItems`보다 많은 유효 행이 있으면 누락한 행과 이유를 남기고 `partial`로 표시하거나 source-import/table 경로로 전환한다.
- 제목은 사용자가 실행 여부를 판단할 수 있는 동사형 표현이다.
- 날짜를 임의의 절대 날짜로 만들지 않고 기준일과 `dayOffset`으로 제안한다.
- 원문에 없는 수치·기한·안전 판단은 확정문으로 만들지 않는다.
- `sourceSupport`는 내부 품질 판단용이며 user-facing technical label로 노출하지 않는다.
- 부분 응답은 `incompleteReason`을 남기고 완성된 Flow처럼 표시하지 않는다.

## Ownership And Precedence

| Layer | 소유자 | 수정 가능 | 우선순위 |
| --- | --- | --- | --- |
| Source snapshot | 원문/creator/공식 출처 | 사용자·AI가 덮어쓰지 않음 | 근거 보존 |
| AI proposal | 생성 provider의 제안 | 사용자 검토 전 임시 | source 다음 |
| User overlay | 사용자 | 제목·날짜·메모·포함 여부 수정 | 화면/Calendar/export 최우선 |

사용자 overlay가 있어도 source URL, source detail, sourceTrace 성격의 내부 근거 데이터는 삭제하지 않는다. 사용자 화면에서는 내부 필드명을 노출하지 않는다.

## UX State Contract

1. `ready`: miss 요청과 입력이 준비됨. 생성되지 않음.
2. `generating`: 취소 가능. 저장·발행·완료 불가.
3. `proposal`: source-derived 제안이 보임. 근거 확인·수정·제외 가능.
4. `partial`: 일부 결과만 있음. 부족한 이유를 사용자어로 표시.
5. `failed`: 입력을 보존하고 결정론적 초안 또는 재시도를 선택.
6. `reviewed`: 사용자가 항목을 확인·수정함.
7. `saved`: 명시적 저장 후 My Flow projection 시작.

`generating`, `proposal`, `partial`은 My Flow 저장 상태가 아니다. 자동으로 다음 상태로 넘어가지 않는다.

## User Copy Contract

허용:

- `제안 초안 받기`
- `초안을 준비하고 있어요`
- `원문과 메모를 바탕으로 제안했어요`
- `저장 전에 제목과 날짜를 확인하세요`
- `제안을 만들지 못했습니다. 입력은 그대로 남아 있어요`

금지:

- `AI가 완성했습니다`
- `자동으로 정확한 일정을 만들었습니다`
- `바로 실행됩니다`
- provider/model 이름을 primary CTA로 노출
- `source-backed`, `handoff`, `Canonical URL`, `Step`, `Item`, `pipeline`

## Review And Save Gate

저장 버튼을 활성화하려면 다음이 모두 참이어야 한다.

- 포함 가능한 item이 1개 이상 `maxItems` 이하
- 모든 item이 SourceRow 근거를 갖거나 명시적인 `user-request`로 표시됨
- 빈 제목 없음
- 포함된 항목이 1개 이상
- 기준일이 필요한 Flow는 기준일 의미가 사용자어로 표시됨
- 민감 콘텐츠는 source/caution/중단 조건 확인 완료
- 사용자가 proposal을 한 번 이상 검토하거나 수정 화면을 열었음

저장 시 현재 P21 personal overlay와 동일한 모델로 변환한다. AI 전용 실행/export 스키마를 만들지 않는다.

## Calendar, My Flow, Export Rules

- My Flow는 사용자 overlay 제목·날짜·메모·포함 여부를 우선한다.
- Calendar는 기준일과 item date override를 현재 우선순위대로 계산한다.
- checklist/sheet/memo/calendar export는 같은 projection을 읽는다.
- AI 관련 내부 상태나 provider 응답을 export에 넣지 않는다.
- source URL과 사용자에게 필요한 원문 맥락은 기존 방식으로 보존한다.

## Failure And Fallback

| 상태 | 사용자 결과 | fallback |
| --- | --- | --- |
| Timeout | 입력 보존, 완료로 표시하지 않음 | 사용자가 직접 쓴 행동 문장이 있을 때만 compatibility fallback 또는 명시적 재시도 |
| Empty response | 빈 Flow 저장 금지 | source row가 없으면 `source_import_required`; 사용자 메모의 명시적 행동만 compatibility fallback |
| Partial response | 완성된 항목과 생략 사유만 임시 표시, 부족함 안내 | 사용자 수정, source import, 또는 명시적 재시도; 일반지식으로 빈 행을 채우지 않음 |
| Invalid dates | 날짜 제안 제거 | 무일정 Item으로 유지하고 사용자에게 필요한 기준일만 명시적으로 요청; 순차 날짜를 발명하지 않음 |
| Duplicate request | 기존 proposal/draft 안내 | 기존 draft 열기 |
| User cancel | 입력과 이전 proposal 유지 | ready 상태 복귀 |
| Offline | 새 생성 시작 금지 | 이미 열린 로컬 draft 편집만 유지 |
| Sensitive gate fail | 생성·저장 중단 | 공식 출처 확인 또는 사용자가 직접 작성 |

## Sensitive Content Gate

다음은 자동 제안만으로 저장 gate를 열지 않는다.

- 의료 진단·치료·약물 변경
- 법률·세무·재무 결론
- 안전 사고 대응을 단정하는 단계
- 공식 마감/자격/비용을 source 없이 확정하는 단계

민감 콘텐츠는 공식 source, checked date, 주의/중단 조건을 별도로 확인한다. AI는 원문 요약과 사용자 검토용 초안까지만 담당한다.

## Cost And Limits

- 요청당 한 번의 생성 호출을 기본으로 한다.
- source text와 memo 입력 길이를 제한한다.
- 대화형 한 번의 proposal은 기본 7개를 넘기지 않는다. 원문 행이 더 많으면 잘라 완성본처럼 표시하지 않고 table/resource import 또는 `partial`로 전환한다.
- 자동 retry는 1회도 기본 허용하지 않는다. 사용자가 재시도를 선택한다.
- provider 비용이 한도를 넘으면 결정론적 fallback을 사용한다.
- 비용·latency가 사용자 화면에서 성공으로 오인되지 않도록 상태를 분리한다.

## Privacy And Logging

- URL, 제목, memo 원문을 장기 로그에 기본 저장하지 않는다.
- 운영 로그는 request id, latency, 상태, item count, fallback 여부처럼 최소 메타만 남긴다.
- 민감정보 탐지 시 사용자에게 제거를 요청하고 provider 전송을 중단한다.
- provider의 학습/보존 정책을 확인하기 전 production 입력을 보내지 않는다.
- clipboard/export에는 provider 응답 metadata를 포함하지 않는다.

## Observability

후보 event:

- `draft_generation_started`
- `draft_generation_cancelled`
- `draft_generation_failed`
- `draft_fallback_used`
- `draft_proposal_reviewed`
- `draft_proposal_saved`

성공 판단은 생성 호출 수가 아니라 다음 비율로 본다.

- proposal 검토율
- item 수정/제외율
- My Flow 저장률
- 저장 후 첫 완료율
- fallback 사용률
- 실패 후 입력 보존률

이 event는 이번 P21-02에서 구현하지 않는다.

## Go/No-Go Checklist

실제 AI implementation slice를 열려면 다음이 모두 필요하다.

- [ ] provider 보존·학습·보안 정책 검토
- [ ] 민감정보 차단 또는 redaction 기준
- [ ] request/response runtime schema와 validator
- [ ] 모든 proposal Item의 SourceRow 근거 또는 명시적 `user-request`와 omission reason
- [ ] source-derived Item 수량과 무일정 Item의 no-ICS invariant
- [ ] deterministic fallback unit test
- [ ] timeout/empty/partial/duplicate/offline E2E fixture
- [ ] 사용자 검토 전 저장·발행 금지 E2E
- [ ] 390px/1024px proposal review UX
- [ ] 비용/latency 상한과 feature flag
- [ ] rollback 시 P21-01만으로 정상 동작
- [ ] legal/privacy review가 필요한 입력 범위 확정

하나라도 충족하지 못하면 No-Go다.

## Service Structure Impact

P21-02는 문서만 추가하므로 현재 route/component/storage/export 구조를 바꾸지 않는다. 실제 구현 때 영향 후보는 `/flows` miss result, URL-first draft service boundary, proposal validator, My Flow save adapter다. `docs/SERVICE_STRUCTURE.md`는 실제 runtime boundary가 생길 때 업데이트한다.

## Tooling And Verification Lane

- UX: `flow-ux-review`, `flow-copy-editor`
- 보안/개인정보: 실제 provider 선택 시 security review
- runtime contract: unit test와 validator
- 사용자 흐름: Playwright 390/1024px
- 문서: `npm.cmd run docs:check`

## Acceptance Criteria

- 실제 AI를 구현하지 않는다.
- AI proposal은 자동 저장·발행·완료되지 않는다.
- source, AI proposal, user overlay 경계가 명확하다.
- source-derived 1..`maxItems` proposal과 기준일/date override 계약이 P21-01 compatibility fallback 및 canonical Item 모델과 호환된다.
- `maxItems`는 처리 상한일 뿐 목표 개수가 아니며, 원문 행을 채우거나 잘라 완성본처럼 표시하지 않는다.
- failure/timeout/partial/duplicate/offline fallback이 정의된다.
- 민감 콘텐츠 gate와 개인정보/로그 최소화 기준이 있다.
- P21-01 결정론적 fallback이 삭제되지 않는다.
