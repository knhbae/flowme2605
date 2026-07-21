# P28-07 Audit

## Before

P28-02 projection은 다섯 shape를 계산했지만 P28-03 초기 renderer는 모든 형태를 거의 같은 두 열 목록으로 보였다. 기능적으로 count는 달랐지만 Calendar, Sheet, Memo를 실제 결과처럼 비교하기 어려웠다.

## Implemented renderers

### Flow 실행

실행 순서, 제목, 날짜/section/자료 역할을 보여준다. 완료 상태 control은 저장 전 preview에 넣지 않는다.

### Calendar

같은 날짜를 한 group으로 묶고 날짜와 일정 제목을 분리한다. 날짜 없는 row는 Calendar eligibility에서 제외한다.

### Checklist/Todo

완료 전 preview라는 의미의 비상호작용 checkbox 모양과 실행 제목을 보여준다. 실제 completion은 저장 후 My Flow/Calendar에서만 작동한다.

### Sheet

모바일에서는 순서·항목·날짜를 세로 친화적으로, wide에서는 열 구조로 보여준다. page-level horizontal overflow를 만들지 않는다.

### Memo

제목, 본문, 날짜, 자료/주의 역할을 note 단위로 보여준다. 내부 taxonomy는 노출하지 않는다.

## Shape policy

- primary exactly 1
- secondary 0~2
- not-applicable omitted
- resource/reference/warning은 completion과 Calendar에서 제외하되 Memo에는 유지
- preview count는 effective included rows에서 계산

## Export boundary

P28은 기존 export builder와 scope/receipt 계약을 재작성하지 않는다. 이 gate는 preview row identity가 기존 source/personal projection과 일치하고, 기존 Calendar/ICS/checklist/sheet/memo regression tests가 유지되는지를 확인한다. 직접 OAuth sync나 새로운 destination은 비범위다.
