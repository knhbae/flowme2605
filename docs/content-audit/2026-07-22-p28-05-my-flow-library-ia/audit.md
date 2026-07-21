# P28-05 Audit

## Information hierarchy

`지금`, `Flow 목록`, `완료`의 local navigation은 유지한다. Flow 목록 안에서는 다음 정보만 먼저 보인다.

1. Flow 이름
2. 콘텐츠 형태와 날짜 범위 또는 날짜 없음
3. 전체 진행
4. 다음 할 일

선택 상세에서만 전체 outline, 날짜/반복 설정, 가져가기, 원문, 보관을 보여준다.

## Responsive behavior

### 390px

- 기본 상태: compact Flow 목록
- row 선택: 한 Flow 상세
- back: 같은 Flow 목록으로 복귀
- 한 화면의 Flow 상세 수: 1

### 1024px

- 왼쪽 18rem library rail
- 오른쪽 selected detail
- 20개 이상에서도 동일 문법
- 검색과 상태 filter는 rail utility로만 노출

## Preserved behavior

- 완료와 다시 열기
- 기준일/반복 설정
- item 수정과 구조 조정
- 전체/선택/item 가져가기
- 보관, 즉시 되돌리기, 보관됨 filter
- source-backed update notice

## Residual risk

현재 목록은 27개 fixture에서 정상 동작하지만 50개 이상에서는 virtualization을 아직 사용하지 않는다. 실제 성능 또는 탐색 실패가 관찰될 때만 pagination/virtualization을 연다.
