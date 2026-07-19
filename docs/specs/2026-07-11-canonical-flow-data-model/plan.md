# Canonical Flow Data Model v1 Plan

## Purpose

URL, 공식 자료, creator 콘텐츠, 개인 메모에서 만든 Flow가 Calendar, 체크리스트, 표, 메모로 이동해도 같은 의미와 사용자 상태를 유지하도록 백엔드보다 먼저 canonical 계약을 고정한다.

## Delivery Sequence

1. 현재 `FlowBundle`, `FlowSection`, `FlowItem`, 세부 정보, source-backed bridge, 개인 overlay, 실행 상태, export 구현을 인벤토리한다.
2. `SourceRow -> Item -> Step -> Flow -> Bundle` 책임과 `Item` 최소 실행 단위를 확정한다.
3. 카테고리, planning pattern, natural artifact, Item facet을 서로 독립적인 축으로 정의한다.
4. TypeScript reference contract와 대표/예외 golden fixture를 작성하고 자동 검증한다.
5. PostgreSQL/Supabase 저장소, RLS, API 상태, idempotency, version merge 계약을 정한다.
6. current model compatibility adapter와 localStorage 비파괴 migration/rollback 순서를 정한다.
7. 한국어 HTML 검토 보드와 QA 기록을 남긴다.

## First Runtime Slice

| Order | Work | Exit condition |
| ---: | --- | --- |
| 1 | canonical runtime validator | 모든 draft가 저장 전에 v1 계약을 통과하거나 이유와 함께 거절된다. |
| 2 | canonical-to-current adapter | fixture가 현재 `FlowBundle` 화면과 export에 같은 Item 수로 투영된다. |
| 3 | unified effective projection | published version + resolution + overlay + run state가 한 reducer를 거쳐 모든 export에 공급된다. |
| 4 | repository interface | `local`, `shadow-write`, `server-primary` 모드가 같은 도메인 계약을 사용한다. |
| 5 | URL intake fake provider | fetch/extract/generate/validate/review/save 상태와 실패를 실제 LLM 없이 검증한다. |
| 6 | Supabase canary | RLS와 migration이 통과한 내부 사용자만 canonical copy/run을 저장한다. |
| 7 | real LLM provider | privacy, retention, cost, safety 검토 후 canonical draft만 생성한다. |

## Risk Controls

- ICS, XLSX, Markdown을 DB 정본으로 저장하지 않는다.
- published content version과 source snapshot은 수정하지 않고 새 버전만 추가한다.
- AI proposal은 source나 user overlay보다 우선하지 않는다.
- 사용자 title/date/memo/include/progress를 콘텐츠 업데이트가 덮어쓰지 않는다.
- source row가 없는 inferred action은 publish하지 않는다.
- 민감 source, rights, review record, provider raw response는 public API와 분리한다.
- localStorage 원본은 안정화 전 삭제하지 않으며 같은 release에서 destructive DB migration을 하지 않는다.

## Current Slice Result

이 slice는 계약, fixture, validator, 저장소/API 설계, 검토 보드만 만든다. 앱 runtime, DB, Auth, crawler, queue, LLM SDK/API key, public 노출은 변경하지 않는다.
