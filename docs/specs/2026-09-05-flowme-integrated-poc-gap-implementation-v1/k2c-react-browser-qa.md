# K2-C React — 변경 결과와 Undo 브라우저 검증

검사일: 2026-09-05. 대상: 로컬 production build의 `/my?personalWorkspacePoc=v1`. **최신 freeze4 제품 재검사는 18개 중 18 PASS / 0 FAIL**이다. 첫 네이티브 드래그와 Undo 결과가 보이는 상태의 연속 네이티브 드래그도 실제 drop·순서 변경·Undo까지 통과했다. K2-C 전체 완료, 세 원본 산출물 전체 충족, 실제 기기·관찰 사용자 검증을 뜻하지 않는다.

## 0. 최신 freeze4 제품 재검사 — 18/18 PASS

아래가 최신 판정이다. **§1–8은 freeze3의 17/18 판정과 원인 조사 당시 기록으로 그대로 보존**한다. 그 안의 ‘최종’, ‘남은 native 실패’는 당시 빌드를 가리키며, 현재 native 판정은 이 절로 갱신한다. 과거 JSON·PNG는 덮거나 삭제하지 않았다.

| 항목 | 최신 실행의 실제 값 |
| --- | --- |
| 서버 / BUILD_ID | root 소유 `http://127.0.0.1:3182` / `JbFO170XJz9wg7lqCLgNA` |
| Surface SHA-256 | `ECFF280ED9E13230EC483B01DDF4766E51E41D87ED6663E2FFF5E27D59FD5357` |
| 검사 파일 | 기존 18개 E2E 본문 변경 없음. 50,003 bytes / SHA-256 `C93B6680CB5301BAE53C2E4C3A803DC43B145C043E076478CF2CB5A3AD4CCADF` |
| 시작 / 소요 | 2026-09-05 18:00:41 KST / 94.073초 |
| 실제 실행 | **18 PASS / 0 FAIL / 0 SKIP / 0 FLAKY**. §3의 등록 18개를 모두 재실행 |
| 실험 조건 | focus·MIME·status-box A/B 모두 OFF. test-only CSS 없음, 제품 native 경로 그대로 |
| 저장 경계 | 29개 새 context 기록 / 제품 mutation API 330회 / prefix 밖·clear 0회 / 운영 bytes 불일치 0개 |
| 오류 | console error·page error 0개 |
| PNG | 이번 실행의 성공 5장·실패 5장 직접 확인. 과거 PNG를 재사용하지 않음 |

최신 JSON (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-freeze4-20260905-01.json`)은 8,843,205 bytes, SHA-256 `D8CAEC114B22CC73699076F063A8B174EC824D598AA7AFD71E87BB5F4E8F39C5`다. 330회는 성공·실패 시도·rollback·PoC 보조 키를 포함한 실제 API 호출 수이며 사용자 행동 수가 아니다. 테스트 준비의 seed·sentinel 주입은 제외했다. 29개 boundary 기록 모두 같은 BUILD_ID를 기록했고 non-PoC key/value를 전후 exact 비교했다. 사용자 운영 브라우저 프로필을 조사한 것은 아니다.

### C05 재검증과 요구 범위

`c05-native-fresh`는 trusted dragstart 1188ms → drop 1290ms → dragend 1306ms, `c05-native-after-visible-undo`는 dragstart 1741ms → drop 1799ms → dragend 1805ms를 기록했다. 둘 다 같은 source DOM이 연결된 상태로 유지됐다. 제품 MIME `text/personal-workspace-ref`를 그대로 사용했으며, 순서 변경 1회와 contextual Undo 복원을 검증했다. 합성 CSS A/B의 성공을 옮겨 적은 것이 아니라 **수정 제품을 별도 새 실행으로 검증한 결과**다.

`c05-input-subchecks-not-five-independent-scenarios`의 메뉴·짧은 핸들·키보드·합성 길게 누르기·네이티브 드래그는 같은 exact ref와 `move-order`, 각 logical target write 1회를 기록했다. 이 다섯 경로는 C05 한 등록 검사의 내부 분기다. 첫 드래그와 Undo 뒤 드래그를 별도 독립 시나리오로 더하지 않는다. CDP pointer와 DOM 합성 검사는 실제 터치·하드웨어 드래그 검사와 구분한다.

따라서 §1 원본 연결표의 V41-042/BP-060·063/P3K-V41-05 중 native 직후 결과·복구 범위, V41-043 중 이번 다섯 입력 경로의 순서 동등성은 이 새 실행에서 충족했다. 원문 시간 투영의 **K3-B RED 1개는 미해결**로 유지한다. C12/C13의 `09:30`은 명시 개인 `placement.time` fixture이며 원문 시간 fallback 검사로 바꾸지 않는다. 다른 origin 신규 handoff, 모든 결과 형식, 실제 기기·사용자 검증 범위도 늘리지 않았다.

### 최신 다섯 화면 직접 평가

성공 Undo·닫기와 오류 패널 닫기는 모든 viewport에서 `fullRatio === 1`, 9/9 hit, 문서 가로 overflow `=== 0`을 통과했다. 아래 실제 viewport PNG 10장을 직접 확인했으며, 각 `fullPage:false` 캡처 앞뒤 transaction/result status 동일 assertion도 통과했다.

| viewport | 이번 PNG에서 직접 확인한 점과 제한 | 최신 PNG |
| --- | --- | --- |
| 390×844 | 본문 결과 Undo/닫기 y575–623, 하단 nav와 분리. 오류 패널 닫기 y113–161 노출. 아래 폴더·순서 모두가 한 화면에 들어오지는 않음 | 성공 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-freeze4-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-success-390x844.png`) · 실패 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-freeze4-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-failure-390x844.png`) |
| 375×812 | 전후 날짜·결과 문장·Undo/닫기 y558–606 노출. 긴 오류·폴더 문구는 줄바꿈하며 닫기는 가려지지 않음 | 성공 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-freeze4-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-success-375x812.png`) · 실패 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-freeze4-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-failure-375x812.png`) |
| 844×390 | 성공 결과로 스크롤한 상태에서 Undo/닫기 y314–362 노출. 실패 패널 닫기는 보이지만 아래 날짜·폴더·순서에는 내부 스크롤이 필요함. 화면 전체의 무스크롤 표시 판정이 아님 | 성공 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-freeze4-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-success-844x390.png`) · 실패 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-freeze4-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-failure-844x390.png`) |
| 1024×768 | header Undo와 본문 Undo가 함께 있으며 결과 버튼 y575–623 노출. 오류 패널 닫기·날짜·폴더는 보이고 순서 하단은 스크롤 필요 | 성공 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-freeze4-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-success-1024x768.png`) · 실패 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-freeze4-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-failure-1024x768.png`) |
| 1440×900 | 폴더 탐색과 본문이 분리되고 결과 버튼 y510–558 노출. 오류 패널에 순서 행동까지 보임. 상단과 패널의 동일 오류 문구 중복은 남아 있음 | 성공 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-freeze4-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-success-1440x900.png`) · 실패 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-freeze4-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-failure-1440x900.png`) |

이 최신 18회는 §6의 과거 재시도 횟수와 별도다. 같은 등록 검사를 다시 실행한 것이므로 고유 시나리오 수는 18개로 유지한다. 실제 Android Chrome·iOS Safari·스크린리더·관찰 사용자 검사는 미실행이며 관찰 사용자 0명이다. 이 하위 작업은 제품 파일·운영 schema를 수정하지 않았고 commit·push·PR·Preview·Production 배포도 하지 않았다. K3-A 회귀에서 별도로 확인 중인 helper 잘림·입력값 보존 문제를 이 K2-C 18/18로 충족 판정하지 않는다.

## 1. 과거 freeze3 판정 요약

날짜·폴더·순서·완료 변경 뒤 결과 옆 Undo, 사라진 마지막 그룹의 결과 위치, 이전 성공과 편집·오류의 소유권 분리, 같은 Flow 안의 상세 대상 전환, 새로고침과 외부 바이트 변경 경계를 확인했다. 다섯 해상도의 성공 결과 Undo·닫기와 오류 패널 닫기는 전체 노출 및 9점 hit-test를 통과했다.

**C05 네이티브 드래그는 제품 검사에서 실패 상태다.** 메뉴·짧은 핸들·키보드·합성 길게 누르기의 네 내부 경로는 동일 순서 변경과 Undo 검사를 통과했으나, 첫 네이티브 dragstart가 27ms 뒤 dragend로 끝났다. 따라서 입력 경로 동등성 전체는 충족하지 못했다. focus/MIME 실험은 해결 근거를 주지 못했다. 이후 §5.1–5.2의 별도 위치 진단과 test-only CSS A/B로 status 영역 소멸에 따른 60px 이동이 이 재현의 원인이라는 근거를 확보했다. **실험 PASS를 제품 PASS로 바꾸지는 않는다.**

원문 `시간: 09:30`을 기간 행에 투영하는 기존 누락은 **별도 K3-B RED 1개**로 보존했다. K2-C 해상도 검사는 명시적인 개인 `placement.time`의 보존만 확인한다. C13 전체 충족으로 올리지 않는다.

### 원본 요구와 연결

정본은 [K2-C 설계](./k2c-design.md), [개선 설계](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md), [실행 계획](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md), [v4.1 요구 원장](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.json)이다. 이 QA는 기존 원장 판정을 일괄 바꾸지 않는다.

| 요구 | 이 실행에서 확인한 범위 | 남은 범위 |
| --- | --- | --- |
| V41-042 / BP-060·063 / P3K-V41-05 | 변경 직후 결과 옆 Undo, 마지막 행·그룹 소멸, 긴 목록, 키보드 닫기 복귀 | 네이티브 드래그 직후 결과 경로는 실패로 미확인 |
| BP-076 | Quick 날짜·폴더 독립 변경, Flow 폴더 상속, 마지막 성공만 Undo | 모든 origin의 신규 handoff 검사를 이 파일에서 다시 실행한 것은 아님 |
| V41-043 | 메뉴·짧은 핸들·키보드·합성 길게 누르기 내부 검사, 취소·동일 위치 0 write | 네이티브 첫 드래그 FAIL, Undo 결과가 보이는 상태의 연속 네이티브 드래그 미실행 |
| V41-024·056 / P3K-V41-03 | 오늘 heading과 exact date context, 행의 중복 날짜 없음, 개인 시간·Flow/폴더 경로·접근성 설명 유지 | 원문 시간→기간 행 누락, 혼합 날짜의 전체 필드 동등성은 K3-B |
| V41-053·054 | 일반 성공 안내의 결과 소유권·중복 완료 announcement 억제 | 오늘 제목 반복, 패널/상단 오류 안내 중복 등 전체 정보량 정리는 남음 |

## 2. 고정 대상과 실행 방법

| 항목 | 이번 실행의 실제 값 |
| --- | --- |
| 작업 공간 | `D:\flowme2605\flow-personal-workspace-v4-1-poc-20260901` |
| 서버 | `http://127.0.0.1:3182`, root가 관리한 freeze3 production build |
| BUILD_ID | `ppguj8lab6ZRyeueMcevG` |
| Surface SHA-256 | `001768710C275C7CB4EAF9EE9E0A263B0D8F0F75A475E267AE5F5FFCB9B4C6E2` |
| 브라우저 | Windows의 Google Chrome, Playwright 자동화. 사용자의 브라우저 프로필은 사용하지 않음 |
| 시간 | `2026-09-05T09:00:00+09:00` fixed time, `Asia/Seoul` |
| 최종 시작·소요 | 2026-09-05 17:18:09 KST, 142.099초 |
| 최종 통계 | expected 17 / unexpected 1 / skipped 0 / flaky 0 |
| 진단 토글 | `FLOWME_K2C_FOCUS_AB=0`, `FLOWME_K2C_MIME_AB=0` |
| 제품 파일 변경 | 이 검증 하위 작업에서는 0개. 제품 수정·빌드 결과는 root/어댑터 QA와 별도 |

검사 코드는 React contextual-result E2E (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2c-react-contextual-result.spec.ts`)다. 50,003 bytes, SHA-256 `C93B6680CB5301BAE53C2E4C3A803DC43B145C043E076478CF2CB5A3AD4CCADF`. 최종 JSON (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01.json`)은 8,778,902 bytes, SHA-256 `60887A80DE197D87F77F40F33DFC6DA34536A8358ED3BCD051B6F9BC0DB85E14`다.

재현은 기존 증거를 덮지 않는 **새 출력 이름**을 지정한다. 아래 이름이 이미 있으면 다른 이름을 선택한다. 기존 설정·패키지·사용자 HTML을 바꾸지 않는다.

```powershell
$env:FLOWME_PLAYWRIGHT_PORT = '3182'
$env:FLOWME_K2C_FOCUS_AB = '0'
$env:FLOWME_K2C_MIME_AB = '0'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'output/playwright/k2c-react-contextual-recheck-NEW.json'
npx.cmd playwright test tests/e2e/personal-workspace-k2c-react-contextual-result.spec.ts --workers=1 --reporter=line,json --output=output/playwright/k2c-react-contextual-recheck-NEW
```

`--list`의 등록 개수도 18개다. viewport 반복이나 한 검사 안의 fault·입력 분기를 독립 시나리오로 더하지 않는다. 아래 29 경계 기록은 29개 독립 시나리오 또는 29명의 사용자가 아니다.

## 3. 최종 18개 실제 검사 목록

아래 번호는 등록 순서다. C 번호는 설계 inventory와 연결하며, C07·C09·C11·C12처럼 하나의 설계 항목을 여러 등록 검사로 나눈 경우가 있다.

| # | 등록 검사 / 주요 assertion | 결과 |
| --- | --- | --- |
| 1 | C01 오늘 마지막 Quick 행·날짜 그룹 사라짐 → 안정된 결과 anchor → 설정을 열지 않고 Undo. domain snapshot 복원, revision/updatedAt은 기존 규칙 | PASS |
| 2 | C02 Quick 폴더·Flow 폴더·Item 날짜 변경. Item 폴더 상속과 원문 유지, 마지막 날짜 Undo가 앞선 폴더 변경을 되돌리지 않음 | PASS |
| 3 | C03 날짜별 직접 순서와 시간순 reset의 결과 owner·단일 Undo, 기간 보기 간 일치 | PASS |
| 4 | C04 완료·다시 열기·Undo·reload, Flow/기간의 개인 실행 상태 일치, 같은 제목의 다른 사본과 sourceChecked 보존 | PASS |
| 5 | C05 메뉴·짧은 핸들·키보드·네이티브 드래그·합성 길게 누르기의 순서 결과 동등성 | **FAIL: native fresh** |
| 6 | C06 같은 위치·같은 날짜·닫기·Escape·pointer cancel·영역 밖·blur·resize. 새 성공 없음, 실제 write 0, 이전 snapshot 유지 | PASS |
| 7 | C07 초기 target read·Quota·readback 실패 3분기. 새 성공 없음, 실패 안내 및 이전 durable snapshot 유지 | PASS |
| 8 | C07 intent 이후 writer 전 CAS drift. 새 성공 없음, 제품 mutation 0 | PASS |
| 9 | C08 연속 성공이 owner를 교체, 동기 이중 Undo 논리 성공 최대 1회 | PASS |
| 10 | C09 편집 receipt → 일반 완료. 각 결과·Undo 소유권과 완료 메시지의 live announcement 하나 | PASS |
| 11 | C10 Quick 편집 진입이 일반 결과보다 우선, draft 저장 실패에 편집 retry·입력·기존 상태 유지 | PASS |
| 12 | C11 결과 닫기 write 0, reload 시 저장 상태 복원·새 contextual result 합성 없음·기존 header Undo | PASS |
| 13 | C11 관측하지 못한 외부 bytes가 contextual Undo 차단, 관측한 A→B→A는 이전 owner 영구 무효 | PASS |
| 14 | C12/C13 다섯 viewport의 성공 Undo·닫기 / 오류 닫기 전체 노출, 9점 hit, overflow 0, 개인 시간·경로·접근성 유지 | PASS |
| 15 | C09 같은 Flow의 Item A 완료 → B 상세 → A 상세. 이전 A 결과가 되살아나지 않음 | PASS |
| 16 | C12 긴 목록 마지막 행 직접 완료. Undo가 현재 viewport 안에 있고 pointer 초점을 빼앗지 않음 | PASS |
| 17 | C12 키보드 결과 닫기. 살아 있는 정확한 origin으로 초점 복귀, 저장 write 0 | PASS |
| 18 | C11 손상 payload reload. 기본 `/my`로 fail-closed, 이전 메모리 결과 합성·추가 쓰기 없음 | PASS |

이 목록만으로 설계 C01–C13의 모든 세부 조건이 검증됐다고 판정하지 않는다. 예를 들어 C08의 모든 늦은 callback 경합, C09의 모든 creator/source-update lane, C10의 standalone K1-B prepared/confirmed journal·부모 편집 복구는 이 React suite의 범위가 아니다. 결과물 TXT·Sheet 전체도 이 파일에서 다시 검증하지 않았다.

## 4. 다섯 화면의 직접 평가

최종 성공 5장·실패 5장 **10개 PNG를 직접 열어 확인**했다. 아래 링크는 최종 run의 실제 viewport 캡처다. 성공 버튼 둘과 오류 닫기 하나는 각각 `fullRatio === 1`, 9점 모두 실제 target hit, 문서 가로 overflow `=== 0`을 통과했다. 표의 Y 범위는 성공 Undo 버튼이다.

| viewport | 성공 화면 평가 | 실패 화면 평가 | 최종 PNG |
| --- | --- | --- | --- |
| 390×844 | 이동한 Quick 행 대신 본문 결과가 남고 Undo/닫기 y575–623. 하단 전역 nav와 겹치지 않음. 같은 제목 Flow 행의 경로·09:30은 별도 줄로 읽힘 | 왼쪽 이동 패널의 실패·닫기 노출. 긴 폴더/하단 순서 항목까지 한 화면에 모두 들어오는 것은 아님 | 성공 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-success-390x844.png`) · 실패 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-failure-390x844.png`) |
| 375×812 | 결과 문장과 전후 날짜가 줄 안에 들어가고 Undo/닫기 y558–606. 하단 nav와 분리 | 좁은 패널에서 실패 문구·긴 폴더 이름이 줄바꿈. 닫기 y113–161 전체 노출 | 성공 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-success-375x812.png`) · 실패 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-failure-375x812.png`) |
| 844×390 | 결과 위치로 본문을 스크롤한 실제 화면. Undo/닫기 y314–362가 하단 안에 있고 행·결과가 서로 덮지 않음. 페이지 상단까지 한 화면에 보인다는 뜻은 아님 | 실패·닫기는 보이나 이동 패널 아래 날짜/폴더/순서는 현재 화면 밖. 이번 판정은 오류 탈출 경로에 한정 | 성공 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-success-844x390.png`) · 실패 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-failure-844x390.png`) |
| 1024×768 | 기존 header Undo와 본문 contextual Undo 유지. 결과 버튼 y575–623, 본문 행과 겹치지 않음 | 패널은 왼쪽에 있고 닫기·오류는 전체 노출. 하단 순서 영역은 더 스크롤해야 함 | 성공 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-success-1024x768.png`) · 실패 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-failure-1024x768.png`) |
| 1440×900 | 폴더 탐색과 실행 본문 분리. 긴 폴더 이름 줄바꿈, 결과 버튼 y510–558. 데이터 행·복구 행동 읽힘 | 오류 패널 닫기·날짜·폴더·순서가 더 많이 노출됨. 상단과 패널의 같은 오류 문장은 중복으로 남음 | 성공 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-success-1440x900.png`) · 실패 (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01/personal-workspace-k2c-rea-6eef3-date-group-path-information/c12-failure-1440x900.png`) |

### 캡처 자체의 상태 보존

최종 `capture()`는 `fullPage:false`다. 매 캡처 전의 transaction `data-status`와 contextual result `data-result-status`를 읽고, 캡처 후 **두 값이 동일함을 expect**한다. 10개 화면 모두 이 assertion을 포함해 통과했다. 저장 상태·호출 목록과 geometry는 최종 JSON의 같은 이름 attachment 및 `c12-five-viewport-subchecks`에 있다.

초기 focused run은 `fullPage:true` 캡처가 브라우저 viewport 값을 일시 바꿔 열린 이동 세션의 정상 resize-cancel을 유발했다. 그때 실패 화면처럼 이름 붙은 PNG가 실제로 취소 상태를 담았기 때문에, 해당 PNG는 **최종 실패 화면 근거로 사용하지 않는다**. 파일은 삭제하거나 덮지 않았다. 손상 reload의 별도 full-page 캡처에는 열린 이동 세션이 없으며, 이를 다섯 viewport의 성공/실패 캡처와 혼합하지 않는다.

### 좁은 UX 평가와 남은 개선

- Execution Clarity: 일반 성공 결과가 대상·변경 종류·전후 날짜와 Undo를 함께 보여준다. 다만 원문 시간 투영 누락은 실행 정보 손실로 남는다.
- Accessibility/Operability: 검사한 Undo·닫기와 키보드 복귀는 통과. native drag 실패 때문에 모든 입력 경로의 조작성을 충족했다고 볼 수 없다. 실제 스크린리더 음성 출력도 미실행이다.
- Cognitive Load / Copy: 성공 결과는 본문에 있고 사라진 항목의 복구에 필요한 정보는 유지한다. 오늘 제목 반복과 오류 상단/패널 중복은 보인다. 이 하위 작업은 제품 UI를 제거하거나 재설계하지 않았으며 후속 공통 표시 검토 대상으로 남긴다.
- Content Fidelity / Source Safety: 검사한 원문·다른 사본·sourceChecked·개인 시간·경로는 유지했다. 원문 시간→행 누락은 별도 RED다.
- User Need Fit / Portability: 이번 기능형 내부 QA만으로 제품 적합성 점수나 TXT/Sheet/캘린더 전체 이식성 점수를 새로 부여하지 않는다.

## 5. 남은 C05 네이티브 드래그: 관측과 미확정 원인

최종 JSON의 `c05-native-fresh`와 실패 trace (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01/personal-workspace-k2c-rea-f0b55-quivalent-date-order-owners/trace.zip`), 최종 native 실패 PNG (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01/personal-workspace-k2c-rea-f0b55-quivalent-date-order-owners/test-failed-5.png`)가 근거다.

| 관측 지점 | 실제 기록 | 해석 한계 |
| --- | --- | --- |
| drag 전 source bbox | x274, y441, width48, height48 | 시작 좌표만 확인 |
| capture 단계 microtask | 같은 bbox, defaultPrevented false | React handler 이후라고 보장할 수 없어 `capture-microtask-not-final-handler-state`로 명시 |
| document bubble | defaultPrevented false, types `text/personal-workspace-ref`, effectAllowed `move` | 정식 dragstart handler가 MIME을 설정한 것 확인 |
| trusted 이벤트 | dragstart 2604ms → dragend 2631ms | 실제 브라우저 trusted 이벤트지만 하드웨어 입력은 아님 |
| source 객체 | 시작·종료 같은 DOM 객체이며 연결 유지 | source 자체의 제거/교체는 관측되지 않음 |
| DOM 변경 | subtitle hidden, title text-right, source/row class 변경. draggable/disabled 변경·source 제거 없음 | class 변경에 따른 순간 위치 이동 가능성은 남음 |
| 레이아웃 요약 | scrollY 0, document height 861, result 없음, global status 높이36→16 | 문서높이가 같아도 내부 source y가 움직일 수 있음. 위치 불변의 증거가 아님 |
| 빠진 계측 | post-layout 및 dragend의 source/row/container bbox 없음 | 임시 위치 변화와 즉시 dragend의 인과는 아직 미확정 |

기존 `4-trace.trace`의 screencast 직전 복원 상태와 직후 취소 상태 프레임을 직접 봤다. 27ms 동안의 중간 이동 패널/ready 레이아웃 프레임은 남지 않아 순간 이동을 배제할 수 없다. `topmost:null`은 `elementFromPoint()` 결과 요소에 data-testid가 없을 수도 있다는 뜻이며, hit 요소 자체가 없었다는 증거가 아니다.

검사 driver는 Chromium CDP `Input`의 drag interception이다. Playwright 내부의 중복 drag interception 대기가 즉시 취소된 drag에 멈추는 문제를 피하려고 직접 CDP mouse 입력을 사용했고, `Input.dragIntercepted`를 최대 5초 기다린다. DOM으로 가짜 dragstart를 발행해 네이티브 통과로 대체하지 않았다. 최종 실패는 결과값을 skip/xfail로 바꾸지 않고 그대로 남겼다.

앞선 **focus-only A/B는 억제된 focus 호출 0회**였고, **같은 exact ref의 text/plain MIME 추가 A/B도 실패**했다. 두 실험만으로 focus나 MIME 제품 코드를 고칠 근거는 없다. 또한 첫 fresh native가 실패했으므로 `Undo 결과가 보임 → 네이티브 재드래그` 분기는 도달하지 않았다. standalone에서 확인한 결과 DOM 제거·scroll clamp 원인을 React에도 그대로 적용하지 않는다.

### 5.1 최종 suite 이후: source 위치 진단 1회

앞 표의 계측 한계를 좁히기 위해 별도 승인된 **fresh native 1개만** 실행했다. 새 진단 spec (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2c-react-native-layout-diagnostic.spec.ts`), JSON (로컬 전용 근거: `../../../output/playwright/k2c-react-native-layout-diagnostic-20260905-01.json`), 전 (로컬 전용 근거: `../../../output/playwright/k2c-react-native-layout-diagnostic-20260905-01/personal-workspace-k2c-rea-a9508-still-requires-interception/native-layout-before-390x844.png`)·후 PNG (로컬 전용 근거: `../../../output/playwright/k2c-react-native-layout-diagnostic-20260905-01/personal-workspace-k2c-rea-a9508-still-requires-interception/native-layout-after-390x844.png`)가 근거다. 메뉴 등 나머지 입력 분기는 다시 실행하지 않았다. Surface와 BUILD_ID는 위 freeze3와 동일하다.

| 시점 | source Y | row Y / height | group Y | status | 결과 |
| --- | --- | --- | --- | --- | --- |
| before / dragstart capture 1469ms | 441 | 433 / 64 | 376 | success, 358×36 | 아직 원래 위치 |
| mutation callback 1491ms | **381** | **373 / 64** | **316** | ready, sr-only 1×1 | source·row·group이 **위로 60px** 이동 |
| document bubble / dragend capture 1492ms | 381 | 373 / 64 | 316 | ready, 1×1 | 이동한 상태에서 trusted dragend |
| cancel 렌더 뒤 1497ms | 441 | 433 / 64 | 376 | canceled, 358×36 | 원래 위치 복귀 |
| timeout0 / rAF1 / rAF2 | 441 | 433 / 64 | 376 | canceled | 이미 취소가 끝나 중간 상태를 놓침 |

이때 source 객체·연결, row 높이64, shell 높이780, 문서높이861, scrollY0은 유지됐다. contextual result는 전 과정 0개였다. 이제 **순간 source 이동은 관측 사실**이며, 복원 안내가 ready/sr-only로 바뀔 때 기존 공간이 사라지는 것이 주요 원인 후보다. 해당 공간을 유지하는 A/B를 실행하지 않았으므로 그 변화만이 native 종료를 일으켰다는 인과는 아직 확정하지 않았다. callback 안에서 bbox를 읽는 계측 자체의 영향도 0이라고 단정하지 않는다.

결과는 **1개 실행 / 1 FAIL**, interception 대기 5초, 전체 9.979초다. 이것을 완료 검사나 새 통과로 더하지 않는다. native start→end는 23ms였다. 제품 storage API 0, state raw 동일, operating sentinel 동일, console/page error 0, 제품 Surface 전후 SHA 동일을 확인했다. 두 PNG를 직접 열었고 실제 viewport 캡처 전후 status도 동일했다. 제품·상태·dataTransfer·이벤트를 바꾸지 않는 신규 진단 코드만 추가했다.

### 5.2 별도 승인된 status 공간 유지 A/B 1회

같은 진단 파일에서 `FLOWME_K2C_STATUS_BOX_AB=1`을 사용한 별도 JSON (로컬 전용 근거: `../../../output/playwright/k2c-react-native-layout-ab-20260905-01.json`)은 **1개 실행 / 1 PASS**, 2.892초다. 측정한 기존 status 요소 하나의 CSS만 시험 페이지 안에서 고정했다. 값은 border-box 358×36px, 위·아래 margin 각각12px, 기존 position/display/padding/border다. body padding이나 가짜 행을 추가하지 않았다. ready 또는 aria-hidden 상태는 `visibility:hidden`으로 시각적으로 숨겼으며 원문, 상태값, ARIA, 저장 모델, transition, drag 입력, dataTransfer는 바꾸지 않았다.

- source y441, row y433/h64, group y376이 dragstart → mutation callback → document bubble → rAF → **trusted drop/dragend**까지 유지됐다.
- 기존 MIME `text/personal-workspace-ref` 그대로 `Input.dragIntercepted`가 도착했다. 순서 `[quick2, quick1]`와 move-order 결과, **target state 저장 1회**를 확인했다.
- 시험 CSS를 제거한 뒤 기존 contextual Undo를 실행했다. 순서와 domain snapshot이 복원됐다. revision/updatedAt의 기존 Undo 규칙은 예외로 분리했다.
- 제품 storage API는 변경5회 + Undo5회 = 10회이며, 이 중 target state setItem은 1회 + 1회다. 허용 prefix 밖/clear 0, 운영 sentinel 동일, console/page error 0, Surface before/after SHA와 BUILD_ID 동일이다.
- 이 실행은 fresh native만 다뤘다. Undo 결과를 남겨 놓고 다시 native drag하는 연속 분기를 더 실행하지 않았다.

§5.1에서 status가 ready로 바뀔 때 60px 공간이 사라지고 source가 움직였으며, 같은 공간만 유지한 A/B에서는 그 이동과 즉시 종료가 사라졌다. 이는 **이 fixture·Chrome 재현에서 status 레이아웃 소멸이 native 실패를 일으킨다는 근거**다. 전 세계 브라우저 공통 원인이나 실제 기기 검증으로 일반화하지 않는다. runtime/제품 CSS는 아직 이 작업에서 변경하지 않았다. 최종 18개 제품 suite의 17 PASS / 1 FAIL은 그대로 유지하며, 제품 수정 후 진단 토글 OFF 회귀가 필요하다.

## 6. 실패·재실행 이력과 수 집계

재실행은 원인을 확인하고 하니스/제품 변경을 구별하기 위한 시도다. 통과한 이전 실행을 최종 결과에 더하지 않는다. 아래 8회는 **실행 시도 44개**, 최종 suite는 **등록 검사 18개**다. §5.1 위치 진단 1회와 §5.2 CSS A/B 1회를 합친 관련 실행 시도는 46개지만 최종 suite 수는 바뀌지 않는다. 둘은 새 진단 파일의 같은 등록 검사 1개를 조건을 달리해 실행한 것이며 독립 제품 시나리오 2개가 아니다. 별도 K3-B source-time 1회와 다른 담당자의 focus 보조 2개·K1-A 38개·standalone 회귀는 여기에 더하지 않았다.

| 실행 | 실제 결과 | 차이·남긴 근거 |
| --- | --- | --- |
| initial (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-initial-20260905-01.json`) | 17개: 14 PASS / 3 FAIL | freeze2. native timeout, C09 초기 모드/필드 하니스, C12 source-time 누락 발견 |
| focused (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-focused-20260905-01.json`) | 4개: 1 PASS / 3 FAIL | freeze2. 개인 placement time geometry, native timeout, unrelated source live region까지 센 하니스, A→B→A 제품 결함. fullPage 실패 캡처 한계 분리 |
| Item owner RED (로컬 전용 근거: `../../../output/playwright/k2c-react-item-owner-red-20260905-01.json`) | 1개: 0 PASS / 1 FAIL | 같은 Flow A→B→A에서 A 결과 재등장. freeze3 activeItemRef owner 무효화 수정 뒤 최종 #15 PASS |
| native 진단 1 (로컬 전용 근거: `../../../output/playwright/k2c-react-native-diagnostic-20260905-01.json`) | 1개: 0 PASS / 1 FAIL | Playwright mouse와 별도 interception이 중복 대기. 100초 timeout |
| native 진단 2 (로컬 전용 근거: `../../../output/playwright/k2c-react-native-diagnostic-20260905-02.json`) | 1개: 0 PASS / 1 FAIL | bounded CDP로 trusted 즉시 dragend를 관측. 이때 long-press 분기는 native 뒤여서 미도달 |
| focus A/B (로컬 전용 근거: `../../../output/playwright/k2c-react-native-focus-ab-20260905-01.json`) | 1개: 0 PASS / 1 FAIL | freeze2. focus 억제 실제 호출 0, native 34ms 종료. 네 non-native 분기는 native 앞으로 이동 |
| MIME A/B (로컬 전용 근거: `../../../output/playwright/k2c-react-native-mime-ab-20260905-01.json`) | 1개: 0 PASS / 1 FAIL | freeze3. text/plain 추가 후에도 25ms 종료. 제품 MIME 변경하지 않음 |
| final (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-final-20260905-01.json`) | **18개: 17 PASS / 1 FAIL** | freeze3, 진단 토글 OFF. 최종 판정·경계·viewport 근거 |

### 별도 source-time RED

source-time E2E (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2c-react-source-time-gap.spec.ts`)는 4,517 bytes, SHA-256 `12DFD63585FFBC035070499760D0DD3FD6C3AC755B509B03838F6B6C8B22DDE1`다. K3-B RED JSON (로컬 전용 근거: `../../../output/playwright/k3b-react-source-time-red-20260905-01.json`)에 **1개 실행, 1 FAIL**을 보존했다. 원문과 materializer의 source timing에는 09:30이 있으나 개인 placement가 없는 기간 행에는 보이지 않는다. 제품 쓰기 0·원문/운영 bytes 보존 조건에서 재현했다. 이는 K2-C 새 기능이 만든 누락이라고 판정하지 않으며, 명시 개인 시간 fixture를 넣어 원문 시간 검사를 통과한 것으로 바꾸지도 않았다.

## 7. 저장 경계 증거

최종 JSON의 `react-boundary-*` attachment를 별도로 집계했다.

| 항목 | 최종 실제 값 |
| --- | --- |
| 새 검사 컨텍스트의 boundary 기록 | 29개 |
| 제품 localStorage mutation API 호출 | 310회. 성공·실패 시도·rollback·PoC 보조 키 호출을 포함 |
| 허용 prefix 밖 setItem/removeItem 또는 clear | **0회** |
| 전후 운영/non-PoC key-value 비교 불일치 | **0개** |
| console error / page error | **0개** |
| 같은 위치·취소의 제품 호출 | 해당 C06 구간 0회 |
| CAS 외부 주입 후 제품 호출 | 해당 C07 구간 0회. fault fixture의 의도된 외부 주입은 별도 |

새 브라우저 컨텍스트에 public pure materializer와 기존 decoder로 검증한 fixture를 넣었다. seed와 운영 sentinel 설정은 측정 전에 native API로 한 테스트 준비이며, 제품 호출 310회에 섞지 않았다. sentinel은 `flow:k2c-react:operating-sentinel`, 원문은 공백·CRLF·이모지를 포함한다. 모든 non-PoC 키·문자열을 정렬해 전후 exact 비교한다. 운영 사용자의 실제 브라우저 저장소를 열어 검사했다는 뜻은 아니다.

fault는 exact `flow:poc:personal-workspace:v1:state`에만 적용한다. readback 실패에는 candidate 쓰기와 rollback이 있을 수 있으므로 저장 오류 전체를 `setItem 0`이라고 보고하지 않는다. snapshot domain 복원 검사는 revision/updatedAt의 기존 변경 규칙을 분리하며, 운영 key/value 비교는 그 예외 없이 정확히 같다.

## 8. 인계와 제외 상태

완료한 것은 React scoped E2E 파일·별도 source-time RED·최종 캡처 직접 평가·이 QA 문서와 네이티브 위치 진단/A/B다. 현재 제품 gap은 근거를 확보한 네이티브 드래그의 제품 수정·재검증, K3-B 원문 시간 투영, 후속 공통 정보량/패널 사용성 검토로 나눠 둔다. 새로운 영구 제품 정책이나 운영 schema 결정을 추가하지 않았다.

`npm test`와 production build는 root가 별도로 실행·집계하며 이 문서의 브라우저 18개에 더하지 않는다. 이 파일 최초 추가 후 `npm.cmd run docs:check`는 필수 문서 16개·로컬 링크 5,077개를 통과했다. 후속 진단/A/B 기록 추가 뒤 다시 실행한 검사는 skill sync 및 16개·5,099개를 통과했으며, 이 문서의 로컬 링크 33개도 누락 0개였다.

| 구분 | 상태 |
| --- | --- |
| 실제 Android Chrome | NOT_RUN |
| 실제 iOS Safari | NOT_RUN |
| 실제 터치·하드웨어 native drag·실제 스크린리더 | NOT_RUN. 합성 pointer/CDP/DOM 검사는 별도 |
| 관찰 사용자 수 | 0명 |
| commit | 진행하지 않음 |
| push | 진행하지 않음 |
| PR | 진행하지 않음 |
| Preview | 배포하지 않음 |
| Production | 배포하지 않음. 로컬 production build 검사와 구분 |
