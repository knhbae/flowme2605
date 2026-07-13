# P23-02A Audit

## 원인

P23-01D1 계약에는 `PersonalStructuralUserItem.schedule`과 fixed-date projection이 이미
있었다. Calendar/ICS와 list export도 해당 projection을 읽고 있었다. 그러나 My Flow의
상세 편집은 기존 날짜가 있거나 progress Flow인 row에만 날짜 input을 보여 줬다.
그 결과 새 user-created Item은 날짜를 가질 수 있지만 사용자가 fixture 없이 그 상태를
만들 수 없었다.

또한 기존 draft 저장 경로는 날짜를 personal value overlay에 저장했다. user-created
Item까지 이 경로를 사용하면 구조 소유권과 값 override가 중복되므로, 이번 작업에서
user-created Item의 날짜만 structural overlay로 보냈다.

## 소유권 결정

### Source/version

- source Item의 canonical schedule
- source Item ID와 원문 맥락
- published order와 source detail

이번 작업은 이 값을 수정하지 않는다.

### Personal structural overlay

- user-created Item의 optional fixed date
- add/delete/restore/order와 같은 개인 구조
- stable personal Item ID

날짜 제거는 별도 sentinel을 추가하지 않고 `schedule` 부재로 표현한다.

### Personal value overlay

- source Item의 기존 personal date override
- title alias와 사용자 메모

user-created Item에 남아 있을 수 있는 legacy date는 structural 저장 성공 후 제거한다.

### Execution run

- pending, done, reopened 등 실행 상태

날짜 지정·변경·제거는 execution state를 수정하지 않는다.

## UX 결정

- 개인 draft user-created Item에서만 `날짜 없음` / `날짜 지정` segmented control을 보인다.
- `날짜 지정` 선택 시 native date input을 열어 모바일 OS의 날짜 선택기를 재사용한다.
- 날짜가 있으면 `날짜 지우기`를 같은 편집 영역에 둔다.
- 제목·메모 저장과 같은 `저장` 행동으로 확정해 별도 full editor를 만들지 않는다.
- 완료, 열기, 수정, 삭제, 이동 control의 기존 역할을 변경하지 않는다.
- 시간·장소·반복 control은 이번 user-created Item 편집에서 숨겨 범위를 오해하지 않게 했다.

## 상태 전이 판정

1. 날짜 없음 → 날짜 지정: structural user Item에 `{ mode: "fixed_date", date }` 저장
2. 날짜 지정 → 날짜 변경: 같은 Item ID의 date만 교체
3. 날짜 지정 → 날짜 없음: schedule 제거
4. 완료 → 날짜 변경 → 완료 취소: execution run과 schedule membership 독립
5. reorder/delete/restore: resolver의 stable ID와 user Item schedule 보존
6. invalid date: 저장 helper가 거부하며 Item과 source 배열은 보존

## Destination 판정

- Calendar screen과 ICS는 유효한 fixed date가 있을 때만 포함한다.
- 날짜 변경 후 이전 날짜 row는 0건, 새 날짜 row는 1건이다.
- 날짜 제거 후 Calendar/ICS eligibility는 모두 false다.
- checklist/sheet/memo는 날짜와 무관하게 effective Item을 유지한다.
- sheet는 빈 날짜를 `날짜 없음`으로 표시한다.
- user-created Item에는 가짜 source 정보를 만들지 않는다.

## 실제 사용자 경로와 fixture 구분

날짜 지정·변경·제거, 완료·완료 취소, Calendar 이동, ICS 다운로드, list export는 모두
Playwright가 사용자 UI를 통해 수행했다. source/user 혼합 reorder와 tombstone 회귀는
P23-01C/D의 deterministic localStorage fixture를 유지한다. 자동화 통과를 실제 사용자
관찰 결과로 표현하지 않는다.

## 시각 점검

- 390px: date mode, native input, clear button이 한 열 안에서 겹치지 않는다.
- 390px Calendar: 선택일 row와 detail, 월간 marker가 같은 항목을 보여 준다.
- 1024px: 선택일 detail의 date editor가 기존 2열 Calendar 안에서 안정적으로 보인다.
- horizontal overflow는 전용 E2E의 각 핵심 상태에서 0건이다.
- 사용자 UI와 생성 output의 내부 구조어 hit는 0건이다.

## 남은 위험

- 시간, 종일, 시간대가 없으므로 fixed date는 현재 날짜 단위 일정만 표현한다.
- 반복 규칙과 회차별 완료가 없어 루틴형 개인 draft에는 아직 충분하지 않다.
- localStorage 손상은 resolver가 Item 유실을 막지만 클라우드 복구를 제공하지 않는다.
- source Item과 user-created Item의 날짜 UI가 서로 다른 소유권 경로를 쓰므로 이후
  공통 편집 shell 확장 시 이 경계를 유지해야 한다.
