# 전체 루프 2 · D F-note 검증 원장

2026-09-20. 범위는 [승인 계획 D](whole-loop-two-plan.md)의 일반 필드 충돌·구판 제안·부분 수용이다. F-week, 두 탭 충돌, 최종 철회는 이 원장의 완료 판정에 포함하지 않는다.

## 실행 결과

| 구간 | 실제 결과 | 증거 |
| --- | --- | --- |
| 개인 제목·설명·날짜/진행/메모 | 436→439, 성공 저장 3회. 17개 검사 뒤 잘못된 전체 행 ID 보존 가정에서 실패 | `whole-two-d-note-prepare-2026-09-20T05-40-30-740Z.json` |
| 작성자 v2 | 439→443. 공개 항목 제목·설명만 변경, 완료 기준 유지. 31개 통과 | `whole-two-d-note-v2-2026-09-20T05-43-11-251Z.json` |
| 실제 구판 v1 제안→검토→v3 | 443→446. 완료 기준만 제안·채택. 구판/반영 판본의 정확 항목 복귀. 12개 통과 | `whole-two-d-note-proposal-2026-09-20T05-46-00-518Z.json` |
| 충돌 선택·수용·Undo·reload | 446→450. 제목 유지, 설명 명시 수용, 완료 기준 별도 수용, 역순 Undo. 65개 통과 | `whole-two-d-note-accept-2026-09-20T05-47-24-486Z.json` |

위 브라우저 JSON은 모두 `output/playwright/integrated-program/`에 있다. 첫 실패를 성공으로 재분류하거나 소비한 runner를 재실행하지 않았다. 성공한 후속 runner의 검사는 108개이며 첫 runner의 중단 전 검사 17개는 별도로 유지한다.

## 잘못된 검사 가정과 실제 행 계약

초기 runner의 “기존 모든 행 ID가 남아야 한다”는 가정이 과도했다. 수동 raw 편집에서 날짜 property 한 줄을 바꾸면서 메모 property를 삽입하면, `vendor/text-model.cjs`의 reconcile은 서로 다른 두 property를 이전 한 property와 임의로 동일시하지 않는다. 기존 날짜 행 ID 하나가 사라지고 새 날짜·메모 행 ID가 생겼다. task/source 행과 나머지 기존 metadata ID는 유지됐다.

실제 `M.editText`로 세 입력을 다시 계산한 수동 편집 모델 증거 (로컬 전용 근거: `../../../output/integrated-product-poc/whole-two-d-note-manual-model-2026-09-20T05-54-21-214Z.json`)는 8개 통과, 최종 TextWorkspaceState 전체가 실제 439와 일치했다. 살아남은 새 행 UUID만 관측값을 공급했으며 reconcile이 버리는 임시 UUID는 미관측 난수다. 이 결과를 중간 전체 store/커서 상태의 byte 검증으로 확대하지 않는다.

반면 공개 설명·완료 기준의 명시 수용은 이미 지정된 해당 metadata 행을 갱신한다. 이 구간에서는 해당 행 ID를 포함한 나머지 전체 개인 상태의 보존을 실제로 확인했다. 수동 편집의 행 재식별과 원문 필드 수용을 같은 계약으로 보지 않는다.

## 저장·Undo 교차검증

실제 생산 함수·strict store 재생 (로컬 전용 근거: `../../../output/integrated-product-poc/whole-two-d-note-crosscheck-2026-09-20T05-51-43-577Z.json`): 69개 통과. 브라우저/누적 프로필을 열지 않고 detached 메모리에서만 수행했다.

- 실제 draft factory/save/publish로 439→443을 재생해 최종 443 wire 전체 일치.
- 443→446은 실제 구판 제안, 검토 초안, 채택 함수로 재생. 444 관측 SHA 및 446 전체 wire 일치.
- 설명 447·완료 기준 448은 실제 preview/transition/strict commit과 전체 wire 일치.
- 실제 `planProgramUndo`로 449 관측 SHA, 450 전체 wire와 확장 Undo 구조 일치.
- 두 수용은 별도 이력이다. Undo는 개인 workspace를 역순 복원하되 공개 v3와 두 receipt를 보존했다.

v2의 임시 440–442 draft wire/updatedAt은 캡처되지 않았다. publish/save는 `history:false`라 실제 443 Undo에도 그 초안이 없다. 재생에서는 임시 초안 시각에 관측 v2.createdAt을 사용했고, 최종 443에서 소비·제거되는 초안의 미관측 중간 bytes는 exact라고 판정하지 않았다. 이후 관측 전체 wire는 입력값이나 validator를 덮지 않고 비교했다.

선택·취소·Escape·제목 유지에는 저장이 없었다. quota 1회는 기존 storage observer보다 바깥에서 차단했으므로 별도 `__dNoteFault`에 실패가 남고 기존 observer에는 성공 4회만 남는다. 실패/재시도 requestId와 fingerprint는 같았고 원래 wrapper를 정확히 복원했다. reload 이후는 새 observer generation이며 이전 observer의 연속 관측이라고 부르지 않는다.

## 화면 및 데이터 경계

accept 캡처의 `selected-390/375/844/1024/1440.png` 다섯 장을 직접 열어 확인했다. 390×844·375×812는 비교 본문이 세로로 배치되고 적용/취소 버튼이 보인다. 844×390은 스크롤 위치상 제목이 위로 나가지만 비교 본문·선택·적용/취소는 보인다. 1024×768·1440×900에서는 두 내용이 나란히 읽힌다. 다섯 크기에서 핵심 적용 버튼의 44px 높이·가림 없음·가로 넘침 없음이 측정됐다. 긴 모달 전체가 한 화면에 동시에 보인다는 뜻은 아니다.

네 runner 모두 page error 0, console error 0. 실제 Android Chrome/iOS Safari 미실행, 관찰 사용자 0명이다.

기존 공개 판본/다른 actor/참조/진행 기록과 B를 포함한 개인 workspace를 보존했다. ordinary 프로필은 처음부터 운영 key가 0개였다. 따라서 여기서의 증거는 빈 운영 key 집합의 전후 일치와 허용 Program key 외 쓰기 0이며, 데이터가 채워진 운영 프로필을 검증했다고 표현하지 않는다.

F-note 구간 종료: revision **450**, SHA `685b94d2c080ee0f0555069f43d30f778016999834fe834ecff5e18aa94cf612`, reload generation `1789883277811.6`, observer offset `0`. 이후 root의 F-week 작업으로 현재 누적 상태는 더 진행될 수 있다.

제품 코드 변경 없음. 신규 QA runner와 이 원장만 추가했다. 이 작업에서 commit·push·PR·Preview·Production 배포는 하지 않았다.
