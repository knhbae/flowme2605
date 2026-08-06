# P1-02 Q3-B 용어·CTA·도움/주의 closeout

**판정:** `PASS — LOCAL INTERNAL GATE`

**사용자 결과:** 핵심 화면은 `계획`을 기본 명사로 쓰고, 편집 적용·personal 저장·Item 완료·실제 결과 생성·닫기를 서로 다른 동사로 표시한다. 선택적 개념 도움은 `?`, 보충 주의는 `!`로 열 수 있지만 중복·비가역·외부 전송 같은 중요 영향은 행동 옆에 계속 보인다.

**시작/종료 기준:** `codex/p35-production-mobile-p0` · HEAD/upstream `d5f693776f7cebbce72a247ddb33ca6c5d550900` 기반 dirty local tree · 2026-08-05 KST

**게시·관찰 경계:** commit·push·PR·CI·merge·Preview·Production 없음. 실제 관찰 사용자 `0명`. 이 단계는 `계획`이 실제로 이해됐다고 판정하지 않는다.

## 1. 실제 변경

- 화면별 Q3 copy profile과 금지 문구 guard를 추가했다.
- navigation→공개 preview→Map→저장 목록/상세→editor→transfer/receipt 순서로 `계획`과 effect-specific CTA를 적용했다.
- `완료`를 Item 실행과 완료 기준에만 허용하고 editor commit은 `변경 반영` 또는 `저장`, dismissal은 `닫기`로 분리했다.
- `?`/`!` 공통 disclosure를 만들고 44×44 trigger, dialog relation, keyboard, Escape, focus return을 제공했다.
- Map 선택 개념 도움과 일방향 transfer 보충 주의를 연결했다. 일방향 중요 경고는 inline으로 유지했다.
- 빠른 결과 진입과 확인창의 비저장 상태를 모두 `내 계획에 저장되지 않음`으로 맞췄다.
- `q3Copy=off` exact flag로 legacy 사용자 문구만 복구하고 FLOW 브랜드·URL·type·변수·storage identity는 유지했다.
- 공개/저장 editor의 숨은 accessible name, 저장 전 요약, 관리 메뉴, 결과 header, 빈·검색·보관 상태까지 Q3 회귀 범위에 포함했다.
- `/flows`, `/f/*`, `/my`의 owned heading·본문·목록·control·metadata까지 독립 소스 재감사를 확장하고 발견된 legacy copy를 보정해 blocker `0`으로 닫았다.
- 새 Q3 component/contract test를 기본 `test:p35-p0` gate에 포함했다.

문구 정본은 [copy inventory](./p1-02-copy-inventory.md), 도움/주의 규칙은 [disclosure matrix](./p1-02-help-disclosure-matrix.md), 캡처와 수치는 [evidence](./evidence/p1-02/README.md)에 있다.

## 2. 보존한 불변식

| 불변식 | 판정 | 근거 |
|---|---|---|
| 같은 효과는 같은 동사, 다른 효과는 다른 동사 | `PASS` | surface profile·editor/transfer component test·4 route E2E |
| 안전·중복·비가역 영향 inline 유지 | `PASS` | transfer one-way warning이 `!`와 별도로 계속 visible |
| URL·type·변수명·`flow:*` key 변경 0 | `PASS` | bounded profile, source diff, exact rollback raw storage equality |
| FLOW 브랜드와 source text 유지 | `PASS` | brand/source/internal context는 guard에서 명시적으로 분리 |
| icon-only help keyboard/screen-reader 사용 가능 | `PASS` | named 44px controls, Enter/Space/Escape, relation, focus return |
| Map action·saved identity·export scope 유지 | `PASS` | affected regression 39/39, storage/route identity assertions |
| 이해도 과장 0 | `PASS` | observed users 0, 자동 QA와 사용성 검증을 분리 기록 |

## 3. 정상·오류·rollback

- 기본: 발견·공개 상세·내 계획·Map을 세 viewport에서 계획 문구로 확인했다.
- 입력 필요: 기준일이 없으면 저장 성공을 암시하지 않고 먼저 날짜 설정 동사를 표시한다.
- 편집/저장: 공개/저장 Plan·Item이 같은 editor transaction을 유지하며 commit 효과별 라벨만 달라진다.
- transfer: preview·confirmation·receipt 흐름과 실제 artifact owner는 바꾸지 않았다.
- help/caution: Enter·Space·Escape·focus return을 통과했고, 안전 경고는 닫힌 상태에서도 보인다.
- rollback: 정확히 소문자 `q3Copy=off`일 때만 legacy copy와 optional icons를 복구한다. `q3Copy=OFF`는 default-on이고 raw local/session storage가 동일하다.
- 오류/Back/retry/duplicate: 기존 P0 editor·capability·saved library·export 회귀 39개를 그대로 통과했다.

## 4. 검증

| 명령/검사 | 결과 |
|---|---|
| independent source audit | blocker `0`; core owned routes의 금지 목록 밖 legacy copy 공백 보정 완료 |
| Q3 copy/disclosure/editor/menu/save-frame focused integration | `67/67 PASS` |
| `npm.cmd run test:p35-p0` | `345/345 PASS` |
| `npm.cmd test` | `1,070/1,070 PASS` (`114 + 345 + 611`) |
| P1-02 default E2E | `12/12 PASS`; core surfaces·URL/memo hit·miss·metadata·editor·menu·empty/search/archive·export recovery·disclosure·rollback |
| P1-02 rollback E2E | `11 PASS + 1 intentional SKIP`; optional Q3 disclosure가 없는 것이 계약 |
| P1 visual + Q3 latest runtime | `17/17 PASS`, workers 2, retries 0 |
| affected P0 editor/result/My IA/export E2E | `39/39 PASS`, workers 4, retries 0 |
| `npm.cmd run build` | `PASS`, Next 15.5.21, pages `18/18`, build `nl0mVLcBPXxwtO73FtGGF` |
| built runtime | test-only port 3114 HTTP `200` |
| before/after visual evidence | discovery/public/my/map × 390/1024/1440 × before/after = PNG `24장` |
| accessibility/browser diagnostics | unnamed visible control 0, horizontal overflow 0, 원인 미확인 browser error 0 |

## 5. Known limitations·다음 gate

- 정적 캡처는 여정 이해·정보 구조 적합성·용어 이해도를 증명하지 않는다.
- raw screen-reader 사용자 세션과 실제 사용자는 없었다.
- 형식별 title/date/order/memo/completion/source의 artifact round-trip과 생성 artifact 안의 잔여 Flow 라벨은 P1-03 소유다.
- 50 Items, 200% zoom, long Korean, legacy/malformed 전체 matrix는 P1-04 소유다.
- Text Authoring/creator의 별도 editor route는 이 프로그램 non-goal이며 P1-02 core owned route PASS에 포함하지 않는다.
- production baseline은 released P35이며 이 local build는 배포하지 않았다.

위 수치와 독립 소스 재감사 blocker `0`을 근거로 P1-02를 local internal PASS로 닫고 P1-03을 연다. 이 판정은 게시·Production 배포·관찰 사용자 검증을 뜻하지 않는다.
