# FlowMe 협업형 작성·편집 전략 v1.1 팀 Handoff

- 작성일: 2026-07-29
- 상태: `strategy_recommendation_not_user_validated`
- 범위: 플랫폼 운영 메커니즘, 콘텐츠별 편집 경계, version governance,
  대표 시나리오, 검증 계획
- 앱·DB·API·seed·export 코드: 변경 없음
- 실제 관찰 세션: `0 / 15`
- 외부 Calendar/Todo/Sheet round-trip: `NOT_RUN`
- 보고서 표현: 수치 근거 dashboard + 실제 서비스 8개 + 제품 UI 계약 A–E
  + 역할 기반 proto-persona·5단계 저니

## 1. 이번 세션의 결론

FlowMe는 “Wiki와 GitHub를 합친 범용 편집기”를 만들기보다 다음 네
메커니즘을 역할별로 조합하는 것이 적합하다는 전략 권고에 도달했다.

1. **작성과 작은 기여는 Wiki식**
   - 일반 텍스트, Item, SourceRow, 오류·최신성 신고 단위로 시작한다.
2. **공개 기준본 변경은 GitHub식**
   - 기준본, 개인 사본, 변경 제안, 검토, 새 version, 이력을 분리한다.
   - 사용자에게 fork, branch, PR, merge 같은 개발자 용어는 노출하지
     않는다.
3. **개인 사용은 Figma·Notion식**
   - 완성된 공개 Flow에서 한 번에 개인 실행본을 만들고 날짜, 포함
     항목, 개인 제목, 메모를 자유롭게 수정한다.
4. **실행 결과는 Cookpad·Instructables식**
   - 개인 실행 결과는 기준본과 분리한다.
   - 다음 사용자에게 실제 도움이 되는 개선만 선택해 별도 proposal로
     보낸다.

권장 상태 흐름:

```text
원출처·제작자
  → 불변 공개 Flow version
      → 비공개 UserFlowCopy overlay
          → ExecutionRun / occurrence
              → Calendar / Todo / Sheet / Memo

사용자·기여자
  → 작은 수정 제안
      → 제작자·유지관리자 검토
          → 새 불변 공개 version
              → 기존 사용자의 명시적 선택 적용
```

이 결론은 전략 권고다. 앱 구현 또는 사용자 검증 완료를 뜻하지 않는다.

## 2. 근거 압축

### 수치 범위

- 플랫폼 도감 `22개`, 이 중 작성·복제·기여·versioning 직접 비교 `7개`
- vertical 후보 `36개`, 공식 공개 근거 확인 `24개` (`66.7%`), deep dive `10개`
- 공식·공개 근거 URL `51개`, 캡처 `20개`
- 로그인 후 실제 앱 내부 검증 `0 / 24`
- FlowMe 관찰 사용자 `0 / 15`
- 24개 서비스 판정: Go `4` (`16.7%`), Partner `6` (`25.0%`),
  Benchmark `13` (`54.2%`), Hold `1` (`4.2%`)

위 숫자는 조사 범위와 다음 판단의 우선순위를 보여준다. 외부 서비스
규모, 특정 제품 실험, 조사 서비스 수는 FlowMe 채택·수정률·재방문·매출의
예측값이 아니다. 모든 외부 수치는 시점·범위·근거 등급·말할 수 없는
것과 함께 표시한다.

### 플랫폼 도감

- GitHub: 기준본·개인 사본·변경 제안·승인·이력 분리
- Wikipedia: 문장·출처처럼 작은 기여와 되돌리기
- wikiHow: 편집기보다 초기 운영자의 직접 응대·검토가 중요
- Figma Community: 미리보기 직후 개인 사본 생성과 자유 수정
- Notion Marketplace: 완성본 복제, 제작자 귀속과 원본 링크
- Instructables: 결과·준비·단계와 실행 후 개선점 연결
- Cookpad: 원본과 개인 실행·변형 기록 분리

외부 플랫폼의 성장이나 규모는 FlowMe 성과 증거가 아니다.

### Vertical 서비스

24개 서비스는 다음 8개 실행 패턴으로 모두 분류했다.

- 목표 → 계획
- 기준일 → 타임라인
- 프로필 → 오늘 계획
- 콘텐츠 → 안내 세션
- 환경 → 유지관리
- 진도 → 다음 학습
- 상태 → 후속 행동
- 모음 → 일정

공통적으로 사용자는 “원본 콘텐츠를 자유 편집”하기보다 자신의 조건을
입력하고, 파생 계획을 재계산하며, 완료·기록을 남긴다. 추천·진단·계산,
영상, 예약, 지도, 기기 제어는 원 vertical 서비스에 남는다.

로그인 후 실제 동작, 장기 사용, 외부 수정 재수입과 충돌 처리는 확인하지
못했으므로 `unknown`이다.

### 보고서의 실제 서비스 8개

| 서비스 | 패턴 | 판정 | FlowMe·앱 밖으로 가져올 것 | 전문 앱에 남길 것 |
| --- | --- | --- | --- | --- |
| Runna | 목표 → 계획 | Go | 목표일·요일·회차·Calendar | 코칭 계산·훈련 부하·GPS |
| The Knot | 기준일 → 타임라인 | Partner | 결혼일·포함 항목·Checklist | 업체·레지스트리·결제 |
| Sweepy | 환경 → 유지관리 | Go | 주기·담당·skip·Calendar | 스마트 일정·청결 상태·가구 공유 |
| SideChef | 콘텐츠 → 안내 세션 | Partner | 인분·대체재·식단·장보기 | 조리 모드·주문·추천 |
| Teal | 상태 → 후속 행동 | Go | 상태·후속일·Sheet·Todo | 공고 분석·이력서·ATS |
| Duolingo | 진도 → 다음 학습 | Benchmark | 공개 시리즈 회차·학습 일정 | 문항·적응형 출제·스트릭 |
| TripIt | 모음 → 일정 | Benchmark | 준비 항목·날짜·Calendar | 이메일 parsing·실시간 알림 |
| TurboTax | 상태 → 후속 행동 | Hold | 공개 준비 체크·공식 링크 | 민감 데이터·세금 계산·신고 |

각 사례는 `공개 관찰`, `benchmark 분석`, `FlowMe 적용 추론`,
`unknown`을 같은 사실 등급으로 섞지 않는다.

## 3. 필드 소유권

| 필드 | 소유자 | 사용자 수정 | 공용 개선 |
| --- | --- | --- | --- |
| source URL·row·snapshot·권리·caution | published content | 직접 수정 불가 | 근거를 포함한 proposal |
| canonical title·detail·order·default schedule | published content | 개인 overlay만 가능 | proposal |
| 포함 여부·개인 제목·개인 일정·주기·메모 | UserFlowCopy | 가능 | 기본 비공개 |
| 완료·skip·hold·decision·record | ExecutionRun | 가능 | 공개 안 함 |
| 한 회차 상태·시간·메모 | occurrence | 가능 | series 자동 변경 금지 |
| 품질 점수·rights decision·provider metadata | internal review | 불가 | 사용자 export 금지 |
| ICS·Markdown·CSV·XLSX | projection | 외부 사본에서 가능 | canonical write-back 금지 |

effective state 순서:

```text
1. pinned published version
2. reviewed version resolution
3. UserFlowCopy overlay
4. ExecutionRun
5. occurrence override
6. unsaved UI buffer
```

## 4. 콘텐츠 종류별 편집 경계

| 콘텐츠 | FlowMe 개인 수정 | 외부 실행 | 보호·외부 서비스 경계 |
| --- | --- | --- | --- |
| 링크·아이디어 | 제목·분류·메모·날짜 | Memo·Bookmark | 원문·출처 |
| 체크리스트·절차 | 포함·순서·개인 메모 | Todo·Checklist | 공통 절차·안전 |
| D-day·목표 | 기준일·포함 Item·가능 요일 | Calendar | 공식 마감·상대 규칙 |
| 반복 관리 | 개인 주기·담당·시작·skip | 회차 완료·알림 | 공통 관리 원칙 |
| 코스·프로그램 | 시작일·속도·세션 선택 | Calendar·진도표 | 강의·적응형 엔진 |
| 레시피·프로젝트 | 인분·대체재·선택·준비 | 장보기표·일정 | 원 레시피·영상·기기 |
| 상태형 Flow | 상태·행·후속 날짜·메모 | Sheet·Calendar | 전문 분석·문서 생성 |
| 여행·모음 | 항목 CRUD·순서·날짜 | Calendar·Sheet | 지도·예약·실시간 정보 |
| 공식·민감 | 개인 체크·알림·준비 메모 | Calendar·Todo | 진단·계산·신고·민감 데이터 |

외부 산출물은 초기에는 detached one-way projection으로 취급한다. 같은
목적지로 반복 export하고 외부 수정 재수입 요청이 반복될 때만
`explicit reimport + diff`를 재검토한다.

## 5. Version과 충돌

필수 처리:

- publisher가 사용자의 overlay와 같은 field를 변경하면 field-level
  three-way review를 제공한다.
- 새 Item은 include, exclude, 나중에 검토 중 선택한다.
- 삭제된 Item에 개인 메모·완료·일정이 있으면 orphan으로 보존한다.
- source·risk·caution 변경은 자동 적용하지 않고 필수 검토한다.
- 한 occurrence 수정은 series를 자동 변경하지 않는다.
- 동시 수정은 last-write-wins가 아니라 revision conflict로 처리한다.
- 외부 projection 수정은 자동 write-back하지 않는다.
- 개인 변경을 proposal로 보낼 때 선택한 patch와 evidence만 복사하고
  개인 메모·완료 이력은 포함하지 않는다.

## 6. 전략 결정

### 전략 계약으로 유지

- 공개 기준본, 개인 실행본, 실행 기록, 외부 projection 분리
- 새 version의 개인본 silent overwrite 금지
- 공용 변경의 bounded proposal + review
- 콘텐츠 유형별 편집 policy
- 원작자·원출처 귀속 유지

### 구현 전 검증

- 한 Item·출처·최신성만 고치는 micro-contribution 이해도
- 새 version과 내 설정을 비교·선택하는 update UX
- 제작자·유지관리자의 제안 검토 시간과 처리 책임
- 외부 reimport+diff의 실제 반복 수요
- execution feedback 중 공용 가치가 있는 정보의 선별

### 보류

- 제작자 직접 발행
- OAuth와 bidirectional sync
- 실시간 공동 편집
- marketplace·평판·랭킹

### 미적용

- 익명 canonical 직접 편집
- 개인 실행 기록 자동 공개
- 좋아요·복제 수 기반 자동 병합
- 외부 산출물 silent write-back
- 전문 vertical engine 복제
- GitHub 개발자 용어의 사용자 노출

## 7. 역할별 Handoff

### 역할 기반 proto-persona·저니 계약

아래 세 역할은 검증된 고객군이나 인구통계 persona가 아니라 기존
S01–S06을 연결하는 행동 기반 연구 가설이다. 실제 관찰은 `0 / 15`이며,
보고서·자동 QA·화면 완성도를 사용자 검증으로 간주하지 않는다.

- **실행 사용자:** 출처가 있는 공개 Flow를 내 일정과 도구로 옮기되
  개인 일정·메모·완료 기록을 잃고 싶지 않다.
- **기여자:** 전체 Flow를 다시 쓰지 않고 공용 가치가 있는 오류 한 건과
  근거만 제안하고 싶다.
- **제작자·유지관리자:** 개인 데이터를 보지 않고 제안을 검토해 기존
  기준본을 직접 바꾸지 않는 새 version을 발행하고 싶다.

공통 5단계 저니는
`① 기준본 준비·발견 → ② 소유 관계 시작 → ③ 개인화·기여 → ④ 실행·검토 → ⑤ 갱신·외부 이동`
으로 비교한다.

| 역할 | 기존 시나리오 | 화면 trace | 핵심 산출물·소유권 |
| --- | --- | --- | --- |
| 실행 사용자 | S02·S04·S05 | A 공개 기준본 → B 내 실행본 → D 새 내용 검토 → 외부 projection | `UserFlowCopy`·run·occurrence는 사용자 소유 |
| 기여자 | S03·S06 | A/B에서 공용 오류 선택 → C 정보 수정 제안 → E 검토 상태 | 선택한 `ChangeProposal`과 evidence만 기여자 소유 |
| 제작자·유지관리자 | S01 + proposal review | draft/source review → E 제안 검토 → 새 공개 version → D 사용자 선택 | `PublishedVersion`은 검토 후 새 불변 version으로 발행 |

E 화면은 현재 runtime 구현이 아닌 code-native 제품 가설이다. 현재
published field, 선택 patch, evidence, 개인 payload 제외 상태를 함께
보여주고 `추가 근거 요청`, `사유와 거절`, `새 version에 반영`을 제공해야
한다. 수락은 기존 version을 mutate하지 않으며 개인 메모·일정·완료를
검토자에게 노출하지 않는다.

근거 계약:
[페르소나·시나리오·저니맵 JSON](./2026-07-29-flowme-persona-scenario-journey-map-v1.json) ·
[Version governance·시나리오 JSON](./2026-07-29-flowme-version-governance-scenario-contract-v1.json) ·
[콘텐츠 편집 정책 JSON](./2026-07-29-flowme-content-editability-policy-v1.json) ·
[수치·사례 근거 JSON](./2026-07-29-flowme-collaborative-authoring-quantitative-evidence-v1.json)

### 콘텐츠

- 각 Flow에 primary source와 source row를 유지한다.
- 개인화 가능한 field와 잠긴 source field를 콘텐츠 유형 policy로
  표시한다.
- official fact, creator experience, caution, 개인 note를 섞지 않는다.
- 공개 proposal에는 변경 이유와 evidence를 요구한다.

### UX

- 사용자 표현은 `내 실행본 만들기`, `정보 수정 제안`, `새 내용 검토`,
  `내 설정 유지`, `일부만 적용`을 기본 후보로 한다.
- 기준본·개인본·proposal을 한 화면에서 같은 편집 상태처럼 보이지 않게
  한다.
- 기준일·주기 변경은 적용 전 파생 일정 diff를 보여준다.
- 새 version 검토에서 추가·변경·삭제와 개인 상태를 함께 보여준다.
- 외부 산출물은 자동 동기화되지 않는다는 경계를 숨기지 않는다.
- 보고서의 A–E code-native 화면을 제품
  계약 출발점으로 사용한다.
  1. 공개 기준본: 출처·제작자·version을 잠그고 `내 실행본 만들기`와
     `정보 수정 제안`을 분리한다.
  2. 내 실행본: 기준일·포함 항목·개인 메모만 편집하고
     Calendar·Checklist projection을 함께 미리 본다.
  3. 정보 수정 제안: 한 field와 근거 URL만 보내며 완료·개인 일정·메모를
     자동 제외한다.
   4. 새 version: 추가·변경·삭제를 항목별로 `새 내용 적용`,
      `내 설정 유지`, `선택 적용`하고 실행 기록을 보존한다.
   5. 제안 검토: current field·선택 patch·evidence·개인 정보 제외 상태를
      비교하고, 근거 요청·사유와 거절·새 불변 version 반영을 분리한다.

### 개발

- 현재 package는 runtime 구현 요청이 아니다.
- 향후 구현 시 existing canonical merge order와 stable Item ID를
  상속한다.
- published version은 불변으로 저장하고 proposal acceptance는 새
  version을 만든다.
- overlay, run, occurrence, proposal storage를 분리한다.
- 외부 write-back을 기본 동작으로 만들지 않는다.

### QA

- source/caution을 사용자가 덮어쓸 수 없는지 확인한다.
- 새 version이 personal schedule·memo·completion을 지우지 않는지
  확인한다.
- removed Item의 personal state 보존을 확인한다.
- proposal payload에 private memo·history가 들어가지 않는지 확인한다.
- occurrence edit이 series를 변경하지 않는지 확인한다.
- projection과 canonical의 silent write-back이 없는지 확인한다.
- 자동 QA와 screenshot을 observed-user validation으로 부르지 않는다.

## 8. 제안된 사용자 검증

현재는 `PROPOSED_NOT_RUN`이다.

- 실행 사용자 5명: 개인본 생성, 개인화, export, version update
- 기여자 5명: 오류 발견, 작은 제안, 개인 정보 분리
- 제작자·유지관리자 5명: proposal 검토, evidence 요청, 새 version 발행

가설 기준:

- 기준본·개인본·proposal 구분: 12/15 이상
- 핵심 과업을 설명 없이 완료: 10/15 이상
- version update 뒤 개인 데이터 무손실: 15/15
- proposal에 개인 기록 자동 포함: 0건
- silent overwrite: 0건

이 숫자는 검증 완료 수치가 아니라 사전에 제안된 threshold다.

## 9. 다음 Human Gate

제품 오너는 아래 중 하나를 선택한다.

1. `adopt`: 혼합 운영 모델을 후속 제품 결정의 기준으로 채택
2. `bounded revise`: 수정할 계약·콘텐츠 유형·시나리오를 정확히 지정
3. `block`: source·권리·운영비·Stage 문제로 후속 승격 중단

채택 후에도 한 번에 하나의 구현 slice만 승격한다.

- 개인 사본과 overlay
- micro-contribution
- published update review

## 10. 산출물

- [한국어 CEO 전략 보고서](./2026-07-29-flowme-collaborative-authoring-editability-strategy-ceo-ko.html)
- [수치·사례 근거 원장](./2026-07-29-flowme-collaborative-authoring-quantitative-evidence-v1.json)
- [플랫폼 운영 메커니즘](./2026-07-29-flowme-collaborative-authoring-platform-matrix-v1.json)
- [Vertical·콘텐츠 편집 정책](./2026-07-29-flowme-content-editability-policy-v1.json)
- [Version governance·시나리오 계약](./2026-07-29-flowme-version-governance-scenario-contract-v1.json)
- [전략 spec](../specs/2026-07-29-collaborative-flow-authoring-editability-strategy-v1/spec.md)

## 11. 근거

- [22개 플랫폼 도감](./2026-07-21-flowme-platform-service-dossiers-v1.json)
- [24개 vertical 서비스 benchmark](./2026-07-28-vertical-execution-service-benchmark-v1.json)
- [Vertical 서비스 한국어 보고서](./2026-07-28-vertical-execution-service-review-ko.html)
- [Research-to-product 결정 matrix](./2026-07-28-flowme-research-to-product-decision-matrix.json)
- [Canonical Flow Data Model](../specs/2026-07-11-canonical-flow-data-model/spec.md)
- [Creator Publish Gate](../specs/2026-06-26-creator-publish-step-contract/spec.md)
- [Text Authoring UX 완료 감사](./2026-07-28-flowme-text-authoring-ux-design-handoff/completion-audit.md)
