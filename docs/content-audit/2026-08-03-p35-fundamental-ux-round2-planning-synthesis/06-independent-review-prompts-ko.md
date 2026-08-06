# P35 근본 UX 2차 독립 검토 프롬프트와 교차 종합 순서

> 상태: `PRE_APPROVAL_REVIEW_PROMPT_SNAPSHOT`
>
> 현재 포인터: Owner는 2026-08-04에 `Q1-B / Q2-B / Q3-B`를 승인했다. 이 문서는 승인 전 독립 검토 절차를 역사 자료로 보존하며, 현재 결정은 [Owner 승인 기록](./02-p35-round2-owner-decisions-ko.md), 구현 정본은 [active spec](../../specs/2026-08-04-p35-round2-bounded-ux-correction/README.md), 실행 입력은 [B/B/B 개발 착수 프롬프트](./08-bbb-approved-developer-kickoff-prompt-ko.md)를 따른다.
>
> 작업 성격: `planning-only`
>
> 금지: 앱·제품 문구·테스트 수정, commit, push, PR, merge, 배포, 외부 서비스 변경
>
> 사용자 관찰: `observed_user = 0`

## 이 문서의 목적

이 문서는 P35 근본 UX 2차 검토를 다시 실행하거나 보완할 때 바로 복사해 쓸 수 있는 세 묶음으로 구성한다.

1. 로컬 저장소·실제 runtime·데이터·상태 전이를 확인하는 **Codex 독립 검토 프롬프트**
2. 공개된 handoff와 현재 화면 증거만 보고 IA·visual hierarchy·copy를 검토하는 **Claude Design 독립 검토 프롬프트**
3. 두 독립 결과가 끝난 뒤에만 실행하는 **교차 종합 프롬프트와 순서**

목표는 누가 더 맞는지 고르는 것이 아니다. Codex가 확인할 수 있는 구현 사실과 Claude Design이 제안하는 화면·정보 구조를 분리한 뒤, 공통점·이견·증거 공백을 owner가 결정할 수 있는 MVP 기획안으로 바꾸는 것이다.

## 이번 재검토에서 반드시 보존할 범위

- 이전 Claude Design 검토는 새 `2026-08-03-p35-fundamental-ux-round2-handoff` 폴더와 Codex 로컬 결과를 보지 못한 상태에서 수행되었다. 그 결과는 유효한 독립 visual/IA 제안이지만, 새 handoff 전체와 U01~U10을 검토한 결과로 소급해서 부르면 안 된다.
- 이전 Claude 결과의 `사용자 해결안 반증 01~08`은 handoff의 `U01~U10`과 같은 ID 체계가 아니다.
- 이전 Claude 결과의 `P1~P8`, `D1~D2`는 제안 화면 ID다. 사용자 피드백 `U01~U10`으로 바꾸거나 직접 1:1 대응시키지 않는다.
- 우선순위 `P0/P1`과 제안 화면 `P1`도 다른 개념이다. 종합 문서에서는 각각 `priority:P0`, `priority:P1`, `Claude/P1`처럼 적어 혼동을 막는다.
- 정적 캡처, 브라우저 재현, 코드 추적, 자동 테스트, 전문가 시뮬레이션은 실제 사용자 관찰이 아니다. 이번 자료에서 `observed_user`는 계속 `0`이다.
- 구현되지 않은 wireframe과 화면 사양은 `Proposal` 또는 `제안`이다. `After`, `반영 완료`, `검증 완료`라고 쓰지 않는다.
- 캘린더·Todo·체크리스트·시트·메모 다섯 이름을 검토하되 모든 Flow에 고정 5형식을 강제하지 않는다. 형식은 canonical Item/Step/Flow의 목적지별 projection이며 콘텐츠 capability와 정보 손실을 기준으로 노출한다.
- 이번 문서와 산출물은 기획 검토용이다. owner 승인 전에는 구현 backlog를 확정하거나 현재 제품 사실을 바꾸지 않는다.

## 검토 실행 전 입력 고정

두 독립 검토를 시작하기 전에 진행자가 다음을 확인한다.

1. 로컬 기준 worktree, branch, HEAD, upstream, dirty path를 기록한다.
2. Claude가 열 수 있는 **불변 GitHub commit URL**로 handoff README와 01~09 문서를 각각 직접 열어 본다.
3. 14개 현재 화면 캡처와 이전 Before/After 보고서가 링크에서 실제로 보이는지 확인한다.
4. 두 검토자에게 같은 U01~U10 정의와 같은 scorecard를 제공한다.
5. Codex와 Claude의 독립 단계가 끝날 때까지 서로의 결론·점수·권장안을 보여주지 않는다.
6. 각 결과에 입력 manifest를 남긴다. 읽은 파일, 열지 못한 파일, 기준 commit, 확인 일시를 분리한다.

Claude가 새 handoff를 열 수 없다면 과거 자료만으로 계속 진행시키지 않는다. 접근 실패 목록을 남기고 해당 독립 검토를 `blocked_by_missing_input`으로 종료한다.

---

## 1. Codex용 로컬 runtime/data/state 독립 검토 프롬프트

아래 `역할`부터 `종료 조건`까지를 새 Codex 작업에 복사한다.

### 역할

당신은 FlowMe P35의 구현자가 아니라 **로컬 runtime·데이터·상태 구조 독립 검토자**다. 화면의 미세한 문구나 색상을 먼저 고치지 말고 다음 네 계약이 현재 코드와 실제 상태에서 어떻게 작동하는지 확인한다.

1. `내 Flow`의 첫 역할과 Today·저장 라이브러리·선택 계획 관리의 관계
2. 공개 상세→편집→저장→저장된 계획→실행/내보내기의 생명주기와 행동 소유권
3. canonical Item/Step/Flow와 캘린더·Todo·체크리스트·시트·메모 projection의 관계
4. 공개 초안과 저장된 개인 계획 편집의 필드·적용·취소·오류·복구 계약

이번 작업은 내부 로컬 검토다. 실제 사용자 관찰이나 UXR로 쓰지 말고 결과 전체에 `observed_user = 0`을 명시한다.

### 작업 위치와 안전 경계

- 기준 worktree: `D:\flowme2605\flow-p35-production-mobile-p0`
- 예상 branch: `codex/p35-production-mobile-p0`
- 과거 UI 기준점: `b215698`. 단, 시작 시 현재 HEAD를 다시 기록하고 차이가 있으면 무엇이 바뀌었는지 먼저 분리한다.
- 저장소의 `AGENTS.md`, `agent.md`와 요청 경로 문서를 먼저 따른다.
- 현재 worktree의 pre-existing dirty path는 모두 다른 작업자의 것으로 간주한다.
- `D:\flowme2605\flow-mvp`나 다른 checkout의 코드·상태·결과를 현재 기준으로 섞지 않는다.
- 앱 코드, 제품 카피, fixture, 테스트, 설정을 수정하지 않는다.
- 검토용 결과 문서와 캡처만 진행자가 지정한 새 결과 폴더에 만들 수 있다.
- commit, push, PR, merge, 배포, 외부 계정 데이터 생성·삭제를 하지 않는다.

### 입력 자료

다음 폴더의 문서를 UTF-8 원문으로 읽는다.

`docs/content-audit/2026-08-03-p35-fundamental-ux-round2-handoff/`

필수 순서:

1. `README.md`
2. `01-owner-feedback-normalized-ko.md`
3. `02-fundamental-review-brief-ko.md`
4. `03-current-state-evidence-map-ko.md`
5. `04-benchmark-study-brief-ko.md`
6. `05-simulation-scenarios-ko.md`
7. `08-review-scorecard-ko.md`
8. 이전 `2026-08-03-p35-feedback-before-after` 보고서와 이미지
9. 현재 저장소의 제품 원칙, 서비스 구조, canonical data model, Flow quality·UX copy 규칙

Claude Design 결과는 이 독립 단계에서 읽지 않는다. 이미 열었다면 독립성이 깨졌음을 결과 첫머리에 적고, 그 영향을 받은 주장과 영향을 받지 않은 runtime 사실을 구분한다.

### ID 체계

U01~U10은 반드시 `01-owner-feedback-normalized-ko.md`의 사용자 피드백 ID 그대로 사용한다.

| ID | 검토 주제 |
|---|---|
| U01 | 공개/저장 후 내보내기 소유권 |
| U02 | 도움·주의 노출 규칙 |
| U03 | `내 Flow` 전체 IA |
| U04 | Item 상세의 정보·색상·카피 감산 |
| U05 | Flow Map 3칸 요약 |
| U06 | 시작일 입력과 반복 확인 문구 |
| U07 | 상세 CTA·여러 형식·저장 직후 이동 |
| U08 | 공개/저장 후 편집기 계약 |
| U09 | 공개 상세·더보기·편집·형식 미리보기 역할 |
| U10 | `Flow` 용어 이해와 사용자 언어 |

U ID를 화면 번호나 구현 작업 번호로 재사용하지 않는다.

### 1-A. 기준선과 증거 manifest

먼저 다음을 기록한다.

```text
branch:
HEAD:
upstream:
dirty paths before review:
runtime command/build:
base URL:
viewport/timezone/locale:
storage/fixture state:
read inputs:
missing inputs:
observed_user: 0
```

관찰마다 증거 종류를 붙인다.

- `runtime_observed`: 실제 실행 화면과 연속 상태에서 확인
- `code_confirmed`: 파일·함수·테스트로 확인
- `static_evidence`: 캡처·문서에만 있음
- `inference`: 여러 근거에서 추론했지만 직접 확인하지 못함
- `TBD`: 현재 범위에서 확인 불가
- `proposal`: 앞으로의 설계 제안

자동 테스트가 존재한다는 이유만으로 사용자 이해나 실제 외부 전송 성공을 `O`로 판정하지 않는다.

### 1-B. 데이터에서 projection까지 추적

대표 대상을 최소 다음 네 개 포함한다.

- `/f/moving-d30-basic`
- `/f/vehicle-inspection-prep`
- `/f/curated-allblanc-morning-workout`
- `/flow-maps/middle-school-math-1`

각 대상에서 아래 연결을 추적한다.

```text
source/slug
→ SourceRow 또는 원본 데이터
→ canonical Item/Step/Flow
→ public preview
→ 공개 편집 초안
→ personal saved state/overlay
→ Today·저장 라이브러리·선택 계획
→ calendar/todo/checklist/sheet/memo preview 또는 export
```

다음 표를 작성한다.

| 대표 Flow | 원본·canonical 위치 | ID 보존 | 공개/저장 공통 renderer | capability 분기 | legacy 전용 경로 | 개인 수정 반영 | 형식별 손실 | 판정 |
|---|---|---|---|---|---|---|---|---|

컴포넌트 이름이 같다는 사실만으로 같은 데이터 계약이라고 결론 내리지 않는다. 제목·순서·기준일·Item 날짜·메모·제외 상태·완료 기준·출처·전송 버전이 어느 계층에서 바뀌고 어느 결과까지 전달되는지 확인한다.

### 1-C. 실제 상태 전이

`05-simulation-scenarios-ko.md`의 S01~S13을 가능한 범위에서 실행한다. 최소 포함 상태는 다음과 같다.

- 저장 데이터 0개인 첫 공개 상세
- 기준일 선택·변경·삭제와 날짜 없음
- 공개 Flow/Item 편집의 적용·취소·닫기·뒤로가기
- 저장과 저장 영수증 또는 저장 후 상세 진입
- 저장 전 공개 내보내기와 저장 후 내보내기
- `지금 할 일 / 저장한 Flow / 선택 Flow 상세`
- 저장된 Flow/Item 수정·메모·완료·완료 취소
- Flow Map 3칸·별도 편집·하위 구조
- 날짜형·날짜 없음·반복·안전 주의 Flow
- 390×844 모바일과 1440px 데스크톱
- 가능한 합법적 fixture가 있을 때만 저장 계획 0·1·5·20개와 Item 1·50개

fixture가 없으면 화면 DOM이나 저장소를 임의로 꾸며 성공한 것처럼 캡처하지 않는다. 확인하지 못한 극단값은 `TBD`다.

각 전이는 다음 형식으로 남긴다.

| 이전 상태 | 행동 | 화면에 보인 결과 | 실제 데이터 변화 | 다음 진입 결과 | 뒤로가기/취소 | 오류·복구 | 증거 |
|---|---|---|---|---|---|---|---|

### 1-D. 내보내기와 형식 capability

다음을 코드와 runtime에서 따로 확인한다.

- 현재 화면 미리보기 형식과 실제 내보내기 형식의 정확한 목록
- Todo와 체크리스트가 데이터·파일·사용자 행동에서 실제로 다른지
- 날짜 없는 Item의 Calendar 포함·제외 규칙
- 공개와 저장 후 전송이 어느 버전의 데이터를 쓰는지
- 개인 수정 후 재전송이 생성·갱신·중복 중 무엇을 뜻하는지
- 실패, 권한 거절, 부분 성공, 취소, 재시도, 중복 방지, 전송 이력
- 화면 표시 개수와 실제 결과 개수의 일치 여부

다섯 형식을 채우기 위한 데이터나 결과를 만들지 않는다. 각 대표 Flow를 다음 capability로 분류한다.

| 형식 | `primary` | `available` | `conditional` | `unavailable` | 근거·정보 손실 |
|---|---|---|---|---|---|

- `primary`: 이 콘텐츠의 가장 자연스러운 실행 결과
- `available`: 현재 데이터로 의미 있게 만들 수 있음
- `conditional`: 날짜·구조화·사용자 선택 등 조건이 필요함
- `unavailable`: 현재 데이터로 만들면 비거나 의미가 손실됨

Todo와 체크리스트를 분리할 근거가 없으면 이를 구현 사실로 적고, 합치거나 나누는 결정은 제안으로 분리한다.

### 1-E. 공통 editor와 transaction

공개 Flow, 공개 Item, 저장된 Flow, 저장된 Item, Flow Map 편집을 비교한다.

| 편집기 | surface | 읽는 상태 | 쓰는 상태 | 필드 | 적용/저장 의미 | 취소·닫기 | unsaved 경고 | 오류 후 보존 | 위치·초점 복귀 |
|---|---|---|---|---|---|---|---|---|---|

공개 초안과 저장된 개인 상태는 화면 모양이 같아도 transaction이 다를 수 있다. session draft, persisted overlay, 실행 기록, export identity를 섞지 않는다.

별도 page, 전체 높이 sheet/dialog, 인라인 세 안을 비교하되 현재 구현 사실과 권장안을 별도 열에 둔다.

### 1-F. `내 Flow` IA와 생명주기 대안

최소 다음 세 안을 비교한다.

- A: Today 우선 + 저장 라이브러리 보조
- B: 저장 계획 우선 + Today 파생 섹션/링크
- C: 저장 직후와 일반 재방문이 다른 문맥형 진입

0·1·5·20개 계획, 날짜 없음, 오늘 할 일 없음, 완료·보관, 방금 저장한 상태에서 첫 행동·탐색 비용·예측 가능성을 적는다. `experiment=off`를 현재 기본 UX로 오인하지 않는다.

내보내기도 다음 세 안을 비교한다.

- A: 공개는 미리보기, 저장 후에만 실제 전송
- B: 공개 빠른 전송과 저장 후 개인 수정본 전송 병존
- C: capability와 수정 여부에 따른 제한적 저장 없는 전송

클릭 수가 아니라 데이터 버전, 저장 강제, 중복, 실패 복구, export-first 원칙을 기준으로 평가한다.

### 1-G. U01~U10 판정과 반증

각 ID를 빠짐없이 작성한다.

| ID | 현재 사실 | 사용자 의도 | 현재 판정 | 유지할 것 | 그대로 채택할 위험 | 대안 | 추가 검증 |
|---|---|---|---|---|---|---|---|

판정은 `채택 / 의도 채택·해결법 수정 / 일부 채택 / 기각 / 검증 필요` 중 하나다. 최소 세 개의 사용자 해결안에는 반증 또는 조건부 채택 근거를 제시한다.

특히 다음을 그대로 정답 처리하지 않는다.

- 내보내기는 무조건 `내 Flow`에서만 한다.
- 모든 도움과 주의를 아이콘 뒤에 둔다.
- 모든 Flow에 다섯 형식을 보여준다.
- 하단 CTA를 `편집 / 완료`로 통일한다.
- Flow Map 세 칸을 전부 삭제한다.
- 공개·저장 후 편집을 완전히 같은 화면으로 만든다.
- 사용자 화면의 `Flow`를 전면 치환한다.

### 1-H. 결과물

진행자가 지정한 새 폴더에 다음을 작성한다. 기존 결과를 덮어쓰지 않는다.

1. `README.md`: 기준 commit, manifest, 한 줄 판정, `observed_user = 0`
2. `01-runtime-state-findings-ko.md`
3. `02-data-projection-integrity-ko.md`
4. `03-lifecycle-ownership-options-ko.md`
5. `04-my-flow-ia-options-ko.md`
6. `05-editor-transaction-contract-ko.md`
7. `06-u01-u10-evidence-table-ko.md`
8. `07-scorecard-ko.md`
9. `screenshots/`: 시나리오 ID·viewport·상태가 파일명에 드러나는 연속 캡처

각 제안에는 해결 문제, 근거, 삭제되는 중복, 새 상태·예외, canonical 영향, 접근성·안전 영향, legacy 영향, 비용, 되돌리기, 검증 방법을 적는다.

### 종료 조건

- U01~U10이 정확한 ID로 모두 판정됨
- 네 가지 근본 계약에 현재 사실·대안·권장·기각 이유가 있음
- representative Flow의 데이터→projection 추적 근거가 있음
- 지원 형식과 정보 손실이 확인/미확인으로 나뉨
- 공개·저장 editor의 transaction 차이가 있음
- runtime·code·static·inference·proposal·TBD가 섞이지 않음
- 실제 사용자 관찰을 했다고 쓰지 않고 `observed_user = 0` 유지
- app/runtime 파일이 수정되지 않음

---

## 2. Claude Design용 독립 visual/IA/copy 검토 프롬프트

아래 `역할`부터 `종료 조건`까지를 Claude Design에 복사한다. 먼저 `{{HANDOFF_GITHUB_BASE_URL}}`을 새 handoff 폴더가 실제로 공개된 불변 commit URL로 바꾼다.

### 역할

당신은 FlowMe P35의 **독립 visual/IA/copy 검토자**다. 사용자 피드백을 그대로 화면으로 옮기거나 예쁜 UI를 만드는 역할이 아니다. 현재 화면에서 상태·주 행동·정보 위계가 읽히는지 검토하고, 공개 상세→편집→저장→내 계획→실행/내보내기가 하나의 예측 가능한 관계가 되도록 제안한다.

이번 검토에서는 로컬 코드와 실제 저장 데이터에 접근할 수 없다. 화면에 보이지 않는 동작을 구현 사실처럼 쓰지 말고 `자료로 확인`, `설계 추론`, `로컬 확인 필요`, `제안`을 구분한다.

이 작업은 디자인 전문가의 내부 시뮬레이션이다. 실제 사용자 관찰이나 UXR이 아니며 `observed_user = 0`이다.

### 독립성·입력 완전성 규칙

이전 Claude 검토는 새 handoff와 Codex 로컬 결과를 보지 못했다. 이번에는 다음 절차를 지킨다.

1. 먼저 `{{HANDOFF_GITHUB_BASE_URL}}/README.md`와 01~09 문서를 각각 열 수 있는지 확인한다.
2. 14개 현재 화면 캡처와 이전 Before/After 보고서가 보이는지 확인한다.
3. 접근하지 못한 자료가 있으면 파일명을 적고 중단한다. 과거 캡처나 기억으로 대체하지 않는다.
4. 독립 검토가 끝날 때까지 Codex 결과 폴더·요약·점수·권장안을 보지 않는다.
5. 이미 Codex 결론을 읽었다면 독립 검토라고 표기하지 말고 `cross-informed review`로 범위를 낮춘다.

### 필수 입력

- `{{HANDOFF_GITHUB_BASE_URL}}/README.md`
- `01-owner-feedback-normalized-ko.md`
- `02-fundamental-review-brief-ko.md`
- `03-current-state-evidence-map-ko.md`
- `04-benchmark-study-brief-ko.md`
- `05-simulation-scenarios-ko.md`
- `08-review-scorecard-ko.md`
- 이전 P35 Before/After 보고서
- 위 문서에 연결된 현재 캡처 14개

입력 manifest에 읽은 URL, 열지 못한 URL, 기준 commit을 적는다.

### ID 체계: 절대 혼동 금지

- `U01~U10`: owner feedback ID. 반드시 10개 모두 `01-owner-feedback-normalized-ko.md` 정의로 평가한다.
- `Claude/P1~P8`: 390×844 제안 화면 ID.
- `Claude/D1~D2`: 1440px 제안 화면 ID.
- `priority:P0/P1`: 구현 우선순위 후보.

U01~U10을 Claude/P1~P8·D1~D2로 바꾸지 않는다. 화면이 여러 U 항목을 해결할 수 있으므로 제안 화면에는 `related_feedback: [U03, U07, ...]`처럼 다대다로 연결한다.

### 2-A. 5초 상태·행동 지도

다음 상태마다 사용자가 5초 안에 알아야 할 것을 적는다.

- 공개 계획 상세
- 공개 계획 편집
- 공개 Item 편집
- 저장 완료 직후
- `내 Flow` 첫 화면
- 저장된 계획 상세
- Item 상세
- 형식 미리보기
- 실제 외부 전송
- 오류·재시도·미저장 변경 상태

| 화면/상태 | 사용자가 있는 곳 | 얻는 결과 | 주 행동 1개 | 보조 행동 최대 1개 | 다음 상태 | 뒤로가기 | 삭제할 정보 | 항상 남길 정보 |
|---|---|---|---|---|---|---|---|---|

현재 화면에서 실제로 보이는 것은 `Before`, 새로 그린 것은 `Proposal`로 표기한다. 구현 확인을 받기 전에는 `After`라고 쓰지 않는다.

### 2-B. `내 Flow` IA 세 안

다음 안을 0·1·5·20개 계획, 저장 직후, 일반 재방문, 날짜 없음, 오늘 할 일 없음, 완료·보관 상태로 비교한다.

- A: Today 우선
- B: 저장 계획 우선 + Today 파생 섹션/링크
- C: 저장 직후와 일반 재방문이 다른 문맥형 진입

각 안의 모바일 wireflow와 기각 이유를 만들고 하나를 권장한다. 다른 앱의 무거운 프로젝트 계층·대시보드·필터를 그대로 복사하지 않는다.

### 2-C. 생명주기와 내보내기 소유권

아래 세 안을 비교한다.

- A: 공개는 미리보기만, 저장된 내 계획이 실제 전송 소유
- B: 공개 빠른 전송과 저장 후 개인 수정본 전송 병존
- C: 수정 여부와 capability에 따른 조건부 저장 없는 전송

화면 수가 아니라 다음을 평가한다.

- 사용자가 어느 버전을 옮기는지 아는가
- 저장을 강제하는가
- 수정 후 재전송과 중복을 예측하는가
- 실패·권한 거절·재시도·취소 경로가 보이는가
- FlowMe의 export-first 약속과 맞는가

`완료`는 실제 Item 실행 완료와 저장 완료를 동시에 뜻하게 만들지 않는다. CTA는 클릭 뒤 결과를 말해야 한다.

### 2-D. 하나의 계획과 여러 결과 형식

캘린더·Todo·체크리스트·시트·메모를 검토하되 모든 Flow에 고정 5탭을 만들지 않는다.

대표 콘텐츠별로 다음을 제안한다.

| 대표 콘텐츠 | primary | available 최대 2개 | conditional + 해결 CTA | unavailable + 이유 | preview와 실제 전송의 차이 |
|---|---|---|---|---|---|

- 자연스러운 결과 1개가 먼저 보인다.
- 현재 만들 수 있는 보조 결과만 노출한다.
- 조건부 형식은 날짜 지정·구조화 등 해결 행동을 함께 제시한다.
- 불가 형식은 정상 탭처럼 두지 않는다.
- Todo와 체크리스트를 분리할 명확한 사용자 차이가 없으면 통합안을 비교한다.
- 숫자 5를 맞추기 위한 빈 결과나 가짜 결과를 만들지 않는다.

이 설계는 canonical 데이터 구조를 새로 확정하는 작업이 아니다. 데이터 동작은 `로컬 확인 필요`로 남긴다.

### 2-E. 공통 editor family

공개 계획·공개 Item·저장 계획·저장 Item·Flow Map 편집을 하나의 화면 family로 정리한다. 다음 surface를 비교한다.

- 별도 page
- 전체 높이 sheet/dialog
- 기존 내용 아래 인라인

필드 순서, 행 구성, 주 행동 위치, 닫기, 뒤로가기, 미저장 경고, 오류, 재시도, 초점 복귀는 공통 문법으로 제안한다. 공개 초안의 `변경 반영`과 저장된 개인 계획의 `저장`처럼 transaction 의미를 구분할 필요가 있는지 명시한다.

연속 상태는 최소 다음을 포함한다.

1. 편집 진입
2. 계획 이름·기준일·Item 목록
3. Item 상세 편집
4. 변경이 있는 닫기·버리기 확인
5. 적용/저장 성공
6. 오류 후 기존 상태와 입력 유지·재시도

### 2-F. progressive disclosure·안전·copy

현재 설명과 주의를 네 등급으로 분류한다.

- 삭제
- `? 도움말`로 이동
- 짧은 한 줄 + 상세 확장
- 반드시 항상 표시

운동·건강·안전, 개인정보, 중복 생성, 되돌릴 수 없는 전송은 아이콘 안에만 숨기지 않는다. 도움말·popover·inline disclosure·bottom sheet·modal의 사용 조건을 구분하고 44px 안팎 터치 영역, 접근 가능한 이름, 뒤로가기, 닫은 뒤 초점 복귀를 명세한다.

다음 용어와 CTA를 실제 화면 문장으로 비교한다.

- `Flow / 계획 / 실행 계획 / 저장한 계획`
- `내 Flow / 내 계획`
- `완료 / 내 계획에 저장 / 저장하고 시작`
- `수정 / 항목 수정`
- `더보기 / 결과 보기 / 다른 형식 보기`
- `내 도구로 옮기기 / 내보내기`

브랜드 FLOW와 사용자 행동 언어를 분리하는 안, 사용자 화면에서 단계적으로 `계획`으로 바꾸는 안을 모두 비교한다.

### 2-G. U01~U10과 사용자 해결안 반증

U01~U10을 모두 다음 표로 평가한다.

| U ID | 사용자 의도 | 현재 화면 근거 | 채택 수준 | 그대로 적용할 위험 | 수정 제안 | related proposal screens | 로컬 확인 필요 |
|---|---|---|---|---|---|---|---|

채택 수준은 `채택 / 의도 채택·해결법 수정 / 일부 채택 / 기각 / 검증 필요`를 사용한다. 최소 세 개는 사용자 제안을 그대로 채택하지 않는 이유와 의도를 살린 대안을 함께 제시한다.

### 2-H. 제안 화면

390×844 기준 `Claude/P1~P8`을 만든다.

1. `Claude/P1`: 공개 계획 상세와 형식 미리보기 진입
2. `Claude/P2`: 결과 형식 선택·조건·불가 이유
3. `Claude/P3`: 공통 계획 편집
4. `Claude/P4`: Item 편집과 오류/복구
5. `Claude/P5`: 저장 직후 선택된 내 계획 상세
6. `Claude/P6`: `내 Flow` 첫 화면
7. `Claude/P7`: Item 상세
8. `Claude/P8`: 실제 전송 범위·형식·버전·결과 확인

1440px에서 같은 IA를 확장한 화면을 만든다.

9. `Claude/D1`: `내 Flow` 목록과 선택 계획
10. `Claude/D2`: 선택 계획과 Item inspector

화면마다 다음을 붙인다.

```text
proposal ID:
related_feedback: [Uxx, ...]
source evidence:
design inference:
local verification needed:
primary action:
secondary action:
removed elements:
empty/error/back behavior:
accessibility notes:
```

제안 화면을 `After`라고 부르지 않는다. 현재 캡처와 1:1로 대응하지 않는 새 상태에는 `Before 없음`을 표시한다.

### 2-I. 결과물

하나의 zip 또는 열람 가능한 폴더로 다음을 제출한다.

1. `README.md`: 입력 manifest, 한 줄 판정, `observed_user = 0`
2. `01-root-findings-ko.md`
3. `02-lifecycle-and-ownership-ko.md`
4. `03-my-flow-ia-options-ko.md`
5. `04-editor-and-projection-system-ko.md`
6. `05-copy-and-disclosure-ko.md`
7. `06-u01-u10-review-ko.md`
8. `07-screen-spec-ko.md`
9. `08-scorecard-ko.md`
10. `wireframes/`: Claude/P1~P8, Claude/D1~D2

각 결론은 `자료로 확인 / 설계 추론 / 로컬 확인 필요 / 권장 / 기각` 중 하나 이상을 붙인다.

### 종료 조건

- 새 handoff의 U01~U10을 정확히 모두 평가함
- Claude/P1~P8·D1~D2와 U01~U10을 혼동하지 않음
- Codex 결과를 보기 전에 독립안이 완성됨
- 고정 5형식을 강제하지 않고 capability와 손실을 표시함
- 제안 화면을 `Proposal`로만 표시함
- `observed_user = 0`이며 실제 UXR이라고 주장하지 않음
- 자료로 확인할 수 없는 runtime·저장·내보내기 동작은 `로컬 확인 필요`로 남김

---

## 3. 독립 검토 완료 후 교차 종합 순서

교차 종합은 Codex와 Claude Design이 각각 종료 조건을 충족한 뒤에만 시작한다.

### Step 0. 독립성·완전성 gate

다음 중 하나라도 충족하지 못하면 바로 종합하지 않는다.

- 두 결과에 입력 manifest와 기준 시점이 있음
- Codex가 Claude 권장안을 보기 전에 runtime 결과를 고정함
- Claude가 Codex 권장안을 보기 전에 visual/IA/copy 결과를 고정함
- 양쪽 모두 U01~U10을 같은 정의로 평가함
- 양쪽 모두 `observed_user = 0`을 명시함
- Claude 제안 화면은 Proposal이며 구현된 After로 쓰이지 않음

이전 Claude 결과처럼 새 handoff를 못 본 산출물은 참고 열에만 둔다. 현재 U01~U10 독립 점수 열을 채우는 데 사용하지 않는다.

### Step 1. 증거 권한 정규화

| 주장 종류 | 우선 근거 | 할 수 없는 결론 |
|---|---|---|
| 현재 route·컴포넌트·저장 상태·projection·오류 처리 | Codex code/runtime evidence | 사용자 이해도·선호 확정 |
| 현재 캡처의 위계·가독성·중복·CTA 경쟁 | 양쪽 현재 화면 관찰 | 실제 클릭 결과 확정 |
| IA·wireframe·copy 대안 | Claude proposal + Codex feasibility/risk | 구현 완료·효과 검증 |
| 사용자 피드백의 의도 | U01~U10 원문 | 제안된 해결법 자동 채택 |
| 사용자 이해·성공·선호 | 향후 실제 UXR | 시뮬레이션으로 `O` 판정 |

모든 문장을 `current fact / proposal / inference / TBD / owner decision` 중 하나로 분류한다.

### Step 2. ID와 제안 namespace 정리

1. U01~U10은 사용자 피드백 행으로 고정한다.
2. Claude/P1~P8·D1~D2는 화면 제안 행으로 별도 유지한다.
3. Codex의 제안은 `Codex/Cxx`, 합의안은 `Sxx` 같은 새 ID를 사용한다.
4. `priority:P0/P1`은 우선순위 열에만 쓴다.
5. 화면 제안을 U 항목으로 재명명하거나 화면 수를 맞추기 위해 가짜 대응을 만들지 않는다.

### Step 3. 사실·제안·이견 matrix

먼저 다음 표를 작성한다.

| 쟁점 | 현재 사실 | 사용자 의도 | Codex 결론 | Claude 결론 | 공통점 | 이견 | 증거 공백 | owner 결정 |
|---|---|---|---|---|---|---|---|---|

Codex와 Claude가 같은 문장을 썼다는 이유만으로 사실이 되지는 않는다. 두 결과가 같은 가정을 공유했는지 확인한다.

### Step 4. 네 가지 근본 계약 결정

다음 순서로 하나씩만 결정한다.

1. `내 Flow` IA와 저장 직후 진입
2. 공개·저장·실행·내보내기의 생명주기와 소유권
3. canonical 데이터와 결과 capability/projection
4. 공통 editor family와 서로 다른 transaction

각 결정에 아래를 작성한다.

```text
decision candidate:
current facts:
selected option:
resolved feedback IDs:
rejected options and reasons:
export-first/canonical/MVP fit:
empty/error/back/duplicate/legacy cases:
data or migration impact:
accessibility/safety impact:
rollback:
owner approval needed:
implementation verification:
future observed-user question:
```

형식 결정은 `primary / available / conditional / unavailable` capability로 기술한다. 모든 Flow에 다섯 결과를 강제하는 안은 선택하지 않는다.

### Step 5. U01~U10 합의표

| ID | 현재 | Codex | Claude | 합의 판정 | 선택한 해결법 | 기각한 해결법 | 구현 후 검증 | 실제 UXR 질문 |
|---|---|---|---|---|---|---|---|---|

합의 판정은 `채택 / 의도 채택·해결법 수정 / 일부 채택 / 기각 / 검증 필요` 중 하나다. `제안 후 예상`은 구현 전 `O`가 아니다.

### Step 6. scorecard와 hard fail

공통 `08-review-scorecard-ko.md`를 사용한다.

- `O`: 실제 현재 동작 또는 구현 후 검증으로 충족을 확인한 경우만
- `△`: 일부 충족, 예외·중복·미확인 존재
- `X`: 문제 재현 또는 구조적 미충족
- `TBD`: 증거 부족
- `N/A`: 의도적 미적용과 이유가 있음

제안 wireframe, 자동 테스트, 전문가 의견만으로 사용자 이해 항목을 `O`로 바꾸지 않는다. hard fail이 남으면 owner에게 숨기지 않는다.

### Step 7. planning-only P0/P1

결정된 계약을 구현 화면 목록이 아니라 상태 단위 후보로 바꾼다.

```text
priority:
state/entry condition:
required information:
primary action:
secondary action:
next state:
back/cancel:
empty/error/retry:
canonical data effect:
accessibility/safety:
acceptance criteria:
rollback:
evidence needed after implementation:
```

`priority:P0`는 생명주기 모호성, 잘못된 데이터 버전 전송, 지원하지 않는 결과, 상태 손실, 안전 정보 은폐처럼 관찰 전에 막아야 하는 문제에 한정한다. 시각 감산과 단계적 용어 전환은 위험도에 따라 `priority:P1` 또는 후속 후보로 둔다.

이 단계에서는 앱 코드와 canonical 문서를 수정하지 않는다. 모든 항목은 `DRAFT_FOR_OWNER_REVIEW`다.

### Step 8. owner 질문과 실제 UXR 분리

owner에게는 코드·runtime으로 답할 수 없는 결정만 최대 3개 묻는다. 예:

1. 저장 없는 빠른 내보내기를 없앨지, 제한적 capability에 남길지
2. `내 Flow` 일반 진입을 Today와 저장 계획 중 무엇으로 둘지
3. 사용자 화면에서 `Flow`를 `계획`으로 단계적으로 바꿀지

그와 별도로 실제 사용자에게만 확인할 질문을 남긴다. 예:

- 저장 직후 전체 계획과 오늘 할 일 중 무엇을 먼저 찾는가
- 저장 없이 내보내기가 필요한 상황과 빈도는 무엇인가
- `계획`, `Flow`, `저장한 계획` 중 현재 상태를 가장 잘 설명하는 말은 무엇인가
- 완료된 Item이 남는 방식과 사라지는 방식 중 무엇이 복구하기 쉬운가

이 질문은 아직 답을 얻지 못했으므로 `observed_user = 0` 상태에서는 결론으로 쓰지 않는다.

### Step 9. 종합 결과물

최소 다음 세 문서를 제안 상태로 만든다.

1. `p35-round2-fundamental-ux-decision-ko.md`
   - 네 가지 계약, U01~U10 합의, 기각안, P0/P1, acceptance criteria, 검증 계획
2. `p35-round2-owner-decisions-ko.md`
   - 비기술적 현재/제안/TBD, 공통점·이견, owner 질문 최대 3개
3. `p35-round2-implementation-handoff-ko.md`
   - 상태·진입·행동·오류·데이터 영향 단위의 planning-only handoff

각 문서 상단에 다음을 둔다.

```text
status: DRAFT_FOR_OWNER_REVIEW
work_type: planning-only
observed_user: 0
implemented: no
published: no
```

owner 승인, 구현, 로컬 QA, 배포, 실제 사용자 관찰은 서로 다른 후속 상태로 관리한다.

---

## 4. 교차 종합용 복사 프롬프트

아래를 두 독립 결과가 완성된 기획 작업에 복사한다.

### 역할과 목표

P35의 U01~U10 사용자 피드백, 새 handoff, Codex 로컬 runtime/data/state 결과, Claude Design 독립 visual/IA/copy 결과를 하나의 owner 검토용 MVP 기획안으로 종합하라. 구현하지 말고 `DRAFT_FOR_OWNER_REVIEW`, `planning-only`, `observed_user = 0`을 유지하라.

### 입력 gate

- Codex와 Claude 결과에 입력 manifest, 기준 commit, 미확인 자료가 있는지 확인한다.
- Claude가 새 handoff를 실제로 읽었는지 확인한다.
- 두 독립 결과가 서로의 권장안을 보기 전에 고정됐는지 확인한다.
- 이전 Claude 결과는 새 handoff와 Codex 결과를 못 본 독립 참고안으로만 사용한다.
- 입력이 빠졌으면 추측으로 채우지 말고 해당 항목을 `TBD`로 남긴다.

### 종합 규칙

1. 현재 code/runtime/data 사실은 Codex의 직접 근거를 우선한다.
2. 시각 위계·IA·copy 제안은 Claude의 대안을 검토하되 구현 사실로 바꾸지 않는다.
3. 사용자 이해·선호는 어느 내부 검토로도 확정하지 않는다.
4. U01~U10은 사용자 피드백 ID로 유지한다.
5. Claude/P1~P8·D1~D2는 화면 제안 ID로 별도 유지하며 U ID로 재명명하지 않는다.
6. 모든 Flow에 고정 5형식을 강제하지 않는다. primary/available/conditional/unavailable capability로 합의한다.
7. Proposal을 After 또는 구현 완료로 부르지 않는다.
8. 실제 UXR, runtime 시뮬레이션, 코드 확인, 정적 캡처, 전문가 제안을 별도 증거 열로 둔다.

### 수행 순서

1. 사실·사용자 의도·Codex·Claude·공통점·이견·증거 공백 표 작성
2. `내 Flow` IA 결정
3. 저장·내보내기·실행의 생명주기/소유권 결정
4. canonical data→결과 capability/projection 결정
5. 공통 editor family와 transaction 결정
6. U01~U10의 채택 수준과 기각 이유 작성
7. 공통 scorecard와 hard fail 작성
8. planning-only `priority:P0/P1`과 acceptance criteria 작성
9. owner 질문 최대 3개와 향후 실제 사용자 질문 분리

### 필수 결과

- 네 가지 근본 계약이 하나의 사용자 흐름으로 연결됨
- U01~U10이 빠짐없이 판정됨
- Codex/Claude 이견이 합의, `TBD`, owner 질문 중 하나로 정리됨
- 제안과 현재 구현 사실이 표에서 분리됨
- 화면 제안 ID와 사용자 피드백 ID가 섞이지 않음
- 고정 5형식, 중요 주의 은폐, `완료` 의미 충돌, 저장 전·후 버전 혼동이 hard fail로 점검됨
- owner 질문은 최대 3개
- 구현·배포·실제 사용자 관찰을 완료했다고 쓰지 않음

## 최종 원칙

이 순서의 핵심은 독립 검토의 차이를 없애는 것이 아니라, 차이가 어디에서 생겼는지 보존하는 것이다. 현재 동작은 로컬 근거로, 화면 대안은 Proposal로, 사용자 이해는 향후 실제 관찰 질문으로 남긴다. owner 승인 전에는 어느 제안도 확정 구현안이나 검증된 After가 아니다.
