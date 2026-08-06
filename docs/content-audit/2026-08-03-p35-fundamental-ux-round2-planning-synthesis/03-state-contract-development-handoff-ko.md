# P35 Round 2 상태 계약 개발 인계

> 상태: `OWNER_APPROVED_LOCAL_HANDOFF`
> 목적: 화면 시안이 아니라 구현 가능한 상태·전이·데이터 효과 계약
> Owner 결정: 2026-08-04 `Q1-B / Q2-B / Q3-B` 승인
> 구현 정본: [P35 Round 2 bounded UX correction active spec](../../specs/2026-08-04-p35-round2-bounded-ux-correction/README.md)
> 첫 gate: `P0-01`에서 실제 code/storage owner, action ownership, projection loss, 기술 TBD를 fixture와 contract test로 고정
> 금지: 이 문서만으로 구현 시작, source/base 덮어쓰기, 고정 5형식, legacy migration 동시 수행

## 1. 구현자가 먼저 알아야 할 경계

### 1.1 다섯 종류의 상태를 섞지 않는다

| 상태 | 수명 | 저장 위치 | 바꿀 수 있는 것 | 바꾸면 안 되는 것 |
|---|---|---|---|---|
| 공개 source/base | 게시 수명 | source-backed snapshot | 없음 | 출처·원문·creator 구조 |
| 공개 session draft | 현재 세션 | 메모리/명시된 임시 복구 저장소 | 미리보기용 제목·기준일·포함 항목 | source/base, 개인 완료 이력 |
| 저장 personal overlay | 사용자 수명 | 기존 My Flow 저장 계약 | 개인 제목·날짜·메모·제외 | source/base, 실행 완료 이력 |
| execution overlay | 실행·회차 수명 | 기존 run/occurrence/completion 계약 | Item 완료·완료 취소·회차 상태 | source/base, personal content overlay |
| result artifact/receipt | 생성 결과 수명 | 기존 receipt/history 계약 | 재생성·복사·다운로드 상태 | canonical plan 자체 |

`effectivePlan = deterministicMerge(baseSnapshot, personalOverlay)`는 저장한 계획 내용과 capability의 공통 입력이다. 실행 화면과 완료 상태를 포함할 수 있는 projection은 `effectiveExecution = deterministicMerge(effectivePlan, executionOverlay)`를 명시적으로 사용한다. 어떤 artifact가 execution overlay를 포함하거나 제외하는지는 projection loss schema에 기록하며, 완료를 personal overlay로 합치지 않는다. 공개 session draft는 저장 전에는 personal overlay가 아니다.

### 1.2 행동 소유권

| 능력 | 주 소유 상태 | 허용 보조 진입 | 보조 진입이 달라야 하는 점 |
|---|---|---|---|
| 공개 내용 이해 | 공개 계획 상세 | 찾기 목록 preview | 요약만 제공 |
| 미저장 수정 | 공개 editor | 공개 상세 `수정` | `변경 반영`, 세션 수명 명시 |
| 개인 저장 | 공개 상세/session draft | 공개 format preview | 항상 atomic save, 저장 상세로 이동 |
| 개인 수정 | 저장 계획 editor | 저장 상세 `수정` | `저장`, overlay에만 반영 |
| 실행 완료 | 저장 Item 상세/실행 lens | compact Today | Item state만 변경 |
| 권위 있는 내보내기 | 저장 계획 transfer | 저장 상세 `내 도구로 옮기기` | 범위·버전·receipt·중복 경고 소유 |
| 저장 없는 결과 | 공개 preview | 없음 | Q1-B 승인 범위인 미수정·eligible 로컬 결과로 제한, 저장 안 됨 상시 표시 |

주 소유자가 하나라는 뜻은 진입점이 물리적으로 하나라는 뜻이 아니다. 같은 capability × lifecycle × scope에 동일 효과의 버튼을 여러 곳에 반복하지 않는다는 뜻이다.

### 1.3 공통 이벤트와 결과

| 이벤트 | 성공 결과 | 실패 결과 |
|---|---|---|
| `OPEN_PUBLIC_PLAN` | base snapshot을 읽고 공개 상세 진입 | not-found/source-invalid 상태, 추측으로 Item 생성 금지 |
| `OPEN_EDITOR(context)` | clean draft와 origin focus 저장 | 원 화면 유지 + recoverable 안내 |
| `CHANGE_FIELD` | dirty/validity 재계산 | 입력값 유지 + field error |
| `APPLY_PUBLIC_DRAFT` | session projection만 갱신 | draft 유지 + 재시도 |
| `SAVE_PERSONAL_COPY` | base reference + overlay atomic 저장, idempotency key 기록 | 기존 저장본 불변, draft 유지 |
| `SAVE_OVERLAY` | 기존 personal overlay atomic 교체 | 기존 overlay 유지, draft 유지 |
| `TOGGLE_ITEM_COMPLETE` | 해당 Item execution state만 변경 | 기존 상태 유지 + 재시도 |
| `BUILD_PROJECTION` | loss schema와 같은 receipt 생성 | canonical 불변, 실패 단계와 재시도 표시 |
| `DISCARD_DRAFT` | 마지막 committed 상태로 복귀 | 해당 없음; 명시 확인 뒤 수행 |

## 2. 전이 개요

```text
S00 찾기
  → S01 공개 상세
    → S02 결과 미리보기
    → S03 공개 계획 편집
       → S04 중첩 Item 편집
       → S01/S02 변경 반영
    → S05 개인 저장 처리
       → S06 저장 직후 선택 계획

S07 일반 내 계획
  → S08 저장 계획 상세
    → S09 저장 계획 편집
       → S10 중첩 저장 Item 편집
    → S11 Item 상세/실행
    → S12 전송 확인
       → S13 전송 처리·결과

Q1-B 승인 범위:
S02 공개 결과 미리보기 → S14 저장 없는 로컬 결과

모든 상태:
오류 → 같은 상태의 recoverable error
legacy 불일치 → S15 호환 안내/안전 중지
```

## 3. 상태별 계약

### S00. 계획 찾기

**상태:** 공개 계획 탐색.
**진입 조건:** 공개 entry route 진입, 검색/분류/직접 링크.
**보여줄 필수 정보:** 제목, 결과 한 줄, source/creator, 구조 규모, 날짜/조건 여부, 저장 여부.
**주 행동:** 계획 상세 열기.
**보조 행동:** 최소 검색·정렬, 이미 저장한 계획으로 이동.
**다음 상태:** S01 또는 기존 저장본이면 S08.
**뒤로가기/취소:** 기존 route/query/scroll을 보존.
**오류/빈 상태:** 결과 없음과 network/source 오류를 구분. 빈 결과에서 가짜 추천을 만들지 않음.
**canonical 데이터 영향:** 없음.
**검증 기준:** 같은 카드의 제목·규모·조건이 S01과 일치하고, 공개 목록에서 실행 완료나 전송 이력을 수정할 수 없음.

### S01. 공개 계획 상세

**상태:** source/base와 현재 session draft의 effective preview.
**진입 조건:** S00 선택 또는 공개 deep-link.
**보여줄 필수 정보:** 결과, 기간/조건, Item 수, 중요한 경고, 출처, 주 결과 preview, 저장 여부.
**주 행동:** `내 계획에 저장`.
**보조 행동:** `수정`, `결과 미리보기`; Q1-B의 strict eligibility를 통과할 때만 quick-result 진입.
**다음 상태:** S02, S03 또는 S05.
**뒤로가기/취소:** session draft가 clean이면 S00 복귀. dirty이면 `계속 수정 / 변경 버리기` 선택.
**오류/빈 상태:** source-invalid는 저장 차단, 부분 지원은 지원 항목·hold 항목·이유를 구분.
**canonical 데이터 영향:** 보기만 하면 없음. save 전 변경은 session draft만 영향.
**검증 기준:** 콘텐츠별로 흔들리는 `… 시작`이 주 CTA가 아니며, 저장과 실행 완료를 같은 `완료`로 표시하지 않음.

### S02. 공개 결과 미리보기

**상태:** session draft를 입력으로 한 capability별 projection preview.
**진입 조건:** S01에서 결과 미리보기 선택 또는 S03 변경 반영.
**보여줄 필수 정보:** 주 결과 1개, 바로 가능 최대 2개, 조건부 입력/예상 수, 불가 이유, 형식별 실제 preview와 loss 요약.
**주 행동:** `내 계획에 저장`.
**보조 행동:** 형식 전환, `수정`; Q1-B의 strict eligibility를 통과할 때만 `저장 없이 사용`.
**다음 상태:** S03, S05 또는 조건부 S14.
**뒤로가기/취소:** S01로 돌아가며 session draft 유지.
**오류/빈 상태:** eligible 0은 원인과 다음 입력을 제시하고 빈 캘린더/빈 파일을 성공처럼 표시하지 않음.
**canonical 데이터 영향:** 없음. projection preview는 파생 상태.
**검증 기준:** 고정 5탭이 없고 preview count가 effective snapshot과 일치하며 날짜 없는 Item에 VEVENT를 만들지 않음.

### S03. 공개 계획 편집

**상태:** 공개 session draft의 full-height editor, plan level.
**진입 조건:** S01/S02 `수정`.
**보여줄 필수 정보:** `미저장 변경` 상태, 제목·기준·기간, 포함 Item, 조건·출처, 현재 오류, commit 효과 설명.
**주 행동:** `변경 반영`.
**보조 행동:** `취소`, Item 편집.
**다음 상태:** S01 또는 S02의 갱신된 preview; Item 선택 시 S04.
**뒤로가기/취소:** clean이면 origin으로 즉시 복귀. dirty이면 계속/버리기 확인. backdrop·X·Escape·browser Back은 같은 규칙.
**오류/빈 상태:** validation은 필드 근처와 첫 오류 요약, runtime 오류는 draft를 유지하고 재시도.
**canonical 데이터 영향:** 없음. session draft에만 반영.
**검증 기준:** 닫기 후 포커스·scroll·query 복원, submitting 중 중복 commit 차단, source/base 불변.

### S04. 공개 중첩 Item 편집

**상태:** S03 draft 안의 Item 하나를 편집.
**진입 조건:** S03 Item 선택.
**보여줄 필수 정보:** Item 제목, 메모, 일정/기준, 완료 기준, 경고·출처, plan draft와의 관계.
**주 행동:** `변경 반영`.
**보조 행동:** 취소, 계획 편집으로 돌아가기.
**다음 상태:** S03의 동일 scroll 위치.
**뒤로가기/취소:** Item 변경만 버릴지 확인하며 S03 전체 draft는 유지.
**오류/빈 상태:** 삭제/hold 된 Item이면 안전 중지와 목록 새로고침; 임의로 새 ID를 만들지 않음.
**canonical 데이터 영향:** 공개 session draft의 해당 Item overlay 후보만 변경.
**검증 기준:** nested Back이 전체 editor를 닫지 않고, completion criterion이 preview/export 계약에서 누락되지 않음.

### S05. 개인 저장 처리

**상태:** 공개 base/session draft를 personal copy로 atomic 저장 중.
**진입 조건:** S01/S02의 `내 계획에 저장`.
**보여줄 필수 정보:** 처리 상태, 저장 대상 제목·Item 수; 오래 걸릴 때만 취소 불가 이유.
**주 행동:** 없음; 중복 제출 차단.
**보조 행동:** recoverable 실패 시 재시도/돌아가기.
**다음 상태:** 성공 S06, 실패 원 상태.
**뒤로가기/취소:** commit 시작 전에는 취소 가능. commit 중 browser Back/새로고침 후에도 idempotency key로 결과를 복구.
**오류/빈 상태:** storage quota, partial write, stale source, duplicate key를 구분. partial record를 성공으로 노출하지 않음.
**canonical 데이터 영향:** base reference와 personal overlay를 한 transaction으로 저장. source/base는 불변.
**검증 기준:** double click·재시도·같은 source 재진입에서 사본 1개, 성공 count와 저장된 count 일치, 실패 시 이전 데이터 불변.

### S06. 저장 직후 선택 계획

**상태:** 방금 저장한 계획을 선택한 상세 + transient receipt.
**진입 조건:** S05 성공.
**보여줄 필수 정보:** `저장됨 · N개 · 되돌리기`, source 관계, 계획 결과, 첫 실행 가능 항목, 조건부 다음 입력.
**주 행동:** 콘텐츠에 맞는 첫 실행 행동.
**보조 행동:** `수정`, `내 도구로 옮기기`, 되돌리기.
**다음 상태:** S09, S11 또는 S12.
**뒤로가기/취소:** 일반 `/my` shell의 해당 계획 선택 상태를 유지. 뒤로가기로 공개 session을 중복 저장하지 않음.
**오류/빈 상태:** 저장 후 읽기 실패 시 idempotency key로 저장 결과를 복구하고 “다시 저장”을 바로 제안하지 않음.
**canonical 데이터 영향:** 추가 변경 없음. 되돌리기는 기존 계약에 따라 개인 사본만 제거하고 source는 유지.
**검증 기준:** 별도 receipt route 없이 저장 근거와 다음 행동을 찾을 수 있고, 새로고침 후 transient 배너가 반복되지 않음.

### S07. 일반 `내 계획` shell

**상태:** Q2-B로 승인된 저장 계획 library의 일반 진입.
**진입 조건:** navigation에서 직접 진입, 저장 deep-link가 아닌 일반 `/my`.
**보여줄 필수 정보:** 조건부 compact Today, 최근 저장/활성 계획, 저장 계획 목록, 수량에 맞는 최소 탐색 도구.
**주 행동:** 저장 계획 열기; 0개면 `계획 찾기`.
**보조 행동:** Today 실행 lens, 검색/상태 필터(수량이 충분할 때).
**다음 상태:** S08 또는 S11.
**뒤로가기/취소:** 마지막 선택/scroll/query를 예측 가능하게 복원하되 숨은 문맥 규칙으로 첫 화면 자체를 바꾸지 않음.
**오류/빈 상태:** 0/1/5/20 계약을 따름. Today 0개면 빈 Today 카드 대신 섹션 숨김.
**canonical 데이터 영향:** 없음. 모두 derived summary.
**검증 기준:** 저장 계획이 20개여도 첫 주 행동이 하나로 읽히고, flag off에서 현재 P35 `/my`로 되돌릴 수 있음.

### S08. 저장 계획 상세

**상태:** 선택한 effective plan과 개인 실행 상태의 기준 화면.
**진입 조건:** S06/S07에서 계획 선택 또는 저장 계획 deep-link.
**보여줄 필수 정보:** 개인 제목·기준·진행, Item·조건·출처, 결과 가능성, 마지막 저장/전송 정보.
**주 행동:** 콘텐츠에 맞는 실행 행동 한 개.
**보조 행동:** `수정`, `내 도구로 옮기기`, overflow의 보관/삭제.
**다음 상태:** S09, S11, S12.
**뒤로가기/취소:** S07의 선택/scroll로 복귀.
**오류/빈 상태:** legacy copy, missing base, partial support를 구분하고 복구 전 자동 rewrite 금지.
**canonical 데이터 영향:** 보기만 하면 없음.
**검증 기준:** 한 화면에 동등한 주 행동 네 개가 경쟁하지 않고, 공개 source와 personal 변경을 구분해 설명.

### S09. 저장 계획 편집

**상태:** personal overlay의 full-height editor, plan level.
**진입 조건:** S08 `수정`.
**보여줄 필수 정보:** `저장한 계획`, 마지막 저장 상태, 제목·기준·기간·Item·조건·출처, validation.
**주 행동:** `저장`.
**보조 행동:** `취소`, 중첩 Item 편집(S10).
**다음 상태:** 성공 S08, Item 선택 S10.
**뒤로가기/취소:** S03과 동일한 clean/dirty guard. source 변화 감지 시 merge/재검토를 요구하고 조용히 덮어쓰지 않음.
**오류/빈 상태:** storage/runtime 실패에서 기존 committed overlay와 draft 모두 보존.
**canonical 데이터 영향:** 성공 시 personal overlay만 atomic 갱신.
**검증 기준:** 공개 editor와 필드·순서·접근성은 같고 commit 라벨·설명·저장 효과는 다름.

### S10. 저장 중첩 Item 편집

**상태:** S09 draft 안의 개인 Item overlay 편집.
**진입 조건:** S09에서 Item 선택.
**보여줄 필수 정보:** 제목, 메모, 개인 날짜, 완료 기준, 출처/경고, 원본 대비 개인 변경.
**주 행동:** `저장` 또는 상위 transaction에 맞춘 `변경 반영` 후 S09에서 최종 저장. 활성 spec에서 하나로 확정.
**보조 행동:** 취소, 계획 편집으로 돌아가기.
**다음 상태:** S09.
**뒤로가기/취소:** Item draft만 버리고 S09 plan draft 보존.
**오류/빈 상태:** source Item 삭제/ID 충돌 시 hold 상태와 선택지를 보여주고 silent remap 금지.
**canonical 데이터 영향:** S09 commit 전까지 draft, commit 후 personal overlay.
**검증 기준:** stable ID, completion criterion, memo/date가 상세·실행·export에 일관됨.

> `TBD-S10-COMMIT`: nested Item이 즉시 저장되는지 상위 Plan 저장에 포함되는지는 현재 코드 계약을 확인해 active spec에서 하나로 고정한다. 임의 추측 금지.

### S11. Item 상세·실행

**상태:** 저장 Item의 실행 결과와 개인 메모/기준 확인.
**진입 조건:** S06/S07 Today/S08 Item 선택.
**보여줄 필수 정보:** 할 일, 완료 기준, 일정/메모, 경고·출처, 현재 완료 상태.
**주 행동:** 미완료면 `완료`, 완료면 `완료 취소`.
**보조 행동:** `수정`; 이동·제외·단건 전송·삭제는 필요할 때 overflow.
**다음 상태:** 상태 변경 후 같은 Item 또는 origin list, 수정은 S10/단건 editor.
**뒤로가기/취소:** origin 계획/Today의 scroll과 filter 복원.
**오류/빈 상태:** 상태 저장 실패 시 optimistic UI를 원복하고 이전 상태를 명시.
**canonical 데이터 영향:** execution state만 변경. plan 저장이나 source 수정 아님.
**검증 기준:** 독립 파란 surface와 `실행할 일` 중복 heading 제거, `할 일 수정→수정`, checklist payload에 UI가 약속한 완료 기준 포함.

### S12. 실제 전송 확인

**상태:** 저장 effective plan의 결과 생성 전 확인.
**진입 조건:** S06/S08 `내 도구로 옮기기`.
**보여줄 필수 정보:** 범위, 주/선택 형식, eligible/held/unavailable 수, 버전, 도착지, 손실, 중복·비가역 영향.
**주 행동:** 결과에 맞는 구체 동사(`파일 만들기`, `복사하기`, 승인된 경우 `전송하기`).
**보조 행동:** 취소, 범위/형식 변경.
**다음 상태:** S13.
**뒤로가기/취소:** S08로 복귀, 선택은 보존하되 실행하지 않음.
**오류/빈 상태:** eligible 0이면 생성 차단과 조건 충족 경로 표시. unsupported remote/OAuth를 성공처럼 보이지 않음.
**canonical 데이터 영향:** 없음.
**검증 기준:** 표시 수와 payload 수가 일치하고 중요한 위험은 icon 안에만 숨지 않으며 날짜 없는 row가 calendar 결과에 들어가지 않음.

### S13. 전송 처리·결과

**상태:** projection 생성/복사/다운로드와 receipt.
**진입 조건:** S12 최종 확인.
**보여줄 필수 정보:** 처리 단계, 성공/실패 수, 형식, 범위, 버전, 생성 시각, 재시도 가능성.
**주 행동:** 성공 시 `열기/복사`, 실패 시 `다시 시도`.
**보조 행동:** 저장 계획으로 돌아가기, 다시 만들기.
**다음 상태:** S08 또는 S12.
**뒤로가기/취소:** artifact 생성 전 취소만 허용. 생성 후 Back은 결과를 없애지 않고 receipt로 복귀 가능.
**오류/빈 상태:** clipboard denial, blob/download 실패, partial result를 구분. 재시도는 중복 생성 위험을 표시.
**canonical 데이터 영향:** plan 불변, result receipt/history만 추가.
**검증 기준:** 성공 메시지가 실제 artifact 존재와 일치하고, 실패를 완료로 기록하지 않으며 같은 입력의 재생성 규칙이 deterministic.

### S14. 저장 없는 로컬 결과 — Q1-B strict eligibility

**상태:** 공개 미수정 base의 one-shot local result.
**진입 조건:** session draft clean + 형식 eligible + 로컬 file/copy + 계정 연결/전송 이력/재시도 불필요.
**보여줄 필수 정보:** `FlowMe에 저장되지 않음`, 범위·형식·개수·손실, `지금 저장` 복구 경로.
**주 행동:** `파일 만들기/복사하기`.
**보조 행동:** `내 계획에 저장`, 취소.
**다음 상태:** local result 또는 S05.
**뒤로가기/취소:** 공개 preview로 복귀, 개인 저장본 생성 안 함.
**오류/빈 상태:** 실패 시 history/retry를 약속하지 않고 저장 후 다시 시도 경로 제공.
**canonical 데이터 영향:** 없음. receipt/history도 만들지 않거나 one-shot임을 명시.
**검증 기준:** 수정이 생기면 즉시 이 경로를 비활성화하고 저장 경로로 전환, OAuth/remote send가 이 상태에 들어오지 않음.

### S15. legacy·호환 안전 중지

**상태:** legacy Flow/Map/saved copy를 현재 effective contract로 안전하게 읽지 못한 상태.
**진입 조건:** schema version, stable ID, base reference, Map child decision 불일치.
**보여줄 필수 정보:** 읽을 수 없는 범위, 보존된 데이터, 가능한 읽기 전용/복구 행동.
**주 행동:** 안전한 읽기/이전 화면. migration이 승인된 별도 spec에 있을 때만 변환.
**보조 행동:** 진단 정보 복사.
**다음 상태:** read-only S08 또는 origin.
**뒤로가기/취소:** 아무 데이터도 쓰지 않고 복귀.
**오류/빈 상태:** 자동 삭제·재생성·silent adapter absorption 금지.
**canonical 데이터 영향:** 없음.
**검증 기준:** `save_all`, `choose_child`, `review_hold`, risk, conflict, source relation, old receipt를 보존하고 bounded parity PR이 schema migration을 수행하지 않음.

## 4. 공통 취소·뒤로가기 계약

| 입력 | clean | dirty-valid/invalid | submitting | success/error |
|---|---|---|---|---|
| `취소` | 즉시 origin | 버리기 확인 | commit 시작 뒤 차단/설명 | success는 결과로, error는 draft 유지 |
| X | `취소`와 동일 | `취소`와 동일 | 동일 | 동일 |
| backdrop | 모바일에서는 의도치 않은 닫기 방지를 기본값으로 함 | 확인 없이 닫지 않음 | 닫지 않음 | 명시 계약 따름 |
| Escape | 접근 가능한 `취소`와 동일 | 확인 dialog로 focus 이동 | 닫지 않음 | dialog 종료 후 origin focus |
| browser Back | route origin 복원 | history를 잃지 않는 dirty guard | idempotent recovery | 중복 save/export 금지 |
| 새로고침/탭 닫기 | committed 상태 유지 | 임시 복구를 제공하거나 명시 경고 | idempotency key로 결과 회복 | success banner 반복 금지 |

## 5. 오류 코드가 구분해야 할 사용자 결과

구현 이름은 기존 규칙을 따르되 최소한 다음 범주는 서로 다른 사용자 결과를 가져야 한다.

| 범주 | 사용자 결과 | 보존 조건 |
|---|---|---|
| validation | 필드 근처 수정 안내 | draft 전부 보존 |
| source missing/stale | 저장·전송 차단, 다시 불러오기/검토 | base reference와 draft 보존 |
| storage quota/write | 재시도·공간 안내 | 마지막 committed copy + draft 보존 |
| duplicate/idempotency | 기존 저장 결과로 이동 | 사본 추가 생성 금지 |
| projection unsupported | 불가 이유·조건 표시 | plan 불변 |
| clipboard/blob | 다시 시도/다른 로컬 방식 | artifact/receipt 상태 정확히 기록 |
| partial remote result | 성공/실패 항목 분리 + 중복 경고 | 성공 항목 receipt 보존; MVP 원격 연동 밖이면 구현 금지 |
| legacy incompatibility | read-only/안전 중지 | 자동 rewrite 금지 |

## 6. 승인 완료와 `P0-01` foundation gate

### 6.1 Owner 결정 — 완료

| ID | 승인 결과 | 구현 효과 |
|---|---|---|
| Q1 | `B` | S14를 strict eligibility의 one-shot local result로 구현 |
| Q2 | `B` | S07을 저장 계획 library shell로 구현하고 flag-off rollback 유지 |
| Q3 | `B` | 핵심 사용자 surface에서 `계획`을 우선하고 브랜드·URL·내부 이름 유지 |

### 6.2 `P0-01`에서 닫을 기술 gate

| ID | 확인할 것 | 확인 방법 | 해소 전 금지 |
|---|---|---|---|
| TBD-S10-COMMIT | 중첩 saved Item commit 단위 | 현재 reducer/storage 계약과 tests | 이중 저장·중간 partial write |
| TBD-RECEIPT | 현재 receipt/history 저장 형태 | runtime·storage fixture | 새 schema 발명 |
| TBD-LEGACY | 실제 legacy schema/version 목록 | fixture inventory | adapter 삭제·migration |
| OUT-REMOTE | remote send·OAuth·양방향 sync | 승인 scope에서 명시적 제외 | 구현 금지 |

`P0-01`은 UI를 바꾸지 않는다. 위 기술 gate, 실제 state owner, action ownership matrix, projection loss schema, 대표 fixture를 먼저 고정한다. 각 기술 gate가 닫히기 전에는 그 영향을 받는 후속 티켓을 시작하지 않는다.

## 7. 상태 계약 완료 정의

이 계약은 다음 조건을 지키며 active spec에서 실행한다.

- Q1-B/Q2-B/Q3-B와 `bounded fix` 승인이 기록됨
- `P0-01`이 각 기술 TBD에 확인 근거 또는 명시적 제외를 남김
- 각 상태에 담당 코드 owner와 test owner가 지정됨
- action ownership matrix와 projection loss schema가 승인됨
- [인수·QA 매트릭스](./05-acceptance-and-qa-matrix-ko.md)의 hard fail 3건이 개별 테스트로 연결됨
- rollback flag와 legacy no-write 원칙이 PR 계획에 포함됨
