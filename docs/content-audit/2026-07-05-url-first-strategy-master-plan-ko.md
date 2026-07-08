# FlowMe URL-first 전략 마스터 플랜

**작성일:** 2026-07-05
**상태:** 전략 실행 계획
**연결된 구현 스펙:** [URL Lookup Production Slice](../specs/2026-07-05-url-lookup-production-slice/spec.md)
**핵심 문장:** FlowMe는 외부 URL과 사용자의 메모를 실행 가능한 Flow로 바꾸고, 기존 도구와 My Flow로 이어주는 실행 변환 레이어가 된다.

## 1. 전략 결론

FlowMe의 첫 번째 강한 루프는 "AI가 새 계획을 만들어준다"가 아니다. 사용자가 이미 보고 있는 블로그, 영상, 공식 안내, 체크리스트, 템플릿 URL을 붙이면 FlowMe가 기존 변환본을 먼저 찾아주고, 사용자는 그것을 바로 저장하거나 내 도구로 옮긴다.

따라서 당분간의 우선순위는 다음 순서다.

1. URL을 붙여 기존 Flow를 찾는다.
2. hit 결과는 저장 전 미리보기, export, My Flow 저장으로 이어진다.
3. needs_review 결과는 원문 확인 전 저장/export를 막는다.
4. miss 결과는 AI 생성이 아니라 수집/검토 대기 상태로 둔다.
5. 메모 입력은 중요하지만 URL-first와 export-first가 작동한 뒤 두 번째 진입점으로 확장한다.

## 2. 왜 이 방향인가

| 판단 축 | 결론 | 이유 |
| --- | --- | --- |
| 사용자 가치 | 외부 콘텐츠를 실행 단위로 바꾸는 것이 가장 빠르다 | 사용자는 이미 URL, 블로그, 영상, PDF, 템플릿을 보고 있다. |
| 사업 자산 | canonical URL과 변환된 Flow DB가 누적 자산이다 | 같은 URL은 재사용할 수 있고, 수정/fork/버전 관리로 확장된다. |
| 비용 구조 | lookup-before-AI가 비용을 줄인다 | 모든 URL을 매번 AI로 새로 만들면 비용과 품질 리스크가 커진다. |
| 연결성 | direct OAuth보다 portable export가 먼저다 | Calendar, Markdown, checklist, sheet로 가져갈 수 있으면 초기 가치가 생긴다. |
| 신뢰 | source gate가 없으면 위험하다 | 원문 확인 전 저장/export를 허용하면 잘못된 실행 계획이 퍼질 수 있다. |

## 3. 제품 원칙

### 3.1 URL-first

URL 입력은 `/flows`의 주요 진입점이다. Home을 크게 바꾸지 않고, Flow 찾기 화면에서 "URL로 Flow 찾기"를 제공한다.

### 3.2 Lookup-before-AI

동일 canonical URL의 기존 Flow가 있으면 AI를 호출하지 않는다. 사용자는 기존 Flow를 재사용하고, 필요하면 옵션 변경, 수정, fork로 개인화한다.

### 3.3 Export-first

초기 연결성은 OAuth 통합이 아니라 portable export다. P0 export pack은 `Calendar .ics`, `Markdown`, `checklist`를 우선한다. CSV/sheet, calendar feed, direct integration은 다음 단계다.

### 3.4 Source trust gate

`hit`, `needs_review`, `miss`는 내부 상태지만 제품 판단 기준은 명확해야 한다.

| 상태 | 사용자 의미 | 허용 |
| --- | --- | --- |
| hit | 바로 시작 가능한 기존 Flow가 있음 | 미리보기, export, My Flow 저장 |
| needs_review | 원문 확인이 필요함 | 미리보기만 허용 |
| miss | 아직 변환된 Flow가 없음 | 수집/요청만 허용 |

### 3.5 Memo는 두 번째 진입점

메모-to-Flow는 일상 사용과 retention에 중요하다. 다만 P0에서는 URL-first를 흐리지 않도록 별도 보조 루프로 둔다.

### 3.6 AI는 fallback

AI는 miss URL 또는 품질이 약한 변환을 보완하는 fallback이다. 첫 public UX에서 "URL을 넣으면 AI가 새로 만들어준다"는 기대를 만들지 않는다.

## 4. 실행 로드맵

### Phase 1. URL-first P0 루프 확정

**목표:** `/flows`에서 URL을 붙이면 기존 Flow를 찾고, 사용자가 저장 전 미리보기와 export 기대값을 이해한다.

**범위:**

- `/flows` 상단 URL lookup entry
- hit / needs_review / miss 사용자 문구
- 최소 3개 이상 canary URL hit
- AI 생성 disabled
- mobile 390px overflow 없는 화면
- fake usage, fake review, fake social proof 금지

**완료 기준:**

- URL lookup production slice QA가 통과한다.
- hit 결과에서 사용자가 다음 행동을 한 번에 이해한다.
- catalog가 lookup entry 아래에서 계속 보인다.
- 내부 상태어가 사용자 화면의 주요 문구로 노출되지 않는다.

### Phase 2. Export Pack v1

**목표:** Flow를 FlowMe 안에 가두지 않고 사용자의 기존 도구로 옮길 수 있게 한다.

**범위:**

- Calendar `.ics`
- Markdown/Obsidian friendly text
- checklist copy
- source URL, checked date, caution 포함
- Step 단위 export regeneration

**완료 기준:**

- 상위 canary 5~8개에서 export가 자연스럽다.
- 캘린더형, 체크리스트형, 진도표형 Flow가 각각 깨지지 않는다.
- 민감 영역은 조언처럼 보이지 않고 확인/기록/문의 상태로 남는다.

### Phase 3. Source/Version/Trust Ledger

**목표:** FlowMe의 핵심 자산인 source-to-Flow 변환 DB를 신뢰 가능한 상태로 만든다.

**범위:**

- canonical URL
- source title/site/author
- first converted date
- last reviewed date
- source status
- source hash 또는 snapshot reference
- Flow version
- personal edit/fork origin

**완료 기준:**

- 같은 URL의 중복 생성을 막을 수 있다.
- 오래된 Flow를 stale 상태로 표시할 수 있다.
- user edit과 source-backed fact를 분리할 수 있다.

### Phase 4. Canary Content Portfolio

**목표:** 6개가 아니라 유형별 8~12개 canary로 FlowMe의 반복 가능성을 검증한다.

**권장 mix:**

| 유형 | 후보 예시 | 검증 목적 |
| --- | --- | --- |
| 이사 | 아정당 이사 체크리스트 | D-day, checklist, lead-back 가능성 |
| 학습 | 오픽/중학수학 | 진도표, 반복 학습, export |
| 여행 | KKday 준비물 | 체크리스트, 구매/예약 backlink |
| 웨딩 | 12개월 타임라인 | 긴 timeline, 개인화 |
| 식단/생활 | 도시락 식단표 | remix/fork 가능성 |
| 차량 | 신차 구매/정기검사 | 결정/보류 상태 |
| 공식 trust anchor | 예방접종/행정/가전 | source gate, 민감 경계 |
| 크리에이터 루틴 | 홈트/면접/공부 영상 | creator promotion 가능성 |

**완료 기준:**

- 각 canary가 어떤 artifact로 자연스럽게 변환되는지 설명된다.
- source/import 권리 또는 민감 위험이 표시된다.
- community/fork 후보와 trust anchor 후보를 섞는다.

### Phase 5. My Flow Continuation

**목표:** export 후에도 사용자가 FlowMe에 실행 기록을 이어갈 이유를 만든다.

**범위:**

- 저장한 Flow의 Today/Calendar/My Flow 연결
- Step 체크, memo, 재-export
- 수정된 Step 값으로 export 재생성
- 완료/보류/다음 행동 기록

**완료 기준:**

- 저장 후 사용자가 다시 돌아올 이유가 명확하다.
- My Flow가 거대한 프로젝트 관리 도구처럼 보이지 않는다.
- Step detail이 calendar/todo detail처럼 가볍다.

### Phase 6. Memo-to-Flow

**목표:** 사용자가 평소 메모하듯 쓴 계획을 FlowMe의 Step/Item 구조로 정리한다.

**범위:**

- 짧은 메모 입력
- 시간/마감/반복/누락 체크 추출
- 관련 기존 Flow 추천
- My Flow에 draft로 저장

**완료 기준:**

- URL-first와 같은 데이터 모델로 수렴한다.
- daily planner처럼 과도하게 커지지 않는다.
- 사용자가 "가볍게 쓴다"는 감각을 유지한다.

### Phase 7. Growth / Creator / Integration

**목표:** 검증된 URL-first와 export-first 루프 위에 제작자, 공유, 자동화 연결을 얹는다.

**후순위 후보:**

- creator backlink package
- public share/fork link
- bookmarklet/share URL
- calendar feed
- Google/Todoist/Notion/Sheets direct integration
- AI fallback queue
- MCP/Zapier connector

**전제 조건:**

- URL lookup과 export가 반복 사용된다.
- source/version/trust ledger가 작동한다.
- edit/fork가 최소형으로 검증된다.

## 5. 지금 보류할 것

- Home hero 전면 재설계
- AI-first generator
- direct OAuth integration 선행
- full editor/diff/version graph
- creator marketplace
- 실제 근거 없는 사용량/리뷰/social proof
- memo-first daily planner 전환

## 6. 전략 검토 질문

1. 사용자가 `/flows`를 URL 붙이는 장소로 이해하는가?
2. hit 결과의 첫 행동은 "보기", "저장", "export" 중 무엇이 가장 자연스러운가?
3. export pack v1은 `.ics + Markdown + checklist`로 충분한가?
4. needs_review 상태에서 어디까지 보여줘야 신뢰를 잃지 않는가?
5. canary 8~12개가 실제로 서로 다른 artifact 유형을 대표하는가?
6. My Flow는 export 후 retention을 만들 만큼 가볍고 유용한가?
7. memo-to-Flow는 언제 전면화해야 URL-first를 흐리지 않는가?

## 7. 첫 번째 목표

아래 목표는 다음 채팅이나 작업 세션에 그대로 붙여 넣을 수 있다.

```text
/goal
FlowMe의 첫 번째 전략 목표는 URL-first P0 루프를 CEO 보고 수준으로 확정하는 것이다.

범위:
- 현재 `/flows` URL lookup production slice의 실제 구현, QA, 문서 상태를 재검토한다.
- hit / needs_review / miss 흐름이 사용자 관점에서 명확한지 확인한다.
- 내부 상태어, fake usage, AI-first 기대, 과도한 Home redesign이 섞이지 않았는지 점검한다.
- 대표 canary URL 8~12개를 유형별로 재정리하고, 각 후보가 Calendar / Markdown / checklist / sheet / My Flow 중 어떤 artifact로 자연스럽게 이어지는지 표로 만든다.
- Export pack v1 범위를 `.ics`, Markdown, checklist 중심으로 확정할 수 있는지 검토한다.
- source/version/trust ledger에 필요한 최소 필드를 정리한다.

산출물:
- `docs/content-audit/`에 CEO/임원용 한국어 HTML 보고서 1개를 만든다.
- 보고서는 글 나열이 아니라 요약, 숫자/표, 루프 다이어그램, canary 비교표, P0/P1/P2 우선순위, 의사결정 필요 항목을 포함한다.
- 연결된 근거 문서와 구현 스펙 링크를 보고서 안에 명확히 건다.

검증:
- 문서 링크가 깨지지 않도록 `npm.cmd run docs:check`를 실행한다.
- 구현 검증을 새로 주장할 경우 기존 QA 파일 또는 실제 명령 결과만 근거로 쓴다.
```

## 8. 관련 근거 문서

- [FlowMe 전체 Production 계획](./2026-07-05-flowme-integrated-production-plan-ko.html)
- [URL-first Production 적용 방향](./2026-07-05-url-first-production-direction-review-ko.html)
- [URL-first P0 Lab 구현 계획](./2026-07-05-url-first-p0-lab-implementation-plan-ko.md)
- [생산성 도구 연결성 우선순위 리서치](./2026-07-04-productivity-connectivity-priority-research-ko.md)
- [웹 소스 커뮤니티/제작자 루프 검증 리뷰](./2026-07-05-web-source-community-creator-loop-review-ko.md)
- [콘텐츠 소스 확장 계획](./2026-07-04-content-source-expansion-plan-ko.md)
- [URL Lookup Production Slice Spec](../specs/2026-07-05-url-lookup-production-slice/spec.md)
- [URL Lookup Production Slice QA](../specs/2026-07-05-url-lookup-production-slice/qa.md)
- [SERVICE_STRUCTURE](../SERVICE_STRUCTURE.md)
- [DECISIONS](../DECISIONS.md)
- [IDEAS](../IDEAS.md)
