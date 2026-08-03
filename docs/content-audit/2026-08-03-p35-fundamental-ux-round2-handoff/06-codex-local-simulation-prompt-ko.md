# Codex 로컬 근본 UX 시뮬레이션 프롬프트

아래 내용을 로컬 접근이 가능한 Codex 작업에 그대로 전달하세요.

---

## 역할

당신은 FlowMe P35의 구현 담당이 아니라 `근본 UX·상태 구조 검토자`다. 실제 로컬 앱, 활성 코드, 저장 상태, 모바일 화면을 재현해 사용자 피드백의 원인을 확인한다. 개별 문구와 색상을 먼저 고치지 말고, 공개 상세→편집→저장→내 Flow→실행/내보내기의 책임과 데이터 구조를 먼저 검토한다.

이번 작업은 내부 시뮬레이션이다. 실제 사용자 관찰로 표기하지 말고 사용자 세션 수는 `0`으로 유지한다.

## 작업 위치와 안전 범위

- 우선 확인할 worktree: `D:\flowme2605\flow-p35-production-mobile-p0`
- 현재 UI 기준 commit: `b215698`
- 예상 브랜치: `codex/p35-production-mobile-p0`
- 먼저 실제 branch, HEAD, upstream, dirty status를 다시 확인한다.
- `D:\flowme2605\flow-mvp`나 다른 checkout을 임의로 섞지 않는다.
- 기존 변경과 자료를 보존한다.
- 앱 코드·제품 문구·테스트를 수정하지 않는다.
- commit, push, PR merge, Vercel Production 배포를 하지 않는다.
- 검토 결과 문서와 검토용 캡처만 새 결과 폴더에 만들 수 있다.

## 먼저 읽을 자료

1. 이 폴더의 [README.md](./README.md)
2. [01-owner-feedback-normalized-ko.md](./01-owner-feedback-normalized-ko.md)
3. [02-fundamental-review-brief-ko.md](./02-fundamental-review-brief-ko.md)
4. [03-current-state-evidence-map-ko.md](./03-current-state-evidence-map-ko.md)
5. [04-benchmark-study-brief-ko.md](./04-benchmark-study-brief-ko.md)
6. [05-simulation-scenarios-ko.md](./05-simulation-scenarios-ko.md)
7. [08-review-scorecard-ko.md](./08-review-scorecard-ko.md)
8. 저장소의 `AGENTS.md`, `agent.md`, session-start 문서, 제품 원칙, 서비스 구조, Flow quality/UX copy 규칙

이전 사용자 피드백 Before/After는 [이전 P35 보고서](../2026-08-03-p35-feedback-before-after/p35-owner-feedback-before-after-ko.html)와 이미지에서 확인한다.

## 가장 먼저 답할 네 질문

1. `내 Flow`는 오늘 실행, 저장 라이브러리, 선택된 계획 관리 중 무엇을 첫 역할로 가져야 하는가?
2. 저장과 내보내기의 순서는 무엇이며, 공개 상세와 `내 Flow` 중 어느 화면이 실제 내보내기를 소유해야 하는가?
3. 캘린더·할 일·체크리스트·메모·시트가 하나의 canonical Item/Step/Flow를 실제로 공유하는가?
4. 공개 초안과 저장된 개인 Flow 편집은 어떤 공통 editor 계약을 쓰고, 적용·취소·복구 의미는 어떻게 달라야 하는가?

## 반드시 수행할 로컬 검토

### A. 데이터→UI 구조 추적

이전 검토에서 가장 중요한 미확인 부분이다. 대표 Flow마다 아래 경로를 코드와 runtime에서 추적하라.

```text
slug/source data
→ canonical Item/Step/Flow
→ public preview
→ personal saved state
→ Today/My Flow
→ calendar/checklist/todo/memo/sheet preview or export
```

대표 대상:

- `/f/moving-d30-basic`
- `/f/vehicle-inspection-prep`
- `/f/curated-allblanc-morning-workout`
- `/flow-maps/middle-school-math-1`

다음 표를 작성한다.

| 대표 Flow | 원본 데이터 위치 | canonical ID 유지 | 공통 렌더러 | 콘텐츠별 조건 분기 | legacy 전용 UI | 수정값이 모든 결과에 반영 | 판정 |
|---|---|---|---|---|---|---|---|

콘텐츠마다 완전히 별도 UI·별도 데이터를 만드는지, 같은 컴포넌트가 데이터와 capability에 따라 바뀌는지, 어디부터 예외가 누적됐는지를 파일·함수·상태 근거로 구분한다. 단순히 컴포넌트 이름이 같다고 구조가 공통이라고 판정하지 않는다.

### B. 실제 상태 전이 재현

[05-simulation-scenarios-ko.md](./05-simulation-scenarios-ko.md)의 S01~S13을 가능한 범위까지 수행한다.

최소 필수:

- 저장 데이터 초기화 후 첫 공개 상세
- 기준일 선택·변경·삭제
- 공개 Flow/Item 편집의 적용·취소·닫기
- 저장과 저장 영수증
- 저장 전 공개 내보내기
- 저장 후 `내 Flow` 내보내기
- `지금 할 일 / 저장한 Flow / 선택 Flow 상세`
- `Flow 관리 → Flow 편집` 인라인 상태
- Item 상세·수정·메모·완료·완료 취소
- Flow Map 3칸과 편집
- 날짜형·날짜 없음·반복·주의 Flow 비교
- 390×844 모바일과 1440px 데스크톱

가능하면 저장 Flow 0·1·5·20개, Item 1·50개도 확인한다. 합법적인 demo/fixture가 없으면 UI를 임의 조작해 결과를 꾸미지 말고 `TBD`로 남긴다.

### C. 내보내기 무결성

아래를 코드와 가능한 runtime 상태에서 확인한다.

- 현재 지원하는 미리보기 형식과 내보내기 형식의 정확한 목록
- Todo와 체크리스트가 데이터·파일·사용자 가치에서 실제로 다른지
- 날짜 없는 Item의 캘린더 제외 규칙
- 제목·순서·날짜·메모·완료 기준·출처의 형식별 보존/손실
- 공개 화면과 `내 Flow`가 같은 버전을 내보내는지
- 저장 후 수정한 내용을 다시 옮길 때 중복·갱신·단방향 복사 의미
- 실패, 권한 거절, 부분 성공, 재시도, 취소에 대한 현재 처리

외부 서비스를 실제로 변경하거나 개인 계정에 테스트 데이터를 만들지 않는다. 실제 연결이 필요한 항목은 코드/테스트 근거와 `TBD`를 분리한다.

### D. 공통 editor 계약

공개 Flow, 공개 Item, 저장된 Flow, 저장된 Item, Flow Map 편집을 비교한다.

| 편집기 | surface | 필드 | 적용 의미 | 취소/닫기 | unsaved 경고 | 오류 복구 | 원래 위치·초점 복귀 |
|---|---|---|---|---|---|---|---|

다음 안을 비교하고 하나를 권장한다.

- 별도 모바일 page
- 전체 높이 bottom sheet/dialog
- 현재 화면 인라인

화면 모양만 통일하지 말고, 미저장 초안과 저장된 개인 상태의 transaction 차이를 적는다.

### E. `내 Flow` IA 대안

최소 세 안을 runtime 현실과 데이터 상태로 비교한다.

- A: `지금 할 일` 우선 + 저장 라이브러리 보조
- B: 저장 라이브러리 우선 + 오늘 할 일 파생 섹션
- C: 저장 직후와 일반 재방문이 다른 문맥형 진입

0·1·5·20개 Flow, 날짜 없음, 완료·보관, 방금 저장, 오늘 할 일 없음에서 각각 첫 행동과 탐색 비용을 적는다. 현재 `experiment=off` 경로를 현재 기본 UX로 오인하지 않는다.

### F. 도움·주의·카피

현재 인라인 정보와 문구를 다음 네 가지로 분류한다.

- 삭제
- `도움말`로 이동
- 짧은 한 줄 유지 + 상세 확장
- 반드시 인라인 유지

중요한 건강·안전·개인정보·중복 생성·되돌릴 수 없는 결과는 아이콘 안에만 숨기지 않는다. 아이콘 접근성, 모바일 뒤로가기, 초점 복귀도 검토한다.

다음 용어를 비교한다.

- `Flow / 계획 / 실행 계획 / 저장한 계획`
- `완료 / 내 Flow에 저장 / 저장하고 시작`
- `내 도구로 옮기기 / 내보내기`
- `수정 / 항목 수정`
- `더보기 / 결과 보기 / 다른 형식 보기`

### G. 사용자 제안 반증

사용자 해결안에 그대로 동의하지 않는다. 다음 중 최소 세 개에 대해 반증 또는 유지 이유를 제시한다.

- 내보내기를 `내 Flow`에만 둔다.
- 도움과 주의를 모두 아이콘 dialog로 숨긴다.
- 모든 Flow에 다섯 형식을 보여준다.
- 하단 버튼을 `편집 / 완료`로 통일한다.
- Flow Map 3칸을 모두 없앤다.
- 공개/저장 후 편집을 완전히 같은 화면으로 만든다.
- 사용자 화면의 `Flow`를 전면 치환한다.

## 결과물

새 결과 폴더 예시:

`docs/content-audit/2026-08-03-p35-fundamental-ux-round2-results/codex/`

필수 파일:

1. `README.md`: 한 줄 결론, 읽는 순서, 확인 범위
2. `01-local-simulation-findings-ko.md`: 시나리오별 근거와 판정
3. `02-data-ui-architecture-ko.md`: 데이터→UI 추적과 공통/예외/legacy 구분
4. `03-lifecycle-and-ownership-options-ko.md`: 저장·내보내기·실행 책임 대안
5. `04-my-flow-ia-options-ko.md`: IA 3안과 권장안
6. `05-editor-projection-contract-ko.md`: 공통 editor와 결과 형식 계약
7. `06-copy-disclosure-review-ko.md`: 용어와 도움·주의 분류
8. `07-scorecard-ko.md`: [08-review-scorecard-ko.md](./08-review-scorecard-ko.md) 작성본
9. `screenshots/`: 상태 전이를 알 수 있는 연속 캡처. 각 파일명에 시나리오 ID 포함

필요하면 inspectable HTML 요약을 추가할 수 있지만, Markdown 원본이 canonical 결과다.

## 결과 작성 규칙

- 관찰, 코드 근거, 추론, 제안을 명시적으로 구분한다.
- 파일·함수·route·test id와 캡처를 근거 가까이에 링크한다.
- `O`는 실제로 확인한 경우만 사용한다. 자동 테스트 존재만으로 사용자가 이해한다고 판정하지 않는다.
- 확인하지 못한 외부 동작과 이해도는 `TBD`다.
- 모든 제안에 삭제할 요소와 유지할 요소를 함께 적는다.
- 권장안 하나만 내되, 기각한 대안과 이유를 남긴다.
- 사용자에게 필요한 결정은 최대 3개로 줄인다.
- 구현 작업 목록은 P0/P1로 제안만 하고 코드는 변경하지 않는다.

## 종료 조건

다음이 모두 있으면 검토 완료다.

- U01~U10 각각의 현재 판정과 근거
- 네 가지 근본 결정의 대안·권장안·반증
- 콘텐츠별 별도 UI인지 canonical projection인지에 대한 코드 근거
- `내 Flow` IA 3안 비교
- 공개/저장 후 editor 계약
- 형식 지원·손실·Todo 불일치 표
- 도움·주의 노출 규칙
- MVP 구현 우선순위와 owner 결정 최대 3개

---
