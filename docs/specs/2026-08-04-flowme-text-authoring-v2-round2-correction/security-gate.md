# TA-R2-SEC-01 의존성 보안 게이트

- 점검일: 2026-08-04 (Asia/Seoul)
- checkout: `D:\flowme2605\flow-text-authoring-ta`
- branch: `codex/text-authoring-ta-implementation-20260729`
- 시작 HEAD: `c09f859b30b854f6f897b8ec1eb781fd774fbeca`
- 대상: 잠금 트리의 High 취약점과 최소 dependency 보정
- 제외: 애플리케이션 보안 전체 감사, unrelated dependency 정리, 자동 major upgrade, 배포

## 1. 판정 요약

`brace-expansion` override를 `5.0.8`에서 `5.0.9`로 올리고 lockfile의 같은 패키지 레코드만 갱신했다. 보정 뒤 일반 감사와 production-only 감사 모두 취약점 `0`이며 Text Authoring 테스트 `161 / 161`이 통과했다.

| 판정 항목 | 결과 | 근거 |
|---|---:|---|
| 보정 전 | FAIL | High 2, Critical 0 |
| 보정 후 전체 dependency audit | PASS | `found 0 vulnerabilities` |
| 보정 후 production-only audit | PASS | High 0, Critical 0, Total 0 |
| Text Authoring 회귀 | PASS | 161 / 161 |
| 최소 변경 범위 | PASS | manifest override 1줄, lock record 3줄 |
| TA-R2-SEC-01 보안 조건 | PASS | High 0, 승인되지 않은 예외 없음 |

전체 Round 2 변경이 모인 뒤 root closeout에서 full unit과 production build도 다시 통과했다. 이 문서의 PASS는 dependency 보안 조건의 판정이고, 전체 결과는 Round 2 완료 보고에 연결한다.

## 2. 보정 전 발견 사항

### SEC-DEPS-001 — `brace-expansion` 자원 고갈형 DoS

- 원래 심각도: High
- advisory: [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895)
- CWE: CWE-400, CWE-770
- CVSS: 7.5 (`AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`)
- 취약 범위: `>=4.0.0 <5.0.9`
- 실제 설치 버전: `5.0.8`
- 직접 의존성 여부: 아님 (`isDirect=false`)
- 자동 감사 메타데이터: `fixAvailable=true`

실제 production dependency 경로는 다음과 같다.

```text
exceljs@4.4.0
└─ archiver@5.3.2
   ├─ archiver-utils@2.1.0
   │  └─ glob@7.2.3
   │     └─ minimatch@3.1.5
   │        └─ brace-expansion@5.0.8
   └─ readdir-glob@1.1.3
      └─ minimatch@5.1.9
         └─ brace-expansion@5.0.8
```

`npm audit`의 두 번째 High 항목인 `minimatch`는 별도 직접 취약점이 아니라 위 `brace-expansion` advisory의 전이 영향이다. `npm audit --omit=dev --json`에서도 같은 High 2건이 재현되므로 개발 도구에만 한정된 문제가 아니었다.

영향은 공격자가 제어하는 비정상적으로 큰 brace pattern을 해당 경로가 확장할 때 CPU·메모리를 과도하게 소비시켜 가용성을 떨어뜨릴 수 있다는 것이다. 현재 Text Authoring 입력이 이 라이브러리를 직접 호출한다는 근거는 없지만, production export dependency 안에 포함되므로 publish gate에서 제거해야 했다.

## 3. 최소 보정

### 3.1 변경

- `package.json:56`: 기존 override `brace-expansion: 5.0.8`을 `5.0.9`로 변경
- `package-lock.json:1641`: `node_modules/brace-expansion`의 version, resolved URL, integrity만 `5.0.9` 값으로 갱신
- 실행: `npm.cmd install --package-lock-only --ignore-scripts --no-audit --no-fund`
- 설치 트리 확인: `npm.cmd install --ignore-scripts --no-audit --no-fund`, `npm.cmd ls brace-expansion minimatch --all`

`npm audit fix`는 실행하지 않았다. 따라서 unrelated package 승격이나 자동 major 변경은 발생하지 않았다.

### 3.2 breaking 위험 판정

보정은 `5.0.8 -> 5.0.9`의 같은 major 내 patch 변경이다. `5.0.9`의 Node engine은 `20 || >=22`이고 프로젝트 runtime은 Node `v24.17.0`이므로 engine 충돌이 없다.

상위 `minimatch`가 선언한 원래 범위보다 높은 major를 강제하는 상태는 이번 보정 전의 `5.0.8` override부터 이미 존재했다. 이번 작업은 새로운 major 경계를 추가하지 않고 그 override를 보안 patch로만 이동했다. 남는 호환 위험은 Text Authoring의 CSV/TSV/XLSX export를 포함한 161개 테스트와 root closeout production build로 확인한다.

## 4. 검증 근거

| 명령 | 결과 |
|---|---|
| `npm.cmd run security:audit` (보정 전) | FAIL, High 2, Critical 0 |
| `npm.cmd audit --omit=dev --json` (보정 전) | FAIL, High 2, Total 2 |
| `npm.cmd ls brace-expansion minimatch --all` (보정 후) | 두 경로 모두 `brace-expansion@5.0.9` |
| `npm.cmd run security:audit` (보정 후) | PASS, `found 0 vulnerabilities` |
| `npm.cmd audit --omit=dev --json` (보정 후) | PASS, High 0, Critical 0, Total 0 |
| `npm.cmd run test:text-authoring` | PASS, 161 / 161 |
| `git diff --check -- package.json package-lock.json` | PASS |

전체 Round 2 변경까지 합친 root closeout에서 `npm.cmd test`는 `694 / 694`, `npm.cmd run build`는 static pages `18 / 18`, focused E2E는 `31 / 31`로 통과했다. dependency lane 자체에서는 충돌을 피하려 중복 build를 실행하지 않았고 root가 최종 증거를 소유한다.

## 5. 변경 소유권과 되돌리기

점검 시작 시 `package.json`에는 Text Authoring script 추가 등 선행 dirty 변경이 있었고 `package-lock.json`은 clean이었다. 이 lane이 소유하는 변경은 아래뿐이다.

| 파일 | 이 lane의 소유 범위 |
|---|---|
| `package.json` | `brace-expansion` override 한 줄 (`5.0.8 -> 5.0.9`) |
| `package-lock.json` | `node_modules/brace-expansion`의 version/resolved/integrity 세 줄 |
| `security-gate.md` | 이 감사·보정·검증 기록 전체 |

보정만 되돌릴 경우 위 manifest 한 줄과 lock record 세 줄을 함께 `5.0.8` 상태로 복원한다. 다만 그러면 High 2가 다시 발생하므로 publish gate를 green으로 표시하면 안 된다.

## 6. 종료 상태

- root closeout의 `npm.cmd test`, `npm.cmd run build`, focused E2E가 모두 통과했다.
- 최종 `npm.cmd run security:audit`은 `found 0 vulnerabilities`다.
- commit, push, PR, merge, deploy는 이 작업에서 수행하지 않았다.
- 전체 증거는 [Round 2 완료 보고](../../content-audit/2026-08-04-flowme-text-authoring-v2-round2-results/README.md)에 기록했다.
