# K1-A QA — 원문 도움의 대상·저장 실패

상태: `K1A_SCOPED_VERIFIED`. 작성일: 2026-09-05. standalone 검토 pane 시각 결함을 수정한 최신 후보에서 새 K1-A 브라우저 38/38, standalone 106/106, host 회귀 8/8 PASS를 확인했고 storage attachment 38개를 직접 집계했다. root는 수정 후 standalone 다섯 화면에서 같은 스크롤 안의 대상·실패 안내·입력·재시도를 확인했다. 기존 선정 회귀 21/21, focused 102/102, 전체 npm 2,236/2,236과 production build PASS는 아래 버전 시점으로 구분한다. 과거 실패 실행을 덮어쓰지 않으며 세 산출물 전체 완료를 의미하지 않는다.

최신 standalone 후보: `944305` bytes, SHA-256 `C0262526ECE4668E3E5A5212E52D8CD0FF5721723CE3C98EA9D264E43008C673`. 최신 browser는 K1-A React production build와 이 시각 수정 standalone을 검사했다. 당시 작업 중인 K2 변경은 새 React build에 포함되지 않았으며 K2 검증 결과로 읽지 않는다. 전체 npm 2,236은 React 844×390 수정 뒤, standalone 검토 pane CSS·inline 실패 안내 최종 수정 전의 실행이다. 이후 전체 npm/build는 다음 묶음에서 새 버전으로 다시 기록한다.

기준은 [K1-A 구현 계약](./k1a-design.md), [P3-K 단계별 계획 §3](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md#3-k1-a--원문-도움의-정확한-대상과-실패-복구), [개선 설계](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md), [개발2 원본 대조 원장](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.json)이다. 과거 원장의 판정을 변경하지 않는다.

## 1. 원본 요구와 이번 판정 범위

직접 읽은 원본은 키보드·정보 tray 신뢰성 계약 (로컬 전용 근거: `D:/flowme2605/flow-text-authoring-flow-view-hybrid-ux-poc-20260828/docs/specs/2026-08-29-flowme-text-authoring-keyboard-property-tray-reliability-poc/spec.md`), 속성 재진입 결과 (로컬 전용 근거: `D:/flowme2605/flow-text-authoring-flow-view-hybrid-ux-poc-20260828/docs/content-audit/2026-08-29-flowme-text-authoring-property-reentry-simplicity-poc-results/README.md`), [Text Authoring 상태·복구 계약](../2026-07-28-flowme-text-authoring-ux-v1/state-model.md)이다. 대화 결정 연결은 기존 D2 감사 원장의 `D2-conversation-038/039/040`, `D2-conversation-003` 참조를 계승한다. 이번 QA 초안 작업에서 해당 대화 전체를 다시 읽은 것은 아니다.

| 요구 ID | 원본 요건 / 역사 하위 판정 | K1-A에서 구현·검사하는 부분 | 현재 판정과 남은 경계 |
| --- | --- | --- | --- |
| D2-040.1 | IME composing Enter write 0 / 미충족 | 양쪽 열린 속성 form의 합성 compositionstart/end·composing Enter 차단, 뒤이은 정상 Enter 1회 | 최종 양쪽 합성 시나리오 PASS. 자동 브라우저 근거를 보강했으며 실제 OS 한글 IME는 NOT_RUN. 실기 충족으로 승격하지 않음 |
| D2-040.3 | parser busy·stale Item 오적용 0 / 부분 | open 시 정확 원문·fingerprint·epoch·문서·editor·draft bytes 고정. 앞줄 삽입·동명·대상 삭제·ABA·문서 교체 후 차단, 입력값 보존과 명시 재선택 | 최종 양쪽 stale 4종·재선택·동일 원문의 새 문서 PASS. 원본 비동기 parser busy·submenu 전체 경로는 이번 구현 범위가 아니므로 하위 요구 전체 충족을 선언하지 않음 |
| D2-040.4 | 빠른 이중 적용 중복 0 / 충족 | 적용 잠금·같은 값 no-op, 빠른 submit 반복에서 native 삽입·draft 반영 1회 | 최종 양쪽 PASS. 기존 충족 기록을 보존하는 회귀이며 새 갭 해결 수로 세지 않음 |
| D2-040.5 | 취소 write 0 / 충족 | 취소·Escape·같은 값에서 helper source/native/storage 추가 변경 0 | 최종 양쪽 PASS. 기존 충족 요구의 근거 보강 |
| D2-039 | 빈 속성은 prefix 뒤 caret, 기존 속성은 실제 값만 선택, 다른 Item 값 혼합 0 / 부모 충족 | 정확 owner ticket·대상 제목·원문 값 선택 경로 보호. 기존 문맥 도움·검토·focus 회귀 | 새 전체 38개는 속성 재진입 15종의 모든 선택 범위를 전수 재검사한 suite가 아님. 기존 21개 회귀와 source locator 단위 근거만 연결하며 원본 tray UI 전체 동일성을 주장하지 않음 |
| D2-058 | 취소·stale·invalid·저장 실패의 원자성, Undo 1회, recovery와 durable 분리 / 부모 및 기존 하위 충족 | 발견된 helper draft 실패만 수정. durable 저장/readback 후 native 적용; 실패 시 exact-before rollback/readback; 복구 불확실 시 추가 적용 차단. 입력값·실패 전 Undo·reload 검증 | 최종 양쪽 저장 오류 6종·native 거절·정상 Undo/Redo/reload PASS. 전체 canonical handoff·export·receipt를 이번 helper 검사로 재승격하지 않음 |

`D2-040.2` submenu focus, 네 그룹/한 editor 표현·틀 UX 등은 K3-A에 남는다. K2-A handoff 완료 초기값, 미저장 편집 닫기, 기간 순서·이동 Undo도 이번 완료 수에 포함하지 않는다. D2 부모 충족 수나 세 산출물 전체 커버율은 이 문서에서 새로 계산하지 않는다.

| finding | 수정 전 확인 | 이번 처리 / 종료 조건 |
| --- | --- | --- |
| P3K-D2-01 · P0 | React에서 열린 속성의 owner가 줄 삽입 후 다른 Item으로 바뀜. standalone은 stale 안내·입력값 재선택 경로가 없음 | opening ticket을 고정하고 추정 재지정 금지. 최종 양쪽 stale·새 문서·명시 재선택 PASS. 검사한 helper 경로의 결함 해결로 판정 |
| P3K-D2-03 · P1 | 양쪽 helper에서 QuotaError 뒤 화면 원문만 바뀌고 durable draft는 그대로이며 일반 반영 안내가 실패 안내를 덮음 | helper 전용 persist-first와 verified rollback, 동일 입력 재시도, recovery 잠금. 최종 오류·native 거절·Undo/reload·실패 CTA 자동 접근 PASS. 최종 시각 평가는 별도 |
| P3K-D2-04 · P1 | standalone 열린 form의 조합 Enter guard·직접 자동 근거 부족 | 최종 합성 browser에서 조합 Enter는 적용 0, 정상 Enter는 정확히 1회 PASS. 실제 IME NOT_RUN을 분리하며 실제 기기 대기를 목표에 다시 넣지 않음 |

## 2. 수정 전 재현과 수정 후 비교

| 증거 | 실제 관찰 | 해석 |
| --- | --- | --- |
| before-stale.json (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/before-stale.json`), 캡처 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/before-stale.png`) | 구 React production build에서 첫 Item 앞에 새 Item을 넣은 뒤 장소를 적용하면 새 Item에 `회의실 A`가 붙음 | K-X1 실제 오적용 직접 증거 |
| before-draft-failure.json (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/before-draft-failure.json`), 캡처 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/before-draft-failure.png`) | 구 React 화면 원문에 `장소: 보관 실패 값`이 추가됐지만 durableBefore/After는 동일 | K-X3 source/durable 불일치. 직접적인 ‘저장 성공’ 문구가 있었다고 확대하지 않음 |
| 구 후보 E2E 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/before-e2e-2026-09-05T03-41-20-732Z.log`) | 선택 4개 모두 FAIL. 양쪽 quota는 원문 불변 assertion 실패. standalone stale는 안내 부재. React stale는 helper-anchor timeout | 실패 4개를 제품 결함 4개로 세지 않는다. React 오적용은 별도 before-stale.json으로 입증 |
| 수정 후 smoke 1 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/after-smoke-2026-09-05T03-49-08-356Z.log`) → smoke 2 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/after-smoke-two-2026-09-05T03-51-49-223Z.log`) | 6개 실행 4 PASS/2 FAIL 뒤 같은 범위 재실행 6 PASS | smoke는 전체 suite의 부분 재실행이며 독립 테스트 수에 더하지 않음 |
| 첫 전체 브라우저 원장 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/browser-full-2026-09-05T03-54-14-862Z.json`) | 38개 중 34 PASS / 4 FAIL | 최초 실패 기록을 보존. 아래 분류·수정 후 최종 재실행으로 검증 |
| 최종 전체 브라우저 원장 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/browser-final-2026-09-05T04-00-18-380Z.json`) | 같은 suite 38/38 PASS | 정상·오류·stale·IME·다섯 화면 loop 모두 완료. 재실행 38개를 고유 테스트 수에 다시 더하지 않음 |

첫 전체 브라우저 실패 4개는 다음처럼 분류했다. 분류는 root의 코드·실패 캡처 진단과 실행 로그를 함께 근거로 하며, 원래 FAIL 로그를 보존한다.

| 실패 | 분류 | 반영한 조치 / 현재 상태 |
| --- | --- | --- |
| React 동일 원문 새 문서 | 하니스: document identity를 잘못된 요소에서 읽음 | 올바른 owner dataset으로 수정, 최종 PASS |
| React native 명령 거절 | 하니스: source 확인 후 durable rollback의 비동기 정착 전 즉시 비교 | 확정 상태/bytes를 기다려 검증하도록 보강, 최종 PASS |
| React 844×390 실패 후 retry | 제품: 재시도 CTA의 visible center가 다른 레이어에 가려짐 | root가 helper 내부 스크롤·CTA 노출을 수정하고 회귀 추가. build·focused·npm과 최종 브라우저 PASS. 직접 시각 평가 별도 |
| standalone 1024×768 | 하니스: desktop에서 숨겨진 mobile 결과 탭을 click | 보이는 경로만 사용하는 showReview로 수정, 최종 PASS |

## 3. 자동 테스트·build 실행 원장

아래는 실행별 수다. 같은 테스트의 smoke·focused·전체 npm 반복 실행 수를 합산하여 고유 테스트 수나 충족 요구 수로 보고하지 않는다. `run-check.cjs`의 Node test counters와 Playwright summary가 다른 형식이므로 browser JSON의 counters=0은 브라우저 0개 실행이라는 뜻이 아니다.

| 실행 | 실제 결과 | 판정 용도 / 증거 |
| --- | --- | --- |
| 초기 저장 focused | 30/30 PASS | 구현 중 저장 회귀. storage JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/storage-2026-09-05T03-41-08-174Z.json`) |
| 초기 관련 focused | 100/100 PASS | 후속 102개 실행과 겹침. focused JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/focused-2026-09-05T03-46-26-391Z.json`) |
| standalone 모델·산출물 검사 | 106/106 PASS | 초기 실행. standalone JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/standalone-2026-09-05T03-46-48-269Z.json`) |
| standalone 마지막 IME 수정·재생성 뒤 | 같은 106/106 PASS | standalone-final JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/standalone-final-2026-09-05T04-01-23-373Z.json`). 후속 검토 pane 시각 수정 이후 증거와는 구분 |
| 첫 npm test | 실행된 942개: 933 PASS / 9 FAIL | Android 현재 후보 pin이 구 927,767 bytes여서 중단. 전체 suite 실행 완료로 세지 않음. 실패 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/npm-test-2026-09-05T03-47-03-784Z.json`) |
| pin 갱신 뒤 npm test | 2,235/2,235 PASS, 15그룹 | viewport 결함 수정 전 성공 기록. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/npm-test-final-2026-09-05T03-52-49-060Z.json`) |
| viewport 수정 뒤 focused | 102/102 PASS | 현재 관련 모델·저장·surface·editor 5파일. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/focused-final-2026-09-05T03-59-04-311Z.json`) |
| viewport 수정 뒤 npm test | 2,236/2,236 PASS, 15그룹 | 초안 작성 중 최종 실행 완료를 직접 확인. 앞 2,235에 새 회귀 1개가 추가된 실행이며 두 수를 더하지 않음. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/npm-test-viewport-fixed-2026-09-05T03-58-54-259Z.json`) |
| production build | 3회 각각 exit 0 | build/build-final/build-viewport-fixed. 가장 최근 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/build-viewport-fixed-2026-09-05T03-58-44-032Z.json`), 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/build-viewport-fixed-2026-09-05T03-58-44-032Z.log`). build 횟수는 테스트 수에 더하지 않음 |
| 기존 브라우저 회귀 | 21/21 PASS | stage-2·P3-C React/standalone 중 `지정 화면과 200%`, `검증 예시 전체 원문` 제외 선정. 전체 기존 E2E를 실행했다고 표현하지 않음. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/regression-2026-09-05T03-54-25-129Z.json`) |
| 새 K1-A 전체 브라우저 첫 실행 | 38개: 34 PASS / 4 FAIL | 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/browser-full-2026-09-05T03-54-14-862Z.log`). 아래 재실행과 구분 |
| 새 K1-A 기능 브라우저 재실행 | 같은 38/38 PASS | JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/browser-final-2026-09-05T04-00-18-380Z.json`). 당시 자동 기준 기능 PASS, 이후 발견한 standalone 시각 결함까지 해결됐다는 뜻이 아님 |
| 현재 후보 host browser 첫 실행 | 8개 FAIL | JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/host-regression-2026-09-05T04-00-28-634Z.json`). 화면 표시 bytes 기대값 `927,767` 한 곳이 하드코딩되어 공통 진입 assertion 실패. 제품 결함 8개로 세지 않음 |
| 현재 후보 host browser 재실행 | 같은 8/8 PASS | JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/host-regression-final-2026-09-05T04-05-40-407Z.json`). 현재 상수의 locale 표시를 기대하도록 고쳐 재검증. 실제 기기 검사 아님 |
| K1-A 첨부 보존용 재실행 | 같은 38/38 PASS, skipped/unexpected/flaky 0 | browser-evidence.json (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/browser-evidence.json`), 04:06:58 UTC 시작. `line,json` reporter로 storage body를 보존. 고유 테스트 수 추가 0 |
| standalone 시각 수정 뒤 기능·화면 재실행 | 같은 38/38 PASS | 실행 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/browser-visual-final-2026-09-05T04-10-12-833Z.json`), 첨부 포함 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/browser-visual-final.json`). 04:10:13 UTC 시작, skipped/unexpected/flaky 0. 가장 최근 K1-A browser 근거 |
| standalone 시각 수정 뒤 모델·산출물 | 같은 106/106 PASS | JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/standalone-visual-final-2026-09-05T04-10-47-612Z.json`). 최신 생성본 기준 |
| standalone 시각 수정 뒤 host | 같은 8/8 PASS | JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/host-visual-final-2026-09-05T04-11-31-774Z.json`). 최신 bytes/SHA pin의 자동 host 회귀 |

전체 npm 2,236개와 별도 focused 102개는 겹치므로 합산하지 않는다. 신규 K1-A 38개·기존 선정 21개·host 8개는 서로 다른 browser test 파일의 고유 67개이며 각 선정 실행은 PASS다. 이 67개를 같은 한 실행으로 표현하지 않는다. 최신 standalone 시각 수정 뒤 재실행한 것은 38개와 host 8개이고, 기존 선정 21개는 그 수정 전 실행이다. 38개 중 다섯 viewport loop는 runtime당 test 1개씩이며 반복한 화면 10개를 추가 테스트 10개로 세지 않는다. 원본 요구 하위 항목 수·finding 수·테스트 실행 수는 서로 다른 단위다.

### Android 현재 후보 pin

P3-J [현재 후보 갱신 계약](../2026-09-05-flowme-integrated-poc-execution-detail-gap-v1/handoff.md)에 따라 host·validator·runner·회귀의 현재 bytes/SHA 5곳을 맞춘다. SHA 불일치 fail-closed 검사를 약하게 만들지 않는다. 과거 Android NOT_RUN·manifest·P3-G/P3-I 당시 pin·released history는 그대로 둔다. 새 HTML이나 host 자동 테스트는 실제 Android 실행 증거를 승계하지 않는다.

## 4. 화면별 평가 — 자동 PASS와 직접 확인한 결함

첫 전체 loop가 실제 도달한 범위를 보존하고, 재실행 결과를 마지막 열에 추가한다. 자동 PASS는 action visible-center hit와 문서 가로 overflow 0을 뜻한다. 긴 대상 제목과 입력값이 시각적으로 함께 읽히는지까지 보장하지 못했다.

| viewport | React 첫 전체 실행 | standalone 첫 전체 실행 | 기능 브라우저 재실행 |
| --- | --- | --- | --- |
| 390×844 | 정상/실패/재시도 iteration 완료 | 정상/실패/재시도 iteration 완료 | 양쪽 자동 PASS |
| 375×812 | iteration 완료 | iteration 완료 | 양쪽 자동 PASS |
| 844×390 | retry CTA 가림 실제 FAIL | iteration 완료 | root의 React 수정 후 양쪽 자동 PASS |
| 1024×768 | 앞 iteration 실패로 미도달 | 숨겨진 mobile 탭 하니스 timeout, 해당 iteration 미완료 | 하니스 수정 후 양쪽 자동 PASS |
| 1440×900 | 미도달 | 앞 iteration 실패로 미도달 | 양쪽 자동 PASS |

관련 첫 실패 캡처는 `output/playwright/k1a-browser-full/`, 재실행 캡처 10개는 `output/playwright/k1a-browser-final/`에 있다. 현재 390 실패 상태 캡처 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/react-failure-current-390x844.png`)는 중간 진단이다.

root의 재실행 캡처 직접 평가에서 standalone `항목 검토` pane가 약 30~120px로 눌려 대상 제목·입력값이 가려지고 재시도만 보이는 실제 결함을 확인했다. visible-center hit 자동 검사만으로 PASS 처리하지 않고, 검토 열림 상태를 단일 스크롤로 조정하고 지속적인 inline 실패 안내를 추가했다.

최신 `output/playwright/k1a-browser-visual-final/`의 10개 캡처와 38/38 재실행은 그 수정 이후 증거다. root는 standalone 390×844, 375×812, 844×390, 1024×768, 1440×900에서 같은 스크롤 안에 owner·오류·입력·retry가 표시되고 844×390에서도 전체 44px 버튼에 접근할 수 있음을 직접 확인했다. 상세 캡처 평가의 작성·관찰 주체는 root이며 이 QA 작성자가 이미지를 직접 재평가한 것으로 표현하지 않는다. 과다한 속성 catalog, 글자 크기·중첩 border 등 원본 Authoring UI 충실도는 K3-A의 남은 범위다.

## 5. 저장·운영 데이터 경계

새 E2E는 test마다 새 browser context를 만들고 운영 sentinel key 하나 `flow:k1a:operating-sentinel`에 공백·CRLF·한글·emoji가 포함된 값을 seed한다. seed는 제품 호출 감시를 시작하기 전에 이루어지며 reload에서는 기존 값을 다시 쓰지 않는다. 감시는 제품의 prefix 밖 setItem/removeItem/clear를 차단·기록하고, 종료 시 비-PoC key/value를 전후 비교한다.

따라서 이 결과는 **자동화 context의 sentinel 및 그 context에 있는 비-PoC 값 불변 증거**다. 실제 사용자의 브라우저 프로필, 사용자가 저장한 네 origin 실데이터 전체, 서버·운영 DB를 검사한 결과가 아니다. 오류 주입·fixture 쓰기와 제품 쓰기 호출은 분리한다.

실패 시 목표는 모든 storage API 호출 0이 아니라 성공 mutation 0과 검증 가능한 exact-before 복구다. QuotaError는 실패한 setItem 시도가 있을 수 있고 readback/native 실패는 candidate 저장 뒤 rollback 쓰기가 필요할 수 있다. stale/noop/cancel/composing Enter는 helper 추가 쓰기 0, prefix 밖 쓰기는 항상 0이어야 한다.

`browser-final` 38/38 실행은 각 test의 afterEach에서 sentinel parity·prefix 밖 호출·console/page error assertion을 통과했지만, `testInfo.attach({body})`와 `--reporter=line` 조합으로 성공 attachment가 디스크에 남지 않았다. 이를 보완한 `browser-evidence.json`도 보존한다. 아래 집계는 그보다 최신인 시각 수정 후 browser-visual-final.json (로컬 전용 근거: `../../../output/poc-gap-implementation/k1a/browser-visual-final.json`)의 `storage-boundary.json` base64 body 38개를 직접 해석한 결과다. 고유 검사 수 추가는 0이다.

| runtime | 읽은 attachment / test PASS | before·after key/UTF-8 bytes/SHA 동일 | prefix 밖 호출 | console/page error | 기록된 제품 storage 호출 |
| --- | --- | --- | --- | --- | --- |
| React | 19 / 19 | 19 / 19 | 0 | 0 | 73 |
| standalone | 19 / 19 | 19 / 19 | 0 | 0 | 240 |
| 합계 | 38 / 38 | 38 / 38 | 0 | 0 | 313 |

각 attachment의 비-PoC key는 sentinel 하나이며 UTF-8 44 bytes, SHA-256 `c3bf9459626ad21640a2cbfebafcc0e0aaff9888ccd0ae6c54ec40dd9c97a972`로 전후 동일했다. `byteParity` 자기 보고뿐 아니라 before/after 배열의 key·bytes·SHA도 38개 모두 직접 비교했다. 제품 storage 호출 313건은 setItem 312·removeItem 1·clear 0이며 모두 두 PoC authoring-draft key 안이다. 일반 입력, 성공 적용, 실패 시도, rollback, Undo/reload 경로가 포함되므로 성공 mutation 313건이라는 뜻이 아니다. 이 증거는 위 최신 K1-A React/standalone 후보의 자동 context 검사다.

## 6. 종료 경계와 다음 묶음

1. K1-A의 source owner·저장 실패·합성 IME·시각 결함 수정과 최신 38개 검증, storage 첨부 집계, standalone/host 회귀를 완료했다. root가 최종 보고서와 단계별 진행 원장에 연결한다.
2. 전체 npm 2,236 및 build는 명시한 이전 시점의 성공 기록이다. 다음 K2 묶음에서 변경된 모델·생성본·React build로 다시 실행하되 K1-A와 K2 실행 수를 혼합하지 않는다.
3. D2-040.1/.3/.4/.5, D2-039, D2-058과 finding별로 검사한 부분만 판정한다. parser busy/submenu·원본 editor UX·실기 검사를 검사하지 않은 채 전체 충족으로 올리지 않는다.
4. K3-A의 catalog·글자·중첩 border·원본 한 editor UX 등은 남아 있다. K2-A는 별도 handoff 완료 초기값 묶음으로 시작한다.
5. 이 QA 파일의 최종 docs:check·보고서 연결 검사는 root의 묶음 문서 마감에 포함하며, 여기서는 실행하지 않았다.

## 7. 미실행·발행 상태

| 항목 | 상태 |
| --- | --- |
| 실제 Android Chrome / iOS Safari | NOT_RUN |
| 실제 Samsung Keyboard·Gboard·OS 한글 IME | NOT_RUN. 합성 composition 이벤트와 분리 |
| TalkBack / VoiceOver / 실제 OS 글자 확대 | NOT_RUN |
| 관찰 사용자 | 0명 |
| commit | 안 함 |
| push | 안 함 |
| PR | 안 함 |
| Preview | 안 함 |
| Production | 안 함 |

K1-A는 세 산출물을 통합하는 전체 작업 중 원문 도움 안전성 한 묶음이다. 이 문서와 자동 테스트를 개발1·개발2·v4.1 전체 기능/UX 완료나 제품 출시 가능 판정으로 읽지 않는다.
