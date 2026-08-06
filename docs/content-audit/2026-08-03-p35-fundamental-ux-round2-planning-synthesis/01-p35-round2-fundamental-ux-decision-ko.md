# P35 2차 근본 UX — 승인된 목표 UX

> 상태: `OWNER_APPROVED_LOCAL_HANDOFF`
> 적용 범위: P35 이후의 제한된 B/B/B UX 보정
> Owner 승인: 2026-08-04 · `Q1-B / Q2-B / Q3-B` · `bounded fix`
> 정본 경계: 승인된 목표 UX이며 아직 구현된 제품 상태가 아님. 구현 정본은 [active spec](../../specs/2026-08-04-p35-round2-bounded-ux-correction/README.md)
> 실제 관찰 사용자: `0명`

## 1. 한 줄 결론

하나의 canonical 계획을 **공개 미저장 초안 → 개인 저장본 → 실행·내보내기 결과**로 명확히 이어 주고, `내 Flow`는 저장 계획의 안정적인 집으로, 공개 상세는 발견·미리보기·수정의 입구로 재정의한다.

## 2. 현재 문제의 근본 원인

개별 버튼의 이름보다 큰 문제는 사용자가 “지금 보는 것은 누구의 어떤 상태이고, 이 행동이 무엇을 바꾸는가”를 알기 어렵다는 점이다.

| 근본 원인 | 현재 드러난 증상 | 해결 원칙 |
|---|---|---|
| 상태 소유자가 흐림 | 공개 상세와 저장본 양쪽에 편집·내보내기가 반복되고 `완료`가 저장/실행 의미로 섞임 | lifecycle 단계마다 한 능력의 주 소유자를 지정하고 보조 진입은 역할이 다르게 보이게 함 |
| UI와 canonical 결과가 어긋남 | Flow Map 적용 수와 주 미리보기 수가 `7 ↔ 8`로 불일치 | UI 숫자는 동일한 effective snapshot에서 계산하고 저장 전 parity를 검증 |
| 결과 형식이 내용보다 먼저임 | 사용할 수 없는 캘린더가 먼저 보이거나 고정 5형식 기대가 생김 | 콘텐츠 capability를 계산한 뒤 주 결과·가능·조건부·불가로 나눔 |
| 편집 문법이 화면마다 다름 | 공개 편집은 단계 안에 중첩되고 저장 편집은 화면 하단에 붙음 | 같은 editor family와 transaction 상태를 쓰되 commit 의미만 분리 |
| 정보 구조가 설명문에 의존함 | 도움·주의·요약 카드가 반복되어 화면이 복잡해짐 | 먼저 삭제·통합하고, 일반 도움은 점진 공개, 중요한 결과·위험은 inline 유지 |
| 검증 종류가 섞일 위험 | 캡처·자동화·시뮬레이션 결과가 실제 이해도로 오해될 수 있음 | runtime 사실, 디자인 제안, 관찰 사용자 결과를 별도 기록 |

Codex 로컬 검토는 55.4/100과 hard fail 3건을 보고했다. Claude Design은 정적 캡처 기반으로 `revise`를 권고했다. 두 결과 모두 실제 사용자 관찰이 아니며, 현재 관찰 사용자는 0명이다.

## 3. 네 가지 근본 결정

### D1. `내 Flow`의 역할과 첫 화면

- **선택한 안:** 안정적인 저장 계획 library shell + compact한 오늘 실행 요약 + 저장 직후 선택 계획 deep-link.
- **해결하는 피드백:** U03, U07, U08, U10.
- **현재 결정과의 관계:** Q2-B가 승인되어 현재 일반 `/my`의 cross-Flow Todo 기본 진입을 명시적으로 재개방한다. canonical decision에는 superseding 기록을 추가하고 rollback flag를 둔다.
- **기각한 안:** 상황마다 첫 화면 자체가 바뀌는 완전 문맥형 C안. 사용자가 같은 탭에 들어갈 때마다 다른 구조를 만나고 저장 계획의 위치를 예측하기 어렵다.
- **export-first·canonical 관계:** `내 Flow`는 source를 복제해 망가뜨리는 workspace가 아니라 개인 overlay, 실행 상태, 재생성 가능한 결과의 집이다.
- **예외:** 저장 계획이 0개일 때는 탐색 CTA, 1개일 때는 단일 계획 상세 진입, 20개일 때는 검색·상태 필터가 필요하다. 오늘 항목이 없으면 Today 요약 자체를 숨긴다.
- **Owner 확인:** 2026-08-04 Q2-B 승인.

### D2. 공개 상세→편집→저장→실행/내보내기 소유권

- **선택한 안:** 공개는 원본 이해·형식 미리보기·세션 초안 편집을 소유하고, 저장된 계획은 개인 편집·실행·범위 선택·권위 있는 내보내기와 receipt를 소유한다.
- **해결하는 피드백:** U01, U07, U08, U09.
- **보조 예외:** Q1-B 승인에 따라 미수정 상태이고 별도 계정 연결·전송 이력·재시도가 필요 없는 eligible 로컬 파일/복사만 `저장 없이 사용`으로 둔다. 사용자에게 “FlowMe에 저장되지 않음”을 항상 보여준다.
- **기각한 안:** 모든 공개 내보내기 제거와 모든 곳의 동일한 내보내기 버튼. 전자는 export-first의 낮은 진입 장점을 잃고, 후자는 어떤 버전과 범위를 보내는지 더 모호해진다.
- **중복·오류:** 저장본의 전송 확인이 대상·형식·항목 수·버전·중복/비가역 영향을 보여주고, 실패해도 저장 계획과 편집 내용을 유지한다.
- **Owner 확인:** 2026-08-04 Q1-B 승인.

### D3. 하나의 canonical 계획과 여러 결과 형식

- **선택한 안:** canonical 계획은 하나이며 결과 형식은 projection이다. `주 결과 1개 → 바로 가능 최대 2개 → 조건 충족 후 가능 → 불가와 이유` 순서로 노출한다.
- **해결하는 피드백:** U05, U07, U09.
- **사용자-facing 결과 계열:** 캘린더, 할 일·체크리스트, 시트, 메모. `Today/Todo`는 내부 실행 lens이며 별도 외부 형식으로 중복 표시하지 않는다.
- **기각한 안:** 모든 계획에 고정 5형식을 제공. 날짜 없는 메모형 콘텐츠를 캘린더로 왜곡하고 빈 결과를 먼저 보여줄 수 있다.
- **canonical 관계:** `SourceRow → Item → Step → Flow → Bundle/Flow Map → Projection`을 유지한다. 날짜 없는 Item은 자동으로 가짜 날짜를 만들지 않는다.
- **legacy:** 기존 Map, old saved copy, source-backed snapshot은 읽을 수 있어야 하며 bounded parity fix와 migration을 같은 PR에 넣지 않는다.
- **Owner 확인:** 결과 capability 원칙은 공통 구현 계약으로 승인되었고, 외부 계열 명칭은 Q3-B 용어 전환을 따른다.

### D4. 공개 초안과 저장된 계획의 공통 editor 계약

- **선택한 안:** 동일한 정보 구조와 interaction grammar를 가진 하나의 editor family. 모바일은 full-height sheet, wide 화면은 right inspector/dialog를 허용하지만 transaction 상태는 동일하다.
- **해결하는 피드백:** U04, U08, U09.
- **commit 의미:** 공개 초안은 `변경 반영`하여 현재 세션 projection만 갱신한다. 저장본은 `저장`하여 personal overlay를 atomic하게 갱신한다. Item의 실행 완료와는 절대 같은 `완료`를 쓰지 않는다.
- **기각한 안:** 공개와 저장본의 화면·라벨·효과를 완전히 동일하게 만듦. source 원본과 personal overlay 경계를 숨기고 저장 효과를 오해하게 한다.
- **취소·오류:** clean 상태는 즉시 닫고, dirty 상태는 버리기 확인을 거친다. validation/runtime/storage 오류에서는 편집 draft와 포커스 위치를 보존한다.
- **Owner 확인:** 별도 질문 없는 공통 P0 계약으로 승인. 단, 기존 source 불변·overlay 저장 원칙을 바꾸는 요구가 발견되면 즉시 중지한다.

## 4. 승인된 사용자 생명주기

```text
계획 찾기
  → 공개 계획 상세
  → 결과 미리보기 또는 미저장 수정
  → 내 계획에 저장(atomic copy + personal overlay)
  → 방금 저장한 계획 상세 + 1회 저장 배너
  → 항목 실행 / 계획 수정 / 내 도구로 옮기기
  → 전송 확인(범위·형식·개수·버전·위험)
  → 결과 receipt 및 필요 시 재생성
```

세부 규칙:

1. 공개 원본은 편집하지 않는다. 공개 편집은 session draft다.
2. 저장은 중복 클릭·재진입에도 동일한 개인 사본을 한 번만 만들도록 idempotent해야 한다.
3. 저장 성공 후 일반 `내 Flow` 첫 화면으로 던지지 않고 방금 저장한 계획 상세를 선택한 상태로 이동한다.
4. 별도 receipt 전용 화면은 두지 않는다. 선택 계획 상세의 `저장됨 · N개 · 되돌리기` 배너가 저장 결과를 설명한다.
5. 실행 완료는 Item 상태만 바꾸며 계획 저장과 구분한다.
6. 내보내기는 projection이며 canonical 계획을 덮어쓰지 않는다.

## 5. 화면별 책임표

| 화면·상태 | 소유하는 책임 | 주 행동 | 보조 행동 | 소유하지 않는 것 |
|---|---|---|---|---|
| 계획 찾기 목록 | 발견·비교·필터 | 계획 열기 | 저장 상태 확인 | 개인 실행, 전송 이력 |
| 공개 계획 상세 | 원본 이해·결과 요약·출처 | 내 계획에 저장 | 수정, 형식 미리보기 | 개인 완료 상태, 권위 있는 재전송 |
| 공개 형식 미리보기 | 실제 eligible 결과 예시·손실 안내 | 내 계획에 저장 | 다른 가능한 형식 보기 | 고정 5탭, 저장본 범위 선택 |
| 공개 계획 편집기 | 미저장 session draft | 변경 반영 | 취소 | source 원본 변경, 실행 완료 |
| 저장 직후 선택 계획 | 1회 save banner·다음 행동 연결 | 첫 실행 행동 | 수정, 내 도구로 옮기기 | 별도 save-only 결과 화면 |
| 일반 `내 Flow` | 저장 계획 탐색·상태 요약 | 계획 선택 | compact Today 진입 | 공개 콘텐츠 탐색 |
| 저장 계획 상세 | 개인 overlay·실행·전송의 기준 | 콘텐츠에 맞는 실행 행동 | 수정, 내 도구로 옮기기 | 공개 source 수정 |
| Item 상세 | 한 항목의 결과·기준·메모·상태 | 완료/완료 취소 | 수정 | 계획 전체 전송을 주 CTA로 노출 |
| 전송 확인 | 범위·형식·eligible count·버전·위험 확인 | 실제 생성/복사 | 취소 | canonical 변경 |
| 전송 결과 | 성공·실패·재시도·receipt | 결과 열기/복사 | 다시 만들기 | 사용자 관찰 성공 판정 |

## 6. `내 Flow` IA와 0·1·5·20개 상태

일반 진입의 골격은 항상 같다.

```text
내 계획
├─ 오늘 실행 요약(해당 항목이 있을 때만 한 줄)
├─ 최근 저장(저장 직후 1회 pin, 이후 일반 정렬로 복귀)
├─ 저장한 계획 목록
└─ 완료/보관 상태 필터(목록이 충분할 때만)
```

| 저장 계획 수 | 첫 화면 | 주 행동 | 감산 규칙 |
|---:|---|---|---|
| 0 | 빈 상태 + 어떤 결과를 만들 수 있는지 한 문장 | `계획 찾기` | 검색·필터·Today·완료 탭 숨김 |
| 1 | 계획 한 개와 다음 실행 가능 항목 | 계획 열기/실행 | 검색과 복잡한 상태 필터 숨김 |
| 5 | compact Today + 최근/활성 계획 목록 | 마지막 사용 또는 최근 저장 계획 열기 | 한 화면의 주 CTA는 1개, 카드 행동은 overflow로 이동 |
| 20 | 검색 + 최소 상태 필터 + 최근/활성 정렬 | 계획 찾기/열기 | 고급 필터·프로젝트 계층·협업은 제외 |

저장 직후에는 개수와 무관하게 해당 계획을 선택한 상세로 직접 이동한다. 이 deep-link는 일반 `/my` IA를 문맥에 따라 바꾸는 것이 아니라 명시적 저장 성공 결과다.

## 7. canonical 데이터→결과 형식 계약

### 7.1 데이터 경계

| 계층 | 변경 가능성 | 책임 |
|---|---|---|
| Source/base snapshot | 불변 | 출처·원문·구조·검증 상태 보존 |
| Public session draft | 저장 전 세션에서만 변경 | 공개 원본을 건드리지 않고 제목·기준일·포함·순서 변경을 임시 보존 |
| Personal overlay | 사용자만 변경 | 제목·기준일·메모·제외·개인 일정·구조 변경 |
| Execution overlay | 실행 행동으로만 변경 | Item 완료·완료 취소·회차·실행 기록 |
| Effective authoring snapshot | 계산 결과 | base + public session draft 또는 personal overlay를 deterministic하게 합성 |
| Effective execution snapshot | 계산 결과 | committed authoring snapshot + execution overlay를 합성 |
| Projection / artifact / receipt | 재생성 가능 | Calendar/List/Sheet/Memo 결과와 생성 범위·형식·개수·상태 기록 |

Map도 동일한 effective snapshot에서 선택 수·적용 수·preview를 계산해야 한다. 기존 `save_all`, `choose_child`, `review_hold`, risk, conflict 메타데이터를 잃지 않는다.

### 7.2 capability 단계

| 단계 | UI 규칙 | 예 |
|---|---|---|
| 주 결과 1개 | 콘텐츠의 자연스러운 목적지를 가장 먼저 실제 preview로 표시 | 날짜가 충분한 일정 → 캘린더 |
| 바로 가능 최대 2개 | 손실이 허용 가능한 보조 결과만 표시 | 체크리스트, 시트 |
| 조건부 | 필요한 입력과 입력 후 예상 개수를 같이 표시 | `시작일을 정하면 일정 8개` |
| 불가 | 숨겨서 추측하게 하지 말고 필요할 때 짧은 이유 표시 | `날짜가 없어 캘린더로 만들 수 없음` |

형식별 공통 loss schema를 projection 구현보다 먼저 정의한다.

- 보존 필드
- 변환 필드
- 제외 필드와 이유
- eligible/held/unavailable count
- 시간대·반복·완료 기준·경고·출처 처리
- 생성된 artifact의 버전과 범위

Item 상세가 “완료 기준도 체크리스트에 포함”한다고 말하면 실제 export payload에도 동일한 정보가 있어야 한다. 카피로만 약속하고 payload에서 빠지는 상태는 hard fail이다.

## 8. 공통 editor 계약

### 8.1 공통 구조

1. 상태 배지: `미저장 변경` 또는 `저장한 계획`
2. 계획 이름·기준·기간
3. 포함 항목 목록과 항목별 편집 진입
4. 중요한 조건·출처·경고
5. sticky action: 맥락에 맞는 commit 1개 + 취소

### 8.2 상태 기계

| 상태 | 진입 | 허용 행동 | 이탈 규칙 |
|---|---|---|---|
| clean | editor open | 수정, 닫기 | 닫기는 즉시 이전 화면·포커스로 복귀 |
| dirty-valid | 필드 변경·검증 통과 | 반영/저장, 취소 | 취소·뒤로가기는 버리기 확인 |
| dirty-invalid | 필수값 오류 | 오류 수정, 취소 | commit 비활성/오류 위치 포커스, draft 유지 |
| submitting | commit 시작 | 중복 제출 차단 | backdrop/Escape/browser Back으로 중간 상태를 만들지 않음 |
| success | atomic commit 완료 | 다음 상태로 이동 | 공개는 preview 갱신, 저장본은 상세+1회 save banner |
| recoverable-error | runtime/storage 실패 | 재시도, 취소 | draft·scroll·nested Item 상태 유지 |

### 8.3 화면 크기

- 모바일: 화면 하단에 붙은 인라인 편집 영역이 아니라 full-height sheet/route-modal.
- wide: 목록 맥락을 유지하는 right inspector 또는 dialog 허용.
- 두 형태 모두 필드 순서, validation, commit 의미, dirty guard, focus return은 같다.
- nested Item 편집에서 뒤로가면 Plan editor의 draft로 돌아가며 전체 sheet를 닫지 않는다.

## 9. 도움·주의 규칙

| 등급 | 예 | 노출 방식 |
|---|---|---|
| 삭제 가능 | 제목을 그대로 반복하는 설명, 이미 보이는 선택값 재표시 | 삭제 |
| 개념 도움 | `기준일`, 결과 형식 차이 | `?`/라벨 설명으로 점진 공개 |
| 조건·출처 disclosure | 일부 항목 제외, 출처 기반 값, 조건부 형식 | 관련 값 바로 옆 inline 요약 + 자세히 |
| 안전·중복·비가역 영향 | 중복 캘린더 추가, 덮어쓰기, 계정 전송, 삭제 | 행동 전에 항상 inline. 아이콘만으로 숨기지 않음 |

느낌표는 의미를 보조할 수 있지만 경고의 유일한 전달 수단이 될 수 없다. 아이콘에는 accessible name, keyboard path, 닫기와 focus return이 있어야 한다.

## 10. 용어·CTA 규칙

### 10.1 1차 승인 카피

| 현재/모호한 표현 | 1차 승인 표현 | 규칙 |
|---|---|---|
| Flow 찾기 | 계획 찾기 | Q3-B 승인에 따라 핵심 navigation부터 단계 적용 |
| 내 Flow | 내 계획 | 브랜드 FLOW와 내부 모델명은 유지 가능 |
| Flow 조정 | 계획 수정 | 사용자가 바꾸는 대상을 결과 언어로 표현 |
| 할 일 수정 | 수정 | Item 상세 맥락에서 대상이 이미 분명함 |
| 실행할 일 | 삭제 | 별도 섹션 구분이 꼭 필요할 때만 `할 일` 사용 |
| 완료(저장·닫기 의미) | 변경 반영 / 저장 / 닫기 | `완료`는 실제 Item 실행 상태에만 사용 |
| ... 시작 | 내 계획에 저장 | 공개 상세의 콘텐츠별 흔들리는 CTA 제거 |
| 내보내기 | 내 도구로 옮기기 | 실제 도착지/결과를 다음 화면에서 명시 |

제목은 행동의 결과를 말해야 한다. 내부 구현어인 snapshot, projection, adapter는 사용자 카피에 노출하지 않는다.

## 11. U01~U10 채택 수준

| ID | 채택 수준 | 결정과 이유 | 단계 |
|---|---|---|---|
| U01 | 의도 채택·해결법 수정 | 저장본 내보내기의 주 소유자는 `내 계획`. Q1-B에 따라 미수정·eligible 로컬 결과의 저장 없는 예외만 허용 | Q1-B/P0 |
| U02 | 의도 채택·해결법 수정 | 화면을 덜 복잡하게 한다는 의도는 채택. 모든 정보를 아이콘에 숨기지 않고 삭제→점진 도움→inline 경고 등급을 적용 | P0/P1 |
| U03 | 채택 | `내 계획` 역할·정보 순서·수량별 상태를 다시 설계. Q2-B의 안정적인 library shell을 적용 | Q2-B/P0 |
| U04 | 채택 | 파란 단독 surface와 `실행할 일` 제거, `할 일 수정→수정`. 완료는 Item 상태 행동으로 유지 | P1 |
| U05 | 일부 채택 | 3칸 grid는 삭제하되 선택/전체 수 같은 행동 판단 정보는 CTA 근처 한 줄로 유지. 7→8 parity는 P0 | P0/P1 |
| U06 | 채택 | 사용자가 고른 시작일을 바로 아래에서 반복 표시하지 않음. 조건·결과가 달라지는 경우에만 한 번 표시 | P1 |
| U07 | 의도 채택·해결법 수정 | 공개 상세 CTA를 일관되게 하고 여러 결과 preview를 제공. 고정 5형식과 `편집/완료`는 쓰지 않고 capability 기반 + `수정/내 계획에 저장` 사용 | P0 |
| U08 | 의도 채택·해결법 수정 | 공개·저장 편집기는 같은 family로 통일하고 full-height surface 사용. commit 효과와 라벨은 구분 | P0 |
| U09 | 일부 채택 | 공개 더보기는 실제 가능한 형식 preview 중심으로 감산. 편집 진입은 분리하되 저장 행동을 `완료`로 부르지 않음 | P0 |
| U10 | 검증 필요 | Q3-B에 따라 핵심 화면에서 `계획`을 우선한다. 실제 이해도는 여전히 관찰 과업으로 검증 | Q3-B/P1 |

Claude ZIP은 U01~U10을 직접 보지 못했다. 위 표는 사용자 원문, Codex runtime 결과, Claude의 독립 구조 제안을 기획 단계에서 합성한 판정이며 Claude의 P1~P8/D1~D2 화면을 U번호에 대응한 것이 아니다.

## 12. 기각안과 이유

| 기각안 | 이유 |
|---|---|
| 모든 도움·경고를 `?`/`!` 팝업에 넣기 | 중요한 위험을 발견하지 못하고 아이콘 접근성에 의존함 |
| 모든 계획에 고정 5형식 | 내용에 없는 날짜·구조를 만들거나 빈 결과를 먼저 보여줌 |
| 공개와 저장본의 모든 버튼·라벨을 동일하게 만들기 | 미저장 session과 persisted overlay의 효과가 다름 |
| 일반 `내 Flow`가 상황마다 다른 첫 화면을 선택 | 위치 예측성이 떨어지고 정보 구조가 숨은 알고리즘에 의존함 |
| 별도 save-only 결과 화면 유지 | 저장 후 실제 계획과 다음 행동 사이에 불필요한 중간 화면을 만듦 |
| Flow Map을 별도 제품/주 tab으로 확장 | 현재 “사용자에게 Flow 하나, Map은 aggregate” 원칙과 충돌하고 MVP 범위를 키움 |
| bounded parity fix에 legacy Map migration 포함 | 회귀 범위와 rollback 단위를 분리할 수 없음 |

## 13. P0/P1 범위

### P0 — 생명주기와 데이터 신뢰를 먼저 닫기

1. B/B/B Owner 결정 기록과 active spec 기준선 확인
2. action ownership matrix·projection loss schema·fixture 기준선
3. Flow Map applied/preview parity hard fail 수정
4. Item 완료 기준 UI/payload parity hard fail 수정
5. atomic save·중복 방지·저장 상세 direct handoff·inline receipt
6. 공통 editor transaction과 saved Plan full-height sheet
7. capability 기반 결과 preview와 공개/저장 내보내기 역할 분리
8. 승인된 `내 계획` library shell을 rollback flag 뒤에 구현
9. 전송 확인·실패·receipt 계약과 hard fail 0 회귀 게이트

### P1 — 감산·카피·극단값

1. Item 상세 파란 surface·중복 heading·부가 행동 감산
2. Flow Map 3칸 grid를 한 줄 요약으로 통합
3. 시작일 echo 제거
4. Q3-B 핵심 용어·CTA 단계 전환
5. 형식별 field parity 보강: saved ICS, TSV/Sheet, Memo, Checklist
6. 0/1/5/20 계획, 50 items, 긴 한국어, 반복·시간대·overdue·archive 회귀
7. 접근성·keyboard·focus·mobile/wide 검증
8. 제한된 실제 사용자 관찰 프로토콜 실행

### 이번 범위에서 제외

- 고급 필터와 복잡한 프로젝트 계층
- 협업·권한·공유 workspace
- 외부 도구 양방향 동기화와 OAuth 연동 확대
- AI 자동 재계획
- creator/Text Authoring/publishing 재설계
- legacy Map adapter 흡수 migration
- 실제 사용자 관찰 없이 성공 판정

## 14. 구현 acceptance criteria

상세 기준은 [인수·QA 매트릭스](./05-acceptance-and-qa-matrix-ko.md)를 따른다. 구현 slice 전체의 공통 종료 조건은 다음과 같다.

1. lifecycle × capability × scope마다 주 소유자가 하나이며 보조 shortcut은 다른 효과와 라벨을 가진다.
2. 공개 미저장 변경, 저장된 personal overlay, 실행 완료, 생성한 artifact가 서로 덮어쓰이지 않는다.
3. Map applied count, 주 preview count, 실제 저장 count가 같은 effective snapshot에서 일치한다.
4. UI가 약속한 완료 기준·메모·날짜·경고·출처와 export payload가 loss schema대로 일치한다.
5. 저장 더블 클릭, 새로고침, 뒤로가기, 같은 source 재진입이 중복 사본을 만들지 않는다.
6. clean/dirty/submitting/error 상태의 Cancel, X, backdrop, Escape, browser Back 결과가 정의와 일치한다.
7. validation/runtime/storage/clipboard/blob 오류에서도 draft와 canonical 저장본이 보존된다.
8. 모바일 sticky CTA가 가려지거나 잘리지 않고, wide layout도 같은 transaction 의미를 유지한다.
9. 모든 도움·경고 control에 접근 가능한 이름과 keyboard/focus return이 있고, 중요한 영향은 항상 inline으로 보인다.
10. 고정 5형식을 보여주지 않으며 조건부/불가 형식에는 필요한 입력 또는 이유가 있다.
11. P35 자동 회귀와 docs check가 통과하고 Codex hard fail이 0이다.
12. 과거 내부 scorecard의 총점 76·핵심 네 영역 4/5는 참고 목표다. 동일 rubric·threshold가 active QA에 별도 승인되기 전에는 구현 PASS/FAIL gate나 UXR 성공 기준으로 사용하지 않는다.

## 15. 검증 계획

| 검증 층 | 담당 | 확인 내용 | 성공 표기의 한계 |
|---|---|---|---|
| 단위·계약 | 개발 | reducer, eligibility, loss schema, snapshot parity, idempotency | 코드 계약 통과 |
| 브라우저 회귀 | 개발/QA | S01~S13, 오류·뒤로가기·중복·극단값, mobile/wide | 내부 QA 통과 |
| Codex 독립 재검토 | Codex | runtime·payload·storage·console·network와 hard fail | 로컬 시뮬레이션 통과 |
| Claude 독립 재검토 | Claude Design | 정보 순서·시각 감산·카피·접근성 후보 | 정적/디자인 검토 통과 |
| 교차 종합 | 기획 | fact/proposal/disagreement와 owner decision 준수 | 기획 acceptance 통과 |
| 제한 사용자 관찰 | 연구/Owner | 저장 후 위치 이해, 수정/저장/완료 구분, 결과 형식 선택, `계획` 용어 이해 | 실제 관찰 사용자 수와 결과를 별도 기록 |

현재 실제 관찰 사용자는 **0명**이다. 첫 관찰 전에는 “사용자가 이해한다”, “검증됐다”, “After가 확정됐다”라고 쓰지 않는다. 5명 탐색 검증 이후에만 이해도 가설을 갱신하고, 20명/50명 확대 여부는 별도 gate에서 정한다.

## 16. Owner 승인과 변경 통제

Owner는 2026-08-04에 [Owner 결정안](./02-p35-round2-owner-decisions-ko.md)의 세 질문을 모두 B로 승인했다. Map parity와 Item export parity를 포함한 실제 구현은 [active spec](../../specs/2026-08-04-p35-round2-bounded-ux-correction/README.md)의 bounded scope와 strict order 안에서만 시작한다.

승인된 로컬 인계 이후에는 다음을 지킨다.

- 옛 결정을 수정하지 않고 새 superseding decision 추가
- 하나의 active spec과 owner 지정
- My Flow IA는 flag/rollback 경로 보유
- parity fix와 legacy migration 분리
- 각 PR은 [개발 순서와 티켓](./04-development-sequence-and-tickets-ko.md)의 한 slice만 소유
