# 2026-07-02 Flow 활용 입구 백로그

## 상태

- 문서 유형: 제품 방향 백로그
- 구현 상태: 미구현
- 기준선: 현재 4탭 IA와 My Flow v2.1 실행 UX를 유지한다.
- 검증 상태: 아이디어/백로그 정리이며 실제 사용자 검증이 아니다.
- 읽기용 HTML: [Flow 활용 입구 백로그 보드](./2026-07-02-flow-usage-entry-backlog-ko.html)

## 핵심 판단

FLOW는 새 생산성 앱을 처음부터 대체하는 서비스가 아니라, 사용자가 이미 쓰는 캘린더, 투두, 엑셀, 메모, Notion, Obsidian으로 실행 구조를 옮기기 쉽게 만드는 레이어로 출발한다.

초기 획득 모델은 외부 컨텐츠에 FlowMe 링크가 이미 붙어 있는 상태가 아니다. 더 현실적인 1차 입구는 사용자가 블로그, 유튜브, 사이트, PDF, 커뮤니티 글 URL을 FlowMe에 넣고 Flow 초안을 만드는 것이다. 같은 URL이 이미 변환되어 있으면 기존 Flow를 먼저 보여주고, 사용자는 옵션만 바꾸거나 마음에 들지 않는 부분을 수정/fork한다. 이후 누군가 원컨텐츠 댓글이나 공유 경로에 FlowMe 링크를 남기면서 원컨텐츠 주인이 그 Flow를 발견하고 더 공식적으로 활용하는 루프가 생길 수 있다.

따라서 입구는 여러 개일 수 있지만, 결과 모델은 하나로 수렴해야 한다.

```text
원컨텐츠 URL 또는 개인 메모
-> URL 중복 확인 / 기존 Flow 제안
-> Flow 초안
-> Step / Item / Memo / Source / Export 구조
-> 옵션 선택 / 수정 / fork
-> 기존 도구로 복사하거나 My Flow에서 계속 실행
-> 실행 기록과 수정이 다음 Flow 개선 근거가 됨
-> 공유 링크가 원컨텐츠 쪽으로 되돌아가 제작자/원작자 adoption 루프를 만들 수 있음
```

## 사용성 기준선

기준 사용자는 새 업무 관리 앱을 배우고 싶은 사람이 아니라 이미 아래 도구 중 하나를 쓰는 사람이다.

- 캘린더 사용자: 날짜, 반복, 짧은 일정 제목, 알림, 다음 일정이 중요하다.
- 투두 사용자: 오늘 할 일, 완료 체크, 우선순위, 미룬 항목이 중요하다.
- 엑셀/시트 사용자: 행, 열, 상태, 비교, 진행률, 내보내기 품질이 중요하다.
- 메모/Obsidian/Notion 사용자: 긴 맥락, 원문 링크, 체크리스트, 회고, 수정 가능성이 중요하다.

FLOW 화면의 기본 복잡도는 캘린더/투두/메모 앱 수준을 넘지 않아야 한다. 더 복잡한 구조는 저장 후 상세, 검토 리포트, 제작자 도구, 또는 향후 고급 기능으로 내려간다.

## 공통 모델

| 단위 | 역할 | 외부 도구로 내려갈 때 |
| --- | --- | --- |
| Flow | 사용자가 저장하거나 공유하는 실행 묶음 | 캘린더 묶음, 체크리스트, 시트, 메모 문서, 공유 링크 |
| Step | 캘린더/투두/시트에 저장되는 최소 실행 단위 | 일정, 할 일, 시트 행, 체크리스트 heading |
| Item | Step 안의 체크/메모/detail | 하위 체크, 본문 텍스트, 메모 fallback |
| Memo | 배경, 원문 링크, 옵션, 예외, 개인 기록 | Notion/Obsidian 본문, 일정 설명, 시트 note |
| Source | 원문, 제작자, 버전, 변환 근거 | 링크, 출처 표기, 업데이트 참고 |
| Export | 사용자가 기존 도구로 옮기는 결과 | ICS, CSV/XLSX, Markdown, plain text, clipboard |

## 백로그

### FUB-01 - 외부 컨텐츠의 FlowMe 링크 진입

**사용자 상황:** 블로그, 유튜브, 사이트, 강의, PDF, 책, 커뮤니티 글을 보다가 "이대로 따라 하고 싶다"는 순간 FlowMe 링크를 누른다.

**제품 작업:** 링크 또는 팝업/카드가 뜨고, 사용자는 시작일이나 최소 옵션만 고른 뒤 캘린더, 투두, 엑셀, 메모로 복사한다.

**현재 연결:** 최종적으로는 강한 distribution 경험이지만, 초기에는 원컨텐츠 쪽에 FlowMe 링크가 이미 붙어 있다고 가정하지 않는다. 직접 URL 변환과 공유/댓글 루프가 먼저 생긴 뒤 확장되는 후행 입구다.

**다음 검토:** 직접 URL 변환으로 만들어진 Flow 링크가 원컨텐츠 댓글, 커뮤니티 공유, 제작자 채널에 자연스럽게 붙을 수 있는지 유통 루프를 검토한다.

### FUB-02 - 기존 도구별 export 품질 기준

**사용자 상황:** 같은 Flow라도 캘린더 사용자는 짧은 일정과 반복을 원하고, Obsidian 사용자는 원문 맥락과 체크리스트 본문을 원한다.

**제품 작업:** destination별 출력 기준을 정의한다.

- Calendar: 짧은 제목, 날짜, 반복, 설명, 원문 URL
- Todo: 한 줄 action, 완료 기준, 메모 fallback
- Sheet/Excel: 행/열, 상태, 날짜, source row, 메모
- Markdown/Obsidian/Notion: heading, checklist, 원문 링크, 개인 메모, 회고 섹션

**현재 연결:** Step은 최소 export 단위, Item은 text fallback으로 내려간다는 My Flow v2.1 기준과 연결된다.

**다음 검토:** 대표 콘텐츠 2~3개를 각 destination으로 내보냈을 때 결과물이 어색하지 않은지 샘플 출력으로 검토한다.

### FUB-03 - 직접 URL을 Flow 초안으로 변환

**사용자 상황:** 사용자가 FlowMe 안에 URL을 붙여넣고 "이 글/영상/자료를 실행 계획으로 바꿔줘"라고 한다.

**제품 작업:** URL을 canonicalize하고 기존 변환 결과가 있는지 먼저 확인한다. 중복 URL이면 기존 Flow를 보여주고 옵션만 바꿔 쓰게 한다. 기존 결과가 없거나 마음에 들지 않으면 source row를 먼저 보여주고, 변환 가능한 구조인지 판정한 뒤 Flow 초안을 만든다. 원문 row가 없으면 Flow를 억지로 만들지 않고 Park 또는 보류로 남긴다.

**현재 연결:** `docs/flow-rules/source-to-flow-conversion-gate.md`의 `one original source -> one user job -> one natural artifact -> minimal execution UI` 원칙과 연결된다.

**다음 검토:** URL 입력을 1차 획득 모델로 올리고, 자동 생성보다 먼저 `URL 입력 -> 기존 Flow 확인 -> source row 확인 -> 초안 preview -> 옵션 선택/export`의 얇은 PoC를 설계한다.

### FUB-04 - 메모형 계획을 Flow 초안으로 정리

**사용자 상황:** 사용자가 평소처럼 메모장, Notion, Obsidian에 오늘/이번 주 계획을 가볍게 적는다.

**제품 작업:** FLOW가 메모를 강제로 폼으로 바꾸지 않고, 날짜 후보, 할 일 후보, 누락된 확인 항목, 관련 Flow, 반복 가능성을 제안한다.

**현재 연결:** `docs/IDEAS.md`의 `Lightweight daily memo intake`와 연결된다.

**다음 검토:** 첫 화면은 큰 텍스트 입력 또는 paste 영역에 가깝게 두고, 카테고리/우선순위/시간 입력은 자동 제안 또는 선택형으로 낮춘다.

### FUB-05 - 개인 Flow 초안에서 공유 Flow로 승격

**사용자 상황:** 사용자가 자기 메모를 정리해 실행하다가 다른 사람에게도 유용하다고 판단해 공유하고 싶어진다.

**제품 작업:** 개인 초안과 공개/공유 Flow를 분리한다.

```text
개인 메모
-> 개인 Flow 초안
-> 실행하며 수정
-> 공유 가능성 점검
-> 출처/주의/완료 기준 정리
-> 공유 Flow 또는 제작자 Flow로 승격
```

**현재 연결:** 사용자 화면과 검토/제작자 화면을 분리해야 한다는 현재 서비스 구조와 연결된다.

**다음 검토:** 공유 전 필수 점검 항목을 정한다. 예: 원문 출처, 본인 경험 메모, 민감 영역 주의, 원문에 없는 Step 제거, export 샘플 확인.

### FUB-06 - 출처, 작성자, 버전, 내 복사본의 관계

**사용자 상황:** 같은 URL을 여러 사용자가 넣는다. 어떤 사용자는 기존 Flow를 그대로 쓰고, 어떤 사용자는 옵션만 바꾸고, 어떤 사용자는 구조를 수정/fork한다. 이후 원본 Flow나 source가 업데이트될 수 있다.

**제품 작업:** canonical URL, 기존 변환 Flow, 작성자/수정자, sourceTrace, 버전, 내 복사본, 내 수정 사항, fork 관계를 분리한다.

**현재 연결:** saved Flow Map persistence와 Step contract 방향, source-backed Flow Map 구조와 연결된다.

**다음 검토:** "이 URL로 만든 Flow가 이미 있어요", "옵션만 바꿔 쓰기", "내 버전으로 수정", "원본 업데이트 알림", "내 복사본 유지"를 사용자에게 부담스럽지 않게 보여주는 copy와 상태를 설계한다.

### FUB-07 - 실행 기록이 Flow 개선으로 돌아오는 루프

**사용자 상황:** 사용자가 저장한 Flow를 체크하고, 미루고, 날짜를 바꾸고, 메모를 남긴다.

**제품 작업:** 이 행동을 검증으로 과장하지 않고 footprint로 축적한다.

- 저장
- export
- check
- 날짜 수정
- 메모 추가
- 재방문
- 다시 export
- feedback

**현재 연결:** v0.2.0 Evidence Capture, honest review/usage signals, experience value data 아이디어와 연결된다.

**다음 검토:** 실제 사용자 검증 전에는 공개 카드에 fake count를 쓰지 않고, 내부 리포트에서만 "관찰된 행동"으로 분리한다.

### FUB-08 - My Flow는 저장 후 계속 쓰는 곳으로 유지

**사용자 상황:** 사용자가 외부 도구로 export했지만, FlowMe에도 저장해 두고 나중에 다시 열어본다.

**제품 작업:** My Flow는 전체 생산성 앱이 아니라 저장한 Flow의 실행 inbox와 구조 관리 공간이다. 다만 현재 앱처럼 고정 구조만 보여주면 URL 변환/개인 메모에서 온 Flow를 실제로 쓰기 어렵기 때문에, Step 날짜, 제목, 메모, 반복, Item, export destination을 쉽게 수정하는 UX가 필요하다.

- `오늘`: 오늘 또는 가까운 다음 Step 실행
- `Flow`: 저장한 Flow 구조와 진행률
- `캘린더`: dated Step을 보는 글로벌 실행 탭

**현재 연결:** My Flow v2.1 기준선과 4탭 IA를 유지한다.

**다음 검토:** 메모/URL/외부 Flow 링크에서 들어온 Flow도 같은 My Flow 기준선으로 자연스럽게 들어오는지 확인한다.

### FUB-11 - Flow 수정 UX와 fork/edit 경험

**사용자 상황:** URL로 생성된 Flow나 기존 URL Flow가 대체로 맞지만, 내 상황과 맞지 않는 Step, 날짜, 제목, 메모, Item이 있다.

**제품 작업:** 사용자가 전체 editor로 들어가지 않아도 핵심 실행 단위를 쉽게 고칠 수 있게 한다.

- 옵션만 바꾸기: 시작일, 목표일, 반복, 대상 조건
- Step 수정: 제목, 날짜, 메모, 완료 기준, export destination
- Item 수정: 체크 항목 추가/삭제/수정
- 내 버전 만들기: 원본 Flow를 깨지 않고 fork/copy
- 공유 전 정리: 원문에 없는 Step 제거, 출처/주의/완료 기준 확인

**현재 연결:** My Flow Step detail export, saved Flow Map persistence, 개인 초안에서 공유 Flow로 승격하는 흐름과 연결된다.

**다음 검토:** "수정"을 제작자 도구처럼 무겁게 만들지 않고, 캘린더/투두 detail을 고치는 수준으로 낮춘 모바일 UX를 먼저 본다.

### FUB-09 - 제작자/채널/Flow Pack 확장

**사용자 상황:** 제작자나 사이트 운영자가 여러 Flow를 묶어 제공한다. 예: 공부 커리큘럼, 운동 루틴 묶음, 육아 월령별 자료, 이사 준비 패키지.

**제품 작업:** Flow Pack은 flat bundle이 아니라 `Flow of Flows`로 다룬다. 부모 Flow 아래 section/subgroup/child Flow가 있고, 각 child Flow는 여전히 calendar, sheet, checklist, memo artifact를 만든다.

**현재 연결:** Creator experience map, Flow Pack as Flow of Flows 아이디어와 연결된다.

**다음 검토:** 대표 콘텐츠 품질이 먼저 정리된 뒤, 제작자 확장 PoC에서 parent Flow 저장과 child Flow 개별 저장을 함께 검토한다.

### FUB-10 - 신뢰 신호와 선택 기준

**사용자 상황:** 사용자가 Flow 찾기에서 어떤 Flow를 저장해야 할지 판단한다.

**제품 작업:** 실제 사용량이나 리뷰가 없을 때는 fake social proof를 쓰지 않는다. 대신 source-backed 신호를 보여준다.

- 원문 출처
- 제작자 맥락
- 저장 후 결과물
- 입력 수
- Step 수
- 업데이트일
- 미리보기 항목
- export destination

**현재 연결:** 2026-07-02 service-readiness handoff의 홈/Flow 찾기 신뢰 신호 작업과 연결된다.

**다음 검토:** Home은 서비스 약속과 대표 시작점, Flow 찾기는 catalog로 역할을 나누고 내부 평가 문구는 사용자 화면에서 제거한다.

## 우선순위 제안

### 지금 가까운 작업

1. FUB-03 직접 URL을 Flow 초안으로 변환
2. FUB-06 출처/작성자/버전/복사본/중복 URL 관계
3. FUB-11 Flow 수정 UX와 fork/edit 경험
4. FUB-02 기존 도구별 export 품질 기준
5. FUB-08 My Flow 기준선 유지

이 다섯 가지는 초기 획득을 URL-first로 볼 때 바로 필요한 기준이다. 자동 완성형 제품을 먼저 크게 만들기보다, 중복 URL 재사용, source row 확인, 얇은 수정, export 품질, My Flow 실행 기준선을 먼저 본다.

### 다음 PoC 후보

1. FUB-04 메모형 계획을 Flow 초안으로 정리
2. FUB-05 개인 Flow 초안에서 공유 Flow로 승격
3. FUB-10 신뢰 신호와 선택 기준
4. FUB-07 실행 기록 기반 개선 루프

이 네 가지는 Flow를 일상화하고 더 퍼뜨리는 루프다. 개인 메모가 Flow 초안이 되고, 수정한 Flow가 공유되고, 실행 기록이 다음 Flow 개선과 신뢰 신호가 되는지를 본다.

### 나중에 열 작업

1. FUB-01 외부 컨텐츠의 FlowMe 링크 진입
2. FUB-09 제작자/채널/Flow Pack 확장

이 두 가지는 원컨텐츠 주인이나 제작자가 FlowMe 링크를 직접 붙이는 단계다. 사용자가 먼저 URL로 Flow를 만들고 공유/댓글로 되돌려 보내는 루프가 생긴 뒤 더 자연스럽게 열린다.

## 지금 만들지 않을 것

- 완전한 Notion/Obsidian 대체 workspace
- 자동 공개 발행
- Google Calendar, Todoist, Notion, Sheets 직접 계정 연동
- fake review, fake active-use count, 검증되지 않은 사용량 신호
- marketplace, 결제, 토큰, creator monetization
- 민감 영역에서 FLOW가 의료/법률/재무 판단을 대신하는 기능

## 다음 세션 사용법

대표 콘텐츠/홈/Flow 찾기 작업을 시작할 때 이 문서를 백로그 기준으로 읽는다.

권장 시작 순서:

1. URL-first 흐름을 기준으로 대표 원컨텐츠 2~3개를 고른다.
2. 각 URL이 기존 Flow 재사용, source row 확인, 초안 preview, 옵션 선택, export destination을 가질 수 있는지 점검한다.
3. 고정된 실행 구조만 보여주지 말고, Step/Item/메모/날짜를 사용자가 쉽게 수정할 수 있는 UX를 같이 본다.
4. 사용자 화면에는 신뢰 신호와 결과 미리보기만 남기고, 내부 평가와 점수는 검토 리포트로 분리한다.
5. 메모 입구는 URL-first 다음 PoC로 두되, 같은 Flow 모델로 수렴하는지 텍스트 모델부터 만든다.
