# 2026-07-04 생산성 도구 연결성 기반 FLOW 기능 우선순위 리서치

## 상태

- 문서 유형: 리서치 기반 백로그 재정렬
- 구현 상태: 미구현, 제품 방향 및 우선순위 정리
- 검토 기준일: 2026-07-04
- 읽기용 HTML: [생산성 도구 연결성 우선순위 보드](./2026-07-04-productivity-connectivity-priority-research-ko.html)
- 관련 기존 문서: [Flow 사용 입구 백로그](./2026-07-02-flow-usage-entry-backlog-ko.md), [Claude 진입점 기획 요약](./2026-07-04-claude-entry-ux-plan-summary-ko.md)

## 결론

FLOW의 다음 기능 순서는 "AI가 새 계획을 많이 만들어주는 서비스"가 아니라 "이미 존재하는 컨텐츠와 기존 생산성 도구 사이를 실행 가능한 구조로 번역하는 서비스"를 기준으로 잡아야 한다.

따라서 다음 목표는 다음 네 가지다.

1. URL을 먼저 찾고, 이미 변환된 Flow가 있으면 재사용한다.
2. 사용자가 쓰는 캘린더, 투두, 노트, 시트로 바로 가져갈 수 있는 export를 먼저 완성한다.
3. AI는 중복 URL이 없거나 변환 품질이 부족할 때만 쓰는 fallback으로 둔다.
4. My Flow와 memo-to-Flow는 중요하지만, URL-first와 export-first가 작동한 뒤 일상 사용 루프로 확장한다.

## 리서치 기준

가중치는 사용자가 말한 "비즈니스적, 사용성적 중요도"를 중심에 두고, 외부 도구 연결성과 구현 리스크를 보조 기준으로 뒀다.

| 기준 | 가중치 | 판단 질문 |
| --- | ---: | --- |
| 비즈니스 임팩트 | 40 | 유입, 재방문, 데이터 자산, 공유 루프, 수익화 가능성을 만들 수 있는가 |
| 사용성 임팩트 | 35 | Obsidian, 기존 투두/캘린더 사용자 기준선보다 덜 귀찮은가 |
| 외부 도구 연결성 | 15 | Google, Outlook, Todoist, Notion, Obsidian, 시트, 자동화 도구와 이어지기 쉬운가 |
| 구현/운영 리스크 | 10 | 지금 만들었을 때 비용, 개인정보, 유지보수, 품질 리스크가 낮은가 |

점수는 각 항목 0-5점으로 두고 `비즈니스*8 + 사용성*7 + 연결성*3 + 구현성*2`로 환산했다. 구현성은 쉬울수록 높은 점수다.

## 외부 서비스에서 확인한 트렌드

### 1. 캘린더와 태스크 통합은 기본값이 됐다

Todoist는 Google/Outlook 이벤트와 time-blocked task를 Today/Upcoming에서 함께 보여주고, task를 calendar layout으로 다룬다. 단, 외부 캘린더 이벤트는 Todoist 안에서 읽기 중심이며 원본 캘린더에서 편집하게 한다. Google Calendar도 Tasks를 날짜가 있는 항목으로 캘린더에 표시하고 수정할 수 있게 한다. Microsoft Outlook은 My Day에서 Calendar와 To Do를 한 화면에 보여준다.

FLOW에 주는 의미: FLOW가 새 캘린더가 될 필요는 없다. 대신 Step을 날짜, 기간, 마감, 반복, 원문 링크가 있는 일정/태스크 단위로 내보내야 한다.

### 2. AI 자동 스케줄링은 강하지만 P0 경쟁축은 아니다

Motion은 AI Calendar Assistant와 auto-scheduling으로 태스크를 빈 시간, 마감, 우선순위에 따라 배치한다. Reclaim도 task, habit, break, focus time을 Google/Outlook calendar에 자동 배치한다.

FLOW에 주는 의미: FLOW가 Motion/Reclaim처럼 full auto-scheduler가 되면 제품 경계와 구현 비용이 커진다. 초반에는 auto-scheduling이 먹을 수 있는 구조화 데이터, 즉 duration, due date, priority, source를 잘 내보내는 쪽이 맞다.

### 3. 노트/클리핑/Markdown은 여전히 강한 기준선이다

Obsidian Web Clipper는 웹 페이지와 metadata를 durable offline files로 저장하고 template을 제공한다. Readwise Reader는 highlight를 note-taking app으로 sync/export하고, Markdown 다운로드와 템플릿 커스터마이즈를 제공한다.

FLOW에 주는 의미: Obsidian/Notion/메모 사용자는 "앱 안에 가둔다"보다 "원문 링크와 체크리스트가 있는 Markdown으로 예쁘게 빼준다"에 더 빨리 반응할 가능성이 높다.

### 4. AI agent와 MCP/자동화 연결은 커지고 있다

Akiflow는 AI가 task/calendar를 create/edit/plan/reschedule할 수 있는 hosted MCP server를 공개했다. Zapier MCP는 AI 도구를 수천 개 앱과 액션에 연결하는 방향을 강조한다.

FLOW에 주는 의미: 장기적으로 FLOW도 API, MCP, Zapier류 connector가 필요할 수 있다. 그러나 P0은 connector가 아니라 portable export와 명확한 데이터 모델이다. connector는 표준 export 사용이 반복된 뒤에 붙이는 편이 맞다.

### 5. Daily planning은 별도 습관으로 남아 있다

Sunsama는 Google/Outlook/Apple calendar를 연결하고, task를 calendar로 timebox하며, daily planning 루프를 제공한다. 중요한 점은 Sunsama도 기존 캘린더를 대체하기보다 연결하는 모델을 취한다.

FLOW에 주는 의미: memo-to-Flow는 일상화와 확산에 중요하지만, 초반부터 full daily planner가 되면 FLOW의 핵심인 source-to-execution이 흐려진다.

## 기능 후보 점수표

| 순위 | 기능 후보 | 비즈니스 | 사용성 | 연결성 | 구현성 | 총점 | 분류 | 판단 |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Export pack: ICS, Markdown, clipboard, source attribution | 4.5 | 5.0 | 5.0 | 4.5 | 95.0 | P0 | 기존 도구 사용자에게 즉시 가치가 있다. |
| 2 | URL canonical lookup + 기존 Flow 재사용 | 5.0 | 4.5 | 3.5 | 4.0 | 90.0 | P0 | acquisition, 비용 절감, 데이터 자산을 동시에 만든다. |
| 3 | Markdown/Obsidian export template + frontmatter | 4.0 | 4.5 | 4.5 | 4.0 | 85.0 | P0/P1 | Obsidian/Readwise 기준선에 맞춘다. |
| 4 | Saved Steps calendar feed/subscription | 4.0 | 4.5 | 5.0 | 2.5 | 83.5 | P1 | one-time ICS보다 강하지만 계정/개인정보 설계가 필요하다. |
| 5 | Web clipper/share URL/bookmarklet entry | 4.0 | 4.5 | 4.0 | 2.5 | 80.5 | P1/P2 | URL 입력 마찰을 줄인다. 시작은 bookmarklet/share URL이 적당하다. |
| 6 | Thin options/edit layer | 4.0 | 4.5 | 3.0 | 3.5 | 79.5 | P0/P1 | 시작일, 목적지, 제목, 날짜, 메모 수정이 없으면 재사용이 막힌다. |
| 7 | Source/version/trust ledger | 5.0 | 3.5 | 3.0 | 3.0 | 79.5 | P0/P1 | 신뢰, 법적 안전, 중복 URL 재사용의 핵심 기반이다. |
| 8 | Memo-to-Flow lightweight input | 3.5 | 4.5 | 4.0 | 3.0 | 77.5 | P2 | 일상화에는 중요하지만 URL/export 검증 후가 낫다. |
| 9 | My Flow execution hub continuation | 4.0 | 4.0 | 3.0 | 3.0 | 75.0 | P1 | 저장, 진행, 재-export의 retention 루프다. |
| 10 | Direct OAuth integrations: Google/Todoist/Notion/Sheets | 3.5 | 4.0 | 5.0 | 1.5 | 74.0 | P2/Later | 가치가 크지만 유지보수, 권한, 정책 리스크가 높다. |
| 11 | AI generation fallback with cost gate | 4.0 | 3.5 | 2.5 | 2.0 | 68.0 | P1/P2 | 공급 확장에는 필요하지만 기본 경로가 되면 비용과 품질 리스크가 커진다. |
| 12 | Zapier/MCP/automation connector | 3.5 | 2.5 | 5.0 | 2.0 | 64.5 | P2/Later | 생태계 신호는 강하지만 사용자 P0은 아니다. |
| 13 | Creator / Flow Pack / Flow of Flows | 4.5 | 2.5 | 2.0 | 1.5 | 62.5 | Later | 플랫폼 잠재력은 크지만 단일 Flow 실행 검증 뒤가 맞다. |
| 14 | 실사용 전 public social proof count | 1.0 | 2.0 | 1.0 | 4.0 | 33.0 | Do not build | 신뢰 원칙을 깨고 사용자 기대를 왜곡한다. |

## 재정렬된 백로그

### P0 - 지금 논의하고 바로 설계해야 할 것

1. URL canonical lookup
   - 입력: 원문 URL
   - 동작: canonical URL 정규화, 기존 Flow hit 확인, hit이면 AI 호출 없이 기존 Flow 제공
   - 필요한 최소 데이터: canonical_url, source_title, source_site, source_author, first_converted_at, last_reviewed_at, source_hash 또는 snapshot reference

2. Export pack
   - Calendar: `.ics` download, 날짜/기간/원문 링크/설명
   - Todo: plain checklist, copyable task list, due date text
   - Markdown: heading, checklist, source link, optional frontmatter
   - Sheet/Excel: CSV 또는 table copy 우선, XLSX는 이후

3. Thin options/edit layer
   - 시작일 변경
   - 강도/기간 옵션
   - Step title, date, memo, skip/keep 수정
   - export destination 선택

4. Source/version/trust metadata
   - 원문을 근거로 변환했다는 표시
   - 검토일/변환일/수정일 분리
   - "N명이 사용" 같은 근거 없는 social proof 금지

### P1 - P0가 작동하면 다음으로 붙일 것

1. Markdown/Obsidian template profile
   - daily note, project note, checklist note 형태로 export
   - YAML frontmatter, tags, source URL, Flow ID 포함

2. Calendar feed/subscription
   - saved Flow Steps를 subscribe 가능한 calendar feed로 제공
   - 계정, privacy token, revoke, timezone 정책 필요

3. My Flow continuation
   - 저장한 Flow에서 진행 상태, 수정, 재-export를 이어감
   - external export 후에도 FLOW에 실행 기록이 남는 루프

4. AI fallback with cost gate
   - URL lookup miss일 때만 변환 요청
   - 동일 URL 중복 생성 방지
   - AI 비용 추적, quality review, source gate 필요

5. Bookmarklet/share URL entry
   - browser extension보다 먼저 가벼운 URL 전달 경로 제공
   - 모바일 share sheet는 별도 P2 후보

### P2 - 중요하지만 지금은 뒤로 둘 것

1. Memo-to-Flow direct input
   - 사용자가 평소 메모하듯 쓴 계획을 Step/Item으로 정리
   - URL-first 검증 후 daily habit 확장으로 다룬다.

2. Web clipper/browser extension/mobile share sheet
   - capture friction은 크게 줄지만 배포/권한/브라우저별 관리가 필요하다.

3. Zapier/MCP/automation connector
   - AI agent 시대에 맞는 방향이지만, 표준 export 사용 패턴이 먼저 쌓여야 한다.

4. Direct OAuth integrations
   - Google Calendar, Todoist, Notion, Sheets direct push는 매력적이지만 정책/권한/오류처리 비용이 크다.

### Later

1. Creator / Flow Pack / Flow of Flows
2. Marketplace, payment, token model
3. Motion/Reclaim식 full auto-scheduler
4. Notion/Obsidian workspace replacement

### Do not build

1. 실제 근거 없는 사용량, 리뷰 수, creator 인증 표시
2. AI-first generation을 기본 경로로 두는 UX
3. thin edit 검증 전 heavy editor/diff/version graph
4. portable export 검증 전 direct integration부터 만드는 접근

## URL-first 전략과의 충돌/보강

### 보강되는 점

- URL lookup은 AI 비용을 낮춘다. 같은 URL이면 기존 Flow를 보여주고, 옵션만 바꾸게 하면 된다.
- Export pack은 FLOW 계정 없이도 첫 가치를 만든다. 이는 "남이 만든 계획을 내 도구로 복사"하는 초기 사용성에 맞다.
- Source/version/trust ledger는 중복 URL 재사용과 fork/edit의 근거가 된다.
- Markdown export는 Obsidian/Notion/메모 사용자 기준선을 직접 만족시킨다.

### 충돌하는 점

- Direct OAuth integration을 너무 빨리 만들면 URL-first 검증보다 권한/동기화/오류 처리로 개발이 소모된다.
- memo-to-Flow를 너무 빨리 전면화하면 FLOW가 generic daily planner처럼 보일 수 있다.
- AI fallback을 너무 앞세우면 사용자는 "URL을 넣으면 항상 AI가 새로 생성"한다고 기대하고, 비용과 품질 관리가 어려워진다.
- creator platform을 너무 빨리 강조하면 실제 유입 루프보다 공급자 도구가 먼저 커진다.

## 다음 토의 주제 추천

가장 먼저 깊게 토의할 주제는 `URL canonical lookup + Export pack`을 하나의 첫 사용자 여정으로 묶는 것이다.

검토해야 할 구체 질문은 다음이다.

1. 사용자가 URL을 넣었을 때 hit, miss, low-quality hit를 어떻게 보여줄 것인가.
2. hit가 있을 때 옵션 변경과 thin edit의 최소 범위를 어디까지 둘 것인가.
3. 첫 export 목적지를 Calendar, Todo, Markdown 중 무엇으로 기본 노출할 것인가.
4. 계정 없이 가능한 복사/다운로드와 로그인 후 저장되는 My Flow 경계를 어디에 둘 것인가.
5. 원문 컨텐츠 주인에게 자연스럽게 돌아가는 공유/comment 링크를 언제부터 실험할 것인가.

## 참고한 공식 자료

- [Todoist calendar integration](https://www.todoist.com/help/articles/use-the-calendar-integration-rCqwLCt3G)
- [Obsidian Web Clipper](https://obsidian.md/clipper)
- [Notion Calendar](https://www.notion.com/product/calendar)
- [Google Calendar Tasks](https://support.google.com/calendar/answer/9901136?co=GENIE.Platform%3DDesktop&hl=en)
- [Microsoft Outlook My Day with To Do](https://support.microsoft.com/en-us/outlook/calendar/use-my-day-with-to-do-in-outlook)
- [Motion](https://www.usemotion.com/)
- [Motion auto-scheduling](https://www.usemotion.com/help/time-management/auto-scheduling)
- [Reclaim](https://reclaim.ai/)
- [Reclaim integrations](https://reclaim.ai/integrations)
- [Akiflow](https://akiflow.com/)
- [Akiflow MCP release](https://product.akiflow.com/changelog/sunny-akiflow-summer-release)
- [Zapier MCP](https://zapier.com/mcp)
- [Readwise Reader export](https://docs.readwise.io/reader/docs/faqs/exporting)
- [Readwise Markdown/CSV export](https://docs.readwise.io/readwise/docs/exporting-highlights/markdown-csv)
- [Sunsama calendar integrations](https://help.sunsama.com/docs/integrations/calendar/)
- [Sunsama daily planning](https://help.sunsama.com/docs/usage-guides/daily-planning/)
