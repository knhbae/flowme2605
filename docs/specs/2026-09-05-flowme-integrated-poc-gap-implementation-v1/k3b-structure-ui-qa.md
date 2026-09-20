# B2 구간·전체 Plan 순서 — standalone 브라우저 QA

2026-09-06. **신규 12개가 최종 후보에서 모두 통과했다.** 23개 격리 context, mutation API 66회, 허용 key 밖 호출·clear·운영/legacy/source bytes 불일치·console/page error는 모두 0이다. 첫 기능 통과 뒤 캡처에서 발견한 `수정` 버튼의 세로 감김도 main이 좁게 보완했고, 5 viewport에서 한 줄 표시와 전체 영역·9점 hit를 재검증했다. 이 결과는 아래 standalone B2 범위이며 전체 제품·실기기·관찰 사용자 검증 완료가 아니다.

## 검사 범위

[읽기·UI 연결 설계](./k3b-structure-reader-ui-design.md)에 따른 신규 `tests/e2e/personal-workspace-k3b-structure-ui.spec.ts` 12개다. 실제 Chrome, 독립 localStorage context, actual M 작성 handoff·C checkpoint·E2 v4 recovery fixture를 쓴다. `build-single-file.cjs.buildText()`를 메모리에서 읽어 HTTP 응답으로 제공하며 `build()`나 사용자 HTML 재생성은 실행하지 않는다.

구간 이름은 실제 sectionId 소유가 발급된 대상만 편집한다. full Item ref의 전체 Plan 순열은 원본 Step 소속과 raw 배열을 변경하지 않는다. Flow 상세의 기존 실행 목록은 v4.1의 구간별 실행 순서를 유지하면서 구간 이름만 반영한다. 같은 상세의 결과 panel과 Plan 편집 목록은 개인 전체 순서를 표시한다. Calendar는 시간·명시 수동 순서 우선순위를 별도로 검사한다.

| ID | 등록한 실제 시나리오 | 현재 판정 |
| --- | --- | --- |
| B2UI01 | 명시 두 구간 별칭·구간 간 순서·Item 메모 staged 0쓰기→저장 4API→reload→Undo·다른 사본/raw 보존 | PASS |
| B2UI02 | 네 saved origin의 구간 readonly·개인 전체 순서 저장, origin별 독립 context | PASS |
| B2UI03 | 빈/공백 이름 invalid 입력 유지, 첫/끝 disabled, 원래 순서 reset와 semantic no-op 0쓰기 | PASS |
| B2UI04 | 키보드 순서·같은 full-ref 초점, 구간 mode에서 Escape/계속 초점, 자식/부모 dirty Cancel | PASS |
| B2UI05 | target quota 후 exact rollback·입력/순서 유지·명시 retry 한 번 저장 | PASS |
| B2UI06 | source bytes drift와 관측 StorageEvent ABA의 입력 유지·제품 쓰기 0 | PASS |
| B2UI07 | actual v4 prepared journal의 before 복구·구간/순서 초안 재개·명시 저장 | PASS |
| B2UI08 | actual v4 confirmed cleanup: journal만 제거, 저장 후보 보존·새 성공 카운트 0 | PASS |
| B2UI09 | source B 기준에서 명시 A 별칭 유지·reload·inherit로만 해제 | PASS |
| B2UI10 | 5 viewport의 긴 동명 구간·긴 항목·줄바꿈·invalid·순서/reset/저장/취소 full rect와 9점 hit, 수정 한 줄 | PASS |
| B2UI11 | 빈 선행 구간과 implicit/explicit 혼합에서 실제 step-2 소유, readonly owner 창작 0 | PASS |
| B2UI12 | TXT/Todo/Sheet 전체 순서와 Calendar 동시간·다른 시간·명시 수동순서, WorkingSource exact bytes | PASS |

12개에 포함된 네 origin, 5 viewport, 두 drift 및 다른 fixture 반복을 독립 시나리오 수로 더하지 않는다. 일반 저장·Undo에 허용하는 실제 key는 workspace-v2와 plan-item-recovery:v2 두 개뿐이다. 성공 Plan 저장은 target set 1회 + journal set 2회/remove 1회인 4API로 검사한다. 실패 호출 수, 성공 상태 변경 수, journal housekeeping은 구분한다.

## 수정 전 재현

정확한 기존 사용자 HTML을 읽었다. SHA256 `FB17FDA35E1141C50359BEE3CC5B85A39DC89F9C0C10809570ADB70B757D8BE3`. 새 모듈을 주입하거나 그 HTML bytes를 변경하지 않았다.

2026-09-06 KST 실행: B2UI01 **0 PASS / 1 FAIL**, skipped/flaky 0, 8,282.976ms. Plan은 정상 열렸지만 `data-editor-draft-contract`가 `flowme-standalone-source-bound-personal-plan-draft-v1`이었다. 신규 `v2` 기대와 불일치해 새 구간·순서 UI 연결이 없음을 재현했다. 이 단계 뒤의 저장 여정은 해당 RED 실행에서 도달하지 않았다.

JSON (로컬 전용 근거: `../../../output/playwright/k3b-structure-baseline-20260906-01.json`) · 실행 로그 (로컬 전용 근거: `../../../output/playwright/k3b-structure-baseline-20260906-01.log`) · 실패 화면 (로컬 전용 근거: `../../../output/playwright/k3b-structure-baseline-20260906-01/personal-workspace-k3b-str-bd132-s-then-save-reload-and-Undo/test-failed-1.png`) · trace (로컬 전용 근거: `../../../output/playwright/k3b-structure-baseline-20260906-01/personal-workspace-k3b-str-bd132-s-then-save-reload-and-Undo/trace.zip`).

이 RED의 격리 context에서는 제품 mutation API 0, 허용 key 밖 호출 0, console/page error 0이었다. 운영 sentinel·legacy·source bytes가 같았다. `--list` 결과와 아래 실제 실행 결과를 별도로 기록한다.

## 실행 이력 — 반복을 고유 테스트로 합산하지 않음

| 순서 | 실제 결과 | 근거 |
| --- | --- | --- |
| B1 정확 HTML에서 신규 positive | 0 PASS / 1 FAIL | 위 FB17 RED. 신규 v2 UI에 도달하지 않음 |
| B2 첫 전체 | 11 PASS / 1 FAIL | JSON (로컬 전용 근거: `../../../output/playwright/k3b-structure-initial-20260906-01.json`). B2UI10의 이동 직후 reset 측정 위치가 y=-128.75 |
| 동일 제품의 geometry 집중 재실행 | 1 PASS / 0 FAIL | JSON (로컬 전용 근거: `../../../output/playwright/k3b-structure-geometry-settled-20260906-01.json`). 기존 초점 복원 완료 뒤 strict 검사 |
| 동일 제품의 전체 재실행 | 12 PASS / 0 FAIL | JSON (로컬 전용 근거: `../../../output/playwright/k3b-structure-final-20260906-01.json`). 34,037.289ms. 기능 통과 후 시각검토에서 버튼 세로 감김 발견 |
| 좁은 CSS 보완 후 강화 전체 최종 | **12 PASS / 0 FAIL** | JSON (로컬 전용 근거: `../../../output/playwright/k3b-structure-visual-final-20260906-01.json`) · 로그 (로컬 전용 근거: `../../../output/playwright/k3b-structure-visual-final-20260906-01.log`). 34,864.873ms |

총 5번의 runner 실행에서 등록 테스트 실행 시도는 38회(1+12+1+12+12)이며, **고유 테스트는 12개**다. focused 1개나 마지막 두 번의 12 PASS를 추가 고유 시나리오로 더하지 않았다. 최종 expected 12/unexpected 0/skipped 0/flaky 0. 기존 다른 단계의 회귀와 전체 npm/build는 담당 main/별도 보고서의 결과이며 여기 실행 수에 포함하지 않는다.

첫 B2UI10 실패는 `focusAfterRender`의 setTimeout → visibility frame이 테스트의 별도 reachability scroll과 겹친 하니스 경합이었다. 같은 ref 버튼이 실제 초점을 받은 뒤 두 rAF를 기다리도록 테스트를 고쳤다. 제품은 이 정정에서 바꾸지 않았고 full rect·ancestor clipping·9점 hit를 낮추지 않았다. 이후 최종에는 수정 버튼의 실제 text Range 1줄과 가로/세로 44px 이상도 추가했다.

## 저장 경계와 실제 수

최종 JSON의 `b2-ui-boundary*` attachment 23개를 각각 decode해 집계했다.

| 값 | 최종 결과 |
| --- | --- |
| 격리 browser context | 23 |
| mutation API 호출 | 66 = target 17 + journal 49 |
| 허용 key 밖 set/remove 및 clear | 0 / 0 |
| 운영 sentinel/legacy/source bytes 불일치 | 모두 0 |
| console error/page error | 모두 0 |
| 제품 writes 0 확인 경로 | child staged, invalid, no-op/reset 원복, dirty Cancel/Escape, source drift/ABA |

target 17회에는 실패한 quota set 호출과 prepared 복구의 before 복원도 포함된다. 17회를 성공 저장 17건으로 해석하지 않는다. confirmed cleanup은 journal 제거만 한 번이며 target 재저장과 새 성공 카운트는 0이다. 실패 저장 후 입력과 이전 target bytes를 보존하고 사용자의 명시 retry에서만 성공 revision을 한 번 올린 것을 검사했다.

감시 전에 fixture seed를 넣었고, v4 prepared/confirmed는 actual E2 저장/실패 경로로 만든 유효 기록이다. 미리 만든 fixture의 Node 내부 DB 호출은 브라우저 API 66회에 포함하지 않았다. source drift/ABA는 원래 Storage method를 이용한 테스트 외부 변경으로 따로 표시했고, 그 이후의 source bytes와 제품 호출 0을 비교했다.

## 화면 평가

최종 15 PNG 중 순서 화면 5개와 로컬 오류 field 5개를 직접 열어 확인했다. 상단 오류 5개는 앞선 직접 검토 화면과 SHA256까지 동일함을 확인했다. 모든 캡처는 fullPage가 아닌 실제 viewport 크기이며, 캡처 전후 storage bytes/API 수/editor state가 같다는 assertion을 통과했다.

| 화면 | 직접 확인 | 증거 |
| --- | --- | --- |
| 390×844 | 긴 이름 줄바꿈, 수정 한 줄, mode·빈 입력·구간 오류가 같은 화면에 표시 | 순서 (로컬 전용 근거: `../../../output/playwright/k3b-structure-visual-final-20260906-01/personal-workspace-k3b-str-bf72e-ly-reachable-at-nine-points/structure-390x844.png`), 오류 (로컬 전용 근거: `../../../output/playwright/k3b-structure-visual-final-20260906-01/personal-workspace-k3b-str-bf72e-ly-reachable-at-nine-points/structure-invalid-field-390x844.png`) |
| 375×812 | 수정 한 줄 보완, 긴 구간 원문과 local error의 가로 잘림 없음 | 순서 (로컬 전용 근거: `../../../output/playwright/k3b-structure-visual-final-20260906-01/personal-workspace-k3b-str-bf72e-ly-reachable-at-nine-points/structure-375x812.png`), 오류 (로컬 전용 근거: `../../../output/playwright/k3b-structure-visual-final-20260906-01/personal-workspace-k3b-str-bf72e-ly-reachable-at-nine-points/structure-invalid-field-375x812.png`) |
| 844×390 | 짧은 높이에서 문서 스크롤로 동작에 도달, local input/error를 같은 scroll에서 전체 표시 | 순서 (로컬 전용 근거: `../../../output/playwright/k3b-structure-visual-final-20260906-01/personal-workspace-k3b-str-bf72e-ly-reachable-at-nine-points/structure-844x390.png`), 오류 (로컬 전용 근거: `../../../output/playwright/k3b-structure-visual-final-20260906-01/personal-workspace-k3b-str-bf72e-ly-reachable-at-nine-points/structure-invalid-field-844x390.png`) |
| 1024×768 | sidebar와 본문 유지, 수정 버튼 한 줄, 이름 mode/error가 본문 폭 안에 표시 | 순서 (로컬 전용 근거: `../../../output/playwright/k3b-structure-visual-final-20260906-01/personal-workspace-k3b-str-bf72e-ly-reachable-at-nine-points/structure-1024x768.png`), 오류 (로컬 전용 근거: `../../../output/playwright/k3b-structure-visual-final-20260906-01/personal-workspace-k3b-str-bf72e-ly-reachable-at-nine-points/structure-invalid-field-1024x768.png`) |
| 1440×900 | 넓은 본문에서도 수정 한 줄 보완, long token/오류 field 줄바꿈과 배치 확인 | 순서 (로컬 전용 근거: `../../../output/playwright/k3b-structure-visual-final-20260906-01/personal-workspace-k3b-str-bf72e-ly-reachable-at-nine-points/structure-1440x900.png`), 오류 (로컬 전용 근거: `../../../output/playwright/k3b-structure-visual-final-20260906-01/personal-workspace-k3b-str-bf72e-ly-reachable-at-nine-points/structure-invalid-field-1440x900.png`) |

전체 문서와 Plan 카드/요약/구간 control의 내부 가로 overflow 0, 검사한 핵심 control의 full rect 및 9/9 hit를 확인했다. 각 버튼에 문서 스크롤로 도달하는 검사이며 **모든 버튼이 한 장에 동시에 보인다는 주장은 아니다.** local error와 해당 입력만은 마지막 강화에서 같은 scroll 위치에서 함께 검사했다.

시각검토가 추가한 실제 수정은 `.plan-item-summary > .button`의 flex 축소 방지와 nowrap이다(main 소유). 수정 전 1440 화면 (로컬 전용 근거: `../../../output/playwright/k3b-structure-final-20260906-01/personal-workspace-k3b-str-bf72e-ly-reachable-at-nine-points/structure-1440x900.png`)에서 `수/정`으로 감기던 것을 위 최종과 대조할 수 있다. 긴 구간 이름이 원본 label/baseline/각 행에 반복되어 화면이 길어지는 정보 밀도는 남는다. 이번 제한된 반응형/행동 검사가 전반적인 시인성·사용성 완성 판정은 아니다.

## 실행 후보와 파일 소유

- 최종 메모리 HTML: SHA256 `889B88F811039413B15347359B5490D5D5D66CEFABC3B4B1DA91E4B516733098`, 1,428,663 UTF-8 bytes. 사용자 disk HTML 생성은 이 테스트에서 하지 않았다.
- app: `6EABC405CA394FC7E03052DE9EDBCAF14C8144CD838B2B3EBF2FC91A6623346B`.
- style: `3FA5482D68354B3D5EC8ACEC44C41BC9EA0A88985606CDFCE8E963C57072DFA8`.
- M: `C21EDA9A5690214CC0C8202FE4915A6DF7091E76A53EBA1DF63A5C5303DF4D36`.
- P: `AA3D3EA124BC9C7C752D5FF82A359D075F3C1CEEABC933571C11953C0E3493F4`.
- C: `AD18C6D8A776BF49923D6489238ADA78E067A29BD427DC9B53F19DE097D67314`.
- E2: `C803AA77EE7B9EF1CA778ABF997F3A27B9C815C31BF906BF7AFE20E404E145C2`.
- S: `387B90EBC23EBCF9C8EA7816D64F1DD2889214F08B4962732A645E1E7A765CE9`.
- PD: `1EF9E1D95BD75E9174706D91E77028981E03DD7D3CC70F196F977A3211AE73D0`.

위 8개와 T/rank/presenter를 포함한 11개 source hash를 최종 실행 시작과 종료에 대조해 모두 같음을 확인했다. 상세 hash는 최종 JSON의 각 boundary에 있다. 테스트 담당이 쓴 파일은 신규 spec과 이 QA뿐이며, 제품/CSS 수정은 main이 담당했다. 기존 B1 테스트 파일을 고치지 않았다.

## 증거의 한계

- 실제 사용자의 운영 프로필을 검사한 것이 아니다. 테스트가 독립 context에 주입한 운영 sentinel의 전후 bytes와 hash를 비교한다. 테스트의 외부 source drift 주입은 제품 쓰기와 별도다.
- viewport는 390×844, 375×812, 844×390, 1024×768, 1440×900의 자동화 설정이다. 실제 Android Chrome/iOS Safari, OS IME, 보조기술 검사는 NOT_RUN이다.
- B2UI09는 A→B 후 명시 A·inherit를 검사한다. 그 뒤 source가 다시 A가 되는 추가 버전 여정은 기존 순수 모델 검증과 별도이며 이 등록 시나리오의 브라우저 증거가 아니다.
- source-order/membership 확대, 새 구간 생성/삭제, drag 추가, 운영 writer/schema, 배포는 이번 범위가 아니다.
- 관찰 사용자 수 0. commit, push, PR, Preview, Production 모두 이 작업에서 진행하지 않았다.

HTML의 실제 file URL 조작과 기존 54개 회귀, 전체 npm/build/host 검사는 main 및 별도 담당의 후속 증거다. 이 12개 HTTP route-fulfill 검사로 그것까지 실행한 것으로 표현하지 않는다.
