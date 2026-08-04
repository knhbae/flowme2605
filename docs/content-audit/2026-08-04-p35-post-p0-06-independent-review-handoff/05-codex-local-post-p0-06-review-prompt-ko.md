# Codex 2차 로컬 P0-06 이후 계약 반증 검토 프롬프트

먼저 [05a 1차 블라인드 프롬프트](./05a-codex-blind-root-discovery-prompt-ko.md)의 결과를 파일 hash로 고정한 뒤, 같은 Codex 세션을 계속 쓰거나 새 세션에는 자신의 1차 결과만 첨부해 아래를 전달한다. 패키지 작성·기획·Claude 검토 세션을 재사용하지 않는다. 이 프롬프트는 구현 지시가 아니라 현재 local candidate와 남은 설계의 2차 계약 반증 검토다.

---

## 역할

당신은 FlowMe P35 Round 2의 구현자가 아니라 `runtime·data·state·recovery 독립 검토자`다. 개별 문구나 색을 먼저 고치지 말고 다음 다섯 영역을 실제 코드·로컬 브라우저·storage·artifact에서 확인한다.

1. D0: 콘텐츠별 UI가 아니라 canonical 데이터와 공통 renderer/projection을 쓰는가
2. D1: 일반 `/my`에서 저장 계획 library·Today 파생 요약·선택 계획 상세가 어떤 관계인가
3. D2: 공개 미리보기→session 편집→저장→실행→옮기기→완료의 상태와 행동 소유권
4. D3: Calendar·할 일/Checklist·Sheet·Memo capability와 field loss·ID/count parity
5. D4: 공개/저장 Plan·Item의 공통 editor family와 서로 다른 commit 효과

도움·주의·용어·시각 감산은 이 구조를 확인한 뒤 검토한다.

이번 작업은 내부 시뮬레이션이다. 실제 사용자 관찰이 아니며 `observed_user = 0`, `user_understanding = NOT_ASSESSED`로 기록한다.

## 현재 기준과 안전 경계

- worktree: `D:\flowme2605\flow-p35-production-mobile-p0`
- 예상 branch: `codex/p35-production-mobile-p0`
- 기준 조상: `91fb66af063f7041f9442a9dfeb66f9a3e78d723`
- Round 2 local 상태: P0-01~P0-06 PASS, P0-07 이후 NOT_STARTED
- Production 기준: 배포된 P35. local candidate와 섞지 않는다.
- 시작 시 실제 branch·HEAD·upstream·ahead/behind·dirty paths를 다시 확인한다.
- `npm.cmd run workflow:session-start`와 repo `AGENTS.md`, `agent.md`를 따른다.
- 모든 기존 dirty path는 다른 작업자의 것으로 간주한다.
- 앱 코드, 제품 문구, 테스트, fixture, 정본 문서를 수정하지 않는다.
- 검토 결과와 새 캡처만 진행자가 지정한 새 결과 폴더에 만들 수 있다.
- commit, push, PR, merge, Preview, Production 배포를 하지 않는다.
- Text-to-Flow, creator/publishing, AI 재계획, OAuth·양방향 sync는 제외한다.

## 1차 결과 고정과 독립성

1차 결과 경로·SHA-256·고정 시각을 먼저 기록한다. hash가 없거나 이 프롬프트를 먼저 읽었다면 `blind_independence = COMPROMISED`라고 쓴다. Claude Design 결과를 읽지 않은 상태를 유지한다. 이미 읽었다면 `cross_reviewer_independence = COMPROMISED`라고 쓰고, runtime 사실과 영향을 받은 디자인 판단을 분리한다.

## 필수 입력 순서

1. [Owner 피드백 원문과 해석 경계](./00-owner-feedback-verbatim-and-ambiguities-ko.md)
2. 이 패키지 [README](./README.md)
3. [01 현재 상태와 검토 경계](./01-current-state-and-review-boundary-ko.md)
4. [02 근본 문제·가설 지도](./02-root-problem-and-hypothesis-map-ko.md)
5. [03 증거 manifest](./03-evidence-manifest-ko.md)
6. [04 비교 앱 study](./04-cross-app-study-brief-ko.md)
7. [07 공통 scorecard](./07-independent-scorecard-and-evidence-rules-ko.md)
8. [증거 JSON](./evidence-manifest.json), [시나리오 JSON](./review-scenarios.json), [응답 템플릿](./10-review-response-template-ko.md)
9. active spec의 `README.md`, `spec.md`, `qa.md`, `full-program.md`, P0-01~06 closeout
10. repo product principle·service structure·canonical data·Flow quality/UX copy 규칙

이전 결과 문서는 현재 사실이 아니라 과거 입력이다. 현재 local candidate를 직접 재현한다.

## 0. 입력·환경 manifest

먼저 다음을 기록한다.

```text
review_phase: POST_P0_06_DESIGN_SPEC_REVIEW
blind_result_path/hash/locked_at:
branch:
HEAD:
upstream:
ahead/behind:
dirty path count and scoped fingerprint:
runtime/build command:
base URL:
viewport/timezone/locale:
fixture IDs and seed hashes:
feature flags:
read inputs:
missing inputs:
blind_independence: INTACT/COMPROMISED
cross_reviewer_independence: INTACT/COMPROMISED
observed_user: 0
user_understanding: NOT_ASSESSED
```

각 관찰에는 공통 enum `RUNTIME_OBSERVED / CODE_CONFIRMED / PAYLOAD_CONFIRMED / STATIC_CAPTURE / SYNTHETIC_STRESS / DESIGN_INFERENCE / UNVERIFIED` 중 하나를 붙인다.

## 1. D0 데이터→UI 구조 추적

다음 대표 대상을 최소 포함한다.

- `/f/moving-d30-basic`
- `/f/vehicle-inspection-prep`
- `/f/curated-allblanc-morning-workout`
- `/flow-maps/middle-school-math-1`
- memo-first와 mixed-date deterministic fixture

각 대상에서 다음을 추적한다.

```text
source/base
→ canonical Item/Step/Flow
→ public session draft 또는 personal overlay
→ effective authoring/execution snapshot
→ public/saved/Today/Map projection
→ capability preview
→ artifact/receipt
```

표를 작성한다.

| 대상 | canonical ID owner | 공통 snapshot | 공통 renderer | capability branch | slug/content 전용 branch | personal 수정 반영 | legacy 이유 | 판정 |
|---|---|---|---|---|---|---|---|---|

component 이름이 같다는 이유로 공통 구조라고 결론 내리지 않는다. 실제 payload·state owner·commit effect를 확인한다. 콘텐츠마다 별도 JSX가 있어도 표현 variant인지 별도 실행 모델인지 구분한다.

D0 hard fail:

- 같은 Item의 ID·제목·순서·날짜가 surface나 형식마다 달라짐
- slug 조건이 canonical membership·save result·artifact count를 직접 소유함
- 새 콘텐츠가 새 UI·storage model을 요구함
- 동일 action이 화면마다 다른 snapshot version을 바꿈

## 2. 공통 시나리오 S01~S13

390×844을 주 기준으로 사용하고 1024×768, 밀집/desktop은 1440×900 또는 1440×1000을 추가한다.

| ID | 시나리오 | 필수 상태·근거 |
|---|---|---|
| S01 | 날짜형 공개 계획 첫 방문·시작일 전/후 | 날짜 echo, preview 반영, primary action, storage no-write |
| S02 | 날짜 없는 체크리스트형 공개 계획 | 가능한 결과, 날짜 강제 없음, 실제 Item field |
| S03 | 반복·주의가 있는 공개 계획 | routine 편집, 항상 보일 안전 정보, disclosure와 focus return |
| S04 | 메모·참고 중심 공개 계획 | 원문 보존, 억지 일정·할 일 생성 없음, unsupported reason |
| S05 | Flow Map 8→7 수정·적용·저장 | selected/applied/preview/saved count parity, 3칸 감산, legacy branches |
| S06 | Public Plan clean·dirty·invalid | 공통 family, Apply 효과, Cancel/X/Escape/Back·focus, storage no-write |
| S07 | Public Item 적용 후 부모 Plan | parent draft만 변경, Item/Plan commit 구분, exact return |
| S08 | 저장 직후 선택 계획 이동 | direct `/my`, 배너 1개, version identity, 다음 행동 |
| S09 | 일반 `/my` IA | 0·1·5·20 계획, Today 0/있음, 날짜 없음, 완료·보관, mobile/wide |
| S10 | Saved Plan·Item 편집과 Item 메모·완료·되돌리기 | nested Apply, final Save, 상세→메모→완료→되돌리기→reload, Today/계획 parity, authoring/execution 분리 |
| S11 | capability 여러 결과 | dated·undated·mixed·routine·memo·Map의 primary/available/conditional/unavailable |
| S12 | 실제 옮기기·receipt | 범위·형식·version, 성공·부분 성공·실패·retry·중복 방지; 미구현은 NOT_IMPLEMENTED |
| S13 | rollback·legacy·reload·중복 저장 | flag-off, legacy read-only, malformed/stale, no-write, 기존 사본 보호 |

합법적 deterministic fixture가 없으면 DOM이나 storage를 임의 조작해 성공 화면처럼 꾸미지 않는다. `TBD_FIXTURE_MISSING`으로 기록한다. 50 Item synthetic layout은 의미·저장·projection을 검증하지 않는다.

## 3. P0-06 editor delta 검토

Historical Before와 최신 local P0-06의 네 context를 비교한다.

| context | surface | field order | reads | writes | commit label/effect | Cancel/Back | error/retry | focus return | visual family | status |
|---|---|---|---|---|---|---|---|---|---|---|

다음을 별도 확인한다.

- Public Apply 전 persistent write 0
- Saved Item Apply 후 persistent write 0, Saved Plan final Save에서만 write
- source/base와 execution overlay mutation 0
- dirty guard와 nested return point
- wide inspector에 mobile-only chrome가 남는지
- P0-06이 제외한 Flow Map·URL draft·legacy editor가 일반 경로로 오인되지 않는지
- 공통 화면이 transaction 차이를 숨기지 않는지

## 4. P0-07~P0-09 설계 반증

아직 구현되지 않은 항목은 실제 화면 실패 `X`로 쓰지 않는다. `NOT_IMPLEMENTED`와 Proposal coverage `FULL / PARTIAL / MISSING / REJECTED / LOCAL_CONFIRMATION_REQUIRED`를 분리한다.

### capability preview

- 검증 가설인 primary 정확히 1개·available 최대 2개가 실제 content capability에서 유효한지, 더 나은 대안이 있으면 무엇인지
- conditional에 필요한 입력·입력 뒤 예상 count·editor entry가 있는지
- unavailable이 정상 선택처럼 클릭되지 않는지
- 실제 title·date·order·memo·completion criterion을 쓰는지
- preview snapshot kind/version/hash·Item IDs·count를 artifact가 재사용할 수 있는지
- 날짜 없는 Item이 VEVENT 성공 0개로 보이지 않는지

### `/my` library shell

- Today가 committed authoring+execution state의 read-only 파생인지
- Today 0이면 heading/card도 없는지
- 0/1/5/20 계획에서 안정적인 순서와 최소 검색·filter가 있는지
- save deep-link 뒤 query/filter/scroll/선택 계획으로 정확히 돌아오는지
- feature flag off가 legacy UI와 storage bytes를 보존하는지

### 실제 결과·receipt

- preview = confirm = artifact = receipt의 version/hash·IDs·count parity
- saved receipt와 public session-only confirmation 수명 차이
- file/clipboard success 전 success receipt가 없는지
- artifact success + receipt failure를 partial-local로 정확히 표시하는지
- pending·double click·retry·권한 거절·cancel에서 plan/overlay 불변인지
- public quick은 다섯 eligibility 조건을 모두 만족할 때만 가능한지

## 5. 사용자 해결안 반증

U01~U10을 모두 판정하고 최소 세 개에 반증을 제시한다.

| U ID | 사용자 의도 | current production | local P0-06 | proposal coverage | 그대로 적용할 위험 | 권장 수정 | evidence/TBD |
|---|---|---|---|---|---|---|---|

특히 다음을 자동 정답 처리하지 않는다.

- 내보내기는 무조건 저장 뒤에만
- 모든 도움·주의는 icon popup
- 모든 계획에 고정 5형식
- 하단 `편집/완료`
- Map count까지 전부 삭제
- public/saved editor의 label·effect 완전 동일
- `Flow` 전면 치환

## 6. 결론 규칙

D0~D6 근본 영역마다 결론을 하나만 선택한다.

- `confirm`: 승인된 B/B/B와 full-program을 그대로 다음 gate로 진행 가능
- `bounded_amendment`: 근본 결정을 유지하되 acceptance·순서·표면에 제한 보정 필요
- `stop_and_reopen`: 데이터 손실, 상태 소유권 충돌, 위험 은폐, rollback 불가 같은 hard fail로 승인 결정을 재개방해야 함

취향이나 미세 시각 선호는 `stop_and_reopen` 근거가 아니다.

기술 hard fail은 아니지만 IA 판단이 실제로 갈려 Owner 선택 없이는 명세를 고정할 수 없으면 verdict와 별도로 `DESIGN_RISK_NEEDS_OWNER_DECISION`을 붙인다. 승인된 Q1-B/Q2-B/Q3-B 각각에 대한 strongest counterargument를 하나씩 적고, hard fail이 아니면 기존 결정을 유지한다.

## 7. 필수 결과물

새 결과 폴더 예시:

`docs/content-audit/2026-08-04-p35-post-p0-06-independent-review-results/codex/`

1. `README.md` — manifest, 한 줄 verdict, observed 0
2. `01-blind-result-delta-ko.md` — 1차 독립 발견 중 유지·수정·기각된 것
3. `02-data-to-ui-architecture-ko.md`
4. `03-runtime-s01-s13-ko.md`
5. `04-lifecycle-and-action-ownership-ko.md`
6. `05-my-plan-ia-simulation-ko.md`
7. `06-capability-transfer-parity-ko.md`
8. `07-editor-subtraction-copy-accessibility-ko.md`
9. `08-u01-u10-traceability-ko.md`
10. `09-scorecard-ko.md`
11. `10-evidence-index-ko.md`
12. `screenshots/` — 파일명에 scenario·state·viewport 포함

각 캡처·관찰에는 route/query, flags, viewport, fixture ID/hash, before action, action, after, accessible text, storage diff, console/network 요약을 연결한다. 실제 artifact가 있으면 파일 hash·ID count·field parity를 기록한다.

## 종료 조건

- D0~D6와 U01~U10이 빠짐없이 판정됨
- state namespace, evidence kind, implementation status, Proposal coverage가 분리됨
- S01~S13의 실행/미실행 이유가 있음
- data→projection과 slug/legacy 예외가 코드 근거로 추적됨
- 공통 editor의 visual parity와 transaction 차이가 모두 기록됨
- P0-07~09 미구현을 현재 실패로 오인하지 않음
- 최소 세 사용자 해결안을 반증함
- 1차 blind 결과 hash와 2차 변경 이유가 있음
- 제공된 가설 지도 밖의 새 발견 후보 최소 3개와 Q1-B/Q2-B/Q3-B strongest counterargument가 있음
- app/runtime 파일 수정 0
- observed_user 0, user_understanding NOT_ASSESSED 유지

---
