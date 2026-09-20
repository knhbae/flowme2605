# P3-K 단계별 구현 목표 마감 — C3 제품 후보와 K4-D 설계

2026-09-06. **계획에 정한 K1~K3의 한정 구현·검증과 K4-D 설계 패키지까지 마쳤다.** K4-D 종료가 필드 기능의 구현 완료가 아니라는 [실행 계획 §11](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md#11-k4--필드-계약대체-결정-정리)을 적용했다. 모든 제품 요구가 충족됐다는 선언이나 출시 판정이 아니다.

조작용 PoC (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko.html`) · HTML 보고서 (로컬 전용 근거: `../../content-audit/2026-09-05-flowme-integrated-poc-gap-implementation-ko.html`) · [전체 단계 이력](./progress.md) · [다음 구현 gate](./k4-implementation-gates.md)

## 1. 구현한 기능

K1 원문 도움의 대상/저장 실패 보호·미저장 편집 이탈, K2 신규 완료 owner 분리·기간별 순서·직후 Undo, K3 작성 도움/틀·개인 Plan 편집·출처/복귀·명시 비교 연습을 순서대로 진행했다. 각 단계의 지원 범위·최초 실패·후속 수정은 진행 원장에 남아 있으며 이번 마지막 검사 수와 합산하지 않는다.

마지막 C3 변경은 다음과 같다.

- PoC 본문의 행동·선택·초점 색상을 승인된 로컬 청록에 연결했다. 전역 theme·nav·기본 `/my`는 바꾸지 않았다.
- 확인된 상세 이동/완료, 원문 비교, 작성 하위 체크 등의 클릭 영역을 48×48 이상으로 보완했다. 모든 앱 control을 일괄 확대하지 않았다.
- standalone의 같은 Plan editor 중복 진입을 상세의 `개인 편집` 하나로 정리했다. 네 결과·원문·Sheet8열·export identity는 유지했다.
- React의 정상 닫힌 비교 배너만 줄였다. 기존 기록·미해결 결정·실패·잠금·복구와 source Undo는 유지했다.

K4에서는 제품 기능을 추가하지 않았다. 네 날짜 개념, 포함/제외/복원 상태, 같은 Step의 원문 순서 preview, owner/version/legacy/원자성 조건과 다음 구현 목표를 설계·실험했다.

## 2. 변경 파일

마지막 C3 제품 변경은 [ProductShell CSS](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocProductShell.module.css), [SourceUpdateReview](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocSourceUpdateReview.tsx), [Workspace Surface](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx), standalone [app](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js)·[CSS](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/style.css)다. 생성 HTML2개와 그 정확한 파일 hash/크기를 검사하는 host·file 검사 pin도 함께 갱신했다. 구체 테스트·pin·before 사본은 [C3 QA](./k3c-c3-local-ui-qa.md), [React QA](./k3c-react-local-ui-qa.md), [standalone QA](./k3c-c3-standalone-local-ui-qa.md)에 연결했다.

K4 신규 파일은 field/anchor/inclusion/WorkingSource 설계4개와 시뮬레이션4개, 이 통합 gate/인계다. `report-data.json`·보고서 검사·생성 HTML, 진행 원장, STATUS의 격리 PoC 문단도 갱신했다. 그 밖의 오래된 dirty·미추적 파일은 소유로 편입하지 않았다. 전체 worktree의189 modified/471 untracked가 이번 변경 수라는 뜻은 아니다.

## 3. 시뮬레이션별 결과

| 시나리오 | 결과 | 구분·한계 |
| --- | --- | --- |
| 네 날짜 값과 상대/fixed/미정/실행 보존 | KAP01~09 PASS | 기존 actual reader/parser/Result를 이용한 메모리 실험. 새 기준일 저장 API 아님 |
| 현재 catalog의 제외→같은 Item 복원 | KI01~08 PASS | 전체 order·criteria·메모·완료·회차 보존. 개별 occurrence 선택은 미검사 |
| 원문 추가/삭제 retained·Undo와 current/legacy 경계 | KI09~12 PASS | 기존 C2 및 실제 validator 전제를 확인. 새 committed membership의 source 변화·저장은 미구현 |
| 같은 Step Item+속성+하위 체크 정렬·역순 복원 | WS01~09 PASS | LF/CRLF·blank·UTF-16 selection·identity·stale의 test-local 실험. 실제 native Undo·보관·reload 아님 |
| 기존 제약 확인 | KD-C01~04 PASS | 월 이동과 기준일의 차이, full-order guard, 최초 인계 재사용의 identity 위험 확인 |

기능 시뮬레이션 C3에서는 상세 완료/이동/Undo, 네 결과와 같은 편집기 취소, 명시 원문 비교/기록/적용/Undo, 작성 복귀·검색 복귀를 검사했다. 원본 gate/실행/작성33회귀와 실제 파일4·host8도 별도 통과했다. 각 raw JSON의 fixture·viewport·API counts가 정확한 범위다.

## 4. 자동 검사 실제 실행 수

| 검사 | 실행·결과 | 후보·근거 |
| --- | --- | --- |
| K4 합동 순수 | 34 실행 / 34 PASS / fail·skip0 | 합동 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/design-simulation-root34-2026-09-06T07-40-18-854Z.json`), 4+9+12+9. 네 파일 strict diagnostics0 |
| React C3 관련 | 113/113 PASS, 마지막 selector 뒤 별도14/14 | [C3 QA](./k3c-c3-local-ui-qa.md). 중복 실행은 고유 검사 합계로 더하지 않음 |
| standalone 생성·모델 | 135/135 PASS | 같은 C3 제공 후보. 표현/원형9·기존57은 별도 실행 |
| 제공 pin / runner / host CLI | 각각27/27 · 16/16 · 13/13 PASS | 기기 검사가 아닌 도우미/파일 정확성 검사 |
| React 실제 UI + 기존 회귀 | 8/8 + 33/33 PASS | 최종 build `lLXF4heLSEAJg53NdomoU`. 이전 Q8H의 C2 9/9는 별도 후보 |
| standalone 실제 UI | 4/4 PASS | actual HTTP candidate. 고유 PNG 추가용 S04 1회 재실행은 신규 등록 아님 |
| 실제 제공 file + host | 12/12 PASS | file 상세2·작성/비교2 + host8. 실제 기기 아님 |
| 최종 보고서 | 5/5 PASS | 원 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/k4-final-report-20260906-01.json`), 11구획×5크기 PNG55개 |
| 전체 npm test | **2,031 실행 / 2,030 PASS / 기존1 FAIL** | 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-npm-test-2026-09-06T07-00-19-015Z.json`). source 검토기한 실패. 이후 마지막 CSS selector는 focused/build/browser로 재검증 |
| npm 실패 뒤 별도 후속 | 201/201·19/19 PASS | npm의 후속 자동 실행으로 가장하지 않음. C3 QA에 별도 명령 기록 |
| production build | PASS | 최종 build (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c3-final-production-build-2026-09-06T07-12-12-745Z.json`). 정적18경로, 배포 아님 |
| 문서 검사 | PASS | 문서/skill sync (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/final-docs-2026-09-06T07-44-28-162Z.json`), 그 시점 required16·links6825 |

전체 테스트가 모두 green이라고 보고하지 않는다. 날짜가 지난 operating source content4개를 PoC 목표에서 임의 수정하지 않았다. 초기 실패·harness 교정·선택값 RAF 대기는 C3/K4 각 QA에 보존했다.

## 5. 브라우저 화면별 평가

| 화면 | 제품 C3 표본 | 최종 보고서 |
| --- | --- | --- |
| 390×844 | 비교/완료/Undo 역할·긴 제목·하위체크48px 확인 | 한 열 카드, 내용·요구/수정 대응 유지 |
| 375×812 | 마지막 행동은 내부 scroll 후 전체 rect/키보드 접근 | 한 열 카드·긴 문장 줄바꿈, 페이지 가로 넘침0 |
| 844×390 | 비교 footer·선택·Undo 가림 없음. 모든 값의 동시 노출은 아님 | 표를 세로로 읽음. 아래 행·링크는 scroll 필요 |
| 1024×768 | 상세/비교의 역할·수정 진입 구분 | 전후 비교 표와 실험 한계를 읽을 수 있음 |
| 1440×900 | 회색 탐색·흰 본문·로컬 청록, 중복 편집 진입 감산 | K4 표·미구현 한계·후속 계약 링크 구분 |

제품 평가와 보고서 평가는 별도다. 자동 검사는 지정 target의 rect·9점 hit·focus·overflow·console/page error를 검사했고, root/독립 담당은 기록된 PNG만 직접 검토했다. root는 최종 K4 카드5크기를 모두 보았다. 보고서의 링크도 실제 존재·키보드 focus·9점 hit를 검사했다. 모든 화면의 시인성·정보 밀도·접근성 전수 완료가 아니다.

## 6. 실제 기기 검사

Android Chrome, iOS Safari, 실제 OS IME·OS Back, TalkBack/VoiceOver: 모두 **NOT_RUN**. 자동 viewport/file 브라우저와 캡처를 실기나 관찰 사용자 검증으로 표현하지 않는다. 이번 목표를 실기 대기로 정체시키지 않았다.

## 7. 운영 데이터·파일 보호 증거

- 제품 쓰기는 `flow:poc:personal-workspace:v1:*`만 허용한다. 격리 browser의 sentinel 운영 `flow:*` bytes 전후 동일, prefix 밖 setItem/removeItem·clear0을 검사했다. 사용자 실제 프로필 데이터를 전수 검사한 것은 아니다.
- C3 standalone4의12 context에서 제품 API50/실제 byte 변경50, 읽기 단계0이다. source 적용/Undo와 실행 거래의 API를 성공 transaction 수로 섞지 않았다.
- 원manifest551 보호 비교 (로컬 전용 근거: `../../../output/poc-gap-implementation/protected-latest.json`)는 07:43:49Z에 승인36변경/예상 밖0. 최초 manifest를 새로 캡처해 기준을 바꾸지 않았다. C3가 추가한 shell CSS/test만 사전 범위 근거로 승인 목록에 더했다.
- 제공 HTML2개 SHA는 모두 `55C57D51ECE599CACA060D5A7A825A600E2D98D8E428DC51EC76E81855D8E8AD`, 각1,925,497bytes. K4 작업으로 제품/제공 HTML 변경0이다.
- 최종 보고서 SHA는 `442444A49163F84231820DD9F8FE58AF0F1441B8FCA95BB8416B222C478C7E35`. 이 hash는 보고서5/5 후보이며 제품 hash와 다르다.
- branch `agent/personal-workspace-v4-1-poc-20260901`, HEAD `6e4b44fe2f61b7086b8bbc61c30b5aa39dd4390e`, 로컬 origin/main `db74a36cbf2325573b2d696589daa659619e50f2`, upstream0/0을 확인했다. 종료 시 새 fetch/merge를 하거나 최신 main으로 무단 재배치하지 않았다.

## 8. 남은 결함·의사결정·다음 목표

[K4 구현 gate](./k4-implementation-gates.md)에 원본 요구·후속 단계·기술 선택·제품 미결 정책을 연결했다. 가장 먼저 할 것은 **K4-A1: 검증된 원문에서 개인 기준일의 변경 결과를 계산하는 순수 read-preview**다. 지원 typed non-Map/완전 authored·명시 set(date)만 다루고 원문·개인·실행·Undo bytes는 변경하지 않는다. 그 뒤 실제 preview UI와 새 저장 field의 current/Undo/legacy·source 변화·원자성 조건을 별도로 통과시킨다.

포함/복원 preview와 WorkingSource 순열 preview는 독립 구현 묶음으로 병렬화 가능하다. 전체 제외, 새 source Item의 기본 포함, 개별 occurrence 선택, 기준일 해제/Map 범위, 원문 정렬의 미정·반복·빈줄 확대는 아직 확정하지 않았다. 원본 상단/첫 행 대비·disabled 합성 대비·작성 compiler 전체·기기 조합 등 C3 미검사는 [요구 ID별 보완](./k3c-c3-current-trace.md)에 남겼다. 세 원본의 전체 충족률을 이번 결과로 올리지 않았다.

`flow-direction-capture`에 따라 기존 owner 결정은 다시 묻지 않고, 미결 사항의 이유·영향·재검토 시점을 같은 승인 spec에 기록했다. `flow-work-closeout`의 scoped inventory (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/scoped-closeout-2026-09-06T07-44-29-039Z.json`)는 권장 검증을 보여 주는 보조 자료이며 소유권이나 실제 PASS 증명이 아니다. 실제 소유 변경과 before diff는 별도로 확인했다.

## 9. 공개·관찰 상태

| 항목 | 상태 |
| --- | --- |
| commit | 이번 목표에서 미실행 |
| push | 미실행 |
| PR | 미실행 |
| Preview | 미실행 |
| Production | 미실행 |
| 관찰 사용자 수 | **0명** |

후속 작업은 기존 격리 worktree를 이어 쓰되 미소유 파일·원래 `/my`·운영 데이터 경계를 그대로 지킨다. 전체 제품 완성 또는 공개 승인을 이 문서에서 새로 만들지 않는다.
