# 개발계 교체·복귀 준비

이 문서는 아직 실행하지 않은 절차다. 기존 [승인 launcher/교체 기록](../2026-10-01-alpha-folder-content-dev-release/runbook.md)을 재사용하되 과거 PID를 현재 PID로 믿지 않는다.

## 반영 전

- 이전 실제 앱 경로·HEAD/build와 정적 자산, 원본/실행 Git 상태, private pack·host/signing 설정·Tunnel 설정을 hash로만 보호한다. 비밀값/개인 원문을 공개 문서에 복사하지 않는다.
- 마지막 게시 검증 뒤 새 제품 source/HEAD/build/static exact manifest를 결합한다. QA·서비스가 제공 중인 `.next`에 build/install/hooks를 실행하지 않는다.
- 기존 launcher를 먼저 읽고 허용된 `--check`로만 설정 적합성을 확인한다. 이 확인은 build provenance나 DB 쓰기 성공을 보장하지 않는다.
- 현재 3105 앱의 parent/child·생성시각·절대 next 실행경로·포트 소유, 별도 Tunnel의 상태를 대조한다. 일치하지 않으면 추정해서 종료하지 않는다.

## 마지막 게시 build와 시험 사본의 결합

1. 마지막 pre-push hook 전후의 compile input 집합을 기록한다. tracked `app/`·`components/`·`lib/`·`public/`, package/lock·Next/TypeScript/PostCSS/Tailwind 설정, 기존 curated source JSON, 신규 runtime3파일을 포함한다. 전체 경로 집합·중복0·source hash를 대조한다. 제작/저장 경로의 `AlphaWorkspace`·`ProgramCreatorWorkspace`·persistence/client·sync/controller·social contract/dispatch/private-task-schedule도 반드시 포함한다. 문서만 업데이트하더라도 제품 source의 동일성은 별도로 확인한다.
2. hook 성공 뒤 제품 HEAD·BUILD_ID·static 전체 path/hash와 build 기록·앞뒤 compile input을 결합한다. 새 QA 사본은 현재 게시 작업본 안의 `output/playwright/feedback-ux-isolated-build-<새 label>/workspace`에 만들고, `inputs.json`의 root/workspace/sources가 양쪽 실제 파일과 맞아야 한다. 1번의 전체 compile input 집합과 sources의 누락·초과·중복이 모두0인지 대조한다. private pack·env·계정·기존 output을 복사하지 않는다.
3. 동일 제품의 `.next` 실행 산출물·public·설정/package·manifest 소스를 정확한 byte 사본으로 준비하고, 같은 dependency 설치본을 사용한다. `.next/server`와 실행에 필요한 build manifest도 파일 목록·hash로 원 제품과 대조한다. BUILD_ID·static 일치만으로 서버 산출물 전체 동일을 주장하지 않는다. 사본에서 install/build를 다시 하지 않는다. `.next/static`만 복사한 것은 실행 사본이 아니다. 기존 isolated-build 도구는 항상 새 build를 만들므로 이 절차에 재실행하지 않는다. 사본 복사 전후 원 제품의 source/build/static도 같아야 한다.
4. 현재3107은 이전 시험 build이므로 새 결과로 재사용하지 않는다. 현재 listener의 PID·생성시각·절대 실행경로·build와 사용자 시작 범위를 확인한 다음, 허용된 서버 실행 절차로 새 사본을 제공한다. 제공 중인 `.next`를 덮어쓰지 않는다. 도구 정책에 서버 실행이 거절되면 다른 shell/앱으로 우회하지 않고 미실행을 기록한다.
5. 고정 시험 환경은 local·loopback3107·정확한 사본 경로다. 시작/종료의 `/alpha`200·기대 BUILD_ID·합성 publishable key·활성화 gate를 확인한다. 실제 Auth/API/원격 telemetry는 합성 handler에서 처리하고, 허용된 문서/정적 GET만 전달한다. 실제 계정 쓰기로 대체하지 않는다.

## 판본별 화면·동선 판정

- 신규 폴더·작성·날짜7경로×5크기: 새 label·single/case 선택 없음·`fullMatrix:true`·35/35·CLI0·skip/fail/retry0.
- 엄격 회귀12경로×5크기: 정확한60시나리오·60/60·CLI0·wrapper `ok:true`·skip/fail/retry0. synthetic wrapper unit10개를 앱60회와 합산하지 않는다.
- 제작→개인 실행4경로×5크기: 새 label의 디렉터리가 없음을 먼저 확인하고20/20·CLI0·skip/fail/retry0을 확인한다. 이 드라이버 자체에는 frozen build preflight가 없으므로 시작/종료 HTML/build와 각 boundary의 실제 JS/CSS path/hash를 위 사본 manifest에 별도로 대조한다. 모델 직접 호출로 화면 조작을 대신하지 않는다.
- 세 검사 모두 HEAD·source·BUILD_ID/static과 driver/fixture/config hash를 실행 전후 대조한다. 현재 프로그램 검증653입력만으로 전체 compile input 집합을 증명했다고 쓰지 않는다. 실제 로드된 자산의 같은 path/hash·console/page error0·가로 넘침0·허용 prefix 밖 writer0·sentinel bytes 불변을 확인한다.
- 다섯 크기는390×844·375×812·844×390·1024×768·1440×900이다. 브라우저 자동화/합성 IME는 실제 기기·OS IME·접근성 도구·관찰 사용자 증거가 아니다. 공개판 보고서의 새 로컬 전용 표기 렌더 검사는 별도이며 파일 URL 차단을 우회하지 않는다.

준비 build `Ze2wAtzddvDNFTtsL2mHI`는 아직 unpublished 판본이다. 현재653입력·81static 기준 hash와 이전 rollback build를 기록했지만 최종 게시 hook 판본·실제 화면 제공의 증거로 승격하지 않는다.

## 승인된 교체와 복귀

승인된 기존 앱만 중단하고 동결 후보를 같은 launcher로 시작한다. Tunnel·DNS·계정·DB/Auth·설정은 유지한다. 로컬/외부 health·무인증 경계·자산 hash와 합성 핵심 조작을 확인한다. 실제 개인 문서에 시험 입력을 하지 않는다.

실패하면 후보의 검증된 앱 프로세스만 중단하고 보존한 이전 build `667DI4JldqTDckfQ16wB5`의 `flow-folder-content-ux-20261001`을 같은 launcher로 다시 시작한다. 이전 build를 재생성하지 않는다. 새 process·health·이전 자산을 재확인하고 실패 원인을 판정 없이 기록한다.

rollback 대상은 현재 이전 개발계 HEAD `6d534a97`/build `667DI4JldqTDckfQ16wB5`다. 링크된 과거 기록의08aa/build zEY9와 PID를 사용하지 않는다. 앱 판본 복귀는 DB/개인 자료 복원이 아니다. 열린 새 판본 탭은 저장 상태·보관 입력을 확인한 뒤 새로고침하도록 안내하고, 미저장 입력을 버리거나 실제 계정 문서를 자동 수정하지 않는다. 외부 검사는 정확한 제공 JS/CSS path/hash와 무인증 경계 및 합성 동선을 확인하며, 데이터 전수 불변이나 상시 가용성으로 확대하지 않는다.

초기 목표 준비 시점에는 교체·복원·commit/push/PR/CI 모두 미실행이다. 실제 순서와 exact 판본은 QA 후속 기록으로 확인한다.
