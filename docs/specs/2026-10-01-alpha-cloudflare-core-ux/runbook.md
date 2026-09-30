# 개발계 실행·복귀

이 절차는 이번에 승인한 노트북 앱 교체만 다룬다. Windows 자동 시작 등록, Tunnel 변경, 계정 쓰기·복원, DB/Auth 변경을 실행하지 않는다. 키·설정·catalog 원문은 출력하거나 복사하지 않는다.

## 고정 대상

- 후보: `D:/flowme2605/flow-alpha-cloudflare-core-ux-20261001`, base `905c4c31`와 이 목표의 소유 변경.
- 이전 앱/설정: `D:/flowme2605/flow-alpha-backup-5d-publish-20260929`, build `OzumXeWoxE3M0moIOghh_`.
- 주소: `https://alpha.wikiplans.com/alpha`. 기존 Tunnel은 loopback 3105를 계속 사용한다.
- 새 실행기는 설정 폴더만 명시적으로 참조하고 Next는 후보 폴더에서 실행한다. 신규 백업 경로 off는 환경 상속과 관계없이 유지된다.

## 사전검사와 QA

후보 폴더에서 다음을 실행한다. `--check`는 build·설정·catalog 검증이며 포트 공석 검사나 DB 연결 성공을 뜻하지 않는다. 실제 시작은 고정 포트가 비었는지도 확인한다.

```powershell
node --import tsx scripts/alpha/cloudflare-release.ts --settings-root=D:/flowme2605/flow-alpha-backup-5d-publish-20260929 --check
node --import tsx scripts/alpha/cloudflare-release.ts --settings-root=D:/flowme2605/flow-alpha-backup-5d-publish-20260929 --qa
```

QA 포트는 127.0.0.1:3106이며 공개 Tunnel에 연결하지 않는다. 브라우저 suite는 `/alpha`와 정적 JS/CSS만 QA 서버에서 읽고 Auth·개인 API를 전부 합성 처리한다. 외부 서버 검사 모드에서도 같은 쓰기 차단을 유지한다.

```powershell
node node_modules/@playwright/test/cli.js test --config tests/e2e/cloudflare-release.config.ts
# 반영 후에만:
$env:FLOWME_CLOUDFLARE_QA_MODE = 'remote-readonly'
node node_modules/@playwright/test/cli.js test --config tests/e2e/cloudflare-release.config.ts
Remove-Item Env:FLOWME_CLOUDFLARE_QA_MODE
```

## 앱 교체

1. 현재 3105 listener의 PID·시작 시각과 기록된 이전 앱을 다시 대조한다. 다른 프로세스거나 새 작업이 진행되면 중단한다.
2. 이전 build와 설정의 hash를 확인하고 원본을 그대로 둔다. 새 후보 build·검증 결과·소유 경로를 기록한다.
3. 확인한 이전 앱 child와 그 launcher만 중단하고 3105가 비었는지 확인한다. Tunnel PID는 건드리지 않는다.
4. 후보 폴더에서 위 실행기를 `--qa` 없이 실행한다. 백그라운드 실행 시 창은 숨기고 후보의 로컬 전용 로그에만 기록한다. 예상 밖 환경값·실행 인자는 받지 않는다.
5. 외부 HTTPS health의 200·빈 body·no-store, `/alpha`·callback, 기존 endpoint의 no-token 거절, 신규 백업 POST 503을 확인한다. 실제 계정 요청은 보내지 않는다.
6. 외부 정적 bundle과 QA bundle의 hash를 대조하고 동일한 합성 브라우저 검사를 실행한다. 실패하면 복귀한다.

교체 중 짧게 연결이 끊길 수 있다. 기존 탭의 입력·로그인 저장값을 지우지 않는다. 새 화면 확인은 저장 상태 확인 후 새로고침한다.

## 복귀

새 프로세스의 PID·시작 시각·listener 소유를 대조하고 **그 프로세스만** 종료한다. 3105 공석 확인 후 이전 폴더에서 다음을 실행한다. 이전 폴더에 build 명령을 실행하거나 `.next`를 바꾸지 않는다.

```powershell
node --import tsx scripts/alpha/laptop-host.ts
```

candidate/synthetic/backup opt-in 플래그를 붙이지 않는다. 기존 build를 그대로 재사용한다. 외부 health·alpha·백업 off를 확인한다. Tunnel·설정·DB/Auth·원본 파일은 계속 유지한다.

## 근거와 제약

[검증·반영 원장](./qa.md)에 실제 PID/build/파일 hash·시각·검사 결과를 남긴다. secret, 실제 계정 원문, 원시 backup/pack은 기록하지 않는다. 자동 시작·오래 열린 탭의 전체 안정성·새 5D 활성화는 별도 목표다.
