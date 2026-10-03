# 대표 요구 대조 — 현재 앱·피드백·네 디자인 시안

2026-10-02. 기준은 격리 작업본 `flow-ux-comparison-gaps-20261002`의 제품 baseline `d1cc8dd1`이다. 이 문서는 요구 비교와 후속 선택을 기록한다. 제품 코드·문법·schema·공개 정책을 변경한 기록이 아니다.

2026-10-03 수신한 `FLOWME-STATIC-REVIEW-20261002-1821UTC`의 [다섯 항목 대조](../../content-audit/2026-10-03-flowme-ux2-static-review-followup-ko.md)를 C01/C03/C08/C12/C14~C16/C18에 연결했다. 원본 시안 공통 문제5건을 현재 제품의 새 결함5건이나 요구군 완료 수로 합산하지 않는다. 원본과 제품의 대응 화면 유무·이미 있는 보호/표시 규칙·가이드 미반영을 구별하며, 기존 C군 판정과 독립 렌더 잔여는 유지한다.

## 범위와 판정

비교 분모는 아래 **대표 요구군 18개(C01~C18)**다. 최신 피드백 26개는 입력 목록으로 모두 연결하지만, 26개 해결 여부나 과거 424개 하위 조건의 전수 충족률을 계산하지 않는다. 한 요구군에 여러 원 ID와 피드백이 연결되므로 행 수·과거 검사 수를 더해 고유 기능 수로 환산하지 않는다.

개인 자유 텍스트 계획·메모, 공유 경험·지식의 탐색/재사용, 선택적 질문·기여를 함께 유지한다. 개인 작성·외부 출력·사본 실행·제작·기여는 목적별 경로다. 한 사람이 목적을 바꿀 수 있으며 계정 모드나 필수 순서로 만들지 않는다. 현재 우선순위는 방향/UX·사용성 개선이고 정식 관찰 사용자 시험은 보류다.

| 판정 | 뜻 |
| --- | --- |
| 충족 | 명시한 좁은 계약의 현재 코드와 이전 검증 근거가 있다. 모든 조합·실기기·관찰 사용자 충족이 아니다 |
| 부분 | 일부 경로를 지원하지만 요구 전체의 기능 또는 증거는 남는다 |
| 미구현 | 이번에 확인한 owner/화면 경로에 해당 기능이 연결되지 않았다. 다른 제품 모델 전체에 없다고 확대하지 않는다 |
| 미결 | 제품 의미·영구 문법·목록 규칙·소유 정책의 선택이 남는다. 코드 결함과 구분한다 |
| 원환경 미확인 | 사용자 관찰의 원래 URL·진입점·자료·필터·입력 환경이 특정되지 않았다. 일부 회귀 PASS로 원사례 해결을 선언하지 않는다 |

코드/테스트 링크는 **현재 파일을 읽은 근거**다. 이 문서 담당자는 테스트·build·브라우저를 실행하지 않았다. 이전 결과는 [두 UX 반영 spec](../2026-10-02-alpha-two-ux-dev-release/spec.md), [제작·실행 결과](../2026-10-01-alpha-flow-execution-journey/results.md), [폴더·작성·날짜 결과](../2026-10-02-alpha-feedback-ux-bundle/results.md)에 한정한다. 당시 results의 ‘미반영’은 당시 상태이며 개발계 반영의 최종 판정은 별도 closeout 작업본의 QA를 따른다. 현재 목표의 실제 HTTP 앱 검사는 주 담당자의 [QA](qa.md)에서 구분한다.

## 읽기 정본

| 입력 | 이번에 사용하는 범위 |
| --- | --- |
| [v4.1 요구](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.md) | 개인 정리·기간 보기·이동·소속/날짜 보존. V41 ID를 원 의미로 추적하며 9/5 판정을 현재값으로 복사하지 않음 |
| [개발1 요구](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.md) | 실행 대상·identity·사본/원본·저장/복귀·오류 계약. 의도적으로 제외된 운영 route와 후속 Alpha를 구분 |
| [개발2 요구](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.md) | 자유 원문·문맥 작성·Item projection·제작 결과. 후속 A0/P2/P3/M0~M7 대체 관계를 보존 |
| 최신 피드백 정본 | 로컬 전용 `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-28-flowme-use-feedback-session-ko.md`, 1~26. 최초 SHA256 `D862834C3BF1B62D1EE7C12514B5E2389EB33A26283C9C5AFE1D259FE7A30A62` 이후 일정 Dots 추가 때 `FF6740672AD344EB9871A3FF81E4539118119F046565BF8739E4B0A1F6BDB6B0`, 자유 편집 추가 후 현재 `98B6B5267DC982925DB7948DBD7ED52A017AC1E3365246B99FABA547FD78EDC4`로 바뀌었다. 원본 dirty 문서는 읽기만 했고 복사·수정하지 않음 |
| Dots 일정 시뮬레이션 | 같은 원본 작업 공간의 `docs/content-audit/2026-10-02-dots-schedule-scenario-feedback/README.md`와 원본 PDF16쪽. [R01~R06 대조](dots-review.md)는 C07~C11/C18·피드백 #22~25에 연결하되 대표18군/26피드백 수를 늘리거나 가상3명을 관찰 사용자로 세지 않음 |
| Dots 자유 편집 점검 | 같은 원본의 `docs/content-audit/2026-10-02-dots-free-edit-usability-feedback/README.md`와PDF11쪽. [FE01~FE06](dots-review.md#추가-자유-편집-피드백--fe01fe06)을 C02/C03/C04/C08/C09/C10/C12/C16에 연결. 같은 원문/전체 상태, 저장 전후 역편집, 텍스트 사본/명시 이동을 분리. 가상19체크/16카드/4완료는 실제 검사 수·제품 충족 수가 아님 |
| [최근 작성 여정](../2026-10-01-alpha-ux-journey/requirements.md), [작성 조작](../2026-10-01-alpha-writing-interactions/results.md) | J01~J14 및 Enter/메모/들여쓰기·부분/전체의 지원 제한. 후속 수정으로 이미 보완한 갭을 다시 미구현으로 세지 않음 |
| [제작·실행 10개 요구](../2026-10-01-alpha-flow-execution-journey/requirements.md), [폴더·작성·날짜 요구](../2026-10-02-alpha-feedback-ux-bundle/requirements.md) | native 재진입/retry·공개 사본 일정, 연결 위치·현재 날짜 출처·Today 구분의 현재 범위 |
| UX2 네 디자인 시안 | 로컬 전용 `D:/flowme2605/flow-text-integration-plan-20260908/docs/specs/2026-10-02-flowme-design-directions/spec.md` 및 같은 작업본 `docs/content-audit/2026-10-02-flowme-design-directions/{design-brief,qa,completion-audit,journey-review,fidelity}.md`. A 도구형·B 커뮤니티형·C 앱서비스형·D 지식/로드맵형, 공통 S1~S8. 모두 읽기 전용 |
| 원래 1~9/F5~F10 후속 | 로컬 전용 `D:/flowme2605/flow-alpha-backup-5d-publish-20260929/docs/specs/2026-09-12-flowme-integrated-product-poc-program/alpha-follow-up-register-20260930.md` 11~41행. 5D 부분 종료와 재개 조건, 6~9의 독립 설계 가능성을 유지 |

UX2의 네 시안은 같은 작은 모형을 쓰고 시작 객체/배치를 달리한다. 처음 읽은 모형37/37과 렌더 미실행은 당시 기록이다. 10/2 후속 원본 QA는 모형47/47·제한 서버8/8·네 안×3크기·대표8여정으로 갱신됐다. 주 담당자는 그 QA/source와 기존 첫 화면12장·상태6장을 읽고 [시안별 제품 차이](ux-review.md#ux2-후속-원본과-시안별-제품-차이)를 추가했다. 이 세션에서 시안 브라우저를 새로 실행한 것은 아니며 원본을 복사·수정하거나 `file:` 차단을 우회하지 않았다. 외부 시안 QA, 캡처 직접 검토, 제품 parser/writer·Auth·DB·외부 출력 성공, 실제 기기와 사용자 선호는 별도 근거다.

## 원 ID·피드백·시안 연결

S1 독립 작성, S2 같은 일 왕복, S3 여러 날 진행, S4 출력하고 종료, S5 개인 사본, S6 질문부터, S7 공개·판본, S8 실패·복귀는 UX2의 대표 시나리오 이름이다. 시안의 S 번호가 제품 요구 ID를 대체하지 않는다.

| ID / 대표 요구 | v4.1·개발1·개발2의 원 ID와 후속 | 피드백 / UX2 |
| --- | --- | --- |
| C01 독립 자유 문서와 일반 메모 | D2-001·011, J01/P01 | #3, S1. A의 문서 시작을 비교하되 다른 목적에서도 개인 작성 가능 |
| C02 Enter·Tab/ShiftTab의 예측 가능한 작성 | D2-012·034·040·058, V41-014, 작성 조작 계약 | #6·15, S1/S8 |
| C03 같은 Item의 메모 이어쓰기 | D2-002·012·011, 작성 조작의 Item.note 계약 | #16·22, S1/S5 |
| C04 부분/전체는 같은 원문, 숨은 문맥 보존 | D2-029~032·039·040·052, D1-008·011 | #13·21, S1/S2/S8 |
| C05 기존 폴더 이름의 비강제 명시 연결 | V41-012·018, D2-033·034·037·050, 후속 폴더 계약 | #17·20, S1/S2 |
| C06 연결 위치와 실행 결과의 일치 | V41-014·018~020, D2-034·037·040 | #9·10·26, S1/S2 |
| C07 보관 위치·실제 소속·조회 필터 구분 | V41-013·015~017·025, D1-005·008, J06/J07 | #2·4·5·19·21, S2 |
| C08 문서↔기간의 같은 Item·시간·원문 복귀 | V41-002·025·028, D1-002·004·006·022, D2-003·017·039 | #11·12·14, S2/S5 |
| C09 구획/개별 날짜·Today의 현재 의미 | V41-012·013, D1-006·018, D2-014·015, 후속 C1/C2 | #14·23·24, S2 |
| C10 날짜 이동·복제·반복의 identity와 메모 | V41-013·014, D2-002·016·025, 후속 F6 | #22, S2/S3/S5 |
| C11 예정일과 독립 due | 날짜/기록 보존의 V41-013·D1-006·D2-003을 전제로 한 추가 요구. 별도 due가 원 ID의 기존 완성 기능이라고 소급하지 않음 | #25, S2를 확장할 정책 후보. 네 시안 공통 due 구현 요구로 간주하지 않음 |
| C12 현재 진행과 날짜별 기록 | D1-011·018, D2-002·003, J09 | S3. 피드백26개에 없는 별도 대표 요구 |
| C13 제작 판본→개인 실행·같은 연결 재진입 | D2-004·005·020·026·057, J13/P06/P07 | #18, S5/S7. 시안이 실제 native 제작기를 구현했다고 보지 않음 |
| C14 공개 Flow 찾기·외부 출력·개인 사본 | D1-017·019·021·023, D2-003·004, J12/P03/P04 | #7, S4/S5. D 주제/단계, B 경험에서 연결, A/C의 선택 진입 비교 |
| C15 질문·기여·선택 공개/불변 새판 | D1-017·018·D2-004와 후속 P05~P07/M5. 세 원천에 모두 있던 기능이라고 소급하지 않음 | S6/S7. B/D의 질문/관련 경험, 모든 안의 선택 참여 |
| C16 확정 거절의 명시 재저장·unknown ACK 복구 | D1-003·004·011·018, D2-040·058, J11 | #1의 체감과 구분한 실패 계약, S8 |
| C17 백업·복원 창 닫기·재진입 | D1-011·D2-058의 복구 경계와 후속 M6/R13/원래5번 | S8의 보존 원칙. 네 모형이 서비스 백업을 구현한다고 보지 않음 |
| C18 작은 화면·조작 발견성·실기기·운영 관측 | V41-003~011·019·020, D1-014·015·025·026, D2-038·042·043·061·062 | #1·3·4·8·9·11, 네 안의 배치 비교 |

## 현재 코드·검사 연결과 추천

아래의 충족/부분 판정은 baseline과 명시한 이전 QA 범위에 한정한다. 새 HTTP 앱 결과는 이 표와 별도로 기록하며 모형/SSR/순수 검사와 합산하지 않는다.

| ID | 현재 owner·코드 / 검사 파일 | 판정과 남은 경계 | 이번 추천 / 정책 선택 |
| --- | --- | --- | --- |
| C01 | [ProgramTextEditor](../../../components/flow/integrated-poc/ProgramTextEditor.tsx), [text-workspace](../../../lib/flow/integrated-poc/text-workspace.ts) / [text-workspace 검사](../../../lib/flow/integrated-poc/text-workspace.test.ts) | 충족: 일반 문장·명시 할 일은 독립 작성 가능. #3의 전체 완성도/원환경은 미확인 | 문서 본문을 첫 작업 대상으로 유지. 일반 메모 자동 할 일/Flow/공개 승격 금지 |
| C02 | [입력 계획](../../../lib/flow/integrated-poc/text-input-plan.cjs), [native 입력](../../../lib/flow/integrated-poc/vendor/text-editor.cjs) / [입력 계획 검사](../../../lib/flow/integrated-poc/text-input-plan.test.ts), [키 엔진 검사](../../../lib/flow/integrated-poc/text-input-engine.test.ts) | 부분: 제목 끝 형제 추가·빈 체크 종료·즉시 들여쓰기 역연산의 구현 근거. 제목 중간/선택·부분 구조 변경은 기존 보호 제한. 실제 모바일/OS IME 미확인 | Enter마다 선택창을 추가하지 않음. 현재 지원과 전체 작성 전환을 함께 설명. 새 Enter/문법 결정은 PC01/PC02 |
| C03 | [메모 Enter 계획](../../../lib/flow/integrated-poc/text-input-plan.cjs), [text-workspace](../../../lib/flow/integrated-poc/text-workspace.ts) / [같은 Item 메모 검사](../../../lib/flow/integrated-poc/text-input-plan.test.ts) | 부분+미결: 기존 들여쓴 `- 메모:` 끝 Enter/ShiftEnter는 같은 속성을 반복해 Item.note로 합침. 새 들여쓴 본문·빈 줄 종료·공통/회차 메모는 미결 | 현재 호환을 보존. 새 문법을 이미 지원한다고 안내하지 않음. PC01/PC03 |
| C04 | [부분 편집기](../../../components/flow/integrated-poc/ProgramFolderRegionEditor.tsx), [folder-document-regions](../../../lib/flow/integrated-poc/folder-document-regions.ts) / [부분 편집 검사](../../../components/flow/integrated-poc/ProgramFolderRegionEditor.test.tsx), [부분 모델 검사](../../../lib/flow/integrated-poc/folder-document-regions.test.ts) | 부분+원환경 미확인: 같은 native 입력·full 재구성·ID/숨은 bytes 보호. 부분은 전체와 같은 write 권한이 아님. #13 원 flicker·OS IME/AT 미확인 | 부분/전체 이름과 지원 범위만 표시. 숨은 문맥을 조각 payload로 저장하거나 두 번째 편집기 도입 금지 |
| C05 | [폴더 제안](../../../lib/flow/integrated-poc/folder-link-suggestions.ts), [ProgramTextEditor](../../../components/flow/integrated-poc/ProgramTextEditor.tsx) / [제안 검사](../../../lib/flow/integrated-poc/folder-link-suggestions.test.ts) | 부분+미결: 정확 이름·서로 다른 부모 경로·명시 확정·guard 지원. 자동 연결/생성은 하지 않음. `@/#`·부분 일치·정규화/rename/move 정책은 미결 | 현재 정확 이름 제안과 경로를 유지. 새 문법보다 현재 명시 조작의 발견성부터 비교. PC05 |
| C06 | [실제 위치 preview](../../../lib/flow/integrated-poc/folder-link-preview.ts), [slot](../../../lib/flow/integrated-poc/folder-link-slot.ts) / [preview 검사](../../../lib/flow/integrated-poc/folder-link-preview.test.ts), [실제 JSX 검사](../../../components/flow/integrated-poc/ProgramTextEditor.folder-preview.test.tsx) | 부분+원환경 미확인: same-line/삽입·하위 묶음 뒤·폴더 안의 실제 위치와 stale 확정0쓰기 근거. #26 원환경과 ‘항상 바로 아래’ 기본값은 미확정 | preview를 유지하고 중복 설명은 줄임. 동작 기본값을 바꾸기 전에 PC05의 두 위치 의미 비교 |
| C07 | [ProgramSpace](../../../components/flow/integrated-poc/ProgramSpace.tsx), [private-space](../../../lib/flow/integrated-poc/private-space.ts) / [문맥 검사](../../../components/flow/integrated-poc/ProgramSpace.context.test.tsx) | 부분+미결: 실제 경로·문서 보관 위치·Flow owner·필터 해제 지원. #2 오류 제보는 사용자 정정으로 종료. #4/5/19의 개념/발견성은 부분 QA로 완료하지 않음 | ‘문서 보관 위치’, ‘항목 소속’, ‘보는 범위’를 같은 드롭다운의 한 의미로 합치지 않음. PC05 |
| C08 | [ProgramSpace](../../../components/flow/integrated-poc/ProgramSpace.tsx), [ProgramTextEditor](../../../components/flow/integrated-poc/ProgramTextEditor.tsx) / [문맥 검사](../../../components/flow/integrated-poc/ProgramSpace.context.test.tsx), [writing-navigation 검사](../../../lib/flow/integrated-poc/writing-navigation.test.ts) | 부분+원환경 미확인: 같은 ID·날짜/시간·명시 원문 focus/reload 근거. 자동 커서 영속복원은 보장하지 않음. #11 시간/12 캘린더의 원 URL·진입점은 미확인 | 기간/달력은 개인 공간의 보기로 비교. 별도 앱 정체성/새 저장소를 만들지 않음. 날짜·시간은 선택한 대상 가까이에서 발견 가능하게 |
| C09 | [TextTask/row](../../../lib/flow/integrated-poc/text-workspace.ts), [ProgramSpace](../../../components/flow/integrated-poc/ProgramSpace.tsx) / [현재 날짜 표현 검사](../../../components/flow/integrated-poc/ProgramSpace.date-presentation.test.tsx) | 부분+미결: groupDate/explicitDate/미정의 현재 출처와 Today의 지난 미완료·당일 구분. 원 날짜·ID를 유지. 구획 이동/원위치·미정 우선순위의 새 규칙은 미결 | 현재 유효 날짜와 이유를 함께 드러냄. 지난 미완료를 오류 또는 자동 이월로 바꾸지 않음. PC02 |
| C10 | [text-workspace](../../../lib/flow/integrated-poc/text-workspace.ts), [ProgramRecurrence](../../../components/flow/integrated-poc/ProgramRecurrence.tsx) / [text-workspace 검사](../../../lib/flow/integrated-poc/text-workspace.test.ts), [공개 반복 사본 검사](../../../lib/flow/integrated-poc/public-copy-recurrence.test.ts) | 부분+미결: 다른 ID의 같은 제목/개별 메모 보존과 bounded 반복 이력. 전체 반복·자동 병합·개인 상대/Creator 일괄 일정 완성 아님 | 이동·복제·반복 설정의 결과를 구분. 제목 같음만으로 병합하지 않음. PC03/F6 |
| C11 | [개인 TextTask 타입](../../../lib/flow/integrated-poc/text-workspace.ts), [현재 날짜/시간 폼](../../../components/flow/integrated-poc/ProgramSpace.tsx) / [일정 문맥 검사](../../../components/flow/integrated-poc/ProgramSpace.context.test.tsx) | 미구현+미결: 확인한 개인 원문/기간 연결에는 독립 due 속성/폼이 없음. 현재 하나의 실행 날짜를 마감일 지원으로 표시하지 않음 | 비교안에서 예정일/마감을 별도로 다루되 schema·영구 문법을 만들지 않음. PC04 |
| C12 | [private-space](../../../lib/flow/integrated-poc/private-space.ts), [ProgramSpace](../../../components/flow/integrated-poc/ProgramSpace.tsx) / [text-workspace 검사](../../../lib/flow/integrated-poc/text-workspace.test.ts), [journey 검사](../../../components/flow/integrated-poc/ProgramSpace.journey.test.tsx) | 충족: 현재 진행·날짜별 기록과 완료/재개를 구분하는 좁은 근거. 모든 100% 재클릭/반복 조합의 새 정책을 확정한 것은 아님 | 10→20은 현재20이며 합산하지 않음. 과거 기록은 보존하고 고급 이력은 필요할 때 펼침 |
| C13 | [제작 workspace](../../../components/flow/integrated-poc/ProgramCreatorWorkspace.tsx), [native 계약](../../../lib/flow/integrated-poc/creator-native-execution-contract.ts) / [직접 실행 진입 검사](../../../components/flow/integrated-poc/ProgramCreatorWorkspace.execution-entry.test.tsx) | 부분+원환경 미확인: raw/native owner 분리·명시 인계·기존 실제 문서 직접 재진입은 이미 보완. #18 원진입과 모든 틀/Map/source update는 별도 | 현재 ‘개인 문서 열기’를 유지. 새 인계/사본 만들기 버튼을 중복 추가하지 않음. 미지원 origin 목록은 F7 |
| C14 | [Discovery](../../../components/flow/integrated-poc/ProgramDiscovery.tsx), [공개 출력 복귀](../../../lib/flow/integrated-poc/public-output-return.ts) / [Discovery 검사](../../../components/flow/integrated-poc/ProgramDiscovery.test.tsx), [사본 일정 검사](../../../components/flow/integrated-poc/ProgramSpace.private-schedule.test.tsx) | 부분+원환경 미확인: 공개/비공개 카탈로그 구분·외부 출력·선택 개인 사본과 사본 일정 지원. #7 실제 기대 slug·공개/철회/필터와 전체 Flow/Map 품질은 미확인 | 공개 없음/검색 없음/비공개 기존 자료를 구분. 읽기·출력 후 종료도 허용. 카탈로그를 자동 공개하지 않음. F7/F8 |
| C15 | [Community](../../../components/flow/integrated-poc/ProgramCommunity.tsx), [Publisher](../../../components/flow/integrated-poc/ProgramPublisher.tsx), [ProposalReview](../../../components/flow/integrated-poc/ProgramProposalReview.tsx) / [Community 검사](../../../components/flow/integrated-poc/ProgramCommunity.test.tsx), [제안 비교 검사](../../../components/flow/integrated-poc/ProgramProposalReview.test.tsx) | 부분+미구현/미결: 질문/답글/활동·선택 공개·새판·사본 수용 이력. 소유자 제안 필드별 부분채택 UI와 신고/삭제/고아 파일 운영은 후속 | Flow 없는 질문과 관련 Flow를 선택적으로 연결. 답글·경험·공개 파생을 한 버튼으로 합치지 않음. PC06/F8/F10 |
| C16 | [sync controller](../../../lib/flow/integrated-poc/alpha-sync/controller.ts), [private ACK](../../../lib/flow/integrated-poc/alpha-private-save-ack.ts) / [native retry 검사](../../../lib/flow/integrated-poc/alpha-sync/native-handoff-retry.test.ts), [ACK 검사](../../../lib/flow/integrated-poc/alpha-private-save-ack.test.ts) | 부분+미구현: native 최초 인계 limit retry와 private unknown ACK는 이미 보완. 일반 social 확정 거절의 controller 직접 retry는 unresolved. component 수락 mock과 다름 | 실패 입력/선택 보존과 명시 재시도만 노출. unknown은 같은 ID/payload 확인, 자동 새 게시·전송 금지. 좁은 후속 기술 갭 |
| C17 | [PreservationPanel](../../../components/flow/integrated-poc/AlphaPreservationPanel.tsx), [AlphaWorkspace](../../../components/flow/integrated-poc/AlphaWorkspace.tsx) / [보존 패널 검사](../../../components/flow/integrated-poc/AlphaPreservationPanel.test.tsx) | 부분: 같은 탭 닫기/요약·복원 동일 요청 확인과 5A~C 로컬 이력. 5D 부분 종료·새 백업 경로 off, 대용량/업로드 중단/권한/자원 F5-01~04 후속 | ‘닫기’와 ‘취소’를 구분. 탭 종료 뒤 자동 완료를 약속하지 않음. 자료 수요/새 경로 활성화 전 F5 재개 |
| C18 | [ProgramSpace](../../../components/flow/integrated-poc/ProgramSpace.tsx), [AlphaWorkspace](../../../components/flow/integrated-poc/AlphaWorkspace.tsx) / [layout 검사](../../../components/flow/integrated-poc/ProgramSpace.layout.test.ts), [touch-move 검사](../../../components/flow/integrated-poc/ProgramSpace.touch-move.test.ts) | 부분+원환경 미확인: 이전 5크기 합성 QA는 전체 밀도·실제 touch/IME/AT를 증명하지 않음. #1 실제 요청량·전송량, 자동 시작·장시간 Auth 탭은 후속 | 배치 비교에서 상시 안내/중복 CTA 감산. 실제 기기/운영 관측을 모형 클릭이나 CSS로 대체하지 않음. F9/운영 후속 |

## 최신 피드백 26개의 연결 상태

### C16 이번 구현 추가 — baseline 판정과 구별

위 C16은 d1cc 수정 전 판정이다. 이번 격리 작업본에서 `participation-save`의 명확한 invalid/limit/rate-limited 거절 뒤 같은 대상의 수정·직접 재보관만 보완했다. 신규 [순수 회귀](../../../lib/flow/integrated-poc/alpha-sync/social-draft-retry.test.ts)17개와 [화면 연결 검사](../../../components/flow/integrated-poc/AlphaWorkspace.test.tsx)의 SRUI01~03을 추가했다. target/expected·계정/공개 CAS·세션·baseline을 고정하고 fresh wire ID를 사용한다. unknown/malformed ACK·Auth/network·재전송 거절은 새 저장 허용 근거가 아니다.

publication/review/proposal/submit 등 일반 social 전체의 직접 재시도는 **미구현/후속**이며 자동 공개도 하지 않는다. 현재 개발계에는 아직 이 수정이 없다. 후보 실제 화면 검증은 [QA](qa.md)의 별도 상태를 따른다. 따라서 C16 전체 충족으로 판정을 올리지 않는다.

### 후보 r4의 실제 검사와 대표 요구 연결

위18군은 원 요구와baseline 비교를 보존한다. 다음 표는 새 후보 `dB-EkvCezLLLLzP1402bB`의 실제30개 중25PASS/5FAIL을 해당 요구에 연결한 추가 근거이며, 군 전체 충족률이나26피드백 해결률로 환산하지 않는다. 원결과·자산/저장 경계·실패 미도달은 [r4 QA](qa.md#네-번째-재개--후보-r4와-메뉴-tab-경계)에 둔다.

| 대표 요구 | 실제 후보 근거 | 이 검사로 확인하지 못한 것 |
| --- | --- | --- |
| C01/C08/C12 개인 신규 작성→같은 Item 실행/기록/원문 복귀 | UC1×5는 메뉴 마지막Tab 복귀에서 모두FAIL. 이후 개인 신규 작성/실행/reload에 미도달 | 기준판의 이전PASS를 후보PASS로 대신하지 않음. 일반 메모 작성/완료 이력의 이 후보 전체 여정은 보완 후 재검사 |
| C18·FE01 메뉴 조작/등록 발견성 | 실제 다섯 viewport의 중간 버튼Tab·5점 가림·focus outline·등록 설명 캡처. 최종wrapFAIL을 dialog-local 양방향 끝점으로 보완하고 컴포넌트64/64 확인 | 수정 후 실제키보드/화면, 전체 접근성·IME/touch/AT는 미확인. 메뉴Tab과 C02의 본문 들여쓰기ShiftTab은 다른 동작 |
| C07/C08 일부/C09/C10 조회 범위·구획/개별 날짜·미정의 시간/identity | UC6×5PASS: 폴더/주간/검색 교집합·빈 결과 필터해제0쓰기, 구획 상속/개별 예외, 미정 이동의 시간·같은Item/메모·reload | C08의 UC1 원문 행/초점 복귀와 실제 소속 이동·복제·일반 반복 생성·새due 정책의 전체 검사가 아님 |
| C14 공개 선택 판본→외부 출력/종료→개인 사본 실행 | UC2×5PASS: v2→v1 명시 선택·TXT 실제bytes·정확판본 복귀/이탈0쓰기·v1사본 완료·공개 원본 불변 | 전체Flow/Map·비공개catalog·실제외부도구import·#7 원환경은 미확인 |
| C15/C16 선택 질문과 거절/결과 불명 복귀 | UC3/UC4/UC5 각5PASS: Flow 없는 같은 초안, 주입된rate-limited 거절 뒤 수정/키보드 직접retry·새request ID, 원receipt 확인·추가 입력 보존, 변경 필드 participationDrafts만 | invalid/limit 전체는 별도 순수 회귀이며 브라우저 증거가 아님. 공개/제안/소유자채택 전체retry는 후속. r4 거절상태PNG가 없어 새viewport캡처 준비. 사용자 이해도·실Auth/DB는 미검사 |
| C17·독립 HTML/네 시안 조작 | 이30개는 서비스백업/대형복원과새HTML/시안 렌더를 실행하지 않음 | 외부UX2 QA·이전캡처·42모형검사를 대신 합산하지 않음. 새HTML/독립시안DOM/클릭NOT_RUN 유지 |

새Tab 보완의 통합2,931PASS·build 완료와 실제 화면 검사를 구분한다. 3107 재시작 뒤30개 재검사가 남아 있어 수정 후 후보 전체화면PASS로 올리지 않는다. 기존 등록/진행/메모·반복·공개 정책과 개발계는 변경하지 않는다.


이 표는 입력 누락 방지용이다. 원 발언의 시제·관찰·정정·제안 구분을 유지하며 원본 내용은 위 읽기 정본에 둔다.

| 피드백 | 대표 요구 | 유지할 판정 |
| --- | --- | --- |
| #1 요청량 체감 | C16/C18 | 미측정. ACK/retry 보완을 요청량 해소로 바꾸지 않음 |
| #2 기간 목록 누락 | C07 | 사용자 정정: 전체가 아닌 폴더 필터였음, 오류 제보 종료 |
| #3 작업 공간 인상 | C01/C18 | 평가 입력, 원인/전체 사용성 충족 미확인 |
| #4 폴더 표현 | C07/C18 | 원화면 미확인, 트리/드롭다운의 목적을 비교 |
| #5 문서/폴더 관계 | C07 | 보관·소속·조회 계약을 구분, 개념 이해 완료 아님 |
| #6 ShiftTab | C02/C04 | 현행 역연산/입력 회귀 근거. 원줄·장치/IME 미확인 |
| #7 기존 Flow 안 보임 | C14 | 실제 기대 콘텐츠/공개 상태/원필터 미확인 |
| #8 잡아서 이동 | C18 | 메뉴/키보드 대안과 물리 touch/hold/drag 별도 |
| #9 +/더보기 예측 | C06/C18 | 동작/대상/결과 표시를 비교. 모든 메뉴의 원사례 해결 아님 |
| #10 선택 줄 폴더 연결 | C06 | same-line/삽입 preview·명시 전이 근거. 하위 목록 전체 변환 아님 |
| #11 시간 발견성 | C08/C18 | 날짜·시간 경로 존재, 원화면의 발견성 미확인 |
| #12 캘린더 없음 | C08 | 원 URL/기대 진입 미확인. 별도 운영 /calendar 검증과 구분 |
| #13 전체 서식 flicker | C04 | 현재 입력/선택/숨은 원문 회귀와 원환경 재현을 구분 |
| #14 날짜 변경 | C08/C09 | 현재 날짜 저장/표현 보완 근거, 원사례와 새 규칙은 별도 |
| #15 할 일 Enter | C02 | 지원 동작/보호 제한 표시, Enter마다 선택창은 제안하지 않음 |
| #16 메모 줄바꿈 | C03 | 현재 반복 메모 속성 이어쓰기와 새 본문 문법 미결을 구분 |
| #17 @/# 폴더 문법 | C05/C07 | 제안·미결. 자동 연결/생성·정규화 정책 확정 아님 |
| #18 제작 진입 | C13 | 현재 제작→개인 실행 보완, 원 URL/초안·저장·공개 기대 미확인 |
| #19 기간 폴더 맥락 | C07 | 경로·문서명 표시 근거. 폴더별 재그룹 정책/원발견성 별도 |
| #20 이름 입력 제안 | C05 | 정확 이름·비강제 제안의 현재 근거. 부분 일치/원환경 별도 |
| #21 폴더 집중 문서 | C04/C07 | 같은 원문의 부분/전체 보호 지원, 편집 권한은 다름 |
| #22 같은 일/다른 날짜/메모 | C03/C10 | 시나리오 질문. 이동/복제/반복·공통/회차 메모 미결 |
| #23 Today에 어제 포함 | C09 | 지난 미완료/당일 현재 표현 지원. 오류/자동이월 확정 아님 |
| #24 날짜 구획/개별 관계 | C09 | 현재 날짜 출처 지원. 구획 이동/미정/원위치 선택 미결 |
| #25 예정일/due | C11 | 개인 연결의 독립 due 미구현+문법/목록 정책 미결 |
| #26 +폴더 위치 | C06 | 실제 slot preview 보완. 원줄/하위 묶음/기대 기본값 미확인 |

## 다음 좁은 선택 — 추천과 확정의 구분

| ID | 고를 제품 의미 | 현재 보존 / 추천 비교 | 구현 전 필요한 선택 |
| --- | --- | --- | --- |
| PC01 메모 이어쓰기 | 기존 반복 속성 vs 들여쓴 본문·빈 줄 종료 | 기존 `- 메모:` 호환을 보존하는 안을 먼저 비교. 일반 문장/할 일로 자동 승격하지 않음 | 새 본문 종료·escape·기존 줄 해석이 달라진다면 해당 문법만 확정 |
| PC02 날짜 구획과 이동 | 구획 기본값·개별 예외·미정, 다른 구획 이동 시 유지/따름 | 현재 유효 날짜/출처와 원문 위치를 보존해 비교. 기간 날짜 변경이 원문 재배치를 강제하지 않는 안을 먼저 검토 | 날짜 유지/따름의 명시 조작, `[미정]` 우선순위·원위치 정책 |
| PC03 같은 제목·반복·메모 | 이동 이력 vs 별개 복제 vs 반복 회차, 공통/회차 메모 | 같은 제목 자동 병합 없음. 새 복제는 별개 identity, 반복은 명시 설정으로 구분하는 안을 비교 | 기존 완료/기록 보존·회차 생성·메모 owner와 반복 종료의 범위 |
| PC04 예정일/due | 독립 기한과 작업 예정일, due-only의 목록 노출 | 예정일만 바꾸면 due는 유지하는 안을 비교. due-only에 임의 예정일을 만들지 않는 안을 먼저 검토 | 문서 입력/폼·기간 노출·초과/임박 표현. 별도 schema 추가는 이번 문서의 승인 아님 |
| PC05 폴더 | 현재 slot/이름 제안·실제 소속·조회의 관계 | 현재 정확한 preview·경로·명시 확정을 보존. 폴더 연결만으로 기존 할 일 소속을 자동 변경하지 않는 안을 비교 | 기본 삽입 위치·자동 제안 시점·@/#/일치·같은 부모 이름 정책·소속 이동 |
| PC06 공개·부분채택 | 소유자의 제안 필드 선택→불변 새판 | 개인 사본의 기존 필드별 수용과 소유자 부분채택 UI를 구분. 자동 공개/자동 업데이트 없음 | owner/필드 충돌·새판·개인 기록 보존 계약. 공개 운영 F10은 후속 |

먼저 PC01~PC04를 같은 문서의 날짜·메모 예시로 비교하고, 결과에서 한 좁은 정책을 선택한다. 네 디자인 전체를 동시에 채택하거나 화면 외형만 보고 parser/writer를 교체하지 않는다. 이 문서는 선택지를 구체화한 것이며 사용자 선택이나 제품 정책 확정은 아니다.

Dots 자유 편집의 FE01~FE06으로 PC01/PC03의 비교 사례를 보강했다. v11의 독립 등록 유지 계약은 현재 코드에도 적용된다. 같은 원문으로 역편집한 결과3과 저장 전 committed 상태 복원2는 다른 전체 상태이며,9개 메모리 진단으로 이 차이를 확인했다. 구조상 하위/독립 등록 상태의 발견성은 후속 후보에서 해당 줄 메뉴의 설명으로 좁게 보완했다. 컴포넌트 새4/4·전체58/58 PASS이며 후보 화면은 NOT_RUN, 현재 개발계에는 미반영이다. 복원 대상 발견성·등록 해제·이력 복제·완료 초기화·메모 귀속 변경은 미완료 또는 정책 선택이므로 자동 재계산이나 데이터 삭제로 해결하지 않는다. 대표18군·사람 피드백26개 분모는 유지한다.

## 후보 r5로 보강한 현재 근거

Tab 보완 새 판본 `nHVy52oCY9_WJd3Vo4TMH`의UC1~UC6×다섯 크기30/30PASS를 확인했다. 위 대표18군과26입력의 분모·제품 의미는 바꾸지 않으며 아래 통과를 전체 요구 충족률로 환산하지 않는다. 앞선 ‘후보 화면 NOT_RUN’은 당시 이력이며 현재 앱 검사와 새HTML/독립 시안 NOT_RUN을 구분한다.

| 연결한 요구 | r5의 좁은 새 근거 | 여전히 남는 범위 |
| --- | --- | --- |
| C01/C08/C12 | UC1 신규 자유 작성→같은Item 날짜/시간·완료/기록→원문 복귀→reload,5/5 | 모든 작성 조합·자동 커서 영속복원·원 피드백 환경 |
| C07/C08/C09/C10 | UC6 조회 교집합·빈 결과 해제0쓰기·구획/개별 예외·미정 시간·identity/reload,5/5 | 새 반복/메모 owner/구획 이동 정책·원환경·Today 전수 |
| C14 | UC2 명시v1 선택→TXT/정확 복귀 또는사본→완료·공개 원판 불변,5/5 | 모든slug/콘텐츠/Flow Map·실제공개 운영 |
| C15/C16 | UC3 수정후자동 재보관·UC5 버튼직접 재시도(rate-limited 주입),UC4 unknown 원receipt 확인,각5/5 | 수정과버튼클릭을합친 별도동선·일반social 전체retry·모든거절 유형·실제BFF/Auth/RLS/DB |
| C18/FE01 | UC1 등록 안내·13버튼양방향Tab/5점가림/초점·Escape 선택복귀0쓰기,5/5 | native 폼/IME/touch/AT·실기기·메뉴 밀도·복원 대상 발견성 |

독립 시각 검토에서 C16의 확정 거절에도 새로고침 안내와 직접 재시도가 함께 나오는 Medium 잔여를 확인했다. 후보에서는 참여 save의 실제 실패 입력·expected·live proof·같은 계정이 맞을 때만 보존 안내를 표시하도록 구현했다. 새9개 포함 관련110PASS·npm2258PASS·제품 타입 진단0·새 빌드 exit0 이후 **r6 30/30PASS**를 확인했다. 안내 전체·상태·버튼의 viewport/5점 가림과 성공 후 alert/재시도0개를 검사했다. unknown ACK/재전송/일반 social 계약은 유지하므로 C16 전체 충족은 아니다. 375/390px 어절 분리도 Low 후속이다. C17 서비스 백업과 새 HTML/독립 시안 렌더는 이번30개로 충족 처리하지 않는다. [r6 QA](qa.md#여섯-번째-검사--저장-안내-보완-후보-r6)를 따른다.

### 안내 보완 r6의 추가 요구 근거

위 r5 표는 당시 범위를 보존한다. r6의 C15/C16·UC3×5는 최초 거절→본문 수정→수정본 자동 저장 재거절→pointer 직접 재저장→reload를 결합해 확인했다. 두 거절 동안 저장본/공개판본 불변·수정 입력 보존, 두 거절과 직접 성공의 서로 다른3개ID·성공 실행1회다. ‘수정과 버튼을 합친 동선 미검사’라는 이전 공백은 이 좁은 경로에서 해소됐다. UC5×5는 같은 입력 keyboard retry, UC4×5는 unknown 원receipt 경계를 다시 확인했다. C01/C08/C12·C07~C10·C14·C18/FE01도 r6의 해당 시나리오×5에서 재검사했다. 18군/26입력의 분모나 일반social·모든거절·실제BFF/Auth/RLS/DB·실기기 충족률로 환산하지 않는다.

## 다음 UX 업무의 확정 범위

정책 선택 PC01~PC06과 별개로, 다음 UX 업무는 [UX-N1 초안 복구 화면](results.md#다음-ux-개선-범위--초안-복구-화면)으로 고정했다. C15/C16/C18·S6/S8의 확정 거절·unknown·원 receipt 확인 후 추가 미저장 입력을 비교하며, r6의 직접 retry 기능을 다시 만드는 작업이 아니다. 대상·유지/제외·완료 기준의 정본은 results 한 곳에 둔다. 최종 배치나 반복/due/메모 정책을 확정한 것은 아니다. 네 방향의 제품 전체 채택·후속 구현/검사·개발계 교체는 이번 확정에 포함하지 않는다.

## 후속을 다시 시작할 조건

- F5-01~04: 큰 자료 수요 또는 신규 백업 경로 활성화 전에 실제 용량·업로드 중단·권한·자원 검사를 재개한다. 5D 전체 통과를 현재 UX 설계의 선행 조건으로 붙이지 않는다.
- F6/F7: 일정 수요 또는 미지원 콘텐츠 대조에 따라 상대/반복·Creator 일괄 일정, 유형별 Flow/Map 편집을 설계한다. 과거 보존/열람 수를 최신 편집 지원 수로 쓰지 않는다.
- F8: 공개 콘텐츠/기여 경험을 검토할 때 기대 slug/공개 상태와 소유자 부분채택을 확인한다. 실제 공개 자료를 자동 생성하거나 변경하지 않는다.
- F9: 핵심 동선이 안정된 뒤 필요한 실제 IME·touch/drag·보조기술 검사를 수행한다. 기존 제한 S25 Ultra/Chrome 이력과 5크기 자동 QA를 구분한다.
- F10: 공개 사용자 규모 확대 전에 신고·숨김·삭제/보존 책임·고아 파일 운영을 정한다.
- 운영 후속: 현재 작업을 막는 서비스 중단/저장 실패가 있으면 자동 시작·중복 실행·장시간 탭/Auth·첫 복구 저장 Undo·요청량/전송량의 우선순위를 높인다. 창 닫기 이후 상태와 재부팅 자동 복귀를 혼동하지 않는다.

이번 파일의 완료 조건은 대표 18군의 source ID·현재 코드/검사·판정·추천/후속 선택이 연결되고 26입력 누락이 없는 것이다. 요구의 제품 구현·앱 전체 QA·실기기·관찰 사용자·게시/개발계 교체 완료 조건은 아니다.
