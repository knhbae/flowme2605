# Alpha 운영

2026-11-10 23:59 갱신(처음 10/30) · 운영 중인 Alpha가 어떻게 돌고, 어떻게 반영·복귀하는지 한곳에 모은다. 원장 경로는 링크가 아니라 코드 표기로 적는다. 키·자격 정보와 계정 정보는 적지 않는다.

## 1. 지금 운영 중인 것

| 항목 | 값 |
| --- | --- |
| 공개 주소 | `https://alpha.wikiplans.com/alpha` |
| 내부 앱 | `127.0.0.1:3105` (`next start`) |
| 상태 확인 | `http://127.0.0.1:13105/status` (supervisor, 이 PC에서만) |
| 운영 빌드 | int6a `L3t1Xyp_HGigDHPspReXX`, 커밋 `e01d6b51` (11/10 18:06 KST, 가벼운 반영 33회차) |
| appRoot | `D:/flowme-work/etc/int6a-qa-20261110/product` |
| 되돌리기 대상 | int5 `Ik4Y60q1E26VEH3nxcZRS` / `3ef6839a` (`D:/flowme-work/etc/int5-qa-20261110/` 아래 product) |
| 쓰기 UI 설정 | `nativeAuthoringUi: enabled` |

기준은 supervisor의 `manifest.json`이다. 회차별 기록은 [지금 FlowMe](now.md) 기록 절에 남는다.

> 공개 주소에서는 `/alpha`와 그 아래, 로그인 콜백, Alpha API, 정적 파일, `/my`만 열리고 나머지는 404다(경로 차단, 10/30부터).

## 2. 실행 구조

```
Windows 작업 "FlowMe Alpha AutoStart" (로그온 때 시작, 1분마다 다시 확인, 중복 실행 무시)
  └ start-alpha.ps1
      └ alpha-supervisor.mjs   ── 127.0.0.1:13105/status
          ├ app:    scripts/alpha/cloudflare-release.ts → next start -p 3105
          └ tunnel: cloudflared 2026.10.4
```

- supervisor 폴더: `D:/flowme2605/_codex_temp/alpha-startup-20261003/` (manifest, 스크립트, 작업 정의 사본, 기록 `events.ndjson`)
- 앱이나 터널이 끝나면 15초 뒤 다시 띄운다.
- 띄우기 전에 manifest가 고정한 파일 12개의 SHA-256과 빌드 ID를 확인한다. 하나라도 다르면 띄우지 않는다.
- 3105를 다른 프로세스가 쓰고 있으면 같은 빌드일 때만 그대로 두고, 아니면 띄우지 않는다. cloudflared가 이미 떠 있으면 터널을 새로 띄우지 않는다.
- 한계: 프로세스가 살아 있는데 응답만 멈춘 경우는 다시 띄우지 않는다. 재부팅·로그아웃 뒤 복구는 시험한 적 없다. 노트북을 끄거나 절전·로그아웃하면 서비스가 멈춘다.

상태 확인 (읽기 전용)

```powershell
Get-ScheduledTask -TaskName 'FlowMe Alpha AutoStart'
Invoke-RestMethod 'http://127.0.0.1:13105/status'
Invoke-WebRequest 'https://alpha.wikiplans.com/api/alpha/health'
```

자동 시작만 멈추기: `Disable-ScheduledTask -TaskName 'FlowMe Alpha AutoStart'` (지금 도는 앱·터널은 끄지 않는다). 실행 중인 프로세스는 PID 하나만 보고 끄지 않는다. 5절 controller 절차를 쓴다.

## 3. 지우거나 옮기면 안 되는 곳

| 경로 | 무엇 |
| --- | --- |
| `D:/flowme2605/_codex_temp/alpha-startup-20261003/` | supervisor와 manifest |
| `D:/flowme2605/flow-alpha-backup-5d-publish-20260929/` (worktree) | 운영 설정·터널 설정 폴더 |
| `D:/flowme2605/flow-poc-merge-prep-20260920/` (worktree) | 자료실 묶음 파일 |
| 1절의 운영 appRoot와 되돌리기 대상 product | 지금 운영과 직전 운영. `.next` 포함 지우지 않음 |
| 쓰이고 있는 모든 PACKAGE.json의 rollback·before product, manifest가 고정한 guard 파일 | 반영 실행기가 대조한다. 11/5 guard 파일을 지워 재시작이 막힌 적 있음 |
| `D:/flowme-node24221-runtime-20261024-01a10108/` | 운영 Node 24.22.1 |
| `D:/flowme-cloudflared-update-exec-20261027-01a10108/` | 운영 cloudflared |
| `D:/flowme-alpha-today-classification-20261029-01a168e3/revision1/operations/controller.ps1`, `D:/flowme-alpha-mobile-writing-20261028-01a168e3/revision4/ops/controller.ps1` | R4 controller가 SHA로 고정해 가져다 쓰는 이전 controller |
| 코덱스 런타임의 PowerShell 7 | controller를 실행한 셸 |

이름이 임시·백업·PoC처럼 보여 정리 목록에 자주 오른다. 정리 계획에는 이 표를 먼저 대조한다. 운영 설정을 전용 폴더로 옮기는 것은 운영 변경이다. 새 manifest와 SHA를 다시 고정하고 4절 규칙을 따른다.

## 4. 반영 규칙 (사용자 10/30 결정)

- 검사와 통합 QA를 통과하면 **총괄이 판단해 반영한다.** 후보(커밋·빌드 ID·appRoot), 돌린 검사, 근거 경로, 미검증을 기록한다.
- **DB 변경·새 권한·실데이터 접근은 따로 사용자 승인을 받는다.** 실계정 확인의 쓰기와 롤백 뒤 자료 대조도 여기에 든다.
- **사용자 몫 확인은 반영 조건이다.** 예: 쓰기 A가 들어간 N1은 실폰 한글 입력 확인(S4) 전에 반영하지 않는다.
- **명령이 안전장치에 막히면 우회하지 않고 사용자에게 돌아간다.** 다른 세션이나 코덱스에 넘기지 않는다.
- **R7 안내 연락처 값(`FLOWME_ALPHA_PRIVACY_CONTACT`)은 R6 운영 삭제 연습이 끝난 뒤에 넣는다.** 값이 없으면 안내 화면과 링크가 숨는다(N8). 먼저 넣으면 '하루 안에 지웁니다' 약속이 지킬 절차보다 먼저 보인다.

순서

1. 후보 고정: 커밋, 빌드 ID, appRoot, 소스 핀
2. 검사: 바뀐 범위 시험, `tsc -p tsconfig.next.json` 0, 전체 tsc 기준선(8오류·2파일), `next build`
3. 통합 QA: 고정 후보 하나로 합성 QA(코덱스). 결과를 경로·SHA로 고정
4. 사용자 몫 확인이 남았으면 멈춤
5. 반영 판단과 영수증 작성
6. controller 실행(5절), 실계정 확인(7절), 마감 기록

## 5. 가벼운 반영 절차 (11/5~, 실행기 app-light)

DB 변경이 없는 반영은 Codex가 만든 실행기 `app-light.ps1`(v3, SHA256 `3eb9c719…`)로 한다. 기타 세션이 QA 폴더에 후보 product, `PACKAGE.json`(후보·되돌리기 대상·SHA), release 폴더를 만든다.

1. 기타 QA_GO와 목업 대조를 받는다.
2. PC 부하를 확인한다. CPU 35% 미만이 20초 간격 3번 이어질 때만 진행한다. 11/10 31회차는 Codex 부하(CPU 57~76%) 때문에 60초 안에 앱이 뜨지 않아 HOLD됐고, 약 3분 동안 502가 났다.
3. 사용자에게 "10분 뒤 배포합니다 — 그동안 FlowMe 쓰지 마세요"라고 대화로 먼저 알린다. 폰 알림(push)은 꺼져 있다. 11/10 33회차 중단(약 70초) 동안 사용자가 쓰다가 저장 확인 필요가 났다.
4. `pwsh -NoProfile -NonInteractive -File <release>/app-light.ps1 -Mode Inspect`, PASS면 `-Mode Deploy -Execute`. 로그는 `D:/flowme-claude-scratch/app-light-{inspect,deploy}-N.log`에 남긴다.
5. 공개 10경로 기대값을 확인하고, "이제 다시 쓰셔도 됩니다"로 닫는다.

- HOLD 뒤 같은 release 폴더는 state.json이 재실행을 막는다. 새 release 폴더를 만든다.
- 실행기 v4(복구 예외 기록, `-CheckLoad`)는 LOCAL_PASS(11/10)이고 아직 운영 적용 전이다.
- DB 구조를 바꾸는 반영은 예전 controller 절차(revision 원장, 영수증, Inspect/Deploy)를 따르고, 사용자 승인을 따로 받는다.

## 6. 복귀(롤백)

- 조건: 관측해 확인한 실패가 있고, 지금 운영 세대가 이번 반영이 기록한 세대일 때만
- 방향: 직전 빌드 하나로만. 그 전 빌드로 이어 내려가지 않는다
- 횟수: 1회
- 실패 영수증을 따로 만든다(반영 영수증을 덮지 않음). `controller.ps1 -Mode Rollback -Execute ...`
- DB 롤백은 하지 않는다. 자료가 바뀌었으면 증거를 보존하고 쓰기를 멈춘 뒤 읽기 전용으로 대조한다
- 상태를 모르면 HOLD: 아무것도 바꾸지 않고 멈춘다

## 7. 실계정 확인

| 역할 | 누가 | 하는 일 |
| --- | --- | --- |
| 쓰기 전 기준선 | 코덱스 | 운영 DB SELECT만: 보호 해시, 원문 글자 수, revision, 기록 수 |
| 화면 확인 | 총괄 | 검증 계정 001에서 정해 둔 경로 1회. 실데이터 쓰기는 이 1회뿐 |
| 쓰기 후 대조 | 코덱스 | 같은 SELECT를 다시 |
| 따로 | 코덱스 | 002(지난 미완료, 예전 형식 문서). R4 때는 범위에서 뺐다 |

- 보호 자료가 바뀌었으면 사용자 여정 전에 HOLD. 이미 완료된 할 일을 다시 완료하지 않는다.
- 확인이 끝나면 Alpha 탭을 닫는다(8절).
- 반영 전 DB 안 사본은 N4부터 매번 뜬다. 새 반영이 안정되면 이전 사본은 바깥 dump로 옮기고 지운다. DB 안에는 하나만 둔다(11/3).
- 접속 기록 7일(R7 안내문, 11/3 결정): 지금은 감시 프로그램이 앱·cloudflared 출력을 파일로 남기지 않고, events.ndjson에는 프로세스 사건만 있다. 앱·터널 출력을 파일로 남기는 변경은 7일 자동 삭제를 같이 넣어야 반영한다. Cloudflare·Supabase 쪽 로그 보존은 제공자 플랜 기간을 따른다(대시보드 값 미확인).

## 8. Supabase 한도와 전송량

| 항목 | 값 |
| --- | --- |
| egress | 9.56 GB / 5 GB (10/30, 청구기간 10/12~11/12, 유예 11/29까지). 새 기간 값은 11/12 뒤 ★확인 |
| DB | 약 229 MB / 500 MB (11/7, 10/30에는 113 MB) |
| Storage | 57.9 MB (객체 4개) |
| MAU | 4 |

- 전송량 원인: 열린 탭이 20초마다 `flowme_alpha_social_read_v1`로 계정 전체를 받는다(실계정 001은 7.33 MB). 저장 한 번에도 계정 전체 읽기가 두 번 있다.
- DB 크기의 대부분(76.5 MB)은 명령 로그다. 정리 작업이 없어 저장할 때마다 늘어난다. 500 MB 한도에 닿는 가장 큰 요인이다.
- 지킬 것: 실계정·Alpha 탭은 확인이 끝나면 닫는다. 자동 읽기·응답 크기를 바꾸는 변경은 전송량 영향을 같이 적는다.

## 9. 로컬 재현 (운영과 분리)

- 개발·QA는 운영 3105, 실계정, 실제 Supabase에 붙지 않는다.
- 후보 빌드를 합성 백엔드로 띄운다: `FLOWME_ALPHA_ENABLED=development-only`, `FLOWME_ALPHA_STAGE=test`, 합성 publishable key.
- 포트는 `3000` 또는 `3104`만 로그인 흐름이 허용된다(`alpha-persistence/environment.ts`). 둘 다 다른 세션이 쓰고 있으면 HTTP 확인만 다른 포트에서 한다. 서버를 띄우기 전에 포트가 비었는지 먼저 본다.
- QA 서버 가드(`server-guard.cjs` 사본)를 `NODE_OPTIONS --require`로 건다. 네트워크·자식 프로세스·바깥 쓰기를 막는다.
- 브라우저는 QA 드라이버 `observed-driver.cjs`(Playwright, Supabase는 가짜 응답). 드라이버는 `/alpha` 밖으로 가는 요청을 막는다.
- 끝나면 띄운 서버를 포트로 찾아 끈다.

## 10. 증거 남기는 곳

- 회차 원장: `D:/flowme-<주제>-<날짜>-01a168e3/`. 회차마다 `revisionN/{candidate,development,qa,operations,orchestrator,real-account}`
- 세션·코덱스 회신: `D:/flowme-claude-scratch/inbox/<주제>-YYYYMMDD-HHmm.md`
- 결정과 경과: 이 위키의 [결정 기록](decision-log.md)·`tasks/`
- 운영 저널은 controller만 쓴다. 손으로 고치지 않는다.
