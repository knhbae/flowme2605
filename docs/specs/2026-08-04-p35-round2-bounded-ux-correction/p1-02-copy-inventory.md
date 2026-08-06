# P1-02 Q3-B 사용자 문구 계약

**상태:** `IMPLEMENTED_LOCAL · INTERNAL QA PASS`

이 문서는 사용자 화면의 문구만 다룬다. `FLOW` 브랜드, `/flows`·`/f/*`·`/my` URL, TypeScript type/variable, `flow:*` storage key, 저장된 slug와 Item identity는 바꾸지 않는다. 아래의 "승인"은 Owner의 Q3-B 결정에 따른 화면별 효과 문구이며, 사용자 이해가 검증됐다는 뜻은 아니다.

## 1. Before → 승인 → 구현

| 화면/효과 | Before (`q3Copy=off`) | 승인 문구 | 구현·검증 |
|---|---|---|---|
| 전역 탐색 | `Flow 찾기` / `내 Flow` / `Flow 만들기` | `계획 찾기` / `내 계획` / `계획 만들기` | navigation과 mobile tab에 동일 적용 |
| 찾기 제목 | `URL·메모로 Flow 찾기` | `URL·메모로 계획 찾기` | `/flows` 3 viewport에서 적용 |
| 공개 상세 상태 | `Flow 미리보기` | `계획 미리보기` | `/f/*`와 실행 가능한 Map에 적용 |
| 공개 계획 편집 | `Flow 편집` | `계획 수정` | 진입 버튼과 shared editor 제목을 함께 검증 |
| 공개 계획 이름 | `내 Flow 이름` | `내 계획 이름` | visible label과 accessible name을 함께 검증 |
| 계획 항목 포함 | `{항목} Flow에 포함` | `{항목} 계획에 포함` | checkbox accessible name을 공개/저장 editor에서 통일 |
| 공개 Item 편집 | `수정` | `수정` | 계획 편집과 같은 surface를 쓰되 Item effect 유지 |
| 공개 저장 | `N개로 시작` 또는 `내 Flow에 저장` | `내 계획에 저장` | 날짜가 있으면 저장 primary 하나 |
| 공개 날짜 미입력 | 시작 동작과 날짜 요구가 섞임 | `{기준일} 정하기` | 입력 전에는 필요한 설정을 먼저 명시 |
| 공개/Map draft commit | `적용` 계열 | `변경 반영` | persisted save와 구분 |
| Map child choice | `Flow 선택하기` | `계획 선택하기` | child route 선택 효과 유지 |
| Map 저장 | `전체 저장하고 시작` | `내 계획에 저장` | save-all action identity와 count는 유지 |
| Map 저장 전 요약 | `저장될 Flow 요약` / `저장될 전체 Flow` | `저장될 계획 요약` / `저장될 전체 계획` | visible/region name을 함께 변경 |
| 저장 목록 | `My Flow` / `저장한 Flow` / `Flow 목록` | `내 계획` / `저장한 계획` / `계획 목록` | `/my`의 identity와 route는 불변 |
| 저장 목록 검색 | `Flow 검색` / `저장한 Flow 검색` | `계획 검색` / `저장한 계획 검색` | placeholder와 accessible name 함께 변경 |
| 저장 상세 관리·편집 | `Flow 관리` / `Flow 편집` | `계획 관리` / `계획 수정` | trigger·menu accessible name·command label을 함께 변경 |
| 저장 상세 commit | 혼재된 완료/반영 표현 | `저장` | personal overlay persistence에만 사용 |
| 내보내기 범위 | `Flow 전체` | `계획 전체` | preview·confirmation·receipt의 scope 통일 |
| 결과 이동 | `내 Flow에 저장하고 이어가기` | `내 계획에 저장하고 이어가기` | public recovery에만 사용 |
| 빠른 결과 비저장 상태 | `FlowMe에 저장되지 않음` | `내 계획에 저장되지 않음` | 진입 버튼과 확인창이 같은 상태 문구 사용 |
| Calendar 조건 복구 | `Flow로 돌아가 날짜를 정해 주세요` | `계획으로 돌아가 날짜를 정해 주세요` | 조건부 unavailable은 성공 결과처럼 보이지 않음 |
| 저장 영수증 | `내 Flow에 저장됨` | `내 계획에 저장됨` | 생성 결과 receipt와 구분 |
| Item 실행 | `완료` | `완료` | Item 실행 상태와 `완료 기준`에만 허용 |
| 결과 생성 | `바로 결과 만들기` / `결과 만들기` | 동일 | 실제 local effect를 뜻하며 저장과 구분 |
| 닫기 | 맥락에 따라 완료로 표현될 가능성 | `닫기` | 상태 mutation 없는 dismissal에만 사용 |

## 2. 효과별 동사 계약

| 동사 | 허용 효과 | 금지 효과 |
|---|---|---|
| `변경 반영` | 공개 session draft나 parent draft에 편집값 적용 | personal 저장, Item 실행 완료, 결과 생성 |
| `저장` / `내 계획에 저장` | personal overlay 또는 새 personal copy persistence | 단순 닫기, preview 선택, Item 완료 |
| `완료` | Item의 execution completion과 `완료 기준` | editor commit, dialog close, plan save |
| `결과 만들기` | 실제 파일·clipboard 등 local effect 실행 | preview만 전환, personal save |
| `닫기` | mutation 없는 dialog/sheet dismissal | 저장 성공, Item 상태 변경 |
| `수정` / `계획 수정` | shared editor 열기 | 변경을 즉시 persist했다고 암시 |

## 3. 허용·금지 assertion

- 허용 profile은 `navigation`, `public-preview`, `saved-library`, `saved-detail`, `receipt`, `map`, `transfer`, `item-execution`, `completion-criterion` surface별로 고정한다.
- 기본 Q3 surface의 owned accessible copy에는 `Flow 찾기`, `내 Flow`, `Flow 미리보기`, `Flow 수정`, `저장한 Flow`, `Flow 목록`, `Flow 검색`, `Flow 전체`가 없어야 한다.
- `완료`는 `item-execution`과 `completion-criterion` context 외에는 금지한다.
- `FLOW` 브랜드, 사용자/출처가 작성한 원문, internal identity는 금지 scan 대상이 아니다.
- 전역 문자열 치환은 금지한다. 소비자는 자기 semantic effect에 해당하는 profile token만 선택한다.
- `q3Copy=off`는 legacy 사용자 문구만 복구한다. URL과 raw local/session storage는 byte-identical이어야 한다.

계약 구현은 `lib/flow/q3-user-copy.ts`, 정확한 rollback은 `lib/flow/p35-round2-flags.ts`, route 검증은 `tests/e2e/p35-p1-q3-copy-disclosure.spec.ts`가 소유한다.

## 4. 독립 재감사 closeout

- `/flows`, `/f/*`, `/my`의 owned heading·본문·목록·control·metadata를 넓힌 금지 문구 guard로 다시 검사해 blocker `0`으로 닫았다.
- URL·메모 hit/miss, missing-plan metadata, no-date recovery, 저장 목록·상세·Map과 exact `q3Copy=off` rollback을 검증 범위에 포함했다.
- 생성 artifact payload 안의 사용자-facing 라벨은 형식별 parser round-trip과 함께 P1-03에서 처리한다.
- Text Authoring/creator의 별도 editor route는 이 프로그램의 명시적 non-goal이다.
