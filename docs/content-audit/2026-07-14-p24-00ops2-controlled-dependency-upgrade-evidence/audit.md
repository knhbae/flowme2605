# P24-00OPS2 Audit

## 실행 환경

- OS: Windows / PowerShell
- Node.js: `v24.17.0`
- npm: `11.13.0`
- baseline and rollback: `3df364b52d6dffc4993aac94368bd642dfce2dad`
- worktree: isolated clean branch

처음 `npm ci`를 실행했을 때 같은 worktree를 사용하던 오래된 `next start -p 3114` 프로세스가 SWC 파일을 점유해 실패했다. 해당 PID와 worktree 경로가 일치하는 프로세스만 종료한 뒤 `npm ci`가 통과했다. 다른 workspace 프로세스나 dirty 파일은 건드리지 않았다.

## Dependency 판단

### 해결

- Next.js direct advisory를 15.5.20으로 올려 high를 제거했다.
- Playwright를 1.61.1로 올려 현재 브라우저 runner와 lockfile을 정렬했다.
- direct PostCSS를 8.5.16으로 올렸다.
- ExcelJS 하위 `tmp`는 호환 범위 내 0.2.7로 해소됐다.

### 수용한 잔여 위험

`npm audit`의 moderate 4건은 다음 dependency chain에 남는다.

1. Next.js 15.5.20이 고정한 하위 PostCSS 8.4.31.
2. ExcelJS 4.4.0이 사용하는 uuid 8.3.2.
3. 위 두 advisory가 direct/transitive package에 전파한 관련 항목.

현재 high는 0이다. `npm audit fix --force`, Next major 전환, ExcelJS downgrade는 관찰 baseline의 동작 위험이 더 커서 실행하지 않았다.

## E2E assertion 조정

Playwright upgrade 뒤 5개 실패는 runtime regression이 아니라 이전 테스트 문구가 현재 P24 화면을 따라가지 못한 경우였다.

1. 메모 분할 draft의 날짜 없는 항목은 Calendar event가 아니라 날짜 없는 할 일 선반에 보이도록 assertion을 분리했다.
2. 동일 이름의 실행 메모 버튼이 추가된 화면에서 generic role locator 대신 Step row test ID를 사용했다.
3. 반복 설정은 점진적 편집의 `세부 설정`을 펼친 뒤 검증한다.
4. 공통 날짜·시간·장소가 반복 고급 설정보다 먼저 온다는 현재 정보 위계를 검증한다.
5. 항목 export summary를 현재 범위 카피인 `원문 · 이 항목 가져가기`로 맞췄다.

제품 기능을 테스트에 맞추지 않았고, 현재 구현된 UX 계약에 테스트를 맞췄다.

## 시각 점검

### 유지된 강점

- 모바일 Today는 할 일 제목, 완료 체크, 열기 순서가 명확하다.
- 완료 후 되돌리기는 화면 하단의 한 번짜리 행동으로 바로 보인다.
- Calendar의 날짜 없는 할 일 선반은 월간 grid와 분리되어 선택·배치 목적이 읽힌다.
- export는 범위와 형식이 분리되어 전체와 선택 항목의 차이를 알 수 있다.
- 실행 메모는 `내 실행 회고`와 `원문 내용 알릴 점`을 같은 화면에서 구분한다.

### 관찰 필요

- wide My Flow의 편집 카드가 한쪽 열에 몰리고 오른쪽 여백이 크다.
- 모바일 세부 편집은 기능 수가 많아 세로 길이가 길다.
- wide export sheet는 조작 가능하지만 정보 밀도가 낮아 큰 화면을 충분히 쓰지 않는다.

이는 overflow나 접근 불가 문제가 아니다. Claude Design `(8)`의 progressive disclosure 원칙과는 맞지만, 실제 사용자가 피로하거나 길을 잃는지는 P24-00B에서 관찰해야 한다.

## 판정 경계

- 자동 QA: complete
- dependency high gate: complete
- anonymous merged production verification: merge/deploy 후 별도 확인
- 실제 사용자 관찰: not started, `0 / 15`
- P24 전체: incomplete
