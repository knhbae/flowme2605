# 게시 전 의존성 보안·호환성 수정 근거

2026-09-30. [개인 문서 저장 복구 확인](./spec.md)의 소유 변경 게시에 앞서 사용자가 승인한 최소 보안 선행 수정이다. 검증 위치는 `D:/flowme2605/flow-alpha-core-ux-publish-20260930`, 시작 HEAD는 `2b798d43`, Node는 `v24.17.0`, npm은 `11.13.0`이다.

## 원인과 수정

전역 `brace-expansion: 5.0.9` override에서 `npm audit --json`은 High 2건을 보고했다. 두 패키지 항목은 `brace-expansion`과 이를 참조하는 `minimatch`이며, 원인 advisory는 아래 세 건이다. 별도로 실제 `glob`·`readdir-glob` 소비자에서 중괄호 패턴을 실행하면 `TypeError: expand is not a function`이 발생했다. 두 minimatch 버전은 CommonJS 함수 API를 호출하는데 전역 override가 객체 API를 제공했다.

- [중첩 그룹 재귀 제한, GHSA-qhr7-859c-m2p7](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-qhr7-859c-m2p7)
- [쉼표 그룹 파싱 재귀 제한, GHSA-6j4f-fj2g-mc7p](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-6j4f-fj2g-mc7p)
- [재작성 반복 제한, GHSA-q2hr-2g5m-vwhr](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-q2hr-2g5m-vwhr)

공식 유지보수자 advisory의 패치 버전과 npm의 버전·integrity·소비자 요구 범위를 현재 조회했다. 전역 override를 소비자별 고정으로 바꿨다.

| 실제 소비 경로 | 유지하는 minimatch | 요구 범위 | 고정한 brace-expansion |
| --- | --- | --- | --- |
| ExcelJS → archiver → archiver-utils → glob | 3.1.5 | ^1.1.7 | 1.1.21 |
| ExcelJS → archiver → readdir-glob | 5.1.9 | ^2.0.1 | 2.1.7 |

ExcelJS → unzipper → fstream → rimraf 경로 역시 같은 glob을 사용한다. `security:audit`에는 기존 `--audit-level=high`를 유지하고 실제 소비자 호환성 검사만 추가했다. 검사는 소비자 기준으로 설치된 minimatch/brace-expansion을 해석해 함수 API와 단순·중첩 범위 확장을 확인하고, glob과 readdir-glob이 실제 두 package manifest를 찾는지도 확인한다.

## 잠금 파일 변경 범위

기존 항목 2개를 제거하고 5개를 추가했다. 이외 잠금 항목 및 모든 직접 의존성·개발 의존성 버전은 동일하다.

| package-lock.json 항목 | 변경 |
| --- | --- |
| node_modules/brace-expansion | 5.0.9 제거 |
| node_modules/balanced-match | 4.0.4 제거 |
| node_modules/concat-map | 0.0.1 추가 |
| node_modules/minimatch/node_modules/brace-expansion | 1.1.21 추가 |
| node_modules/minimatch/node_modules/balanced-match | 1.0.2 추가 |
| node_modules/readdir-glob/node_modules/brace-expansion | 2.1.7 추가 |
| node_modules/readdir-glob/node_modules/balanced-match | 1.0.2 추가 |

## 현재 검증

| 검사 | 결과 |
| --- | --- |
| 수정 전 npm audit --json | 종료 1, High 2, 나머지 등급 0 |
| 수정 전 새 dependency-compatibility 검사 | 0/4 통과, 4개 실패: 함수 API 불일치 및 expand 호출 오류 |
| npm ci | 종료 0, 223개 설치, 취약점 0 |
| npm run security:audit | 종료 0, 취약점 전 등급 0, 호환성 4/4 통과 |
| npm ls brace-expansion minimatch glob --all | 두 소비자가 각각 1.1.21·2.1.7 사용, 종료 0 |
| XLSX 관련 회귀 | 63/63 통과, 실패·건너뜀 0 |
| npm run docs:check | 종료 0, 검사 4/4 통과, 필수 파일 16개·로컬 링크 6682개 통과 |

XLSX 회귀 명령은 `npx tsx --test lib/flow/export.test.ts lib/flow/result-transfer.test.ts lib/flow/saved-plan-transfer-codec.test.ts lib/flow/saved-plan-transfer-controller.test.ts`다. 워크북 생성, 한글·날짜·열 재열기, 다운로드 바이트 및 receipt 일치 검사를 포함한다.

전체 `npm test`와 production build는 같은 후보에서 주 작업자가 최종 수정 이후 실행해 [QA 기록](./qa.md)에 기록한다. 이 문서는 해당 전체 검증·게시·배포 성공을 주장하지 않는다. CI 설정을 읽어 Node 24와 기존 `security:audit` 호출을 확인했으며 CI·hook·감사 임계값은 수정하지 않았다. 설치 시 기존 전이 의존성의 deprecation 경고는 남지만 이번 감사의 취약점 결과와 구분한다.

소유 수정은 `package.json`, `package-lock.json`, `scripts/dependency-compatibility.test.mjs`, 이 문서 네 파일이다. 기존 다른 작업 폴더는 근거 열람만 했으며, 그곳의 의존성·runtime·데이터 및 5D/laptop 스크립트는 변경하거나 가져오지 않았다.
