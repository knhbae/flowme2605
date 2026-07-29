# P35-R7 독립 검토 체크리스트

## A. 검토 조건

- [ ] 정확한 branch와 SHA를 기록했다.
- [ ] 기존 dirty worktree를 reset, checkout, clean하지 않았다.
- [ ] current R7 Preview가 없음을 결과에 명시했다.
- [ ] 자동화와 실제 사용자 관찰을 구분했다.
- [ ] 앱 코드, dependency, 문서 상태를 수정하지 않았다.

## B. Flow 찾기와 public 결과

- [ ] URL·메모·준비된 Flow 진입이 한 서비스 문법으로 이어진다.
- [ ] 첫 viewport에서 제목, source, 실제 결과, 필요한 최소 입력, primary action이
      설명보다 먼저 읽힌다.
- [ ] primary artifact는 하나이며 secondary는 최대 둘이다.
- [ ] unsupported artifact를 disabled tab으로 늘어놓지 않는다.
- [ ] `Flow 조정` 전에는 row edit control이 화면을 압도하지 않는다.
- [ ] 한 항목의 제목·상세·날짜 수정 결과가 preview, save, Calendar, export에
      일관되게 반영된다.
- [ ] export 전에 범위와 실제 개수를 예측할 수 있다.

## C. 저장 receipt와 연속성

- [ ] 저장 성공은 별도 receipt state로 읽힌다.
- [ ] receipt의 주 행동은 하나다.
- [ ] 저장 전 입력/control이 receipt에 남아 있지 않다.
- [ ] receipt에서 연 개인 workspace가 같은 title, count, stable identity를 사용한다.
- [ ] 불필요한 Today 중간 화면이 여정을 끊지 않는다.

## D. My Flow library

- [ ] 1, 5, 20, 60개 Flow에서 검색·필터·열기 문법이 바뀌지 않는다.
- [ ] mobile row의 visible command는 최대 하나다.
- [ ] 선택한 Flow와 다른 Flow의 command가 동시에 경쟁하지 않는다.
- [ ] browser back이 검색·필터·scroll 맥락을 보존한다.
- [ ] active, completed, archived 상태를 구분할 수 있다.

## E. 개인 Flow workspace

- [ ] public preview와 동일한 Flow identity·row anatomy가 느껴진다.
- [ ] 첫 실행 단위가 콘텐츠 형태에 맞다.
- [ ] 날짜형은 같은 날짜 미완료 항목을 의미 있는 묶음으로 보여준다.
- [ ] 완료 checkbox는 제목·날짜·열기 action과 역할이 섞이지 않는다.
- [ ] 제목·상세·날짜·메모 수정은 3단계 이내에 도달한다.
- [ ] 전체 계획은 첫 실행 단위를 반복하지 않는다.
- [ ] export와 archive/delete는 실행 row를 압도하지 않는다.
- [ ] 기록이 없으면 빈 기록 UI를 만들지 않는다.

## F. shape별 실행

- [ ] Calendar: 가장 가까운 날짜 묶음이 먼저다.
- [ ] Checklist: 다음 미완료 항목이 과도한 planner UI 없이 보인다.
- [ ] Routine: series와 현재 occurrence가 구분된다.
- [ ] Sheet: 현재 행과 다음 행이 원본 순서를 보존한다.
- [ ] Memo: 가짜 완료 대상이나 합성 next unit을 만들지 않는다.
- [ ] 다섯 형태가 서로 다르지만 같은 제품의 hierarchy와 control grammar를 쓴다.

## G. Calendar

- [ ] 날짜가 있는 항목만 투영한다.
- [ ] 모바일 선택일은 bottom sheet, wide는 inspector로 보인다.
- [ ] selected-day detail은 월 grid와 멀리 떨어진 긴 inline list가 아니다.
- [ ] Calendar가 항목 편집·Flow lifecycle를 중복 소유하지 않는다.
- [ ] 완료·다시 열기와 `Flow에서 열기`의 차이가 분명하다.
- [ ] 여러 Flow scope가 긴 가로 chip 열이 되지 않는다.

## H. Export

- [ ] `whole / selected / current` 범위가 action label에 드러난다.
- [ ] preview count와 실제 output count가 같다.
- [ ] format보다 범위와 예상 결과가 먼저다.
- [ ] source, 개인 값, completion 정보의 포함·손실을 예측할 수 있다.
- [ ] receipt가 실제로 만든 결과와 다음 행동을 보여준다.
- [ ] 항목 하나 export와 Flow 전체 export가 혼동되지 않는다.

## I. 완료·복구·관리

- [ ] 완료와 다시 열기가 같은 checkbox 문법을 쓴다.
- [ ] 화면에서 항목이 사라질 때 즉시 undo가 보인다.
- [ ] 제외, 개인 항목 삭제, occurrence skip, archive, permanent delete가 다른 동사를
      사용한다.
- [ ] archive는 reversible이고 archived 목록에서 직접 restore할 수 있다.
- [ ] permanent delete는 archived Flow에서만 가능하다.

## J. 접근성과 반응형

- [ ] 390x844에서 horizontal overflow가 없다.
- [ ] 1024x768에서 mobile을 단순 확대하지 않는다.
- [ ] 1440x900에서 library, canvas, inspector의 역할이 분명하다.
- [ ] fixed navigation이 primary action을 가리지 않는다.
- [ ] DOM focus order가 header → main → local command → persistent nav 순서다.
- [ ] icon button에 accessible name과 tooltip이 있다.
- [ ] dialog/sheet가 Escape로 닫히고 trigger로 focus가 돌아간다.
- [ ] 완료·수정·열기·삭제·이동·export의 accessible name에 대상이 포함된다.

## K. 데이터 경계

- [ ] source Item이나 published order를 개인 수정으로 변경하지 않는다.
- [ ] personal overlay와 execution state가 섞이지 않는다.
- [ ] recurrence series와 occurrence completion이 섞이지 않는다.
- [ ] export identity가 날짜·순서 변경으로 바뀌지 않는다.
- [ ] UI 제안이 별도 임시 identity나 count를 만들지 않는다.
- [ ] migration이 필요하다는 주장에 데이터 근거가 있다.

## L. 결과 작성

- [ ] findings를 severity 순으로 먼저 썼다.
- [ ] finding마다 route, viewport, 재현, 기대/실제, 사용자 영향, evidenceKind가 있다.
- [ ] keep / change / defer를 구분했다.
- [ ] current와 proposed를 390/1024에서 비교했다.
- [ ] 실제 사용자에게만 확인할 질문을 별도로 적었다.
- [ ] observed-user count를 정확히 적었다.
