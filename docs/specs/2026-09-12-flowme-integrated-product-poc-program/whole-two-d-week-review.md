# 전체 목적 루프 2 · D 주간 발표 하위 체크 경로

2026-09-20. **하위 체크 문구 제안·공개·선택 수용·Undo 경로는 검사 범위에서 충족했다.** 반복 일정 자체를 변경하고 수용하는 typed schedule 경로까지 검증한 결과는 아니다. B의 제작 실행 owner와 C에서 만든 공개 사본 owner는 별개로 유지했다.

## 실행과 판정

실제 브라우저 18체크 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-d-week-2026-09-20T05-51-10-970Z.json`), 모델·store 교차검사 (로컬 전용 근거: `../../../output/integrated-product-poc/whole-two-d-week-crosscheck-2026-09-20T05-55-48-093Z.json`).

| 거래 | 실제 revision | 판정 |
| --- | --- | --- |
| C 공개 사본의 첫 월요일 2026-10-05 회차 완료 | 450→451 | public-copy identity로 완료 1건. B의 기존 creatorWorkspace와 이전 회차 기록 그대로. |
| 실제 child ID의 하위 체크 문구 개선 제안 | 451→452 | 입력 중 0쓰기. 실제 child ID 유지, 원본 일정 미변경. |
| 검토 초안 보관 → 작성자 v2 공개 | 452→453→454 | 이전 v1 불변. 첫 하위 체크 문구만 수정한 v2 생성. 개인공간 자동 반영 없음. |
| 공개 v2의 하위 체크만 명시 수용 | 454→455 | 같은 childLine에 새 문구 저장. 반복 계획·완료 기록·B owner 불변. |
| 선택 수용 거래 Undo → reload | 455→456 | revision451의 개인공간을 정확히 복원. C 월요일 완료와 공개 v2 유지. reload 추가쓰기 0. |

실제 앱 성공 거래는 **6회**다. 원래 관찰 기록의 18체크와 detached 교차검사의 11체크는 별도 검증이며, 새로운 브라우저 거래나 자동 테스트 29개로 합산하지 않는다. 이번 브라우저 실행은 실패 0, page/console error 0이었다.

## 직접 확인한 화면

선택한 하위 체크 비교 화면 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-d-week-2026-09-20T05-51-31-589Z-selected-subcheck.png`)에서는 기존 ‘도입 문장 확인’과 새 ‘도입 문장과 발표 목적을 함께 확인’, 선택된 하위 체크 및 명시 반영 버튼을 직접 확인했다.

수용 후 화면 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-d-week-2026-09-20T05-51-37-600Z-after-subcheck.png`)은 문서 상단을 보여 주며 변경된 child 행은 화면 밖이다. 따라서 수용 후 새 문구의 화면 노출까지 확인했다고 주장하지 않는다. 저장 wire의 같은 childLine 변경은 검증했다.

수용 직후 `executionAfterAcceptance` 실제 접근성 snapshot에는 C 공개 사본의 첫 월요일 10/5 완료, 뒤 월요일 10/12·19와 목요일 10/8·15·22 미완료, 각각 09:00·19:30 / Asia/Tokyo가 남아 있다. 이는 C의 실행 상태 증거다. B의 월요일 완료와 이후 개인 계획은 전체 creatorWorkspace·recurrencePlans·기존 recurrenceExecution의 exact 비교로 별도로 보존을 확인했다. 두 owner를 같은 실행 기록으로 합치지 않았다.

## 실제 모델·저장 교차검사

교차검사 스크립트 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-whole-two-d-week-crosscheck.mjs`)는 캡처 artifact만 읽고 브라우저나 프로필에 접근하지 않았다. 450/451/455/456의 전체 wire와 압축 Undo를 실제 strict decoder로 읽었다. 회차 완료, 제안, 검토 초안, 검토 채택, 개인 필드 수용, Undo를 원래 모델 함수와 `commitProgramEnvelope`로 detached 메모리에서 재현했다.

451/452/454/455/456의 SHA가 실제 관찰값과 같고 451/455/456 전체 wire도 byte-for-byte 일치했다. 453은 별도 캡처 wire/hash가 없으므로 독립 관찰 결과로 주장하지 않는다. 이후 454와 최종 전체 wire의 정확 재현에 포함된다. 보호 local/session 값은 전후 같고 허용 밖 앱 writer 0, reload observer 새 호출 0이었다. 빌드 기준 source/test 417개 비교에서 변경 0건이었다.

## 남은 범위

- typed schedule 변경 제안·공개·수용과 개인 반복 계획 충돌 처리는 별도 판정한다.
- 수용 후 실제 child 문구의 화면 노출, 추가 화면 크기·전체 접근성 검사는 이 두 캡처만으로 완료 처리하지 않는다.
- Android Chrome·iOS Safari 실제 기기 미실행, 관찰 사용자 0명.
- 전체 통합 PoC 목표는 아직 진행 중이다. 이번 artifact 검토에서 제품 코드·테스트·프로필을 바꾸거나 commit·push·PR·Preview·Production 배포를 수행하지 않았다.
