# 일반 항목과 반복 항목 사이의 전환 — 요구별 검증

2026-09-14 · 최종 실행판 `T5OwjYHr3bIbrD4NuJi-J`. 전체 목표는 진행 중이다. [설계 계약](copy-kind-change-design.md)의 양방향 보관·복원을 구현했고, 같은 실제 작성물의 공개 5판과 개인 기록을 이어 검증했다. 원래 세 결과물 전체의 충족이나 전체 두 개선 루프 완료를 뜻하지 않는다.

## 원래 요구 → 실제 연결 → 남은 범위

| 요구와 출처 | 이번에 가능한 행동·근거 | 판정과 남은 범위 |
| --- | --- | --- |
| 개발1 개인화 · P03: 가져온 원문의 일정 변경을 선택 수용 | 반복→일반, 일반→반복을 별도 확인 후 적용. 원래 일정과 내 실행 날짜를 나눠 표시 | 아래 주간 운동·고정 일반 항목 조합의 실제 왕복 확인. 다른 구조·개인 수정 충돌은 별도 |
| 개발2 원본·판본 · P06/P07: 새 불변 판본을 공급 | 같은 작성물의 실제 일정 제안→로컬 작성자 검토→5판 생성. 이전 1~4판은 동일 | 준비 과정은 앞선 AKD 실행판. 최종판의 전환은 그 실제 5판을 사용. 외부 게시·다중 사용자 인증 아님 |
| v4.1/개인 실행 · P02: 완료·날짜·문서 연결 보존 | 일반 항목을 완료하고 12/9로 이동·여행 문서에 연결. 반복으로 전환한 뒤 돌아오면 같은 행 ID·완료·날짜·참조 복원 | 일반 완료를 반복 회차에 복제하지 않음. 부모·하위 체크 기록의 모델 검사와 실제 부모 문서 연결을 구별 |
| 통합 복구 · P07/P08: 선택·실패·Undo·새로고침 | 기본 해제 확인, Escape·취소·오류 후 입력 유지·키보드 재시도, 여섯 번 Undo와 reload | 이 전환 경로 확인. 최종 동일 빌드의 S01~S10 전체와 두 전체 개선 루프는 미완료 |

## 설계와 수정

기존 saved-origin 전환의 실제 본문 보관·안정 ID 복원 방식을 재사용했다. 공개 사본에는 `kindHandoffs.version:1`로 일반/반복의 서로 다른 행 ID, 당시 수용 필드, 개인 날짜·시작 선택과 명시 전환 이력을 기록한다. 실제 본문은 기존 보관 문서에 두고, 공개 원본과 운영 저장 구조는 바꾸지 않는다. 필드가 없는 과거 상태를 읽을 때 쓰거나 자동 이전하지 않는다.

일반 항목은 완료·메모·하위 체크·참조를 보존한다. 비활성 반복 참조는 현재 일반 항목으로 자동 연결하지 않고 원래 반복 행과 기록을 가리킨다. 한 형태에서 수용한 공통 원문 필드는 되돌아올 때 과거 판본으로 되감지 않는다. 개인적으로 바꾼 필드는 자동 덮어쓰지 않는다. 검토 화면은 기존 입력 보호·실패 요청 ID·저장 피드백·초점 복귀를 공유한다.

후속 경계 검사에서 **날짜 미정의 일반 항목을 복원할 때 상속 기준값에 새 원문 날짜가 생기는 결함**을 재현했다. `null`을 값 없음으로 간주하던 분기를, 보관된 형태가 있으면 그 명시적 `null`도 보존하도록 수정했다. 해당 검사 1실패→통과, 최종 전체 검사에도 포함했다. 이 미정 복원은 모델 근거이며 브라우저의 고정 날짜 왕복과 동일한 시나리오라고 부르지 않는다.

## 같은 자료의 시뮬레이션

| 실행 기록 | 저장 revision | 실제 결과 |
| --- | --- | --- |
| 실제 새 5판 준비 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-kind-prepare-2026-09-14T04-00-04-837Z.json`) | 85→88 | 일정 제안·검토·불변 5판 생성, 6확인 |
| 첫 전환·완료·날짜 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-kind-roundtrip-2026-09-14T04-02-50-473Z.json`) | 88→91 | Escape·취소·quota·재시도·일반 항목 완료/날짜, 12확인 후 문서 연결 선택자 오류로 중단 |
| 같은 상태 재개 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-kind-resume-2026-09-14T04-05-28-995Z.json`) | 91→100 | 실제 문서 연결·반복 복귀·일반 기록 복원·여섯 Undo/reload, 13확인. 마지막 reload의 route 자산 측정은 실패 |
| reload 근거 보완 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-kind-reload-2026-09-14T04-08-43-095Z.json`) | 100→100 | 실제 문서 build ID와 DOM/ResourceTiming의 로드 자산 일치, 읽기·검토·취소 4확인·쓰기0 |
| 최종판 전체 전환 왕복 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-kind-final-2026-09-14T04-20-27-565Z.json`) | 100→112 | 위 전환 경로를 한 실행으로 재검사. 24확인, 두 방향 각각5크기·키보드·실패/재시도·완료/날짜/참조·여섯 Undo/reload 통과 |

최종판은 성공 쓰기12회와 거절된 quota 시도1회를 기록했다. Escape·명시 취소·실패에서 성공 mutation은0이다. 최종112의 모든 개인 공간은100과 같고 실제 공개5판은 남아 있다. 이전의 반복1판/개인 계획12/4 완료와 수용3판의12/8 완료를 모두 보존했다. 한 번의 전환 경로 재검사를 전체 제품 평가 루프로 세지 않는다.

초기 `about:blank`의 storage SecurityError는 앱 주소 오류가 아니었다. 같은 프로필의 기존 localhost 주소로 돌아왔으며 자료를 초기화하지 않았다. 처음 reload 측정 중단 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-kind-reload-2026-09-14T04-07-16-430Z.json`)은 hydration 이후 DOM script만 기다린 검사 오류다. 실제 로드된 resource와 문서 build ID를 함께 읽도록 보완했고 원래 실패 파일을 수정하지 않았다.

## 화면별 평가

- 375×812 반복→일반 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-kind-1789359630145-series-to-ordinary-375.png`): 이전 반복의 기록2개·개인 계획1개를 남기고, 새 일반 항목이 미완료로 시작함을 표시한다. 확인/적용/취소가 보이며 버튼 높이는48px이다.
- 1024×768 일반→반복 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-kind-1789359633036-ordinary-to-series-1024.png`): 원문 날짜12/2와 개인 날짜12/9를 구별하고, 진행 기록1개·문서 참조1개의 보존을 보여 준다.
- 1024×768 일반 기록 복원 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-kind-1789359634656-restored-ordinary-1024.png`): 전체 할 일에서 개인12/9 완료가 복원된다. 근처 같은 제목의 반복은 별도 작성 문서의 항목이다. QA 문서의 기존 ‘공개하지 않은 초안’ 제목은 변경하지 않았으며 실제 공개 상태를 그 제목으로 판정하지 않는다.

세 캡처를 직접 검토했다. 두 방향 모두375×812·390×844·844×390·1024×768·1440×900에서 가로 넘침0, 적용 버튼 높이44px 이상과 실제 hit 가능을 확인했다. 다른 세 크기는 조작/레이아웃 측정 근거이며 별도 캡처 시각 검토와 구분한다. 최종 콘솔 오류·page error0이다.

`flow-ux-review`의 내부 평가에서 기록/대상 구별은4, 인지 부담·조작성은3이다. 확인 전 보관/복원 결과를 보여주고 기존 실패·취소 경로를 재사용했다. 필수 보존 경고와 접근성 이름은 유지했다. 긴 설명, 0개 기록까지 표시하는 문구, 안팎 이중 스크롤은 개선 후보다. 사용자 점수나 보조기술 통과로 해석하지 않는다. Figma·이미지 생성은 사용하지 않았고 실제 앱 캡처를 썼다.

## 자동 검사 — 실제 실행 수

| 검사 | 결과 |
| --- | --- |
| 형태 전환 모델·화면 표적 | 24/24. 모델10개·화면14개. 이번 추가는 모델10개와 화면1개 |
| PoC 전체 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-14T04-17-29-627Z.json`) | 151파일1,472실행/1,472통과. 실패·skip·검사 중 소스 변경0 |
| 타입 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-14T04-17-58-910Z.json`) / production build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-14T04-17-20-027Z.json`) | strict343개/진단0, build 통과·소스 변경0 |
| npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-14T04-19-51-607Z.json`) | 2,031실행/2,030통과/기존 출처 검토기한1실패/skip0. 출처9개의6/7~6/10 기한을 근거 없이 갱신하지 않음 |
| 기존 승인 회귀 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-14T04-20-01-850Z.json`) / 공개 표면 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-14T04-20-04-849Z.json`) | 201/201, 19/19 |
| 소스·저장 기록 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/copy-kind-crosscheck-2026-09-14T04-22-53-554Z.json`) | 40/40. 현재372소스와 최종 검사/build 해시 일치, 이전 checkpoint 대비 의도한9경로만 변경. 새 브라우저 실행 아님 |

초기 검사 작성 중 잘못된 진행 API 필드·실제로 달라지지 않은 stale baseline·기존 UI 문구 기대값 오류를 고쳤다. 직접 하위 체크 참조 생성은 기존 root-task API의 지원 범위가 아니므로 이번 검사는 부모 참조2개와 하위 완료 보존을 구별한다. 이 과정의 실패를 제품 결함 수로 합치지 않는다. 마지막 미정 복원1실패는 실제 제품 결함이다. 이전 보안 audit5건(critical1 포함)은 미해결이며 이번에 재실행하지 않았다.

## 운영 데이터 불변과 변경 파일

보호 manifest4,781개 중4,779개 byte 동일, 기존 gated route/PoC STATUS의 허용 접점2개 외 예상밖 변경0이다. 기존 제작기26파일819,423bytes와 v11 vendor integrity도 동일하다. 이 검사는 파일 보호이며 브라우저의 운영 데이터와 구별한다.

이번 브라우저 프로필의 운영 보호 key는0개다. 따라서 허용 prefix 밖 setItem/removeItem/clear0을 ‘채워진 운영 데이터 전체 불변’으로 확대하지 않는다. 양방향 controller 검사는 실제 값이 있는 `flow:operating` sentinel을 두고 quota·동일 요청·Undo·Redo·reload 전후 동일함과 모든 저장 시도가 Program key임을 확인했다. 기본 `/my`와 운영 writer/schema는 변경하지 않았다.

제품 변경은 `lib/flow/integrated-poc/`의 contract, private-space, program-data, public-copy-recurrence, public-copy-recovery-location, 새 public-copy-kind-contract와 모델 검사, `components/flow/integrated-poc/ProgramCopyInspector` 및 검사다. 40대조의 changedFiles (로컬 전용 근거: `../../../output/integrated-product-poc/copy-kind-crosscheck-2026-09-14T04-22-53-554Z.json`)에 정확한9경로를 기록했다. 재현/재개/최종 브라우저·대조 스크립트, 본 설계/보고서와 현재 원장·캡처 HTML도 갱신한다. 기존 dirty 파일 전체를 이번 소유로 세지 않는다.

## 다음 단계와 외부 상태

다음은 재추가 하위 체크의 개인 수정 충돌을 실제 보관된 행·완료와 원래 판본으로 해결하는 경로다. 이어 여섯 작성 틀 전체, 실제 새 Map 원본의 삭제·다른 구조/지난 기록, 미정→다른 미정과 현재 판본 개인 계획의 추가 변경, 긴 문서·누적 응답, 같은 최종판 S01~S10 및 두 전체 개선 루프를 진행한다. 종류 전환의 개인 수정·복잡한 하위 구조 조합은 이 한 경로의 성공으로 종결하지 않는다.

보고서 HTML 렌더는 기존 URL 보안 정책 차단 경계를 유지한다. 다른 주소나 도구로 우회하지 않으며 정적 검사와 실제 앱 캡처를 보고서 자체의 브라우저 검사로 표현하지 않는다. 새 실행·전체 백업·재공개·운영 moderation은 별도 정책 검토 대상이다.

캡처 HTML 갱신 후 정적 검사203/203 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-14T04-30-42-549Z.json`)에서 링크·4이미지·스크립트/문서 구조를 확인했고 docs:check (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-14T04-30-42-677Z.json`)가 통과했다. 보고서 자체의 렌더 결과는 아니다. STATUS 경계 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/status-note-boundary-2026-09-14T04-28-13-540Z.json`)는 이번 PoC 안내4줄을 제외한 운영 본문의 원래 bytes를 복원·대조했다.

실제 Android Chrome: 미실행. 실제 iOS Safari: 미실행. OS 입력기·보조기술·외부 계정 import: 미실행. 관찰 사용자:0명. commit:미실행. push:미실행. PR:미실행. merge:미실행. Preview:미실행. Production:미실행. 외부 게시:미실행. 전체 목표는 계속 진행 중이다.
