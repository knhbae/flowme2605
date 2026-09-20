# P3-B handoff

## 목표

`D2-057 CreatorDraft 저장·재진입·관리`의 여섯 판정 단위를 React와 독립 HTML에서 fresh E4로 만들고 primary gap을 15에서 14로 줄인다.

## 현재 판정

P3-B 구현과 fresh 검증을 마쳤다. 현재 집계는 `131 충족 / 10 부분 / 4 미충족 / 11 의도적 변경 / 12 제외 / gap 14`다. P3-A의 `130/11/4/11/12`, gap 15는 이전 snapshot으로 보존한다.

`D2-057.1-.6`은 모두 current `충족 E4`이고 부모 `D2-057`만 `부분 → 충족 E4`로 승격했다. `current-verdict-overrides.json`은 `VERIFIED`다. `D2-002`와 `D2-004`는 부분으로 유지한다.

fresh 결과는 CreatorDraft focused 68/68, 개인공간 PoC 464/464, standalone 71/71, React browser 3/3, standalone 자동 walkthrough 5/5 viewport, build 18/18, trace 8/8, 보고서 browser 2/2, docs 16 files·4,594 links다. 전체 `npm test`는 기존 날짜 기준 seed fixture 한 건 때문에 1,728/1,729에서 중단됐으며 P3-B 관련 실패는 0건, tail은 220/220 별도 통과다.

## 결정한 PoC 경계

- 사용자 화면에서는 `내 초안`, 소유권 설명에서는 `제작자 초안`을 쓴다.
- 자동 복구 working draft와 명시 저장 library는 별도 key다.
- 제작자 초안 lane은 개인 폴더·개인 Flow commit·공개 action을 렌더링하지 않는다.
- 이름 변경은 library 표시 이름만 바꾸며 원문은 그대로 둔다.
- 삭제 대신 보관·복원과 one-step Undo를 제공한다.
- exact query와 `flow:poc:personal-workspace:v1:*` namespace를 유지한다.
- 제목·출처 검색의 출처 label은 exact rawText의 첫 `http(s)` URL에서 파생하며 production source metadata가 아니다.

## 남겨야 할 경계

- D2-002는 production canonical adapter가 없으므로 부분이다.
- D2-004는 PublishedVersion·ExportSnapshot owner가 없으므로 부분이다.
- 개발2의 다중 revision history와 이전 revision 복구는 별도 후속 요구다.
- 개발2 목록의 Step 수·primary artifact·상태 4종 전체는 이번 여섯 subcheck 밖의 fidelity 잔여다. 이번 구현 결과를 그 전체 요구의 완료로 넓혀 말하지 않는다.
- 실제 기기·보조기술·관찰 사용자는 자동화와 별개다.

## 게시 상태

commit, push, PR, Preview, Production은 사용자 승인 전 진행하지 않는다.
