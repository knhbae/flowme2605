# P23-04 Past Run Detail And Reuse Evidence

## Result

완료한 Flow를 다시 시작할 때 이전 실행의 사용자 표시 제목, 날짜, 메모, 완료 상태, 순서, 회고를 완료 시점 snapshot으로 보관한다. My Flow의 `지난 실행`에서 당시 항목을 읽기 전용으로 다시 확인하고 체크리스트, 시트, 메모로 복사할 수 있다.

새 실행은 별도 run으로 시작한다. 이전 run은 현재 source나 현재 개인 수정값으로 다시 계산하지 않으므로, source 새 버전을 검토한 뒤 재사용해도 이전 실행 기록은 바뀌지 않는다.

## Journeys

1. 기준일 역산형 `이사 준비`: 개인 제목·날짜·메모를 수정하고 모두 완료한 뒤 회고와 전송 전 수정 메모를 남긴다.
2. 새 이사일로 다시 시작하고 이전 실행을 펼쳐 당시 24개 항목과 개인 값을 확인한다.
3. 이전 실행을 체크리스트, 시트, 메모로 복사한다.
4. 날짜 없는 체크리스트형 `여권 갱신`: 날짜 입력 없이 새 실행을 시작하고 이전 항목 snapshot을 확인한다.
5. source 새 버전이 있는 학습 Flow: 이전 source version과 개인 값을 보관한 뒤 검토한 새 version으로 새 실행을 시작한다.

## Policy

- 과거 실행 detail은 읽기 전용이다.
- 회고와 아직 전송되지 않은 원본 수정 메모를 별도로 표시한다.
- 과거 checklist/sheet/memo는 저장된 snapshot만 읽는다.
- 과거 Calendar/ICS는 중복 일정 등록 위험 때문에 다시 내보내지 않는다.
- item snapshot이 없는 legacy run은 현재 source로 추정 복원하지 않고 요약만 보여준다.

## Evidence Scope

- Mobile: 390 x 844
- Wide: 1024 x 768
- Automated Playwright journeys: 3
- Full unit tests: 474
- P23-04 targeted Playwright journeys: 3
- URL-first/public/workbench regression tests: 63 final pass; two parallel transport timeouts passed on isolated rerun
- Reload persistence: yes
- Console errors in the dated reuse journey: 0
- Actual observed users: 0

자동화 결과는 실제 사용자 관찰을 대신하지 않는다. `지난 실행`, `회고`, `가져가기`의 발견성과 24개 항목의 체감 길이는 후속 관찰 질문으로 남긴다.

## Files

- `audit.md`
- `route-evidence.json`
- `run-history-fixtures.json`
- `screenshots/00-past-run-detail-export-mobile.png`
- `screenshots/01-past-run-detail-wide.png`
