# QA 계약과 현재 근거

## 근거 원칙

- P0 체크에는 코드 경로 근거와 행동 근거가 모두 필요하다.
- screenshot은 저장/export payload 일치를 증명하지 못한다.
- unit test는 모바일 focus, fixed layer, back navigation을 증명하지 못한다.
- 기존 테스트는 새 계약을 실제로 assertion할 때만 근거로 사용한다.
- 내부 자동화, 브라우저 점검, screenshot은 관찰 사용자 검증이 아니다.
- 통과하지 않은 전체 실행을 일부 재실행 결과로 `full green`이라 부르지 않는다.

## 계약 행렬

| 영역 | 필수 assertion | 현재 최소 근거 |
| --- | --- | --- |
| Snapshot | Flow consumer가 하나의 resolved result와 version boundary를 사용 | resolver parity unit + My Flow/Item/export call-site audit |
| Date | provisional/custom/undated 약속이 저장 후에도 유지 | unit + 세 가지 공개 저장 E2E |
| 공개 수정 | 지원 필드가 저장과 지원 export에 남음 | payload/round-trip unit + E2E |
| 원자적 편집 | Apply 1회, Cancel 0회, 전체 복원 | transaction state + Back/Escape/focus E2E |
| 공개 shell | 기본 행동 1개, 한 단계 branch, receipt export 0개 | DOM action count + 390x844 브라우저 |
| 내 Flow | 실행형은 다음 1~3개와 접힌 계획, 상세 완료 동기화; memo형은 synthetic execution 0 | first-entry/shape unit + My Flow E2E |
| 메모 | 현재/legacy/private store가 손실 없이 분리되고 저장한 `memo` mode 유지 | facade/storage/snapshot unit + backup/restore fixture + UI E2E |
| Map | controller 데이터 손실 없이 공통 행동·복구 계약 적용 | action-contract unit + route/storage E2E |

Map의 이 행은 행동·복구 어댑터의 완료 근거다. Map 전체 결과가 하나의
`EffectiveFlowSnapshot`을 사용한다는 근거로 해석하지 않는다.

## 대표 결과 유형

calendar, checklist, sheet, memo, routine/execution, meal-plan을 unit/contract
matrix에서 다룬다. moving은 `provisional`, `custom`, `undated`를 각각 다룬다.
Map은 다음을 포함한다.

- 한 하위 Flow를 고르는 경로
- 여러 항목을 조정하고 한 번에 저장하는 경로
- review hold
- 보통 위험과 민감 위험
- conflict/`needs_choice` 복구

## 검증 명령

변경 소유권에 따라 목표 테스트부터 실행하고 넓힌다.

```powershell
npm.cmd run test:p35-p0
npm.cmd test
npm.cmd run build
npx.cmd playwright test <affected-specs> --workers=1
npm.cmd run test:e2e -- --workers=4
npm.cmd run docs:check
git diff --check
```

Playwright의 큰 단일 spec은 기본 실행에서 파일 내부 테스트가 병렬화되지 않을
수 있다. 실행 시간이 긴 경우 `--fully-parallel` 또는 파일별 분할을 사용하되,
최종적으로 실행하지 않은 테스트와 실패한 테스트를 각각 기록한다.

## 2026-08-01 현재 실행 근거

| 실행 | 결과 | 증명하는 범위 |
| --- | --- | --- |
| `npm.cmd run test:p35-p0` | 40/40 통과 | snapshot, export, first-entry, memo facade, Map action 계약 |
| `npm.cmd test` | 597/597 통과 | pretest, P35 P0, 전체 unit/contract 회귀 |
| `npm.cmd run build` | 통과 | 현재 source의 production build |
| `npm.cmd run security:audit` | 취약점 0개 | 현재 dependency tree의 npm audit |
| 영향 범위 Playwright 목표 세트 | 통과 | 날짜, 편집, 공개 저장/export, receipt, My Flow 완료·메모, Map 계약, 390x844 |
| `npm.cmd run docs:check` | 통과 | 14개 필수 문서/3,626개 로컬 링크 |
| 전체 Playwright | 57개 spec, 413/413 통과 | 최종 source와 production build의 전체 E2E 회귀 |

전체 회귀 과정에서 승인된 새 구조와 충돌한 과거 assertion은 현재 계약으로
갱신했다. 별도로 발견한 다음 네 가지 제품 회귀는 코드와 회귀 테스트로
수정했다.

- 전체 계획이 현재 실행 묶음의 항목을 제외하던 문제
- 사용자 생성 timed 일정이 Item ICS에서 all-day로 바뀌던 문제
- Calendar 반복 회차 deep link가 정확한 회차 상세를 열지 못하던 문제
- 저장한 `memo` 결과형이 calendar/checklist로 정규화되어 가짜 실행·진행률을 만들던 문제

첫 전체 재실행은 410/413 통과했고, 남은 세 건은 제품 화면이 정상으로 나타난
뒤 테스트가 약 0.1초 일찍 분기한 동기화 경쟁이었다. 대기 조건을 보강한 뒤
정확 재실행 3/3과 최종 전체 재실행 413/413을 모두 통과했다.

목표 모바일 테스트는 390x844 viewport에서 action visibility, Back/Escape,
focus return, horizontal overflow, console error, page error를 함께 확인한다.
다운로드는 파일 존재만 보지 않고 text/XLSX/ICS payload를 검사한다.

## 완료 판정

완료에는 다음이 모두 필요하다.

1. [tasks.md](./tasks.md)의 체크 항목별 근거
2. 이 작업 소유 경로의 scoped diff 확인
3. 실행한 검증의 pass/fail/skip 기록
4. local edit, commit, push, PR, merge, deploy, observed-user 상태 분리
5. 남긴 아키텍처 경계와 재개 조건 기록

상세 판정은 [completion-audit.md](./completion-audit.md)를 따른다.
