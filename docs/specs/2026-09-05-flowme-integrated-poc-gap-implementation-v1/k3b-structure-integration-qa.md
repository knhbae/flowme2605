# K3-B B2 — 개인 구간·전체 순서 통합 검증

2026-09-06 KST. 상태: **B2 제한 범위 구현·회귀 검증 및 사용자 HTML 반영 완료 / 전체 npm test 실패 1건 별도**. K3-B 전체 완료나 세 원본 전체 요구 재판정이 아니다. B3 변경 요약·영수증, K3-C, K4 설계는 남는다.

## 원본 요구와 이번 연결

| 정본·요구 | 기존 차이 | 이번 반영·판정 범위 |
|---|---|---|
| [개발1과 P2-C의 개인 편집 계약](./k3b-design.md), [B2 설계](./k3b-structure-reader-ui-design.md) | standalone의 개인 구간 별칭·전체 Plan 순서 편집 경로 없음 | stable 작성 구간의 capability를 검증한 뒤 별칭/원본 따르기 제공. 전체 full ref permutation으로 구간을 넘는 순서 조정. 읽기 전용 출처에 가짜 편집 권한을 만들지 않음. |
| v4.1 개인 실행과 폴더·기간 목록 | Plan 순서를 실행 정렬에 덮으면 기존 drag/메뉴/키보드 이동 결과가 사라질 위험 | 구간 소속·원문·실행 날짜를 보존. Flow 상세의 기존 실행 목록 정렬과 별도 Plan 결과 순서를 구분. 같은 시간의 기본 정렬에만 개인 Plan 순서 반영, 명시 수동 순서 우선. |
| 개발2 작성 원문·원문 업데이트와 개인 변경의 소유 분리 | 구간 id·제목만으로 capability를 추정하거나 원문 변경 뒤 잘못된 개인 구조를 표시할 위험 | 실제 작성 lineage·원문/개인 current 및 Undo pair 검증. source-owned/implicit/legacy는 구간 읽기 전용, unsupported source는 차단. 원문으로 개인 별칭/순서를 역저장하지 않음. |
| 개발1 Item → 부모 Plan → 최종 저장·복구 | 새 구조가 child/복구에서 사라지거나 표시 실패 후 복구 token을 먼저 소비할 위험 | 자식 반영은 0쓰기. 실제 E2 v4 journal·C 후보를 검증하고 표시 사전 검사가 통과한 뒤 한 번 재개. old v1/v2/v3 경로 보존. |

각 source의 세부 근거·제외 범위는 [K3-B 설계](./k3b-design.md)와 [독립 앱 검토](./k3b-structure-app-independent-design-review.md)에 연결했다. 개인 구간 이름 동등성은 실행 목록도 포함하지만, 실행 목록의 수동 정렬을 Plan 전체 순서로 대체한 것은 아니다.

## 실제 실행 기록

| 검사 | 결과 | 근거·한계 |
|---|---|---|
| 합동 모델·저장·실제 app VM | 38파일 **750/750**, skip/cancel/todo 0 | 실행 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-core-integration-2026-09-05T15-21-27-089Z.json`). 제품 12개 전후 동일. 후속 CSS 버튼 한 줄 보완은 순수 모델 변경 없음. 기존612와 각 중간 실행을 다시 더하지 않음. |
| 기존 시간 표시 6 | 최초 3 PASS / 3 FAIL → **6/6 PASS** | 최초 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-time-presenter-before-2026-09-05T15-28-12-147Z.json`), 보완 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-time-presenter-corrected-2026-09-05T15-29-00-927Z.json`). isolated VM에 새 실제 app helper가 빠진 ReferenceError. 실제 C/P/PD와 app의 표시 helper를 공급했으며 기존 시간 기대·ambient 접근 거부 유지. 제품 수정으로 세지 않음. |
| 신규 브라우저 | 최종 **12/12**, 23격리 context | [화면별 QA](./k3b-structure-ui-qa.md)에 실제 실행·호출·캡처 최종 연결. 최초 스크롤/focus 경합 1건은 하니스, 이후 '수정' 줄바꿈은 실제 CSS 결함으로 분리. |
| npm test | **FAIL**: 실제 2,030개 중 2,029 PASS / 1 FAIL | 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/npm-test-b2-structure-2026-09-05T15-32-01-219Z.json`). 출처 재검토 기한이 지난 기존 콘텐츠 4개를 검사하는 한 테스트 실패. 뒤의 두 script group은 이 명령에서 실행되지 않았음. |
| npm의 미실행 후속 2그룹 별도 실행 | **201/201**, **19/19** | approved (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/npm-b2-remainder-approved-2026-09-05T15-33-51-600Z.json`), public (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/npm-b2-remainder-public-2026-09-05T15-33-54-274Z.json`). 전체 예정 script group의 실행은 확보했지만 npm test 성공으로 바꾸어 쓰지 않음. |
| production build | PASS, 정적 생성18경로 | 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/production-build-b2-structure-2026-09-05T15-32-11-444Z.json`). BUILD_ID `ZS-EN7cCIm0-Hzl7Czi4O`. 배포 아님. |

## 날짜 경계 실패의 원인과 처리

`seed-flows.test.ts`의 `normal user routes fail the standard suite when source review is due`는 실제 현재 날짜를 사용한다. 실제 source-freshness 함수를 같은 현재 seed에 적용한 읽기 진단 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-review-date-boundary-2026-09-05T15-34-29-153Z.json`)에서 2026-09-05 23:59:59 KST에는 due 0, 2026-09-06 00:00:00 KST에는 due 4였다. 90일 초과 규칙과 2026-06-07 검토일에 따라 ageDays 91이다.

대상은 `banana-peanut-recipe-video`, `monstera-care-routine`, `water-purifier-filter-cycle`, `plank-30-day-challenge`. 출처를 실제 재검토하지 않고 날짜를 갱신하거나 검사 시간을 고정하지 않았다. 이 읽기 진단은 등록 테스트 수가 아니며, 외부 원문의 현재 정확성을 검증한 것도 아니다.

네 보호 파일의 현재 SHA는 최초 보호 baseline과 일치한다. `seed-flows.test.ts`는 이미 있던 dirty 변경을 포함하며 이번 작업의 소유로 주장하지 않는다.

- seed-flows.test.ts: `386c6df21428d5ab0b6b976eb7611c99a6a6fa9e2a4916895f15c5e50e25b610`
- seed-flows.ts: `692ba828306674f8c347beb01e3c8de132a62f16cf9ca1ce76a2d8a329597299`
- source-freshness.test.ts: `e1ceb1595102ed99ddba983d7383990ff8534bf1bc78583dd5a645fc8bc62fb8`
- source-freshness.ts: `9e3e63e7c6c120cde9141850cc5691741b49559354d7dde57c590af9d84c8d58`

## 최종 사용자 HTML·기존 회귀

사용자 standalone/Android 단일 파일은 각각 **1,428,663 bytes**, SHA256 `889B88F811039413B15347359B5490D5D5D66CEFABC3B4B1DA91E4B516733098`다. 신규12와 기존54가 실제 실행한 메모리 후보와 동일하다. FB17 이전 파일·현재 후보 pins·직접 file 시험은 `output/poc-gap-implementation/k3b/before-b2-user-html/`에 정확 백업했다. 현행 host/runner 후보 해시·bytes와 직접 file 시험의 contract 기대만 갱신하고 과거 실행 evidence는 보존했다.

| 최종 후속 검사 | 결과 | 근거 |
|---|---|---|
| 기존 mode16·K1B20·C3저장16·sourceCAS2 | **54/54 PASS** | [QA](./k3b-structure-existing-ui-regression-qa.md), 최종 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-existing-ui-corrected-20260906-01.json`). 최초40P/14F는 old draft discriminator12·old app pin2의 하니스 차이. 두 기대값만 정확 백업 뒤 갱신했고 원형실행을 보존. |
| 생성 HTML·모델/runtime·host unit | **151/151 PASS** | 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/b2-final-html-model-regression-2026-09-05T15-45-01-634Z.json`). builder 출력과 두 파일의 deterministic exact 비교 포함. 위750·시간6과 일부 중복되므로 합산하지 않음. |
| 실제 production route gate·손상복구·4origin·시간 | **5/5 PASS** | 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/b2-generated-gates-time-2026-09-05T15-46-02-157Z.json`). 현재 production build 서버와 현행 standalone memory source 사용 범위를 각 spec에서 구분. 기본 `/my`·오류/추가/중복 query·운영 key 지칭 손상 journal fail-closed 포함. |
| 실제 사용자 standalone file URL | **1/1 PASS** | 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/b2-direct-local-file-2026-09-05T15-46-17-300Z.json`). 390×844, 실제889B 파일에서 제목/메모/날짜→child0→save→reload→clean close0→Undo→reload. target2+journal6=8API, 운영/legacy/source/raw Flow/Item exact. 별칭·전체순서 여정은 위12의 동일bytes HTTP 검사이며 이1개에 있다고 확대하지 않음. |
| 현행 후보 loopback host | **8/8 PASS** | 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/b2-generated-host-2026-09-05T15-46-20-791Z.json`). candidate Buffer/hash, 파일허용목록,5viewport, 조작/복구/실기승격거절. host helper 자동 검사이지 Android 검사 아님. |

root도 수정 전390·수정 후390·수정 후844×390 오류 viewport PNG를 직접 열어 버튼 줄바꿈 보완과 입력/오류의 같은 화면 배치를 확인했다. 다섯 화면의 전체 직접 평가와 남는 긴 구간 정보 밀도는 [신규 UI QA](./k3b-structure-ui-qa.md)를 따른다.

## 소유 파일·보호·미실행

제품 연결: standalone assets의 `personal-plan-context.js`, `workspace-checkpoint.js`, `plan-item-session.js`, `workspace-storage.js`, `personal-plan-display.js`, `model.js`, `app.js`, `style.css`. 새 테스트와 세부 QA는 [구조 모델](./k3b-section-order-plan-qa.md), [C/S](./k3b-structure-checkpoint-storage-qa.md), [E2 v4](./k3b-structure-session-v4-qa.md), [D/PD 경계](./k3b-structure-boundaries-qa.md), [표시 facade](./k3b-structure-display-facade-qa.md), [결과 읽기](./k3b-structure-result-read-qa.md), [기간 동률](./k3b-structure-timeline-tie-qa.md), [앱 독립 검토](./k3b-structure-app-independent-design-review.md)에 분리한다. 같은 폴더의 기존 미소유 파일을 일괄 소유로 취급하지 않는다.

쓰기 허용은 PoC namespace와 기존 고정 target/journal pair뿐이다. fresh Chromium의 운영 sentinel·legacy·원문 전후 exact와 호출 감시는 사용자 실제 프로필의 전수검사와 다르다. `localStorage.clear()`·prefix 밖 writer는 허용하지 않았다.

Android Chrome/iOS Safari/OS IME/OS Back/실제 보조기술: NOT_RUN. 관찰 사용자 0명. commit·push·PR·Preview·Production: 미실행.
