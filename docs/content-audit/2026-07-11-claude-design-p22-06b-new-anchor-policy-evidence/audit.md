# P22-06B 새 기준일·개인 고정 날짜 정책 감사

## 문제

Flow 기준일을 바꾸더라도 개인이 특정 할 일에 직접 지정한 고정 날짜는 상대 일정이 아닙니다. 이를 자동으로 유지하면 과거 날짜가 새 실행에 섞이고, 자동으로 삭제하면 사용자 수정을 잃습니다.

## 결정

고정 날짜가 하나라도 있으면 아래 선택 없이는 `new_anchor` run을 만들지 않습니다.

1. `기존 날짜 유지`: 개인 고정 날짜를 그대로 보존
2. `새 기준일에 맞추기`: 개인 고정 날짜만 제거하고 원본 상대 일정으로 복귀

두 경우 모두 제목 alias, 사용자 메모, 포함·제외 항목은 유지합니다.

## 구현

`prepareFlowRunNewAnchor()`는 원본 personal copy를 변경하지 않는 순수 함수입니다. fixed-date override 수와 유지·초기화 수를 반환합니다.

`startFlowRunFromCompleted()`은 정책 결과를 아래 두 위치에 같은 값으로 저장합니다.

- 새 active run의 personal copy snapshot
- Calendar/export가 현재 읽는 saved Map snapshot

과거 completed run은 이전 기준일과 이전 fixed-date snapshot을 그대로 유지합니다.

## 하지 않은 것

- 사용자-facing 재사용 sheet
- 날짜 선택 기본값 자동 추정
- 새 source version 비교
- 과거 Calendar event 자동 삭제
- provider sync

## 남은 위험

- 외부 Calendar에 이미 import한 과거 파일은 FlowMe가 자동 변경하지 않습니다.
- 사용자에게 유지/재계산 선택의 차이를 짧고 명확하게 보여주는 Slice D UI가 필요합니다.
- 실제 반복 사용자가 어느 선택을 더 자주 쓰는지는 관찰 전 알 수 없습니다.
