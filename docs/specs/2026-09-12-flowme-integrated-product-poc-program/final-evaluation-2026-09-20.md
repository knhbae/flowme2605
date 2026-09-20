# 통합 PoC 최종 평가

2026-09-20. **격리된 기능형 통합 PoC의 구현·두 평가/개선 루프를 완료했다.** [P01–P08 실행 계약](spec.md)의 대표 경로와 명시한 오류 경계를 검사했고, 마지막 결함 수정판 `gdvy33rCuvCJ3GJ0GP-Xo`에서 핵심 연결을 재확인했다. 실사용 서비스나 출시 준비 완료 판정은 아니다. 기존 npm 실패·의존성 취약점·미실행 검사·남은 사용성 문제를 아래에 분리했다. 테스트 수를 요구 충족률로 환산하지 않는다.

[조작 가능한 앱](http://127.0.0.1:3641/my?personalWorkspacePoc=v1) · 캡처 중심 HTML 보고서 (로컬 전용 근거: `../../content-audit/2026-09-12-flowme-integrated-product-poc-review-ko.html`) · [S01–S10와 두 루프의 근거 대조](final-scenario-ledger-2026-09-20.md)

## 세 산출물과 요구별 판정

기준은 v4.1의 개인 실행·정리, 개발1의 공개 콘텐츠 발견·개인화, 개발2의 원문 제작·구조·저장본이다. [세 산출물 왕복 매칭](three-journeys-and-review-affordance.md), [원래 코드·설계와 재사용 대조](reuse-fidelity-review.md), [현재 계약](spec.md)을 함께 적용했다. 과거 대조표의 당시 미구현 표기를 이후 구현보다 우선하지 않는다. 공유·기여는 승인된 P05/P07 통합 범위이며 원래 세 화면의 단순 복제 여부로 판정하지 않는다.

| 요구 / 주된 원래 결과물 | 구현 | 실제 통합 | 확인된 개선 | 근거 | 잔여·판정 한계 |
| --- | --- | --- | --- | --- | --- |
| P01 독립 문서 / v4.1·텍스트 모델 | Flow 없는 문서, 폴더, 원문 편집, 이동, 자동 보관, 휴지통·복구 | 문서→다른 문서 참조→같은 행 복귀, 긴 원문 reload | quota 때 휴지통 메뉴 유지, 목록 스크롤로 편집기가 가려지는 문제 수정 | [루프1 S01–03](whole-loop-one-review.md), [루프2 B](whole-loop-two-review.md) | 모든 문법·실제 모바일 입력기 동등성은 미검증. 긴 문서의 입력 부담 잔존 |
| P02 같은 항목 실행 / v4.1 | 문서·기간·폴더의 동일 target, 날짜별 누적 진행, 완료·재열기, 개인 일정 | 이틀 기록·과거 값 수정, native 주간 반복과 실제 Map 진행·참조 연결 | 진행 버튼 노출·Map 빈 실행 표시 개선. 원문 정렬 Redo 손실 수정 후 전체 data/Undo 복원 확인 | [주간 실행](weekly-execution-map-review.md), [정렬](whole-two-b-weekly-order-review.md), [Map](map-b-execution-review.md) | 대표 실행 충족. 미래 계획의 COUNT 안내는 개선 대상이며 정책을 임의 변경하지 않음 |
| P03 발견·개인화 / 개발1 + v4.1 | 공개 탐색과 기존 저장 사본 검색 분리, 일부 항목·기준일·참조·중복 방지 | 공개 질문에서 사본 사용, 네 origin의 정확한 원문·같은 문서 왕복 | 뒤로 이동 때 상황/카테고리 필터 유실 수정 | [루프1 S05/S10](whole-loop-one-review.md), [루프2 네 origin](whole-two-b-origins-review.md) | 네 origin마다 비어 있지 않은 진행 기록을 넣은 검사는 아님. 실제 서비스 공개 카탈로그 운영 검증과 구별 |
| P04 URL·출력 / 개발1·개발2 연결 | 지원 출처/원문 보완·확정, 무저장 TXT/CSV/ICS | 다른 목적의 자료를 실제 파일로 내려받고 bytes 대조. 마지막 3파일의 6링크로 같은 판본·항목·회차 범위 복귀 | 공개 출력 복귀 링크 추가, 이전 화면 기억이 명시 항목 포커스를 빼앗는 결함 수정 | [루프1 S04](whole-loop-one-review.md), [루프2 A](whole-loop-two-review.md), 최종 167확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-focus-ordinary-readonly-2026-09-20T07-20-37-361Z.json`) | 대표 출력 충족. 외부 도구 import·동기화 미검증. 파일은 전체 백업이 아니며 링크는 같은 기기·origin 자료에 의존 |
| P05 질문·경험·지식 / 승인 통합 범위 | 독립 질문/경험, 답글·반응·사진 선택, 편집·삭제, 근거 지식·내 활동 | 부분/반대 경험, 삭제된 근거 표시, 다른 로컬 참여자 답글→정확한 활동 복귀 | 다른 글에도 성공 안내가 남던 문제 수정 | [루프1 S06](whole-loop-one-review.md), [루프2 C](whole-two-c-community-review.md) | 긴 글 스크롤·응답 지연 관찰 남음. 로컬 참여자는 실제 계정/다중 사용자 인증 아님 |
| P06 제작·선택 공개 / 개발2 | 원래 native document·저장 이력·구조·작성 틀, 선택 공개, recovery 출처 분리 | 기존 저장본/미반영 입력, 첫 저장 전 recovery→명시 저장·sync·Undo·reload, 개인 필드 제외 | 임시 작업 인계·제작 초안 재진입·원문 정렬 Redo 수정, publisher 활성 모달 안의 복구 행동 연결 | [재사용 대조](reuse-fidelity-review.md), [pending](native-pending-ui-review.md), [recovery](legacy-recovery-review.md), [publisher](publisher-external-recovery-review.md) | 대표 제작·복구 충족. 모든 원문/조작 조합 동등성이나 실제 IME 입력 검증은 아님 |
| P07 원본 갱신·기여 / 개발1·개발2 연결 | 고정 구판 제안→검토→새 불변 판본, 필드/하위 체크 선택 수용·Undo | F-note 제목 유지/설명·완료 기준 각각 수용, F-week child 제안·수용 후 Undo. F-note만 철회하고 판본·사본·기록 보존 | 일반 필드 충돌의 명시 선택, 두 탭 recovery UI의 modal 밖 inert 결함 수정·실제 재검사 | [D note](whole-two-d-note-review.md), [D week](whole-two-d-week-review.md), [두 탭](whole-two-d-two-tab-review.md), 철회 21확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-note-withdraw-tail-2026-09-20T07-23-33-714Z.json`) | 승인된 대표 갱신 충족. 하위 체크 검사를 모든 typed 일정 변경 검증으로 확대하지 않음 |
| P08 통합 품질 / 세 산출물 공통 | 입력 보호, exact wire/CAS, receipt·Undo, 실패/손상 차단 | 서로 다른 목적의 두 평가 루프, 발견 결함 재검사, 최종 연결·5크기·키보드 확인 | 실제 결함과 QA 대기/selector/비교 가정 오류를 분리하고 실패 기록 보존 | 아래 검증 표와 [시나리오 원장](final-scenario-ledger-2026-09-20.md) | PoC 검증 범위 완료. npm 1실패·audit 5취약점, 기기/사용자 검증 없음. 배포 준비 완료 아님 |

## 두 평가 루프의 차이

| 루프 | 목적과 실제 결과 | 평가 후 개선·남은 범위 |
| --- | --- | --- |
| [1: 기본 사용에서 공유 이후까지](whole-loop-one-review.md) | 독립 메모→이틀 누적 진행→이동/복구; 무저장 출력; 공개 일부 사용→경험/질문→제작·선택 공개→구판 제안·개인 부분 수용. 네 origin 및 제작 원문 왕복도 별도 검사 | 필터 복귀, 진행 버튼 경계, 성공 안내 범위, 일반 필드 충돌 선택을 실제 개선·재검사. S09 초기 Back/없는 대상의 상세 기록 누락은 후속 reload 통과와 별도로 남음 |
| [2: 다른 원문·반복·누적 상태](whole-loop-two-review.md) | A 학습 준비 자료 무저장 출력; B 긴 자유 문서/주간 반복/native/Map; C 별도 공개 사본·커뮤니티; D 다중 필드 충돌·실제 하위 체크·두 탭·F-note 철회 | 문서 가림·제작 재진입·기존 D2 recovery 인계·Redo 손실·모달 복구 버튼·파일 복귀 포커스를 개선하고 같은 자료에서 재검사. 첫 루프의 성공을 두 번째 루프로 복제하지 않음 |

Map의 새 삭제·재등장은 누적 production 프로필에서 원본을 덮지 않고, 실제 factory와 생산 component를 연결한 **분리 메모리 harness**에서 검사했다. 4거래의 실제 모델/store 재생은 일치했지만 reload는 captured 상태를 다시 읽는 구조다. 누적 데이터의 저장 복구 검사로 세지 않는다. harness favicon 404 console 1건도 별도 남겼다. [정확한 범위](map-b-execution-review.md)

## 자동 검증과 화면 증거

| 실행 | 결과 | 해석 |
| --- | --- | --- |
| 통합 신규 전체 회귀 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-20T07-16-30-391Z.json`) | 181파일, 1,749/1,749 PASS, skip 0 | 복구 모달·공개 파일 복귀·원문 정렬·명시 대상 포커스 수정 후 전체 재실행. 실행 중 소스 변경 0 |
| 복구·출력·정렬 표적 회귀 | 복구 관련 70/70, 출력 관련 115/115, 정렬·구조 22/22 | 위 전체 suite와 중복되므로 고유 검사 수로 합산하지 않음. 초기 fixture 타입 오류는 보완 후 strict 재검사 |
| 전체 strict (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-20T07-17-38-986Z.json`) / production build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-20T07-16-19-654Z.json`) | strict 390 entry·421 source, 진단 0. build `gdvy33rCuvCJ3GJ0GP-Xo` PASS | route chunk `page-a578091b8c44e11b.js`. 소스·실행 대조 29/29 (로컬 전용 근거: `../../../output/integrated-product-poc/final-closeout-crosscheck-2026-09-20T07-28-26-598Z.json`): 여섯 검사 기록과 현재 421개 소스 해시 일치 |
| npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-20T07-18-22-280Z.json`) | 2,031 실행, 2,030 PASS / 1 FAIL, skip 0 | 기존 `seed-flows.test.ts`의 출처 검토 기한 검사 실패. 원본 날짜를 고쳐 통과시키지 않았으며 전체 npm PASS가 아님 |
| 승인 범위 회귀 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-20T07-20-09-291Z.json`) / public 회귀 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-20T07-20-16-440Z.json`) | 201/201 / 19/19 PASS, skip 0 | 다른 suite와 중복될 수 있으므로 총 고유 검사 수로 합산하지 않음 |
| npm audit, 06:06 UTC (로컬 전용 근거: `../../../output/integrated-product-poc/audit-2026-09-20T06-06-49-398Z.log`) | 실패: 취약점 5개(low 1, moderate 1, high 2, critical 1) | Next·sharp·browserslist·baseline-browser-mapping·postcss-selector-parser. 실패 테스트 5개라는 뜻 아님. 강제 의존성 변경 미실행 |

최종 gdvy에서 문서·출력·질문·비교 167확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-focus-ordinary-readonly-2026-09-20T07-20-37-361Z.json`), Map 84확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-focus-readonly-2026-09-20T07-20-17-597Z.json`), 철회 후속 21확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-note-withdraw-tail-2026-09-20T07-23-33-714Z.json`), 제작/개인 주간 왕복 13확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-core-creator-2026-09-20T07-26-54-509Z.json`)을 실행했다. 이는 4개 실행 기록의 확인점이며 285개의 독립 시나리오나 사용자 수가 아니다. 167·84·13은 저장0, 철회는 이전 초안 준비1쓰기와 후속 철회1쓰기다. 콘솔/page error는 모두0이다.

| 화면 크기 | 실제 화면 평가 | 남은 사용성 한계 |
| --- | --- | --- |
| 375×812 | 개인 문서·공개 출력·질문·필드 비교·Map의 지정 핵심 행동을 확인. 버튼 hit·44px·페이지 가로 넘침0 | 긴 QA 제목의 여러 줄 표시, 원문과 출력창 내부 스크롤 |
| 390×844 | 위 화면과 철회 확인의 적용/취소 조작 가능. 캡처 직접 확인 | 긴 선택 공개 목록과 본문을 읽는 스크롤 부담 |
| 844×390 | 출력·비교·철회·Map의 지정 핵심 행동 노출/클릭 가능, 가로 넘침0 | 헤더·제목이 높이를 많이 차지함. 상단과 본문·행동 전체가 동시에 보이지 않으며 세로 스크롤 필요 |
| 1024×768 | 문서/목록 분리, 공개 출력, 질문, 비교의 내용·행동 충돌 없음 | 긴 비교는 모달 내부 스크롤, 항상 모든 행동이 보이는 구성은 아님 |
| 1440×900 | 문서·카탈로그 상세·질문·비교 2열과 Map 연결 확인 | 긴 원문·출력의 밀도와 큰 여백 개선 여지 |

두 탭 복구와 native 정렬의 변이 검사는 앞선 ylSng 실행판이며 최종판에서 모두 다시 수행했다고 세지 않는다. 마지막 변경은 App 포커스 복구이고 최종 readonly 연결·실제 App effect 3회귀가 그 영향 범위를 확인한다. 실제 Android Chrome/iOS Safari·실제 IME·보조기술 검사는 미실행, 관찰 사용자 0명이다.

## 운영 데이터 보호: 프로필마다 따로 판정

| 자료 / 프로필 | 보호 대상과 방법 | 한계 |
| --- | --- | --- |
| ordinary 누적 QA | Program 외 운영 local key 0개, session 0개. 전후 wire·snapshot 비교, 허용 prefix 밖 setItem/removeItem/clear 0 | 채워진 사용자 운영 데이터 불변의 증거가 아님 |
| [네 origin 독립 이관 QA](whole-two-b-origins-review.md) | 합성 보호 9키 + Program 1키, 전체 10키 bytes reload 전후 일치. 제품 쓰기 0 | 실제 네 사용자 원본이 아니라 기록에서 이관한 명시적 합성 자료. 원래 준비 쓰기와 제품 쓰기 분리 |
| [실제 Map QA](map-b-execution-review.md) | 채워진 운영 3키, Program 포함 전체 4키 및 session bytes 비교. B 실행 성공 3쓰기만 PoC key | 이후 메모리 harness의 4거래와 누적 프로필 거래를 합산하지 않음 |
| [기존 D2 B pending QA](native-pending-ui-review.md) | D2 원본·sentinel 2키 불변. Program 성공 3쓰기, sync/Undo/reload 후 전체 비교 | 브라우저가 닫힌 기간의 연속 감시는 아님. 기존 D2 A 결과와 별도 원장으로 유지 |
| [recovery 신규 독립 QA 3종](legacy-recovery-review.md) | 각 원래 helper 기반 source 1키+sentinel 1키 불변. 앱 성공 총 10거래, quota 실패 1, prefix 밖 writer 0. strict decoder/실제 model·store·Undo로 캡처 거래 10개 bytes 재생 일치 | 빈 프로필 확인 후 준비 쓰기 각 2회/총 6회는 앱 거래 아님. 신규 fixture 기반이고 사용자 실자료 아님. unload 관측 공백은 전후 wire로 보완 |

프로필별 키 개수는 더하지 않는다. 관측 writer 0과 bytes 불변은 서로 보완하는 증거다. 비관측 구간의 호출 0까지 소급하지 않는다. 원래 worktree·운영 저장소 writer를 호출하거나 `localStorage.clear()`로 초기화하지 않았다.

최종 저장소 보호 대조는 4,781개 중 4,778개 byte 동일·승인 접점3·예상 밖0 (로컬 전용 근거: `../../../output/integrated-product-poc/baseline-verification.json`)이다. 접점은 gated Route, optional ResultPresenter port, PoC STATUS 주석이며 기본 `/my`의 운영 writer/schema 변경이 아니다. STATUS 주석 제거 후 기존 본문의 SHA 복원 (로컬 전용 근거: `../../../output/integrated-product-poc/status-note-boundary-2026-09-20T07-35-22-128Z.json`)도 일치했다. 원래 dirty worktree를 정리·stage하지 않았다.

HTML 정적 검사239확인·5PNG (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-20T07-35-22-531Z.json`)와 문서/링크 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-20T07-35-43-393Z.json`)는 통과했다. 이것은 보고서 브라우저 렌더 검사가 아니다. 실제 앱 캡처는 별도로 직접 검토했다.

## 이번 보완의 실제 수정 파일

경로는 `lib/flow/integrated-poc/`와 `components/flow/integrated-poc/` 기준이다. 전체 누적 작업의 파일 목록이 아니라 이번 종료 검증에서 보완한 범위다. 현재 전체 검증 대상 경로·해시는 위 build 기록의 `sourceHashes`에 있다.

- 신규 recovery: `legacy-creator-recovery-codec.ts`, `native-creator-recovery-source.ts`, `legacy-creator-recovery-handoff.ts`, `legacy-creator-recovery-controller.ts`, `ProgramLegacyCreatorRecovery.tsx` 및 각 직접 회귀 검사. 저장본 identity와 recovery identity를 분리하며 원래 saved-only restore는 유지했다.
- owner·context 연결: `native-creator-document-contract.ts`, `native-creator-document.ts`, `creator-native-context.ts`, `creator-workspace-contract.ts`, `creator-history-contract.ts`, `creator-native-execution-contract.ts`, `creator-workspace.ts`, `creator-native-execution-adapter.ts`, `creator-native-lineage.ts`, `creator-native-workspace.ts`, `ProgramCreatorNativeContext.tsx`. 미저장 working의 canonical/pending sync·명시 저장을 연결하고 가짜 library/version을 만들지 않았다. `native-creator-recovery-owner.test.ts`, `ProgramCreatorNativeContext.recovery.test.tsx`와 기존 saved fixture의 narrowing 회귀를 포함한다.
- 부모 연결 및 실제 inspector 결함: `ProgramApp.tsx`, 신규 `ProgramApp.external-recovery.test.tsx`. 같은 recovery 상태·handler를 inspector가 열려 있을 때 활성 modal 안에 한 번만 표시한다. 저장 schema나 stale 차단을 완화하지 않았다. `ProgramApp.navigation.test.tsx`의 실제 effect 회귀3개는 명시 항목/답글 포커스, 일반 문서 Back 복원, 없는 대상 fallback을 구분한다.
- 같은 복구가 필요한 publisher: `ProgramPublisher.tsx`와 App 연결. [실제 두 탭 검증](publisher-external-recovery-review.md)에서 quota·stale 저장 거절, 미저장 TXT 보관, 취소/명시 폐기·reload·5크기를 확인했다.
- 공개 파일 복귀: `public-output-return.ts`와 직접 검사, `output.ts`, `navigation.ts`, `ui-contract.ts`, `ProgramDiscovery.tsx`와 출력 복귀 검사. 공개 판본·항목·출력 조건의 교체 가능한 URL 표현 v1이며 개인 payload·저장 schema를 바꾸지 않는다.
- 원문 정렬 Redo: `ProgramCreatorWorkspace.tsx`, `ProgramCreatorWorkspace.order.test.tsx`. 전체 계획·정체성·선택과 한 native 거래를 유지하면서 변하지 않는 접두부/접미부만 치환에서 뺐다. Unicode surrogate/CRLF 경계는 자르지 않는다. shared LiveEditor와 운영 파일은 변경하지 않았다.
- QA runner·캡처·오프라인 교차검사는 제품 코드와 별도다. [recovery 원장](legacy-recovery-review.md)에 exact fixture/hash와 실행 기록을 연결했다.

## 마지막 결함과 완료 판정

- 원문 정렬 후 Redo가 제목 일부를 잃는 실제 실패를 기록했다. 변하지 않는 앞/뒤 문자열을 native 치환에서 제외해 366자 전체와 data/Undo의 정확 복원을 확인했다. 브라우저 내부 원인을 전부 확정했다고 주장하지 않는다.
- inspector/publisher의 복구 UI가 modal 밖에 있어 눌리지 않던 결함은 활성 modal 안으로 옮겼다. stale 저장 거절, 입력 보존, 취소·명시 폐기·최신 복귀와 실제 TXT 보관을 별도 원장에서 확인했다.
- 공개 파일 링크는 내용 복귀 후 이전 `program-main` 포커스가 덮던 실제 실패31확인을 보존했다. 명시 항목/답글 우선 복구로 수정하고 최종167확인에서 TXT/CSV/ICS의6링크를 재검사했다.
- F-note 철회는 초안 준비1쓰기 뒤 QA의 중첩 selector에서 중단했다. 같은492에서 이어 철회1쓰기→493, 과거 판본·사본·개인 기록·Undo·F-week 보존과 reload를 확인했다. 새 자료로 실패를 감추지 않았다. [출력·철회 원장](final-output-withdraw-review.md)

ordinary 최종 revision493, SHA `cb3fc610b2208091e36f73db1b7972a08cde4c2864f18a6acec3b7cc28f78c38`. Map은 별도 revision11이다. 성공 자료를 다시 만들거나 전체 저장소를 초기화하지 않았다. 승인된 필수 경로에 남은 데이터 손상·입력 손실·공개 누출 결함은 이번 검사에서 확인되지 않았다. 이는 모든 입력에 결함이 없다는 보증이 아니다.

## 남은 결함·의사결정

1. 기존 출처 기한 검사 실패와 의존성 취약점은 배포 전 별도 해결해야 한다. 자동 강제 업데이트·출처 날짜 위조는 하지 않았다.
2. 낮은 가로 화면, 긴 제목/비교/출력, 누적 Map 응답6.8~8.6초·답글 약5.7초는 이전 관측에 근거한 사용성 개선 항목이다. 최신판의 새로운 성능 수치로 바꾸지 않는다.
3. ‘이 회차부터’의 새 COUNT 안내를 분명히 할 필요가 있다. 총횟수 유지 등 새 정책은 확정하지 않았다.
4. 실제 기기·OS 입력기·보조기술·외부 도구 import·관찰 사용자 검증은 미실행이다. 보고서 HTML의 브라우저 렌더는 URL 보안 정책 차단으로 미실행이며 다른 주소로 우회하지 않았다. 정적 HTML/링크/PNG 검사와 실제 앱 화면 검사를 구별한다.
5. GitHub Pages 상시 실사용, 전체 백업/복원·업데이트 migration·계정/DB·기기 간 보존은 별도 목표다. 현재 결과에 귀중한 개인 자료를 유일본으로 축적해도 안전하다는 판정은 하지 않는다.

## 발행·외부 실행

| 항목 | 상태 |
| --- | --- |
| commit | 미실행 |
| push | 미실행 |
| PR | 미생성 |
| merge | 미실행 |
| Preview | 미배포 |
| Production | 미배포. 로컬 production build와 구별 |
| DB·서비스 가입 / 외부 업로드 | 0건 |
| 실제 기기 검사 | Android Chrome·iOS Safari 모두 미실행 |
| 관찰 사용자 수 | 0명 |
