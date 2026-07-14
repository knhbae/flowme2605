# P24-00U4 실행 중 메모 Evidence

## 판정

`supported` - My Flow와 Calendar의 실행 행에서 상세 편집을 열지 않고 한 번에 실행 메모를 남길 수 있다. 개인 메모와 원본에 알릴 점은 별도 상태로 저장되고, Flow 완료 시 자동으로 나뉘어 모인다.

새 평가·태그 입력은 요구하지 않는다. 메모가 없는 Flow에는 완료 집계 영역도 추가되지 않는다. 새 실행을 시작하면 현재 메모는 비워지고, 이전 실행 snapshot과 지난 실행 메모 내보내기에는 보존된다.

## Claude Design `(8)` 반영

- 행 단위의 작은 메모 진입점
- 완료 뒤에만 쓰는 회고가 아니라 실행 중 바로 기록
- 완료 시 항목별 메모 자동 수집
- 별점·태그·필수 평가 없음
- 개인 메모와 원본 수정 의견 분리
- 원본 수정 의견은 실제 전송 전까지 `아직 전송되지 않음`으로 표시

목업 G의 아이디어를 그대로 큰 후기 화면으로 만들지 않고 Today, Calendar, My Flow가 공유하는 실행 행에 연결했다. 기존 제목·날짜·구조 메모 편집은 변경하지 않았다.

## 적용 범위

- 실행 행의 한 번 탭 메모 진입
- 개인 메모와 원본에 알릴 점 동시 보존
- 반복 회차별 row identity 분리
- 완료 화면 자동 집계
- 완료 실행 snapshot 및 지난 실행 화면 보존
- 지난 실행 memo export 보존
- 재사용 시 현재 실행 메모 초기화
- 로컬 데이터 백업 포함

## 제외 범위

- 원본 작성자에게 실제 전송
- 공개 리뷰·별점·태그
- 계정·cloud sync
- 구조 메모와 실행 메모 병합
- 실제 사용자 관찰 결과

## 증거

- [audit.md](./audit.md)
- [route-evidence.json](./route-evidence.json)
- [행 실행 메모, mobile](./screenshots/00-inline-execution-note-mobile.png)
- [완료 메모 자동 집계, mobile](./screenshots/01-completion-note-aggregation-mobile.png)
- [완료 메모 자동 집계, wide](./screenshots/02-completion-note-aggregation-wide.png)
- [새 실행 후 지난 실행 메모, wide](./screenshots/03-past-run-notes-wide.png)

## 검증 성격

스크린샷과 상태 전이는 Playwright 자동 시뮬레이션 결과다. 실제 관찰 사용자 세션은 `0`건이다. 사용자가 연필 아이콘을 실행 중 메모로 이해하는지, 원본 보완 의견을 실제 전송으로 오해하지 않는지, 메모 집계가 완료 회고 부담을 줄이는지는 P24-00B에서 관찰해야 한다.

## 현재 실행 결과

- `npm.cmd test`: 514/514 pass
- `npm.cmd run docs:check`: pass, 14 required files / 2142 local links
- `npm.cmd run build`: pass, Next.js 15.3.8
- U4 browser journey: 1/1 pass
- P24 + URL-first + public share + workbench: 77/77 pass
- 완료·재사용·지난 실행 targeted: 3/3 pass
- 모바일 390px / wide 1024px horizontal overflow: 0
- console error: 0

77개를 4 workers로 처음 실행할 때 production server가 메모리 부족으로 4개 route navigation에서 종료됐다. 기능 assertion 전에 중단된 4개만 1 worker로 재실행해 4/4 통과했다. 제품 회귀와 실행 환경 자원 한계를 구분해 기록한다.
