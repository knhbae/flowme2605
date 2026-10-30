# 문서 지도

2026-10-30 13:00 KST · 총괄 갱신

어떤 내용을 어디서 찾는지 정리한 표다. 기타 세션의 맥락 문서 점검(10/30)을 바탕으로 했다. 전체 표는 `D:/flowme-claude-scratch/misc/feedback-ideas-inventory-20261030/SOURCES.md`, 점검 내용은 같은 폴더의 `CONTEXT-GAPS.md`에 있다.

## 지금 상태와 할 일

| 찾는 것 | 정본 | 비고 |
| --- | --- | --- |
| 지금 상태 한 장 | [now.md](now.md) | 폰에서 먼저 읽는다 |
| 순서·갈래·사용자 몫 | [backlog.md](backlog.md) | 코덱스 진행판 구성을 따름 |
| 담당과 쓰는 경로 | [owners.md](owners.md) | 두 세션이 같은 파일에 쓰지 않게 한다 |
| 결정 | [decision-log.md](decision-log.md) | 추가만 한다 |
| 남은 피드백·아이디어 | [ideas.md](ideas.md) | 전체 표는 scratch |
| repo의 예전 상태 문서 | repo `docs/PROJECT_CONTROL.md`·`STATUS.md`·`ROADMAP.md` | 10/29까지 코덱스가 관리. 지금은 위키가 앞선다(5단계 뒤 정리) |

## 제품 맥락

| 찾는 것 | 지금 있는 곳 | 현재성 |
| --- | --- | --- |
| 제품 맥락 한 장 | [product.md](product.md) | 최신(10/30). 원칙 정본화(7f) 초안 포함 |
| 원칙 | repo `agent.md`(8/06), `docs/PRODUCT_PRINCIPLES.md`(5/24) | 낡음: export-first, 계정·소셜 금지가 Alpha와 맞지 않음 → [product.md](product.md) 7절 초안으로 7f에서 개정 |
| 결정 | repo `docs/DECISIONS.md`(10/26) + 이 위키 결정 기록 | 둘로 나뉨 |
| 서비스 구조 | repo `docs/SERVICE_STRUCTURE.md`(8/20) | 낡음: `/alpha` 없음 |
| 요구·누락 기능 | `planning/requirements-review-20261029/`, `planning/feature-gap-20261030/` | 최신 |
| 쓰기 방식 A | `planning/writing-model-20261029/` | 최신 |
| Flow 콘텐츠 | `planning/flow-content-20261030/FC-SPEC.md`, `ux/20261030/flow-content/` | 최신 |
| 공식 콘텐츠 | `planning/feature-gap-20261030/drafts/OFFICIAL-DRAFTS.md`, `PUBLISH-DAY-CHECKLIST.md` | 최신 |
| 사용자 9/28 피드백 원장 | repo 체크아웃 `docs/content-audit/2026-09-28-flowme-use-feedback-session-ko.md` | 미커밋 |
| 초기 비전(1월) | Notion FlowMe 루트·기능 페이지 | 어디에도 연결 안 됨 → 제품 맥락 한 장에 넣음 |

(`planning/`과 `ux/`는 `D:/flowme-claude-scratch/` 아래다.)

## 운영과 시스템

| 찾는 것 | 지금 있는 곳 | 현재성 |
| --- | --- | --- |
| Alpha 운영 구조(supervisor, 터널, 포트, 지우면 안 되는 곳) | supervisor README(10/03), 회차별 controller, 총괄 메모리 | 흩어짐. 런북 없음 → 작성 중 |
| 배포·롤백 절차 | 회차별 원장 `D:/flowme-alpha-today-classification-20261029-01a168e3/revision4/operations/` | 회차마다 복사됨. 런북에 한 번 정리 |
| Supabase 함수·테이블·마이그레이션 | #218 브랜치(M2~M7.2), 실제 DB | main에 없음. 자료 구조 문서 없음 → 작성 중 |
| 계정 자료 형식(문서, 제작 도구 데이터) | 코드 `lib/flow/integrated-poc/`와 실제 DB | 문서 없음. egress 진단에서 크기 내역만 확인 |
| 라벨 뜻(R·S·W·FC·C·P·M) | [glossary.md](glossary.md) | 최신(10/30) |

## 규칙이 어긋나는 곳

| 주제 | 어긋남 | 상태 |
| --- | --- | --- |
| 운영 배포 | main AGENTS.md "검사 통과 뒤 스스로", 9/21 기반 AGENTS.md "명시 승인 없이는 안 함", workspace AGENTS.md "검사 통과 뒤 스스로 판단", 위키 "명령마다 사용자 승인" | 10/30 결정: 검사·QA 통과 뒤 총괄 판단, DB·권한은 따로 승인. 위키를 고침. 9/21 기반 사본은 낡음 |
| 상태 정본 | AGENTS.md는 PROJECT_CONTROL·STATUS·ROADMAP을 가리킴, 실제로는 위키 | 5단계 때 AGENTS.md에 위키 추가 |
| 코덱스 위임 | AGENTS.md `codex exec -s read-only`, 실제로는 총괄 스레드 `codex queue` | 5단계 때 한 줄 추가 |

[진행판](backlog.md) · [아이디어·피드백 선반](ideas.md) · [지금 FlowMe](now.md)
