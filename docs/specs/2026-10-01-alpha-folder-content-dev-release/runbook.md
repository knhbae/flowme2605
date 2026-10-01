# 앱 교체와 복귀

## 현재 기준과 보호

기존 앱은 `flow-ux-journey-20261001`의 `08aa8311`·build `zEY9jP0Mcmqs90L0HCPvB`, loopback3105다. 시작 확인 시 child11220/parent5728이며 생성시각은 각각2026-10-01T06:39:23.191695Z/06:39:22.716480Z였다. Tunnel3864는2026-09-30T10:15:05.486949Z 생성된 별도 cloudflared다. PID만 믿지 않고 교체 직전에 부모·생성시각·절대 next 실행경로·포트 소유를 다시 대조한다. 불일치하면 중단한다.

기존 build·next.config.ts·tsconfig.json·설정2개·privatepack·원본 feedback의 hash만 읽고 보호한다. 로컬 manifest/원시 증거는 공개하지 않는다. 새 앱의 build는 마지막 pre-push hook 이후 고정하며 source·HEAD·정적자산을 함께 기록한다. 실행 후 build/install/pre-push hook은 해당 실행 작업본에서 금지한다.

## 순서

1. exact allowlist·보안/출처·private 경계·hook을 통과시킨 commit으로 stacked Draft PR을 만들고 필수4개 CI를 확인한다. 새 browser config의 시나리오는 CI 자동 분류와 별도로 실행한다.
2. 후보에서 loopback3106 합성 앱을 띄워 다섯 크기 조작과 source/자산을 확인한 후 정확한 QA PID만 종료한다. 실제 계정/API/Auth는 전달하지 않는다.
3. 기존 승인 launcher의 `--check`를 후보에서 실행한다. 기존 설정의 secret은 launcher 내부에서만 읽고 복사/출력하지 않는다. 이것만으로 source/build provenance를 보장한다고 쓰지 않는다.
4. 보호hash·기존 앱 process/3105·Tunnel을 다시 확인한 후 기존 child/parent만 종료한다. 같은 launcher로 후보의3105를 시작하고 로컬 health·외부 무인증10검사·remote-readonly 합성 브라우저·자산 exact path/hash를 대조한다.
5. 오류면 후보 앱의 정확한 child/parent만 종료하고 기존 `flow-ux-journey-20261001`의 변경하지 않은 build를 같은 launcher로 재시작한다. Tunnel·DNS·호스트·DB/Auth·설정은 손대지 않는다. 복귀 시 새 PID/health/자산을 확인하고 실패를 원장에 남긴다.
6. 마감 문서와 검사 driver 보완은 제품 commit에서 만든 별도 깨끗한 작업본으로 게시한다. 실행 제품 commit/build와 마감 head를 분리하고 실행 판본이 최신 마감 commit에서 다시 build됐다고 주장하지 않는다. 실제 실행 작업본에서 install/build/hooks를 실행하지 않는다. 마감 head CI는 Draft PR207 최신 checks로 확인한다.

## 교체 후 실행 기록

2026-10-01T10:35:11Z 제품6d534a97/build667DI4JldqTDckfQ16wB5로 교체했다. child10732/launcher26640이며 생성시각은10:35:11.312541Z/10:35:10.832586Z, loopback127.0.0.1:3105다. localhealth200/0bytes/no-store·새외부HTTPS10/10·보완driver 외부60/60·정적 JS/CSS24 exact path/hash일치를 확인했다. Tunnel3864는 그대로다. 초기 외부49PASS/1FAIL과검사gate 보완 근거는 QA에 보존하며 제품source/build변경0이다.

복귀가 필요하면 현재PID만 믿지 말고 새child의 절대 next 실행경로 `D:/flowme2605/flow-folder-content-ux-20261001/node_modules/next/dist/bin/next`와 parent·생성시각·3105 소유를 다시 확인한다. 일치한 앱만 종료한 후 이전 `flow-ux-journey-20261001`의 보존 build zEY9jP0Mcmqs90L0HCPvB를 기존 launcher로 시작한다. 설정 재작성·이전 build 재생성·Tunnel 변경은 하지 않는다. 현재 PID가 달라졌다면 자동으로 추측해 종료하지 않는다.

## 변경하지 않는 것

main merge·실제 계정 자료·DB/Auth/migration·5D 활성·Tunnel/DNS·자동 시작·Render/Vercel/Production 설정과 배포는 제외한다. 브라우저 자동화는 실제 Android/iOS·OS IME·AT·관찰 사용자 시험이 아니다.
