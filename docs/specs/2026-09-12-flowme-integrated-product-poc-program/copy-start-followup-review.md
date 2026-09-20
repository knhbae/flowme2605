# 새 원본을 받은 뒤 시작하기 — 요구 대조와 실제 검증

2026-09-14 · 실행판 `XKvQ2x05jmRnGKt8im28g`. 전체 목표 진행 중. [이전 일정 수용](copy-schedule-resolution-review.md)의 같은70상태를85까지 이어 사용했다. 새로운 임의 사본이나 저장소 초기화로 검사를 대신하지 않았다.

## 원래 요구 → 이번 결과

| 요구와 연결 | 확인한 실제 행동 | 판정·남은 범위 |
| --- | --- | --- |
| 개발1 개인화 · P03: 시작 미정/상대 원문에 내 날짜를 정함 | 같은 공개 v3의 시작 미정→개인12/8, v4의 기준일+2일→12/10 회차 | 이 조합의 동작 확인. 현재 판본의 별도 개인 계획 변경은 기존 계획 범위 확인 필요 |
| 개발2 판본 · P06/P07: 작성 결과의 반복 의미와 불변 판본 유지 | 같은 작성물에 실제 제안→검토→v3/v4 추가. 옛 v1/v2와 원래 작성 문서 보존 | 주간 운동의 미정/상대 조건 확인. 여섯 작성 틀 전체 동등성은 미완료 |
| v4.1/개인 실행 · P02: 같은 항목의 날짜·완료·지난 기록 보존 | v3의12/8, v4의12/10을 각각 완료. v1 원본 완료·개인12/4 완료는 그대로 보관 | 각 판본 회차에 독립 기록. 일반↔반복 종류 전환과 실제 Map 삭제는 미완료 |
| 업데이트/복구 · P07/P08: 선택·취소·실패·Undo·reload | 확인 기본 해제/Escape, quota 후 입력 보존·키보드 재시도, 같은 값0쓰기,3Undo/reload | 이 경로 확인. 최종 동일 빌드의 전체 S01~S10/두 전체 개선 루프는 미완료 |

## 발견한 결함과 수정

실제 새3판을 ‘시작일 미정’으로 수용한 뒤에도 시작일을 저장할 수 없었다. 기존 guard가 **보관된 다른 판본의 개인 계획**과 **현재 수용 판본의 계획**을 구별하지 않고 모두 거절했기 때문이다. 오류는 ‘해결하지 않은 변경이 있습니다’였고, 원본 변경 검토를 이미 끝낸 사용자가 다시 비교해도 진행할 수 없었다.

현재 일정 판본·항목·계획 ID에 대한 명시 보관 확인이 있고, 그 계획이 다른 불변 판본에 속할 때만 새 시작일/기준일 입력을 허용했다. 확인이 없거나 다른 판본·계획이면 거절하며, 현재 수용 판본의 계획도 기존 보호를 유지한다. 원본·지난 완료·개인 계획 owner/operations/events·문서를 수정하거나 삭제하지 않는다. 새 저장 필드·운영 migration·자동 재연결은 없다. [교체 가능한 기존 계약의 보완](copy-schedule-resolution-design.md)을 따랐다.

## 같은 자료의 시뮬레이션

| 실행 | 상태 | 실제 결과 |
| --- | --- | --- |
| 새3판 준비 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-start-prepare-2026-09-14T02-55-58-917Z.json`) | 70→73 | 제안/검토/불변v3 공개4확인 후 자동화가 이미 열린 문서 메뉴를 닫아 중단. 성공 상태 보존 |
| 원래 결함 재현 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-start-reproduce-2026-09-14T02-57-50-897Z.json`) | 73→74 | 기록 보관 확인→미정 일정 수용.12/8 입력 저장은 거절·쓰기0.4확인은 결함 재현이지 기능 통과가 아님 |
| 수정판 미정 시작 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-start-fixed-2026-09-14T03-08-05-975Z.json`) | 74→79 | 미정 시작 quota/재시도→12/8 별도 완료→상대 조건 제안/새v4.13확인 후 모바일의 접힌 문서 목록 locator에서 중단 |
| 같은 상태의 상대 시작·복구 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-start-relative-2026-09-14T03-11-05-347Z.json`) | 79→85 | v4 수용→기준일 미정 유지→12/8 기준일/12/10 회차→실패 재시도/완료→3Undo/reload.16확인 완료 |

앞 두 기록은 `lwhtQQM0kKk8KxPR1b5FG`, 수정 후 두 기록은 `XKvQ2x05jmRnGKt8im28g`다. 두 자동화 탐색 오류와 실제 제품 결함을 구분한다. 상태를 초기화하거나 제안·판본을 중복 생성해 재시작하지 않았다. 현재85는79의 개인 공간과 동일하며, v3의12/8 완료·원래 개인 계획·v1 기록과 공개v4를 유지한다. ‘새 판본 수용 뒤 새 시작일 입력’ 경로의 평가→수정→재검사이며 전체 제품의 두 개선 루프 완료가 아니다.

## 화면별 평가

- 결함 당시375px (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-start-before-1789354674958-375.png`): 시작 날짜를 입력해도 기존 오류로 진행 불가.
- 수정 후375px (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-start-1789355294947-undated-started-375.png`): 원문은 시작 미정, 개인 시작은12/8로 구별. 저장 후 시작 버튼 초점 복귀.
- 상대 원문 수용375px (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-start-1789355467552-relative-review-375.png`): 이전 개인12/8과 개인 계획의 보관, 새 기준일 미정 결과, 해제된 확인을 보여줌.
- 상대 날짜 미리보기1024px (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-start-1789355468872-relative-preview-1024.png`): 기준일+2일의 실제12/10을 저장 전에 확인.
- Undo 복구1024px (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-start-1789355474087-restored-v3-1024.png`): v3 회차의 완료와 원래 기록이 이어짐.

시작일 저장과 기준일 저장 각각375×812·390×844·844×390·1024×768·1440×900에서 핵심 버튼 중앙 hit/높이44px 이상/가로 넘침0을 확인했다. 위 결함/수정375·상대수용375·상대미리보기1024 캡처를 직접 검토했다. 콘솔 오류/page error0이다. 전체 화면의 접근성 통과나 실제 터치 기기 검사로 확대하지 않는다.

`flow-ux-review` 관점에서 실행 가능성은 이 결함의1에서 수정 후4, 조작성/인지 부담은3이다. 이중 스크롤·긴 비교창과 이미 보관한 계획에도 나타나는 일반적인 주의 문구는 잔여다. 내부 상황 평가이며 사용자 점수가 아니다. 불필요한 안내를 추가하지 않았고 기존 확인/취소·입력·실패 UI를 재사용했다. Figma·이미지 생성은 사용하지 않았다.

## 자동 검사 — 실제 실행 수

- 새 표적5개: 수정 전1통과/4실패→수정 후5/5. 미정·상대×전체·이후 계획의 차단 결함을 재현했다.
- controller quota/Undo/Redo/reload 회귀2개 추가 후 관련48/48. 이번 신규 검사는7개다.
- 최종 150파일1,461/1,461 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-14T03-02-26-771Z.json`): 실패/skip/검사 중 소스 변경0.
- production build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-14T03-02-16-484Z.json`): 통과·소스 변경0. strict341개 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-14T03-04-00-181Z.json`): 진단0.
- npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-14T03-06-53-223Z.json`):2,031실행/2,030통과/기존 출처 검토기한1실패/skip0. 승인 회귀201/201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-14T03-11-15-532Z.json`), 공개 표면19/19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-14T03-11-22-148Z.json`).
- 코드·저장 기록39대조 (로컬 전용 근거: `../../../output/integrated-product-poc/copy-start-crosscheck-2026-09-14T03-14-34-724Z.json`): 검사/build/현재370파일 hash 동일, 이전 실행판 이후 모델·회귀2파일만 변경.70→85 실제 연속성, 판본별8회차·독립 완료·옛 계획/개인 완료·다른 작성물/문서·실제5캡처를 확인했다. 이 수는 새로운 브라우저 검사나 요구 충족률이 아니다.
- 통합 HTML 정적203확인 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-14T03-24-37-307Z.json`): 링크·실제4이미지·스크립트·한계 표시 통과. docs:check (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-14T03-24-37-423Z.json`) 통과. 정적 검사를 실제 HTML 렌더 검사로 세지 않는다. 현재 원장/상세/HTML의 최신 상태를 갱신하고 과거 실행 기록은 보존했다.

## 운영 데이터·변경 파일·남은 범위

보호4,781파일 중4,779 bytes 동일·기존 route/PoC상태 안내2접점 외 예상 밖 변경0. 원래 D2의26파일/819,423bytes와 v11 vendor는 그대로이며 운영 writer 모듈0이다. 브라우저의 운영 key 목록은0개이고 범위 밖 setItem/removeItem/clear0이다. 채워진 운영 데이터 보호는 controller의 실제 운영 sentinel 검사와 구별한다. `localStorage.clear()`는 호출하지 않았다.

현재 worktree의 PoC 안내 문단만 갱신한 STATUS 본문 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/status-note-boundary-2026-09-14T03-20-31-726Z.json`)에서 원래 운영 본문 SHA256이 기준선과 일치했다. 이 확인 후 해당 문서의 정확한 after hash만 기존 연결 원장에 갱신했다. 기존 main 작업 공간은 수정하지 않았다.

이번 제품 변경은 `lib/flow/integrated-poc/private-space.ts`, `public-copy-source-update.test.ts` 두 파일이다. 검사 스크립트5개(`program-copy-start-prepare/reproduce/fixed/relative.cli.js`, `program-copy-start-crosscheck.mjs`), 이 설계/보고서·현재 원장·통합 HTML을 연결했다. 직전 일정 수용 기능의6파일과 이번2파일을 별도 신규 구현으로 중복 계산하지 않는다. 원래 dirty 파일을 정리/stage하지 않았다.

다음 필수 구현은 일반↔반복 종류 전환과 재추가 하위 체크의 개인 수정 충돌이다. 기존 개인 시작을 유지하는 미정→다른 미정 조건, 현재 같은 판본의 개인 계획 이후 시작 변경은 검증/설계 범위를 따로 남긴다. 실제 Map 삭제·여섯 틀 전체·긴 화면/누적 응답·최종 동일 빌드의 S01~S10과 두 전체 개선 루프도 미완료다. 새 실행/전체 백업·기기 이동/재공개·신고 정책은 미승인 후보로 유지한다.

실제 Android Chrome/iOS Safari·OS IME·보조기술·외부 계정 import/동기화:미실행. 관찰 사용자:0명. 보고서 HTML 렌더는 기존 URL 보안 정책 차단으로 미실행이며 우회하지 않는다. 앱 브라우저 검사·캡처와 구분한다. 보안 audit는 이번 재실행하지 않았으며 이전 의존성5건의 미해결 기록을 해소했다고 주장하지 않는다.

commit:미실행. push:미실행. PR:미실행. merge:미실행. Preview:미실행. Production:미실행. 외부 게시:미실행. 전체 목표는 진행 중이다.
