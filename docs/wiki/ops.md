# Alpha 운영

2026-10-30 · 운영 중인 Alpha가 어떻게 돌고, 어떻게 반영·복귀하는지 한곳에 모은다. 원장 경로는 링크가 아니라 코드 표기로 적는다. 키·자격 정보와 계정 정보는 적지 않는다.

## 1. 지금 운영 중인 것

| 항목 | 값 |
| --- | --- |
| 공개 주소 | `https://alpha.wikiplans.com/alpha` |
| 내부 앱 | `127.0.0.1:3105` (`next start`) |
| 상태 확인 | `http://127.0.0.1:13105/status` (supervisor, 이 PC에서만) |
| 운영 빌드 | R4 `jhhnmp4NXb89Fh2IoLT8w`, 커밋 `c37dbcab` (10/30 07:21 KST 반영) |
| appRoot | `D:/flowme-alpha-today-classification-20261029-01a168e3/revision4/followup-c37dbcab/candidate` |
| 직전 빌드 | R3 `R7kGo8FaKQJkamGJKSeMN` (`.../revision3/candidate`) |
| 쓰기 UI 설정 | `nativeAuthoringUi: enabled` |

appRoot가 `revision4/candidate`가 아니라 `revision4/followup-c37dbcab/candidate`인 점에 주의한다. 기준은 supervisor의 `manifest.json`이다.

> 10/30: 운영은 R4h다. 공개 주소에서는 `/alpha`와 그 아래, 로그인 콜백, Alpha API, 정적 파일, `/my`만 열리고 나머지는 404다(경로 차단). 그 전까지는 예전 화면과 예전 쓰기 API가 공개돼 있었다.

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
| `.../revision4/followup-c37dbcab/candidate` | 운영 R4 appRoot |
| `.../revision3/candidate` | 복귀 대상 R3 appRoot |
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

순서

1. 후보 고정: 커밋, 빌드 ID, appRoot, 소스 핀
2. 검사: 바뀐 범위 시험, `tsc -p tsconfig.next.json` 0, 전체 tsc 기준선(8오류·2파일), `next build`
3. 통합 QA: 고정 후보 하나로 합성 QA(코덱스). 결과를 경로·SHA로 고정
4. 사용자 몫 확인이 남았으면 멈춤
5. 반영 판단과 영수증 작성
6. controller 실행(5절), 실계정 확인(7절), 마감 기록

## 5. controller 절차 (R4 기준)

회차 폴더 `revisionN/operations/`에 `PLAN.json`, `controller.ps1`, `manifest.candidate.json`, `execution.json`(실행 저널)을 둔다. 영수증은 `revisionN/orchestrator/operating-approval.json`이다.

1. Inspect(읽기 전용): `controller.ps1 -Mode Inspect -VerifyCandidate`
2. 영수증 작성(코덱스 READY 뒤 총괄)
3. 영수증 검증 Inspect: `-AcceptedPlanSHA256`, `-ApprovalReceiptPath`, `-ApprovalReceiptSHA256`을 더해 다시
4. Deploy: `-Mode Deploy -Execute` + 같은 세 인자
5. 모드마다 작업 시작은 최대 1회. 자동 재시도·자동 복귀 없음

R4 반영 때 실제 순서(10/30): 작업 실행 창 확보 → supervisor 정지(앱·터널이 따라 끝남) → `manifest.json` 한 파일 교체 → 등록된 작업 시작 → 앱·터널 기동. 공개 주소가 끊긴 시간은 약 45초였다. 저널 결과는 PASS, 운영 변경 3, 서버 시작 1, DB 쓰기 0.

다음 회차는 R4를 직전 빌드로 삼는 새 PLAN·controller가 필요하다. R4 controller는 R3↔R4 쌍에 묶여 있다.

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
- 배포 전 DB 스냅샷은 R4 때 없었다. 다음 회차부터 할지는 정해야 한다.

## 8. Supabase 한도와 전송량

| 항목 | 10/30 |
| --- | --- |
| egress | 9.56 GB / 5 GB (청구기간 10/12~11/12, 유예 11/29까지) |
| DB | 113 MB / 500 MB |
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
