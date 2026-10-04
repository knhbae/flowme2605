# 피드백 26개·세 원천과 이번 후속 검증의 연결

2026-10-04. [이번 목표](spec.md)의 FG04 추적표다. 원래 피드백 번호 1~26, 대표 요구 C01~C18, 정책 검토 PC01~PC06, 직전 요구 MD01~MD09를 유지한다. 이번 작업은 날짜 입력·부분 붙여넣기·복구의 지원 경로를 검증하는 절편이며, 26개 피드백 전체 해결이나 전체 UX 완성을 판정하지 않는다. 최종 실행과 재검사 결과는 [QA](qa.md)를 따른다.

## 읽기 전용 원문과 이전 정본

원본 작업본의 dirty 문서는 읽기만 했다. 원본 PDF·ZIP·캡처를 열었다거나 이전 사용자 환경의 원인을 확인했다는 의미로 사용하지 않는다. 외부 작업본의 원문 경로와 ignored 실행 로그는 코드 표기로 남기고, 저장소 안의 근거는 아래 링크로 연결한다.

| 원천 | 이번 확인과 위치 |
| --- | --- |
| 직접 사용 피드백 | `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-28-flowme-use-feedback-session-ko.md`, 34,849 bytes, SHA256 `BBFC2FA77D1673ECFA6D11AA3B1D276F3225D1907C0C8956BB76780E92724941`. 26개 번호와 #14·#22·#24 안에 추가된 10/4 인계를 읽었다. 원래 발언·정정·질문·제안을 구분한다. |
| 10/4 재검사 인계문 | `D:/flowme2605/flow-mvp/docs/content-audit/2026-10-04-flowme-ui-retest-comments-handoff-ko.md`, 5,446 bytes, SHA256 `AD0DE1AE869BBAC2C3D88E0FF983EFF611485E4464CABA83609B1B593B9B5B41`. 전달된 PASS·개선 후보·NOT_RUN을 새 실행과 분리한다. |
| 직전 MD 요구·계약 | [MD01~MD09 요구](../2026-10-04-personal-memo-date-ux/requirements.md), [메모·날짜 계약 감사](../2026-10-04-personal-memo-date-ux/contract-audit.md). 직전 표시 보완을 이번 신규 구현으로 다시 세지 않는다. |
| 26개·대표 18군의 기존 추적 | [대표 요구와 원 ID 정본](../2026-10-02-alpha-ux-comparison-gaps/requirements.md), [세 원천의 후속 연결](../2026-10-03-alpha-core-journeys-ready/requirements-delta.md), [폴더·작성·날짜 요구](../2026-10-02-alpha-feedback-ux-bundle/requirements.md). C 번호는 원 V41/D1/D2 ID를 대체하지 않는다. |
| Dots 자료의 기존 대조 | [R01~R06·FE01~FE06 대조](../2026-10-02-alpha-ux-comparison-gaps/dots-review.md). 비인간 가상 시나리오이며 직접 사용자 피드백이나 이번 브라우저 실행 수와 합산하지 않는다. |
| v11 이동 계약 | 원본의 `D:/flowme2605/flow-mvp/docs/specs/2026-09-08-text-workspace-free-move-v11/spec.md`를 읽기만 했다. 구조 이동의 ID·날짜·시간·메모·기록 보존과 독립 등록 유지 계약을 대조했다. 독립 시안의 승인·QA를 현재 제품 통합이나 실제 기기 검증으로 소급하지 않는다. |

인계 원본 `FlowMe_UI_Retest_2026-10-04_KO.pdf`는 Library `libfile_c361e22ad5ec8191bc9d414411fef2e4` / `file_000000003e4c81f59b589911357a3088`, 전달된 크기는 840,329 bytes다. `FlowMe_UI_Retest_2026-10-04_Screenshots.zip`은 `libfile_64eae890ea0481918501e9d57f9da0a4` / `file_000000003dfc81f5b3fbf6f70cd8e43c`, 전달된 크기는 747,885 bytes다. 둘 다 미열람이며 ‘캡처 11장’도 인계문 정보다. 이 메타데이터로 원문 절차·내용·대상 빌드를 확인했다고 판정하지 않는다.

## 세 원천 ID와 이번 절편

원 ID의 직접 근거는 [v4.1 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.md)·[v4.1 원 ID 목록](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.json), [개발1 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.md)·[개발1 원 ID 목록](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.json), [개발2 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.md)·[개발2 원 ID 목록](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.json)이다. 당시 audit의 부모·하위조건 판정을 보존하며, 이번 일부 경로 PASS로 원천 전체의 판정을 올리지 않는다.

| 이번 요구 / 대표 요구 | 유지하는 원 ID와 기존 연결 | 이번에 확인하는 범위 |
| --- | --- | --- |
| FG01·MD07·PC02 / C08·C09 | V41-013·V41-014·V41-025·V41-028, D1-002·D1-004·D1-006·D1-022, D2-003·D2-014·D2-015·D2-039 | 같은 Item의 문서·기간 날짜 입력, 정확 원문 복귀, 시간·메모·진행 기록, 취소와 저장 실패 보호. 원래 #14와 인계 날짜 되돌림의 원인 동일성은 미확인. |
| FG02·MD09·PC01 / C03·C04·C10·C16 | C03의 D2-002·D2-011·D2-012, C04의 D1-008·D1-011·D2-029~D2-032·D2-039·D2-040·D2-052, C10의 V41-013·V41-014·D2-002·D2-016·D2-025 | 지원되는 부분 선택 교체, 텍스트 사본과 명시 이동의 차이, 저장본 Undo/Redo와 dirty 입력 Undo, 거절·stale·추가 입력 보존. 자동 반복·공통/회차 메모는 제외. |
| FG03·MD08·PC02 / C09 | V41-012·V41-013, D1-006·D1-018, D2-014·D2-015 | 자유 문장과 명시적 미정 구획·개별 미정의 현행 차이. 자유 문장을 날짜 명령으로 승격하거나 새 미정 범위 조작을 만들지 않음. |
| FG05·MD05 / C08·C18 | V41-041·V41-042·V41-050, D1-004·D1-011, D2-039·D2-040·D2-058 | 정확 대상·결과·선택 보존, Escape·동일값·지연 결과 보호, 다섯 viewport의 주요 조작 도달과 검사 경계. 전체 접근성·물리 drag·IME·실기기는 별도. |
| #25·PC04 / C11 | V41-013·D1-006·D2-003의 날짜·기록 보존을 전제로 추가된 due 요구 | 원 ID가 독립 due를 이미 완성했다고 해석하지 않음. 개인 원문/기간의 독립 due·문법·목록 노출은 미구현·미승인 정책. |

아래 26개 표의 C01~C18 연결은 [기존 원 ID 매핑](../2026-10-02-alpha-ux-comparison-gaps/requirements.md)을 유지한다. 이번 범위 밖 원천 조건을 삭제하거나 좁은 FG 번호로 다시 번호 매기지 않는다.

## 이번 실행 근거를 읽는 기준

작성 시 실제 로그에서 확인한 결과는 실제 앱 `final-app-verified` 30/30, 지연 결과 `final-races` 2/2, 추가 `final-extra-verified` 11/11, 신규 표적 회귀 31/31, `npm test` 2,261 PASS다. 서로 다른 검사 종류이며 피드백 해결 개수로 합산하지 않는다. 최종 재검사·독립 리뷰·검사 한계는 [QA](qa.md)가 정본이다.

| 근거 | 확인 범위와 정확 위치 |
| --- | --- |
| 실제 앱 합성 브라우저 | `output/playwright/feedback-gaps/final-app-verified.log`. 문서 키보드·기간 fill, 기간 왕복·reload·원문 행 복귀, 실제 clipboard의 선택 메모 교체, 저장본 Undo/Redo, debounce 전 dirty Undo, 주입한 저장 거절과 직접 재시도, 명시 미정 shortcut, 다섯 viewport. 30 PASS / 0 FAIL. |
| 실제 앱 지연 결과 | `output/playwright/feedback-gaps/final-races.log`. BR01은 제출 뒤 더 새 날짜 입력, BR02는 다른 대상 dialog의 입력 보존. 2 PASS / 0 FAIL. |
| 실제 앱 추가 경로 | `output/playwright/feedback-gaps/final-extra-verified.log`. 기간 native 키보드 적용, 같은 제목의 독립 ID·정확 line 복귀·B만 날짜 변경, MD08 세 표현의 기간 목록·reload. 11 PASS / 0 FAIL. |
| 날짜 컴포넌트 신규 10개 | [ProgramSpace.date-roundtrip.test.tsx](../../../components/flow/integrated-poc/ProgramSpace.date-roundtrip.test.tsx). DR01~DR10: 연속 날짜 적용, 같은 제목의 다른 ID, 기간·정확 원문, 지연 결과·dialog 재열기·새 시간 입력·거절, 전체 snapshot Undo/Redo. |
| 부분 붙여넣기 신규 14개 | [ProgramTextEditor.partial-paste.test.tsx](../../../components/flow/integrated-poc/ProgramTextEditor.partial-paste.test.tsx) 8개와 [text-partial-paste-regression.test.ts](../../../lib/flow/integrated-poc/text-partial-paste-regression.test.ts) 6개. 실제 컴포넌트·draft·모델·메모리 owner 연결이며 컴포넌트 검사의 native adapter는 callback/selection 모형이다. 실제 clipboard 근거는 위 브라우저 로그와 구분한다. |
| 미정 표현 신규 3개 | [undated-expression-regression.test.ts](../../../lib/flow/integrated-poc/undated-expression-regression.test.ts). 자유 문장 상속·명시 미정 구획·개별 미정의 날짜/출처와 JSON 읽기 불변을 확인한다. |
| 검사 fixture 신규 4개 | [feedback-gaps-fixture.test.ts](../../../scripts/personal-workspace-poc/feedback-gaps-fixture.test.ts). 기존 cookie/storage/profile 상태 거절과 고정된 로컬 GET 자원 경계를 확인한다. 제품 기능 4개 완료나 인증 서버 검사 4개로 세지 않는다. |
| 이번 표적 통합과 기존 전체 suite | `.tmp/feedback-gaps/scoped-final-typed.log`의 최종212/212는 기존 181개 + 신규 31개다. `.tmp/feedback-gaps/npm-test-final.log`의 각 실행 묶음은 총 2,261 PASS, 실패 0이다. npm 전체의 기존 suite 통과를 아래 모든 피드백의 새 브라우저 재현으로 사용하지 않는다. |

실제 앱 로그의 ‘server Undo/Redo’와 ‘저장 거절’은 합성 계정의 메모리 응답 fixture를 사용했다. 실제 backend Auth/API 전달은 0이며 실제 운영 DB의 byte 비교를 수행하지 않았다. 원문 소속·ID·메모·진행 기록을 확인한 내부 QA이지, 사람의 이해·장기 사용·실제 기기 검증은 아니다. native 날짜 input의 키보드 입력은 확인했으나 날짜 선택기 popup 조작은 미실행이다.

## 피드백 26개의 관찰·지원·검증·잔여

‘현행 지원’은 코드와 이전 정본의 계약을 뜻한다. ‘이번 검증’은 위 실행 범위만 적는다. 같은 표에 있다는 이유로 26개 모두 독립 재현되거나 해결된 것으로 읽지 않는다.

| 번호 / 원래 관찰·질문·제안 | 현행 지원·기존 연결 | 이번 검증 | 남은 부분 |
| --- | --- | --- | --- |
| #1 서버 업데이트가 너무 잦다는 체감·Notion 비교 질문 | C16/C18. 저장·ACK·초안 보호 owner가 있으나 실제 요청량을 측정했다는 근거는 없음. | 합성 날짜·paste 저장 수, 취소/동일값0명령과 외부 Auth/API 전달0을 확인. 이는 실제 사용 요청 빈도 측정이 아님. | 원 사용 화면·실제 요청 횟수/전송량·저장 타이밍 및 비교 서비스의 근거. |
| #2 문서 내 폴더 할 일이 웹 기간 목록에서 안 보였으나 사용자가 ‘전체가 아닌 폴더 선택, 오류 아님’으로 정정 | C07. 폴더 필터는 조회 범위이며 오류 제보 종료 상태 유지. [ProgramSpace](../../../components/flow/integrated-poc/ProgramSpace.tsx). | 같은 Item의 문서·기간 projection을 확인했으나 원 제보를 결함으로 다시 검사하지 않음. | 필터 발견성은 별도 UX 주제. 앞선 모바일 관찰을 동기화 장애 근거로 사용하지 않음. |
| #3 Obsidian과 비교해 문서 작업 공간이 조잡하다는 평가 | C01/C18. 독립 일반 문서·native 편집 경로의 코드/이전 QA는 있음. | 날짜·붙여넣기·복구와 다섯 viewport의 좁은 내부 QA. 전체 완성도/선호 검증은 아님. | 거슬린 실제 요소·작업 장면·사용자 평가와 전체 밀도 검토. |
| #4 폴더가 드롭다운처럼 보여 폴더 개념이 드러나지 않는다는 의견 | C07/C18. 보관 위치·소속·조회 범위와 경로 표시를 구분하는 기존 계약. | 날짜/paste에서 기존 소속 보존을 확인. 폴더 표현의 새 비교 검사는 미실행. | 원 화면·계층 표현·드롭다운 용도·사용자 개념 이해. |
| #5 문서와 폴더 관계가 불분명함 | C07. [private-space](../../../lib/flow/integrated-poc/private-space.ts)의 실제 소속과 문서 보관/조회 범위는 별개. | 같은 Item의 날짜·paste·원문 복귀에서 소속/문서 정체성을 유지. 관계 이해도 검사는 아님. | 보관·소속·집중 보기의 설명과 실제 사용자의 이해. |
| #6 Tab 들여쓰기는 되지만 Shift+Tab 내어쓰기가 안 된다는 보고 | C02/C04. [입력 계획](../../../lib/flow/integrated-poc/text-input-plan.cjs)·[키 엔진 검사](../../../lib/flow/integrated-poc/text-input-engine.test.ts)의 지원/보호 경계. | 이번 신규 표적 검사는 Shift+Tab 원사례를 수행하지 않음. | 원줄·선택 범위·브라우저·입력 장치/IME에서 재현. 메뉴 Tab 순환과 본문 Shift+Tab을 혼동하지 않음. |
| #7 둘러보기에 기대한 기존 Flow가 안 보임 | C14. [Discovery](../../../components/flow/integrated-poc/ProgramDiscovery.tsx)의 공개 없음·검색 없음·기존 비공개 자료 구분 근거. | 공개 원본 불변을 보호 경계로 확인. 기존 콘텐츠 노출 문제의 새 브라우저 검사는 미실행. | 기대한 콘텐츠/slug·공개/철회·배포·검색/필터·원 URL. |
| #8 할 일·폴더를 잡아서 이동시키는 조작이 안 됨 | C18. [v11 model](../../../lib/flow/integrated-poc/vendor/text-model.cjs)의 명시 이동과 기존 키보드/메뉴 대안. | 신규 모델의 명시 이동 보존과 컴포넌트 이동 선택 Escape0쓰기. 물리 hold/drag 실패의 재현은 아님. | 실제 화면·대상/목적지·장치·touch/hold/drag. |
| #9 `+`·`추가`·`...`의 결과를 예측하기 어려움 | C06/C18. [ProgramTextEditor](../../../components/flow/integrated-poc/ProgramTextEditor.tsx)의 정확 대상 메뉴와 기존 위치 preview. | 날짜/메모의 실제 선택 대상과 취소를 확인. 모든 추가/더보기 메뉴의 새 사용성 검사는 미실행. | 원 버튼·기대 결과·발견성 및 모든 메뉴 조합. |
| #10 이름을 적고 선택한 줄을 폴더로 연결할 때 새 폴더 선택지·위치가 기대와 다르고 중복 줄이 생김 | C06. [folder-link-slot](../../../lib/flow/integrated-poc/folder-link-slot.ts)·[folder-link-preview](../../../lib/flow/integrated-poc/folder-link-preview.ts)의 same-line/삽입 위치 계약. | 이번 신규 표적 검사는 해당 폴더 연결 절차를 새로 수행하지 않음. | 원문 선택·줄 종류·연결/생성·하위 묶음과 원환경 독립 재현. 기존 preview를 전체 변환 요구의 완료로 확대하지 않음. |
| #11 문서에서 시간 입력을 찾기 어려움 | C08/C18. 문서 날짜·시간 form과 기간 상세에 기존 입력 경로가 있음. | 날짜 변경·미정 이동에서 기존 시간 보존, 더 새 시간 초안의 지연 결과 보호를 확인. | 원 사용 화면에서 시간 경로의 발견성. 전체 시간-only 정책은 별도. |
| #12 캘린더 UI를 찾지 못함 | C08. 통합 문서의 캘린더와 독립 v11 시안의 범위는 다름. | 오늘·주간·월간·전체·미정의 같은 Item projection을 확인. 원 사용 화면의 캘린더 진입 재현은 아님. | 원 URL·기대 위치·진입 경로와 해당 배포의 상태. |
| #13 수정 때 모든 줄이 text형과 기존 형식 사이를 반복해 오가는 화면 반응 | C04. [부분 편집기](../../../components/flow/integrated-poc/ProgramFolderRegionEditor.tsx)·[native editor](../../../lib/flow/integrated-poc/vendor/text-editor.cjs)의 입력/선택/원문 보호 근거. | 실제 선택 paste에서 선택 메모만 변경, adjacent 원문·ID 보존. 원 flicker를 같은 조건에서 재현한 검사는 아님. | 원 URL·입력/저장 시점·렌더 변화와 데이터 변화, OS IME/AT. |
| #14 개별/폴더 아래 할 일 날짜 변경이 제대로 반영되지 않는 듯함. 10/4 중간 추가: fill `10/05→10/08` 적용 뒤 되돌림 2회 전달 | C08/C09·MD07·FG01. 같은 Item의 개별 날짜·문서/기간 전이와 [날짜 회귀](../../../components/flow/integrated-poc/ProgramSpace.date-roundtrip.test.tsx). | 새 합성 앱의 문서 키보드·기간 fill 적용, 다시 열기·기간 왕복·reload·정확 원문 복귀를 PASS. 지연 결과의 더 새 입력/다른 dialog 보호와 거절은 별도 표적/브라우저 근거. | 원 PDF/ZIP·대상 빌드·원 절차 미확인. 원 사용자 보고와 같은 원인이라고 단정하지 않음. 날짜 선택기 popup은 NOT_RUN. |
| #15 할 일 Enter가 다음 할 일을 만드는 것이 적절한지, 다른 유형을 선택하게 할지 질문 | C02. [작성 조작 결과](../2026-10-01-alpha-writing-interactions/results.md)의 제목 끝 형제 scaffold·빈 체크 종료와 보호 제한. | 이번 신규 표적 검사는 일반 할 일 Enter의 전체 전환을 새로 수행하지 않음. | 제목 중간/선택·일반 문장 전환·모바일 키보드의 기대. Enter마다 선택창·새 문법은 미승인. |
| #16 `- 메모:`의 줄바꿈 처리 질문과 자연 본문 이어쓰기 후보 | C03·PC01·MD01. 현행 직접 반복 `- 메모:`는 같은 Item.note로 합치며 owner 안내는 직전 완료. [계약 감사](../2026-10-04-personal-memo-date-ux/contract-audit.md). | 부분 메모 선택 교체·인접 반복 메모/기록 보존·저장본 Undo/Redo·거절/추가 입력 보호. 이번 새 메모 Enter 관찰로 확대하지 않음. | 자연 본문 문법·빈 줄 종료·escape·반복 속성 호환. 공통/회차 owner는 PC03. |
| #17 `@/#`로 폴더 검색·연결/생성, 이름 충돌 규칙을 검토하자는 제안 | C05/C07·PC05. [folder-link-suggestions](../../../lib/flow/integrated-poc/folder-link-suggestions.ts)의 정확 이름·경로·명시 확정은 기존 지원. | 이번 신규 표적 검사는 `@/#`·검색·생성·rename/move 이름 정책을 수행하지 않음. | `@` escape·부분 일치·정규화·동일 부모 충돌·rename/move·생성 위치 정책. 자동 연결/생성 미승인. |
| #18 Flow 콘텐츠 작성이 가능한지 모르겠고 진입/사용이 어려움 | C13. [제작→실행 요구](../2026-10-01-alpha-flow-execution-journey/requirements.md)의 native 제작/개인 문서 직접 재진입은 기존 범위. | 공개 원본 불변을 확인. 제작·개인 저장·공개 발행 전체의 새 검사는 미실행. | 원 URL·시도한 진입점·초안/편집/개인 저장/공개 중 막힌 단계, 전체 source/틀/Map. |
| #19 기간 목록에 문서뿐 아니라 폴더 맥락도 필요함 | C07. [기존 대표 요구](../2026-10-02-alpha-ux-comparison-gaps/requirements.md)의 실제 폴더 경로와 원본 문서 표시. | 문서↔기간 왕복에서 같은 Item과 소속을 보존. 폴더별 재그룹/발견성 비교는 미실행. | 같은 이름의 다른 경로·필터 인지·날짜 흐름과 폴더별 grouping의 비교. |
| #20 `- 기존 폴더`·`- 새 폴더` 타이핑/붙여넣기의 폴더 인식이 없다는 재관찰·연결 제안 요구 | C05. 정확 이름의 비강제 제안·명시 확정은 현재 코드/이전 QA의 범위. | 이번 신규 paste 검사는 메모/할 일 범위이며 폴더 인식 원사례의 새 재현은 아님. | 원 화면/상태·제안 시점·부분 일치와 일반 텍스트의 구분. 사용자 보고 시점의 미적용을 소급 변경하지 않음. |
| #21 폴더 선택 시 문서의 일치 영역만 보이게 할지 다양한 경우를 시뮬레이션하자는 제안 | C04/C07. [folder-document-regions](../../../lib/flow/integrated-poc/folder-document-regions.ts)의 같은 원문 부분/전체·숨은 문맥 보호. 부분은 전체와 같은 편집 권한을 뜻하지 않음. | 이번 신규 표적은 전체 문서의 부분 선택 paste. 폴더 집중 보기의 여섯 제안 시나리오 전체를 수행하지 않음. | 원환경·중첩/동명/여러 영역·빈 결과·부분→전체의 발견성 및 권한 경계. |
| #22 같은 제목·다른 날짜·반복과 메모 귀속을 어떻게 구성할지 질문. 10/4 중간 추가: 반복 한 회/전체는 인증 제약으로 NOT_RUN | C03/C10·PC03·MD06/MD09. 날짜 이동은 같은 Item, 일반 텍스트 사본은 다른 ID. 제목 자동 병합 없음. | 같은 제목의 다른 ID 보존, 부분 복사본의 독립 ID/메모와 원본 진행 기록, global snapshot Undo/Redo, 명시 이동 보존을 PASS. 이 결과는 자동 반복 검사 아님. | 반복 한 회/전체·공통/회차 메모·자동 생성/배분은 미승인 및 이번 범위 제외. 인계의 인증 제약을 제품 장애로 판정하지 않음. |
| #23 특정 폴더의 오늘 목록에 어제 할 일이 보임 | C09. Today의 지난 미완료는 원래 날짜를 유지하는 현행 계약. [execution](../../../lib/flow/integrated-poc/execution.ts). | 날짜 변경 뒤 오늘/주/월/미정/전체 projection의 좁은 확인. 원 ‘어제 항목’ 조건의 새 재현은 아님. | 원 완료 상태·조회일·폴더 범위·날짜 표시와 기대. 오류/자동 이월로 확정하지 않음. |
| #24 날짜 구획과 개별 날짜 관계 질문. 10/4 중간 추가: 자유 문장 `날짜 미정` 아래가 이전 `11/09` 구획을 상속했다는 전달 | C09·PC02·MD03/MD04/MD08·FG03. 구획은 기본값, 개별 `- 날짜:`는 예외, 구조 이동은 기존 날짜 보존. | 새 미정3회귀는 자유 문장 `2026-11-09` 상속·`[미정]`의 null·개별 미정의 null/기존 구획 유지 확인. 앱의 명시 미정 shortcut은 시간·메모·원문·ID 보존 PASS. | 자유 문장 자동 명령화·새 ‘날짜 없음으로 묶기’ UI·새 구획 자동 따름·자동 원문 재배치는 미승인. 원 전달 PDF/ZIP 미열람. |
| #25 할 예정일과 마감일 due를 나눌 수 있는지 질문 | C11·PC04·MD06. 확인한 개인 TextTask/원문/기간의 독립 due는 미구현. | 이번 검사는 기존 실행 날짜·진행 기록일을 보존했으며 due 검사는 미실행. | 독립 due schema/문법·due-only 목록·임박/초과·반복 회차 due·예정일과의 우선순위 정책. |
| #26 `+→폴더 연결` 결과가 바로 아래가 아닌 다른 곳에 나타남 | C06. [실제 위치 preview](../../../lib/flow/integrated-poc/folder-link-preview.ts)는 same-line/삽입/하위 묶음 뒤 등의 기존 결과를 보여줌. | 이번 신규 표적 검사는 폴더 위치 원사례를 새로 수행하지 않음. | 원줄/하위 묶음·기존 연결/새 생성·원환경과 ‘항상 바로 아래’ 기본값. #10과 연결하되 동일 원인 확정 금지. |

## MD07~MD09의 이번 판정과 제외

| 요구 | 이번에 좁혀진 확인 | 유지하는 잔여 |
| --- | --- | --- |
| MD07 / FG01 | 새 합성 계정의 날짜 fill·문서 키보드·저장/기간/원문/reload 경로와 지연 결과 보호를 확인. 실제 실행 수와 보완 후 재검사는 QA에 둔다. | 원 `10/05→10/08` 두 번 되돌림의 원인 동일성, 원 PDF/ZIP·빌드·native picker popup·실기기 미확인. 원관찰 전체 해결 판정 없음. |
| MD08 / FG03 | 일반 `날짜 미정`, 최상위 `[미정]`, 직접 `- 날짜: 미정`은 서로 다른 현행 입력이며 새 순수 회귀3개와 앱 추가 EX06~10의 날짜/출처·목록·reload로 확인. 명시적 미정 shortcut의 앱 검증도 별도로 수행. | 자유 문장 자동 정책·명시 미정 범위 새 UI·자동 날짜 따름/원문 이동을 구현하거나 승인하지 않음. |
| MD09 / FG02 | 지원되는 부분 paste·선택 교체·dirty Undo·저장본 Undo/Redo·거절/직접 재시도·취소를 신규 모델/컴포넌트 및 실제 앱에서 확인. 직전 인계의 NOT_RUN을 이번 독립 경로에 한해 좁힌다. | 반복 한 회/전체·공통/회차 메모는 계속 제외. 전체 clipboard/IME/모바일/임의 cut 조합 또는 원 인계 인증 환경을 검증한 것으로 확대하지 않음. |

원문 역편집과 전체 snapshot Undo는 다르다. 이번 [부분 paste 회귀](../../../lib/flow/integrated-poc/text-partial-paste-regression.test.ts)에서 기록 없는 Item의 두 이벤트 cut→paste는 새 ID와 목적지 구획 날짜를 만들었고, 진행 기록 있는 Item의 cut은 거절되어 working 원본을 보존했다. 명시 이동은 기존 ID·날짜·시간·메모·기록을 보존한다. 이를 같게 만들기 위한 tombstone·자동 병합·이력 복사 정책을 추가하지 않았다. 같은 raw 문자열로 고쳤다는 이유만으로 독립 등록이나 진행 기록을 원문만으로 재계산하지 않는다.

PC03의 자동 반복·동일 제목 자동 병합·공통/회차 메모 owner·자동 다음 회차, PC04의 독립 due·due-only 노출, MD08의 자유 문장 자동 날짜 정책은 승인되지 않았다. 현재 지원 검증, 좁은 수정, 내부 QA, Git 게시·개발계 반영, 실제 사용자 관찰을 별개의 상태로 유지한다. 이번 문서와 PASS 수가 게시/반영 권한이나 전체 출시 판정을 만들지 않는다.
