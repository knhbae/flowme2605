# C3 현재 증거 연결 — 역사 판정은 유지

2026-09-06. C3의 로컬 색상·조작 크기·중복 진입 변경을 기존 요구에 연결한 보완안이다. **새 기능 검사나 전체 재감사가 아니며, 254개 부모·424개 하위 조건의 판정과 충족률을 바꾸지 않는다.** [C3 상위 QA](./k3c-c3-local-ui-qa.md)의 정한 구현·검사 범위 완료와 개별 원본 요구 전체 완료를 구분한다.

## 1. 판정과 ID를 읽는 기준

- ID와 당시 판정은 생성 추적 HTML의 `script#trace-data` (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html`), finding의 당시 차이는 [개발1 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.json)·[v4.1 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.json)·[개발2 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.json)를 직접 읽었다. 과거의 `충족/E3·E4`, `actual-gap`, `gap`, `code-confirmed`는 그대로다.
- 대상 finding 5개는 부모 14개와 연결된다. 이 중 `V41-001`, `D1-016`, `D2-056`에만 기존 하위 ID 16개가 있다. 나머지 11개 부모의 `subchecks=[]`를 새 원자 ID로 분해하거나 새 PASS 수로 세지 않는다.
- 아래의 **원본대로 / 후속 승인으로 변경**은 계약 관계이고, **부분 표본 / 미검사**는 이번 증거 범위다. 같은 행에 두 분류가 함께 있을 수 있다. CSS 선언·설계 검토·기존 테스트 파일 존재는 actual UI PASS를 대신하지 않는다.
- 이번 조사에서 원본 파일의 관련 절과 후속 계약을 읽었다. `D1-conversation-*`, `D2-conversation-*`는 기존 추적 원장의 회수 포인터이며, 원본 대화 전체를 새로 읽었다고 주장하지 않는다.

## 2. 세 원본과 후속 승인

| 원본 | 직접 확인한 계약 | C3와의 관계 |
| --- | --- | --- |
| v4.1 | 원본 spec (로컬 전용 근거: `../../../..//flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`) 목표·표시·검증 절: 흰 본문/평면 목록/회색 탐색/청록 강조, 날짜 heading 아래 중복 날짜 제거, 실제 시간·경로 유지, 이동 조작 48px. 원본 QA (로컬 전용 근거: `../../../..//flow-mvp/docs/content-audit/2026-09-01-flowme-personal-workspace-v4-1-assets/qa.md`) 시각 비교는 당시 사용자 사진 대비 상단과 첫 월간 Item 약258px를 다룬다. | 목록·소속·완료·날짜 의미는 **원본대로**. 원본 focus `#1268b1`을 현재 청록 focus의 근거로 인용하지 않는다. 청록 focus는 아래 후속 승인이다. 당시 첫 행 위치를 현재 C3 화면 측정으로 대체하지 않는다. |
| 개발1 | 공통 Plan/Item lifecycle spec (로컬 전용 근거: `../../../..//flow-mvp/docs/specs/2026-08-12-my-plan-edit-lifecycle-unification/spec.md`) Product contract·Acceptance 3/7/8: 같은 editor·staged 저장, clean/dirty 이탈과 focus, 보이는 수정과 관리 action 중복 금지. D1-013/014의 원 출처는 추적 원장의 8월20일 visual-only QA와 8월19일 visual-only 시안이다. | 같은 Flow의 동일 Plan editor 중복을 줄이는 것은 **원본대로**. 개발1의 전역 ink/cobalt와 C3 로컬 teal을 같은 전역 정책으로 합치지 않는다. 원래 주 행동48/보조44를 모든 화면의48×48 요구였다고 소급하지 않는다. |
| 개발2 | 8월30일 한 편집기 spec (로컬 전용 근거: `../../../..//flow-text-authoring-structure-template-inline-baseline-20260830/docs/specs/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc/spec.md`) 목표·후속 source 계약·입력 예시·접근성: 구조명6종, picker 탐색0쓰기, 명시 선택의 같은 편집기1회 삽입, ghost와 원문 분리, 웹 최소44/모바일 목표48. P0 handoff (로컬 전용 근거: `../../../..//flow-text-authoring-structure-template-p0-baseline-20260829/docs/specs/2026-08-29-flowme-p0-structure-template-development/handoff.md`) §catalog/원문 계약은 versioned 자산·결정적 compiler·질문/예시 무유입이다. | 한 편집기·원문 보호는 **원본대로**. 8월30일 선택→명시 삽입은 앞선 별도 폼의 선택 중 raw0 계약을 범위 한정 대체했다. C3의 크기·copy 감산이 이 저장 의미나 compiler 정책을 다시 바꾸지 않는다. |

[제품 UX 계약 §2](../2026-09-03-flowme-integrated-poc-product-ux-pass-v1/design-contract.md)와 [P3-F Visual owner](../2026-09-04-flowme-integrated-poc-production-candidate-v1/decision-contract.md)는 전역 ink/cobalt와 exact-query white/gray/teal을 분리하고 로컬 primary·focus를 청록으로 정한다. [C3 승인 설계 §11](./k3c-c3-local-ui-design.md)은 로컬 alias, 정한 조작의48×48, standalone 동일 Plan 진입 하나, React practice 정상 닫힌 배너 감산만 승인했다. **후속 승인으로 변경**된 이 범위 밖의 global CSS/nav·운영 writer·schema·source/personal/execution owner는 보호 대상이다.

[P3-C spec의 D2-056·정보 구조](../2026-09-03-flowme-integrated-poc-validation-examples-structure-draft-v1/spec.md)는 빈 골격과 완성 검증 예시를 별도 자산·명시 행동으로 둔다. C3에서 완성 예시 기능을 삭제하거나 template/ghost/기술 disclosure 전체가 다시 검증됐다고 해석하지 않는다. 이 finding의 선행 구현 범위는 [K3-A 설계](./k3a-design.md)이며 C3와 중복 집계하지 않는다.

## 3. 이번 실행 증거의 이름과 한계

| 참조 | 실제 결과와 후보 | 이 문서에서 사용하는 범위 |
| --- | --- | --- |
| R8 | React 최종8 원 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-local-ui-final-freeze-20260906-08.json`), `lLXF4heLSEAJg53NdomoU`, 8/8 | L01/02/03/06 + warning/하위체크2 + 기존 EX01/HS01. [독립 QA](./k3c-react-local-ui-qa.md): 15 fresh context+peer2,62개 조작 측정/558점 hit/48미달0. 기본60은5폭, source Undo1·하위체크1은 별도 표본이다. 모든 조작을5폭에서 검사한 수가 아니다. |
| R33 | 기존 React 최종33 원 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-gates-existing-final-20260906-02.json`), 같은 최종 build, 33/33 | gate9+integration10+poc14. 기존 작성·실행·이동·취소·Undo·reload·viewport 회귀. 하위체크 선택의 원래 `표 확인하기` 기대는 유지하고 실제 RAF 완료를 기다린 결과다. |
| S4 | standalone 최종4 원 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-standalone-local-ui-four-final-20260906-02.json`), app FF9D/CSS98F3, 4/4 | [독립 QA](./k3c-c3-standalone-local-ui-qa.md): 방문40·비교54개의 actual48×48/full rect/9점, 같은 editor1개, 네 결과·원문·Sheet8열, dirty/cancel focus·source apply/Undo. HTTP 후보 검사다. 고유 캡처를 위한 S04 재실행은 새 등록이 아니다. |
| F12 | 제공 file/host 원 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-provided-file-host-20260906-01.json`), 제공 HTML55C/각1,925,497bytes, 12/12 | 실제 file URL의 상세2+작성/비교2, host8. host의 structured observation 보호는 실제 사용자 관찰이 아니다. `androidOutput` 파일명도 실제 Android 실행을 뜻하지 않는다. |

8+33+4+12를 신규 원자 PASS59개로 바꾸지 않는다. R8의 하위체크 wrapper는 R33의 integration 원형 행동을 재사용하고, EX/HS·S4·F12도 기존 기능을 다른 경계에서 반복한다. 원 JSON의 등록 수·viewport 반복·fixture/API 수는 서로 다른 단위다. 앞선 Q8H의 C2 9/9는 [별도 QA](./k3c-react-local-ui-qa.md)의 역사 후보로만 남기며 lLXF 실행에 합치지 않는다.

## 4. Finding → 기존 ID → 현재 증거

### K-D1-07 — 로컬 행동·초점의 색상 소유

| 기존 ID | 현재 연결 | 남은 조건 |
| --- | --- | --- |
| `D1-013` (하위 ID 없음) | **후속 승인으로 변경 + 부분 표본.** R8 L01이 default/invalid/exact의 전역 DOM·computed 전후 일치, 로컬 청록을 확인한다. L02와 S4 S03은 hover/selected/focus와 실제 위험/오류색을 분리한다. | 전체 Production 시각 문법·모든 consumer 전수검사가 아니다. 원래 전역 cobalt를 실패로 처리하지 않는다. |
| `D1-014` (하위 ID 없음) | **원본 기준 유지 + 후속 범위 보강 + 부분 표본.** R8의62조작과 S4의94측정에서 폭·높이48 이상, viewport 안 rect·9점 hit를 확인했다. 기본 React60/S4는 ancestor clipping도 검사했다. 추가 하위체크1은 rect·hit 표본이며 같은 ancestor 검사를 했다고 확대하지 않는다. standalone36/40·React25/60의 이전 미달과 하위체크44px를 보존한다. | 모든 주/보조 행동·상태를5폭에서 검사한 것은 아니다. disabled의 opacity0.6 합성 대비는 **미검사**. native 보조기술·실기기 미검사. |

실제 normal/hover/selected/failed/danger의 불투명 텍스트 대비와 focus, warning 표본은 [R8 QA](./k3c-react-local-ui-qa.md)에 있다. 코드의 token 존재만으로 충족하던 공백에는 이제 actual 증거가 있지만, finding의 모든 소비자·모든 상태 완료로 승격하지 않는다.

### K-D1-08 — 같은 편집 진입과 내부 설명

| 기존 ID | 현재 연결 | 남은 조건 |
| --- | --- | --- |
| `D1-014` | **원본대로 + 부분 표본.** S4 S02에서 같은 Flow의 동일 editor2진입→상세1진입과 취소 focus를 확인한다. R8 L06은 다른 목적의 source Undo를 남긴 채 같은 비교 기록의 정상 닫힌 중복 배너만 줄인다. | 한 화면 한 primary의 모든 상태·출처 조합은 미검사다. Item `계획에 반영`과 Plan 저장은 중복으로 보지 않는다. |
| `D1-025` (하위 ID 없음) | **원본대로 + 부분 표본.** S4 S02는 기본 결과 제목/원문 disclosure/설명의 기술 문구를 정리하고 원문·네 결과·ID·Sheet 열을 보존한다. React 정상 배너 감산과 오류/잠금 예외는 R8/R33·기본 presenter 보호 근거로 분리한다. | 사용자 Text 전체의 sourceTrace 비노출과 Calendar 날짜 rail 중복 낭독을 C3가 전수검사하지 않았다. 보조기술 실제 낭독 **미검사**. DOM의 ref/data attribute 보존과 사용자용 문구 감산은 다른 조건이다. |
| `D1-016.1` 계획 찾기 / `D1-016.2` 쓸모·자연 결과 | **부분 표본.** R8 EX/HS 검색→취소→같은 작성 복귀, S4/F12 상세 방문과 결과 보존은 연결 근거다. | 출처 검색 품질·모든 자연 결과 선택의 완결 증거는 아니다. C1 별도 원장을 C3에서 재점수하지 않는다. |
| `D1-016.3` 결과·기준일 결정 | 결과 표본은 S4에 있으나 **기준일 결정은 C3 미검사**. | Calendar 월 cursor·결과 보기·실행일 이동을 Plan 기준일 구현으로 대체하지 않는다. K4 계약 gate다. |
| `D1-016.4` 조정·저장 / `D1-016.5` 실행·이동 / `D1-016.6` 복구 | **부분 표본.** R33의 작성 handoff·날짜/폴더/순서/완료/Undo/reload·trash 회귀, S4/F12의 명시 저장·완료/Undo를 연결한다. | 실제 등록의 출처·fixture·저장 실패 경계만 사용한다. 디자인 감산만으로 모든 lifecycle·복구 경합이 새로 PASS된 것은 아니다. |
| `D1-016.7` 여정 전체 한 문법 | **부분 표본, 전체 완료 미판정.** 단일 editor·source/개인/실행 구분을 보호한 UI 변경이다. | 기준일·포함/제외 등 남은 필드 의미, 전체 출처×여정 비교·실제 사용자 효용은 이 실행으로 닫히지 않는다. |

### P3K-V41-03 — Today 날짜·상단 높이·첫 행

| 기존 ID (모두 하위 ID 없음) | 현재 연결 | 남은 조건 |
| --- | --- | --- |
| `V41-024`, `V41-056` | **원본대로 유지할 계약.** 날짜 heading 아래 중복만 제거하고 시간·경로를 보존하는 선행 [K2-C 설계](./k2c-design.md)·[React QA](./k2c-react-browser-qa.md)와 별도 연결한다. R33의 기간/이동 회귀는 보호 표본이다. | C3에서 Today 날짜1회·모든 날짜 그룹의 시간/경로·접근성 설명을5폭으로 새 전수집계하지 않았다. 이 finding을 색상/배너 감산 성공으로 완료 처리하지 않는다. |
| `V41-053` | 원본 QA의 사용자 제공 사진 대비 상단 chrome 비교가 요구다. | **C3 미검사.** 상세/비교창 PNG나 overflow0은 원본 사진 대비 상단 높이 개선량이 아니다. |
| `V41-054` | 원본은390×844 초기 화면의 첫 기간 Item·주 action이다. R33에 viewport/주 행동 보호가 있다. | **부분 표본.** 스크롤 후 target full rect와 첫 로드 무스크롤 노출은 다르다. C3 자료만으로 원본 첫 행 조건을 새 PASS로 올리지 않는다. |

### P3K-V41-04 — 전역/로컬 시각 문법

| 기존 ID | 현재 연결 | 남은 조건 |
| --- | --- | --- |
| `V41-001.1` white/gray/teal / `V41-001.3` 운영 shell·token owner | **원본 시각 역할 유지 + 후속 승인으로 focus 변경.** R8 L01의 전역 전후 exact와 실제 local 소비 색,5폭 L03·S4 색/조작이 직접 근거다. global CSS/PlatformNav 파일 불변과 실제 computed를 따로 확인했다. | 상위 `V41-001` 전체를 색상만으로 다시 PASS 처리하지 않는다. 경고/위험 의미 보존과 disabled 합성 대비의 미검사를 구분한다. |
| `V41-001.2` 폴더→날짜→완료 | **원본대로 + 부분 표본.** R33의 네 origin·이동·완료·Undo/reload와 S4/F12의 실행 회귀는 구조 보호 근거다. | 전체 실행 구조에 대한 새 모델 전수증명이나 신규 기능 완료 수는 아니다. |

### P3K-D2-06 — 틀·완성 예시·기술 정보

| 기존 ID | 현재 연결 | 남은 조건 |
| --- | --- | --- |
| `D2-043` (하위 ID 없음) | **원본대로 + 부분 표본.** 목적 중심 결과 문구와 정상 중복 배너 감산은 S4 S02/R8 L06에서 확인한다. | 개발2 원본의 template picker·기술 disclosure 전체가 C3에서 재검증됐다는 뜻은 아니다. |
| `D2-045` (하위 ID 없음) | **원본대로 + 부분 표본.** R33와 F12 C2-F02에 `moving-dday-v1` 골격의 실제 명시 삽입·원문 보존이 있다. | 6종의 구조명·exact scaffold·첫 caret·Undo/Redo 전체는 이번 묶음의 새 전수검사가 아니다. |
| `D2-049` (하위 ID 없음) | **후속 승인으로 변경된 계약 유지 + 부분 표본.** F12의 picker 선택/preview 읽기0과 명시 골격 적용, R33의 비어 있지 않은 원문 차단을 연결한다. | source0인 탐색과 source1인 명시 적용을 섞지 않는다. 6종×stale/IME/double/실패 전체는 C3 미검사다. |
| `D2-053` (하위 ID 없음) | 한 편집기·ghost가 원문을 바꾸지 않는 원본 계약은 유지한다. EX/HS의 같은 textarea·selection·native Undo는 관련 보호 표본이다. | **ghost 전체 경로는 C3 미검사.** 직접/+/template/reopen에서 toggle·clipboard·scroll·history0을 EX/HS만으로 완료 처리하지 않는다. |
| `D2-056.1` version/manifest/SHA / `D2-056.2` 재귀 draft identity·order·상태 / `D2-056.3` 3 archetype·6 compiler bytes / `D2-056.4` 19-rule·20 negative | **원본 내부 자산 계약 유지, 이번 C3 actual 묶음에서는 미검사.** 기술 문구를 기본 화면에서 줄이는 것은 검증 로직 삭제나 이 네 조건의 새 실행 증거가 아니다. | P3-C/K3-A의 별도 모델·자산 원장으로 조회해야 한다. 디자인 조사 또는 일반 build/생성 성공을 6compiler/20negative 통과로 환산하지 않는다. |
| `D2-056.5` 질문·예시·placeholder 무유입 / `D2-056.6` sidecar reload·단일 transaction·실패 byte 보존 | **부분 관련 표본만 있음.** R33/F12 골격·원문 보호 및 EX/HS 동일 원문·helper1회 반영은 관련 경계다. | compiler 전체 무유입, sidecar wrong-version/corrupt/fingerprint/stale/IME/save-failure 전체 조건을 이 표본으로 새 PASS 처리하지 않는다. |

`P3K-D2-06`의 역사 `code-confirmed-ux-review`와 일부 `doneWhen`의 “설계를 확인”은 사용자 구분 가능성·실제 동작 검증과 같은 층이 아니다. C3가 남긴 것은 제한된 표현·보호 증거이며, 6scaffold/31사례/6compiler fixture 전수 완료의 신규 선언은 없다.

## 5. 상위 원장에 붙일 결론과 보존 확인

현재 보완 문구는 다음 범위로 제한한다: **로컬 token·정한48px 조작·동일 editor/비교 중복 진입은 actual 증거가 생겼다. 날짜/상단/첫 행과 작성 틀 전체는 관련 선행 근거·일부 회귀·이번 미검사를 구분한다.** 새 발견 없는 조건은 재점수하지 않고, 기능·UX·UI·증거 층을 하나의 퍼센트로 합치지 않는다. 이는 [실행 계획 K4-T](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md)의 이력 보존 규칙을 따른다.

조사 시작과 마무리에 아래 SHA-256이 모두 같음을 확인했다. 새 문서의 부모14·하위16 ID 누락0, 로컬 링크26개 부재0, 문서 검사 PASS(필수16파일·로컬 링크6,779개)다. 이 문서 한 파일만 추가했다.

| 보존 대상 | SHA-256 |
| --- | --- |
| d1-audit.json | `d606fa139918ff667107b9d3270d3ee925fc7d6ab8c07008f76d1760a7cb6ce3` |
| v41-audit.json | `9e678925d6b13670a7fc7d1b804f9a1e96b237cbd312579f78642d56e115fbc3` |
| d2-audit.json | `496c1dce42af95b81272c2b8dfbaf0955b19156ad191a3d3f1c4fa05366d6966` |
| trace HTML /254부모·424하위 조건 | `512fe46dd8f8d39fbeb4eb7987408c504307f4f2139135987d07610bcd35909b` |

새 브라우저·제품시험·build 실행0, 제품/기존 문서/감사 JSON/사용자 HTML 변경0, 전체 재점수0. 실제 Android/iOS·OS IME/OS Back·보조기술 미검사, 사용자 관찰0, 게시 작업0이다. `flow-knowledge-maintenance`의 역사 보존 원칙에 따라 현재 증거 연결만 새 파일에 둔다.
