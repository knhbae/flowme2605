# 반복 작성물 공개 — 계약과 연결 순서

2026-09-14 · [구조 손실](recurring-publication-fidelity-gap.md)을 해결하는 실행 설계다. 전체 목표와 P06/P07·S07/S10을 축소하지 않는다. 아래 단계의 중간 완료는 사용자 기능 완료가 아니다.

현재는 [실제 공개·실행 결과](recurring-publication-release-review.md)에 따라 지원 authoring-v1의 versioned PoC 공개를 열었다. 실제 raw/native producer의 전체 model/controller 경로와 보존 자료의 공개·채택·개인 수용·실행/파일 복귀를 구분해 확인했다. 모든 종류 전환·개인 계획 충돌이나 E의 두 전체 개선 루프를 완료했다는 뜻은 아니다. 아래 C3의 공개 제한·A의 저장 validator 차단은 당시 구현 순서이며 현재 판정은 위 결과를 따른다.

## 원본과 공개 후보

- 원래 raw 제작 인계와 native D2 제작 인계를 모두 읽는다. 검증된 owner의 명시 수용 항목만 사용하며 보관·제외·검토 보류와 손상은 구분한다. 제목이나 현재 문서의 메모 문자열에서 반복을 추정하지 않는다.
- 반복은 한 항목으로 유지한다. 원문 반복 블록의 날짜·규칙·세부 확인을 별도 공개 메모 후보로 중복 표시하지 않도록 정확한 문서 행 ID를 함께 반환한다. 문서 전체나 새 개인 메모까지 숨기지 않는다.
- 후보의 내부 식별자는 origin + owner + stable row tuple이다. 제목/행 번호/판본은 식별자로 쓰지 않는다. 공개 항목 ID와 내부 원본 위치의 연결은 비공개 초안에서 유지한다.
- 후보는 선택 전 읽기 모델이다. 공개 가능 필드와 내부 원본 포인터를 분리하며 개인 실행 날짜·진행·메모·실행 이력과 private anchor는 읽지 않는다. 기존 공개 초안의 입력을 자동 덮어쓰거나 삭제하지 않는다.

## 버전 계약

반복의 의미는 `version: 1 / semantics: authoring-v1`로 구분한다. 일/주/월 간격·요일/월일·횟수 또는 종료일을 typed whitelist로 보존한다. raw 문자열·source row ID·완료 값은 공개 규칙에 저장하지 않는다. 조건 메모는 실행 필터와 구분한 별도 검토 대상이다.

회차 계산은 기존 D2 `projectAuthoringRecurrenceDates`를 재사용한다. 이 계산기는 명시 시작일을 첫 회차로 포함한다. 이를 D1 RRULE 의미로 몰래 바꾸지 않으며, 주기와 첫 시작일이 다른 경우 미리보기에서 드러내야 한다. 조회 창은 공개 반복의 종료 조건이 아니다.

현재 A reader의 대상은 raw/native D2 제작 인계다. D1의 실제 RRULE 기반 Map을 `authoring-v1`이라고 재명명하지 않는다. D1 원본에서 공개 파생을 만드는 접점도 consumer 단계에서 따로 대조하고, 의미가 다른 규칙을 일반 메모로 대체하거나 미지원인데 지원한 것으로 표시하지 않는다.

공개 시작일·시간·시간대는 규칙과 분리해 검토한다. 원본 정의를 후보로 제시할 수 있지만 개인 실행의 기준일·회차 이동·완료는 기본값으로 복사하지 않는다. 시작일 미정은 개인화 필요 상태이며 임의 오늘 날짜로 채우지 않는다.

## 구현 묶음과 완료 근거

### B의 비공개 초안 확장

`ProgramPublicationDraftRow`의 선택 필드 `recurrence.version:1`은 입력 중인 raw/end/startKind/startValue/time/timeZone을 보존한다. 글자수·허용 필드·버전은 엄격하게 검사하지만 문법이 완성되기 전에도 비공개 저장과 복구는 가능하다. 공개 입력은 별도의 typed parser를 통과해야 하며 저장 consumer gate는 아직 열지 않는다.

`seriesSource.version:1`은 원본 tuple·진짜 revision·공개 가능한 원본 facts의 정확한 snapshot이다. 개인 실행과 공개 serializer에 이 포인터를 넘기지 않는다. 독립 공개 Item ID를 발급하며, 향후 공개 성공 시 private `publications.seriesBindings.version:1`에 tuple과 Item ID의 연결만 보관한다. 읽기만으로 기존 payload를 migration하지 않는다.

새 초안은 검증된 반복 원본 하나당 미선택 후보 하나를 만든다. 기존 초안은 그대로 열며 명시 검토 후에만 수정하지 않은 원본 metadata 메모를 묶는다. 기존 제목·설명·선택·변경한 일정·별도 메모는 유지한다. 검토 중 원본/초안이 바뀌면 다시 확인하고, 같은 원본 확인이나 취소는 쓰지 않는다. 공개 이후 사본/출력이 준비되기 전의 UI는 초안·미리보기까지만 가능하다고 표시한다. 이 제한은 완료 정책이 아니라 개발 중 임시 상태다.

[같은 실제 자료의 초안 UI 결과](recurring-publication-draft-review.md)를 현재 범위로 사용한다.

C의 [공개 사본 개인 계획 계약](public-copy-plan-review.md)은 원래 authoring-v1 날짜 계산을 유지한다. 개인 revision/영수증은 공유하지만 D1 RRULE로 정규화하지 않는다. 기록이 있는 전체 이동을 이후 revision으로 처리하는 기존 개인 이동 정책은 유지하며 새 실행/초기화 정책을 만들지 않는다. 조회 자원 한도·한도 도달 시 거절과 실제 UI 미검증 범위는 해당 문서에 구별한다.

D의 [출력 복귀 계약](public-copy-output-return-review.md)은 안정적인 순서 key와 출력 당시의 일정 판본 근거를 구별한다. 같은 규칙이라도 새 판본을 명시 수용했다면 옛 출력 링크를 현재 회차로 조용히 바꾸지 않는다. 정확한 원문 행에서 비교/복구를 열 수 있으며, 준비용 reader 검사 때문에 공개 store gate를 먼저 열지 않는다.

| 단계 | 변경 지점 | 통과 조건 |
| --- | --- | --- |
| A. 계약·원본 읽기 | 순수 반복 계약, raw/native source adapter | 실제 제작 API로 만든 두 origin·일/주/월, identity·선택·개인 기록 불변·손상 거절 테스트 |
| B. 공개 수명주기 | `ProgramPublisher`, `contract`, `program-data`, `publication`, 초안 복구/충돌 | 저장된 옛 초안 입력 보존·명시 후보 갱신, 한 반복 항목 선택·공개 미리보기·불변 판본·재시도/취소/중복 |
| C. 개인 재사용 | `private-space`, 실행 source/occurrence/개인 계획/검증, `ProgramCopyInspector` | 별도 사본 identity·개인 기준일·회차/기간/완료·원본 갱신 및 두 Undo/reload, 기존 기록 유지 |
| D. 표시·출력·원본 비교 | `ProgramDiscovery`, `output`, `transient-output`, `proposal-comparison`와 관련 reader | 반복 뜻·시간대·범위를 표시하고 실제 TXT/CSV/ICS 결과 확인. 회차 나열을 공개 원본 정의로 저장하지 않음 |
| E. 통합 회귀·평가 | 동일 보존 주간 자료와 다른 반복·일반 여행 | 2개 중1개 선택, 개인16회차/기록 불변, 공개→사본→출력 연속 브라우저·반응형·허용 밖 writer0 |

A 단계에서는 새 계약을 운영 중인 PoC store validator에 아직 연결하지 않는다. B~D consumer가 준비되지 않은 상태에서 반복 payload를 허용해 조용히 일회성으로 처리하지 않기 위해서다. 기존3종 일정 payload는 읽기 시 자동 migration/쓰기 없이 유지한다. 새 계약은 운영 schema나 영구 정책이 아니다.

여섯 틀 전체 동등성·Map 삭제/다른 반복·전체10상황·두 전체 개선 루프와 실기기/외부 계정/관찰 미실행은 별도 잔여다. 새 실행·전체 백업·재공개 정책을 이 작업으로 확정하지 않는다.
