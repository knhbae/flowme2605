# K3-A 작성 도움 — 브라우저 검증

검사일: 2026-09-05. **최신 final2 제품 재검사는 22/22 PASS**다. React 가로 화면의 입력 가림을 고친 뒤 owner·지역 오류·input·retry를 같은 시점에 검사했으며, 단독 HTML의 속성 재열기 수정까지 반영한 후보에서도 전체를 다시 통과했다. 최신 두 runtime × 다섯 viewport × 빈 틀/오류의 **20개 PNG를 직접 확인**했다.

이 문서는 [K3-A 설계](./k3a-design.md)의 새 브라우저 검사와 실제 캡처를 다룬다. 제품 구현·단위 검사·선행 K1-A 회귀의 전체 결과는 root의 별도 원장에 연결한다. 세 산출물 전체, D2 전체, 실제 기기나 관찰 사용자 검증 완료로 확대하지 않는다.

## 0. 최신 final2 — 22/22 PASS

이 절이 최신 판정이다. **§1–6은 최초 실행과 수정 대기 당시의 기록으로 보존**한다. 그 안의 ‘남은 B11 실패’·React 1024/1440 미도달은 그 시점의 사실이며 현재는 이 절의 새 검증으로 갱신한다. 과거 JSON/PNG는 삭제·덮어쓰지 않았다.

| 항목 | 최신 실제 값 |
| --- | --- |
| production BUILD_ID | `390YwuyeGl-p60RBX-eLr`, root 소유 `http://127.0.0.1:3182` |
| React AuthoringSurface SHA-256 | `793388C067DCF723CB7069B0383150C96905F0DBA66676F4362801518F61B6E3` |
| standalone app SHA-256 | `8C3F29D87895456C41718CB295688D4A63E50A672D06F39592A943A331E18981` |
| standalone memory HTML SHA-256 | `A6199C4ACC78EE9D0F239962BFEB629A24D383BB4D542B0C950318526E45E557` |
| spec SHA-256 | `49F556BCC2F7A5213B79B14F8205F89D7C26D0FF8C28099BED64F78EB45D3722`. 강화 B11 이후 본문 변경 없음 |
| 시작 / 소요 | 2026-09-05 18:37:09 KST / 199.739초 |
| 실제 등록·실행 | React 11 + standalone 11 = **22 PASS / 0 FAIL / 0 SKIP / 0 FLAKY** |
| 저장 경계 | 44 context 기록 / 제품 mutation API 303회 / prefix 밖·clear 0 / 운영 non-PoC bytes 불일치 0 |
| runtime별 API | React 22 context·73회, standalone 22 context·230회. 사용자 행동 수와 구분 |
| 오류 | console error·page error 0 |

최신 final2 JSON (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01.json`)은 670,607 bytes, SHA-256 `865CC03C18049375CDFF9E62B09D226599D964794FF47515F09C1879E9B34243`다. 사용자용 생성 HTML 파일은 이 하위 작업에서 바꾸지 않았다. 단독 HTML 근거는 위 SHA의 메모리 `buildText()` 결과다.

### 이력 — 반복 실행을 고유 시나리오로 더하지 않음

| 실행 | 실제 결과 | 버전·의미 |
| --- | --- | --- |
| 최초 실행 | 22개 중 19 PASS / 3 FAIL | §1의 원래 실패. 원문 문자별 주입 하니스 2건과 React B11 가림 1건 |
| 입력 단위 하니스 정정 | 2/2 PASS | 제품 변경 없이 한 번의 `insertText` Undo/Redo 검사로 정정 |
| 강화 B11 집중 검사 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-geometry-fixed-20260905-01.json`) | 2/2 PASS, 59.642초 / 10 context·75 API | React 가로 value 폼 수정 후. input/retry뿐 아니라 owner·지역 오류도 재스크롤 없이 full/9점 검사 |
| 첫 전체 재검 final (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final-20260905-01.json`) | 22/22 PASS, 173.482초 / 44 context·303 API | standalone app `1ED40B53…`, memory HTML `8AE8149A…`. 별도 K1-A 검사에서 발견한 성공 뒤 속성 재열기 문제를 이 결과로 덮지 않음 |
| 최신 final2 | **22/22 PASS**, 199.739초 / 44 context·303 API | renderer/handler의 열린 상태 판정을 통일한 app `8C3F29D8…`까지 반영. React build는 동일 |

이 하위 작업의 누적 실행 시도는 22 + 2 + 2 + 22 + 22 = 70회다. 고유 등록 검사 수는 **22개**로 유지한다. 6 scaffold, 16 key 둘러보기, 3 fault, 5 viewport의 내부 반복을 별도 사용자 여정·관찰 사용자 수로 늘리지 않는다. root/다른 agent의 K1-A 실행 수는 여기에 합산하지 않는다.

### 최신 다섯 화면 직접 평가

final2의 blank CTA 및 오류 후 owner·지역 오류·input·retry는 모든 viewport에서 전체 rect 노출과 **9/9 hit**를 통과했다. input/error/owner를 따로 재스크롤하지 않고 retry를 보여 준 같은 화면에서 검사했다. 문서 가로 overflow는 0이고 모든 명시 캡처는 `fullPage:false`다. source·저장 bytes·chooser stage·feedback·details 상태는 캡처 앞뒤 동일했다. 아래 20개 최신 PNG를 모두 직접 열어 확인했다.

| viewport | React 직접 평가 | standalone 직접 평가 | 최신 PNG |
| --- | --- | --- | --- |
| 390×844 | 빈 scaffold와 기본 CTA·접힌 완성 예시/기술 정보를 구분. 오류 owner y398, input y514–562, retry y622–670이 하단 nav 위에 노출 | 빈 틀 CTA y548–596. 오류 owner·장소·값·retry y724–768을 함께 읽을 수 있음 | React 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-blank-390x844.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-failure-390x844.png`) / standalone 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-blank-390x844.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-failure-390x844.png`) |
| 375×812 | 긴 값은 input 안에서 가로 표시. 오류 owner y366, input y482–530, retry y590–638 전체 노출. 페이지 모든 행동의 동시 노출 판정은 아님 | 빈 틀 CTA와 접힌 disclosure 노출. 오류 input y611–659·retry y692–736 동시 노출 | React 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-blank-375x812.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-failure-375x812.png`) / standalone 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-blank-375x812.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-failure-375x812.png`) |
| 844×390 | 오류 폼을 문서 흐름에서 표시. owner y27·오류 y55·input y119–167·retry y207–255가 함께 보이고 결과 보기 버튼도 아래에 보임. 이전 입력 상단 가림 해소. 빈 틀 preview 전체는 여전히 스크롤해서 읽어야 함 | 오류 owner y112·input y186–234·retry y267–311 동시 노출. 빈 틀은 일부 preview와 CTA·접힌 disclosure가 보이는 스크롤 상태 | React 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-blank-844x390.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-failure-844x390.png`) / standalone 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-blank-844x390.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-failure-844x390.png`) |
| 1024×768 | 입력/결과 두 패널. owner y496·input y612–660·retry y720–768까지 전체 hit를 통과하나 retry 하단 여유는 작음. 상단/폼의 오류 문구 중복은 남음 | 두 패널에서 input y584–632·retry y665–709 동시 노출. 상단 알림과 지역 오류 중복은 남음 | React 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-blank-1024x768.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-failure-1024x768.png`) / standalone 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-blank-1024x768.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-failure-1024x768.png`) |
| 1440×900 | scaffold/보조 disclosure와 결과 패널 분리. 오류 owner y672·input y764–812·retry y852–900 전체 노출. 자동 스크롤 뒤의 실제 화면이며 모든 상단 행동이 동시에 보인다는 뜻은 아님 | scaffold/CTA와 결과 패널 분리. 오류 owner y642·input y716–764·retry y797–841 동시 노출 | React 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-blank-1440x900.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-failure-1440x900.png`) / standalone 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-blank-1440x900.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-failure-1440x900.png`) |

### 충족 판정의 경계

§2의 실제 실행 범위 22개는 최신 후보에서 모두 PASS다. 처음 네 그룹·선택 속성·단계별 Escape·실패값 보존·명시 재선택·빈 틀 우선·완성 예시의 명시 적용·동일 textarea·저장 경계의 해당 조건을 확인했다. **31 corpus 전체·6 compiled sidecar 전체·16 property의 모든 편집 조합은 이 새 브라우저 suite의 범위가 아니다.** 기존 pure/회귀 결과는 별도 원장과 연결해야 한다.

blank 화면의 이전 취소 안내, 좁은 가로 preview의 제한된 동시 노출, 상단/지역 오류 중복, 두 runtime의 전반적 색상·정보량 통일은 이 22/22로 모두 개선됐다고 쓰지 않는다. 별도 K3-B 원문 시간 투영과 다른 후속 갭도 이 결과로 완료 처리하지 않는다. 실제 Android Chrome·iOS Safari·OS IME·clipboard·스크린리더 검사는 미실행, 관찰 사용자 0명이다. 제품 파일 수정·commit·push·PR·Preview·Production 배포는 이 하위 작업에서 하지 않았다.

## 1. 과거 최초 실행 — 고정 대상과 실행 이력

| 항목 | 실제 대상 |
| --- | --- |
| 작업 공간 | `D:\flowme2605\flow-personal-workspace-v4-1-poc-20260901` |
| React | root 소유 `http://127.0.0.1:3182`, production BUILD_ID `ewrFPr_B6JPCYmlLRBXBQ` |
| React 진입 | `/flows/new?personalWorkspacePoc=v1`, 개인 저장 후 기존 PoC 개인공간으로 이동 |
| React 소스 | AuthoringSurface `F2B55E…`, Surface `ECFF280E…`. 이 하위 작업에서는 변경하지 않음 |
| 단독 HTML | 당시 assets의 `buildText()`를 메모리 route로 제공. 사용자용 디스크 HTML 생성·덮어쓰기 없음 |
| 단독 HTML SHA-256 | `44C9B5926346E188C94E7BEDB63F7FACA773F28E4F68FFEEAFDBA6F72523D487` |
| app SHA-256 | `8F35883CF4B219F39ABE9DBC9D8AD2A3EA796D111806B2E3EE98D20AB8D37A83` |
| style SHA-256 | `8F2E964BC649038CFE04C822B8F15962D5C0D3A8CD2E8265F20B56A1935611B4` |
| 브라우저·시간 | Windows Chrome / Playwright, fresh context / Asia/Seoul / `2026-09-05T09:00:00+09:00` fixed time |
| 테스트 파일 | 새 K3-A spec (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3a-authoring-guidance.spec.ts`). React 11개 + standalone 11개 = 등록 22개 |

| 단계 | 실제 실행 수·결과 | 해석과 증거 |
| --- | --- | --- |
| 최초 실행 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01.json`) | 22개, 19 PASS / 3 FAIL / 0 SKIP / 0 FLAKY. 18:14:04 KST 시작, 194.259초 | React B01·standalone B01은 입력 단위 전제 오류. React B11은 실제 입력 가림. 당시 spec SHA `81998A2B16D48F5A994F88E9AB92829999075DB94482152573975B78F6FCE161` |
| B01 하니스 정정 후 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-input-transaction-20260905-01.json`) | 2개, 2 PASS / 0 FAIL / 0 SKIP / 0 FLAKY. 18:17:44 KST 시작, 9.079초 | 같은 제품. `keyboard.type(' 확인')`만 단일 `keyboard.insertText(' 확인')`로 정정. spec SHA `AE109111BE396C9630B650F02CD923112415AE3A943B6846BA26B430253BE7A7` |

실제 실행 시도는 22 + 2 = 24회이고, 고유 등록 검사는 22개다. 현재 근거를 조합하면 21개 등록 검사가 통과했지만 **22개 전체가 같은 최종 실행에서 PASS한 상태는 아니다**. 초기 JSON·PNG를 삭제·덮어쓰거나 그 안의 FAIL을 PASS로 바꾸지 않았다.

B01의 모드/ghost 전환, textarea identity, selection/scroll/source/저장 bytes assertion은 최초에도 통과했다. 마지막 Ctrl+Z에서 문자별 CDP 입력 중 마지막 `인`만 지워져 ` 확`가 남았다. 단일 입력 transaction으로 바로잡은 뒤 한 번의 Undo/Redo가 전후 원문을 정확히 복원했다. 이는 실제 OS IME나 클립보드 검사 결과가 아니다.

## 2. 22개 등록 검사의 실제 범위

| ID — runtime마다 1개 등록 | 이 파일에서 실제 실행한 조건 | React | standalone | 이 파일 밖 또는 미실행 범위 |
| --- | --- | --- | --- | --- |
| KA-B01 | 한글·tab·emoji·긴 줄, 모드/ghost 전환, 같은 textarea와 selection/scroll/bytes, 단일 입력 Undo/Redo | 재검 PASS | 재검 PASS | 원래 CRLF는 native textarea 입력 과정에서 LF로 정규화됨. 실제 클립보드·OS IME 미실행 |
| KA-B02 | 현재 행/여러 선택 행 raw, 다른 안전 행 presented, 장식 aria-hidden·pointer/user-select 없음, 속성 행에서 exact root Item 도움 | PASS | PASS | 모든 child/보호 구문/200% reflow 조합을 새로 실행한 것은 아님 |
| KA-B03 | 구조→항목 정보→처음 정확한 4그룹→선택 그룹만, 16 key 누락·중복 없음, 둘러보기 0쓰기 | PASS | PASS | 16개 모두의 편집/기존 값 선택을 새로 실행한 것은 아님. 현재 편집 분기는 place와 time/timezone |
| KA-B04 | value→properties→groups→structure→실제 opener Escape, 값 재진입 보존, navigation 메뉴의 Tab 비포획 | PASS | PASS | value 폼 밖 이동에 자동 폐기를 요구하지 않음. K1-A safety owner 보존이 우선 |
| KA-B05 | 합성 composing Enter/submit 무변경, composition 종료 뒤 빠른 이중 submit 최대 native 1회, time/timezone 결합 입력·Undo | PASS | PASS | 실제 IME·반복/종료 dependency·모든 invalid/duplicate 조합은 별도 기존 검사 범위 |
| KA-B06 | 원문 ABA 두 번 수정 후 stale 유지, 임시값 보존, 명시 exact Item 재선택 후 적용 | PASS | PASS | 행 삽입·동일raw 새 문서·외부 draft/CAS 등 전체 K1-A 조합은 선행 회귀에서 별도 |
| KA-B07 | exact draft before-read/Quota/readback 3분기, source·before bytes·native history 유지, Escape/재진입에도 오류와 값 보존, retry | PASS | PASS | native reject·rollback 불확실·recovery-required는 기존 K1-A 회귀 재사용. 오류의 실제 write API가 항상 0인 것은 아님 |
| KA-B08 | 6 scaffold 둘러보기 0쓰기, 명시 삽입 native 1회, exact scaffold·첫 # 빈칸 caret/focus·같은 editor·Undo/Redo | PASS | PASS | non-empty/stale/IME/중복 적용의 모든 template별 조합은 기존 pure/보호 회귀 |
| KA-B09 | 기본 scaffold와 접힌 완성 예시·기술 정보 구분, disclosure 0쓰기, compiled 예시 1개 exact 적용·Undo | PASS | PASS | 31 corpus와 6 compiled sidecar 전체를 새 브라우저에서 검사한 것은 아님 |
| KA-B10 | 입력↔결과 왕복 동일 editor·0쓰기, 원문 `[x]` 포함한 명시 개인 handoff, exact source와 reload bytes | PASS | PASS | 모든 origin 신규 저장, TXT/Sheet/반복 완료 전체는 기존 K2-A/별도 회귀 |
| KA-B11 | 각 5 viewport에서 blank CTA, place 입력·적용·오류 retry의 full bounds/9점 hit, 동일 editor, overflow, viewport 캡처 | **FAIL: 844 입력 윗부분** | PASS | React 1024·1440은 앞선 844 실패로 이번 실행 미도달. viewport를 별도 5개 시나리오로 더하지 않음 |

### 입력값 owner와 밖 클릭의 구분

순수 탐색 메뉴는 non-modal이며 뒤로/Tab/밖 이동에서 원문을 쓰지 않는다. 값을 편집 중인 helper는 다르다. source를 편집해 stale가 되거나 저장에 실패해도 값과 failure owner를 보존해야 하므로, **navigation-only dismiss를 value 폼의 자동 폐기로 확장하지 않는다**. React value는 별도 폼이고 standalone도 value owner가 유지된다. B04의 Tab assertion은 navigation 메뉴를 대상으로 하며 B06/B07은 값 보존을 별도로 검사한다. 밖 클릭의 모든 좌표 조합을 실행했다고 표현하지 않는다.

## 3. React B11 제품 실패

재현: 844×390 빈 문서 → 첫 작성 틀 둘러보기 → 닫기 → 원문 입력 → 첫 Item `+` → 항목 정보 → 일정 → 장소 → 긴 값 입력 → exact draft Quota → 재시도 버튼을 viewport로 스크롤 → 입력란을 다시 스크롤하지 않고 동시에 9점 hit 검사.

재시도 버튼 자체는 전체 노출·9/9 hit다. 입력란은 브라우저 viewport 안에 있으나 상단 3점이 화면 위에 남은 입력/결과 탭에 가려져 **6/9 hit**다. 이는 탭 자체의 CSS `position:sticky`라고 단정한 것이 아니라, 고정 높이 shell 안의 column이 스크롤할 때 상단이 남는 배치다. 원문은 바뀌지 않았고 입력값·오류도 남아 있다. 따라서 저장 소유권 결함과 구분한 **동시 조작 가림**이다. 실패 PNG (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/test-failed-3.png`)를 직접 열어 844×390 크기와 가림을 확인했다. 이 문제 때문에 이번 React B11의 이후 1024·1440 분기는 실행되지 않았다.

입력란을 따로 다시 스크롤하거나 9점 검사를 중앙 1점으로 완화해 PASS로 바꾸지 않는다. 수정 후에는 같은 source/fault/긴 값/동시 geometry assertion으로 재실행해야 한다. 이 하위 작업에서는 제품 CSS나 스크롤 동작을 바꾸지 않았다.

## 4. 실제 viewport 캡처 평가

명시 캡처는 모두 `fullPage:false`다. source와 전체 localStorage bytes, chooser stage, retry/stale/recovery 피드백의 노출, details 열림 상태를 캡처 앞뒤 비교한다. viewport 값을 확장하는 과거 K1-A full-page PNG는 이 표에 사용하지 않았다. 첫 실행의 명시 PNG 15장과 React 실패 PNG 1장을 직접 열어 확인했다.

### React

| viewport | 실제 도달·직접 평가 | PNG |
| --- | --- | --- |
| 390×844 | blank scaffold와 기본 CTA가 보이고 완성 예시·기술 정보는 닫혀 있음. 오류 뒤 place 값·owner·retry 동시 노출/9점 hit PASS. 캡처는 행동으로 스크롤한 상태로 페이지 맨 위 전체 표시를 뜻하지 않음 | 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-blank-390x844.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-failure-390x844.png`) |
| 375×812 | blank/오류 행동은 같은 기준 PASS. 긴 입력은 input 내부 가로 표시이고 source에는 반영되지 않음. 하단 전역 nav가 있어 다른 본문 행동까지 동시에 보인다는 판정은 아님 | 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-blank-375x812.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-failure-375x812.png`) |
| 844×390 | blank CTA까지 PASS. scaffold의 위쪽은 스크롤 밖이며 고정 header·status·탭이 상당한 높이를 사용. 오류 재시도 때 input 위쪽이 탭에 가림 → FAIL | 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/b11-blank-844x390.png`) · 실패 당시 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-3034c-d-complete-action-hit-areas/test-failed-3.png`) |
| 1024×768 | 이번 B11 미도달. 다른 suite 결과로 대체하지 않음 | NOT_RUN |
| 1440×900 | 이번 B11 미도달. 다른 suite 결과로 대체하지 않음 | NOT_RUN |

### Standalone

다섯 화면 모두 blank CTA와 오류 입력/적용/retry의 full bounds·9/9 hit 및 문서 가로 overflow 0을 통과했다. 표의 숫자는 오류 input Y와 retry Y이며 작은 소수는 반올림했다.

| viewport | 직접 평가와 제한 | PNG |
| --- | --- | --- |
| 390×844 | 빈 scaffold/CTA·접힌 두 disclosure가 구분됨. 오류 input y643–691, retry y724–768 동시 노출. 문맥·장소·실패 문구가 함께 보임 | 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-blank-390x844.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-failure-390x844.png`) |
| 375×812 | 빈 틀 CTA로 스크롤하면 상단 preview 제목 일부가 sticky 영역 뒤에 있음. CTA는 전체 노출. 오류 input y611–659, retry y692–736, 값·오류 읽힘 | 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-blank-375x812.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-failure-375x812.png`) |
| 844×390 | blank preview 전체가 한 화면에 들어가지는 않으나 CTA/완성 예시/기술 disclosure에 도달. 오류 input y186–234, retry y267–311, 정확 owner·오류와 함께 보임 | 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-blank-844x390.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-failure-844x390.png`) |
| 1024×768 | 입력/결과 두 패널. 오류 input y584–632, retry y665–709 동시 노출. 상단 알림과 값 폼에 같은 실패 문구가 중복됨 | 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-blank-1024x768.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-failure-1024x768.png`) |
| 1440×900 | 선택한 scaffold/빈 틀 CTA와 결과 패널 분리. 오류 input y716–764, retry y797–841 동시 노출. 빈 문서 결과의 기존 validation 안내까지 보이지만 그 정보량의 적정성을 새 승인한 것은 아님 | 빈 틀 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-blank-1440x900.png`) · 오류 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-initial-20260905-01/personal-workspace-k3a-aut-dfe17-d-complete-action-hit-areas/b11-failure-1440x900.png`) |

React cobalt/standalone teal 등 두 runtime의 전체 시각 통일이나 모든 helper 마지막 행·200% reflow를 이 결과로 충족 판정하지 않는다. ghost의 예시 문구는 raw/저장과 분리하여 검사했으며, 화면에 나온 예시를 저장된 사용자 원문으로 보고하지 않는다.

## 5. 저장 경계와 검사 수의 구분

| 단계 | boundary 기록 | 제품 mutation API | prefix 밖/clear | 전후 non-PoC bytes 불일치 | console/page error |
| --- | --- | --- | --- | --- | --- |
| 최초 22 실행 | 42 context | 299회 | 0 | 0 | 0 |
| B01 재검 2 실행 | 2 context | 20회 | 0 | 0 | 0 |

context 수는 fault·6 scaffold·5 viewport용 fresh context를 포함한다. 사용자 수나 등록 시나리오 수가 아니다. `flow:k3a:operating-sentinel`의 공백·CRLF·emoji를 포함해 모든 non-PoC key/value를 정렬 후 exact 비교했다. seed와 sentinel 설정은 측정 전 테스트 준비로 분리했다. 모든 mutation 감시 대상은 `flow:poc:personal-workspace:v1:*`이며 `clear()`는 가로챈 뒤 거절한다.

fault는 runtime별 exact draft key에만 건다. React는 `...:authoring-draft`, standalone은 `...:standalone-integrated:draft`다. readback 실패에는 저장 시도/rollback API가 있을 수 있지만 source와 마지막 성공 draft bytes, native 입력 이력은 그대로다. 실패 전체를 API 호출 0이라고 쓰지 않는다. 실제 사용자 저장소·운영 계정에 대한 검사는 하지 않았다.

## 6. 다음 검증과 제외

다음은 React B11의 최소 수정 후 같은 검사 재실행, 이후 22개 전체를 고정 빌드에서 다시 실행하는 것이다. 후속 spec은 재시도까지 스크롤한 같은 시점에 기존 input/retry에 더해 **owner와 지역 오류 안내**도 재스크롤 없이 전체 bounds/9점 hit를 검사하도록 보강했다. 이 추가 assertion은 위 최초 실행 결과에 소급하지 않는다. 최신 다섯 해상도의 PNG를 다시 직접 읽어 1024·1440까지 평가한다. 단위/기존 회귀 결과는 고유 시험 범위를 확인해 연결하고 31 corpus·6 compiled·16 property 검증을 이번 브라우저 반복 수와 섞지 않는다.

| 구분 | 상태 |
| --- | --- |
| 실제 Android Chrome / iOS Safari | NOT_RUN |
| 실제 OS IME / clipboard / touch / screen reader | NOT_RUN. 합성 입력·DOM/geometry 검사는 별도 |
| 관찰 사용자 수 | 0명 |
| npm test / production build | root가 별도 실행·집계. 이 브라우저 22개에 합산하지 않음 |
| 제품 코드·운영 schema 변경 | 이 하위 작업 0개 |
| commit / push / PR | 진행하지 않음 |
| Preview / Production | 배포하지 않음. 로컬 production build 검사와 구분 |

재실행할 때마다 새 출력 이름을 사용한다. 아래 `NEW`는 아직 없는 경로로 바꾼다.

```powershell
$env:FLOWME_PLAYWRIGHT_PORT = '3182'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'output/playwright/k3a-authoring-guidance-NEW.json'
npx.cmd playwright test tests/e2e/personal-workspace-k3a-authoring-guidance.spec.ts --workers=1 --reporter=line,json --output=output/playwright/k3a-authoring-guidance-NEW
```
