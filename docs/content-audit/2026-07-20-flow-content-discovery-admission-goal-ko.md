# FlowMe 콘텐츠 발굴·편입 기준 확정 목표

아래 텍스트는 다음 콘텐츠 발굴 세션에서도 그대로 사용할 수 있는 수정본이다.

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
FlowMe에 가져올 원문 콘텐츠를 발굴하고, 각 후보를 Link/Bucket · Quick Flow · Full Flow · Hold/Reject 중 어디까지 편입할지 같은 기준으로 판정한다.
새 Flow 런타임이나 편집기를 설계하는 작업이 아니라, 기존 canonical Flow 계약·Taxonomy v1.1·Output Quality v2·P25/P26을 재사용해 콘텐츠팀의 source scout 및 승격 규칙을 확정한다.
앱 코드와 seed는 수정하지 않는다.

핵심 질문:
1. 이 원문은 한 사용자의 한 목표와 한 자연스러운 결과물로 설명되는가?
2. 실제 URL에서 일정·표·체크·파일·영상 행을 확보할 수 있는가?
3. 원문을 다시 보는 Link/Bucket이면 충분한가, 한 세션 Quick Flow인가, 날짜·순서·분기·역할·진도가 필요한 Full Flow인가?
4. 지금 안전하게 편입 가능한 단계와 source·rights·freshness·safety 보강 후 목표 단계는 각각 무엇인가?
5. 저장 직후 사용자가 얻는 결과와 첫 행동이 현재 /flows · /my · Calendar · export 틀에서 5초 안에 보이는가?
6. 제작자가 원문 유입과 출처를 보존하면서 자신의 Flow를 홍보·수정·fork할 이유가 있는가?

편입 기준:
- Link/Bucket: 정확한 URL·제목·출처·저장 이유만 보존한다. 임의 Item과 날짜를 만들지 않는다.
- Quick Flow: 한 세션 또는 한 결정에서 끝나는 최소 행동만 둔다. 항목 수는 보조 신호일 뿐 하드 리밋이 아니다.
- Full Flow: 날짜·순서·분기·역할·진도 중 하나 이상이 실행 성공에 중요할 때만 사용한다.
- Hold/Reject: 원문 행·최신성·권리·안전·적용 범위가 부족해 사용자를 실행시키면 안 되는 상태다.
- 구조 tier와 공개 gate를 분리한다. source row, rights, freshness, safety, locale을 각각 기록한다.

최소 입력:
- 열람과 날짜 없는 저장은 입력 0개가 기본이다.
- 결과를 바꾸는 기준일·선택·역할만 보통 0~1개, 예외적으로 최대 3개까지 묻는다.
- 예시 날짜는 미리보기이며 사용자 일정으로 저장하지 않는다.
- Calendar/checklist/todo/sheet/memo는 Flow 종류가 아니라 같은 Item의 projection이다.

작업:
1. 현재 P0 24개와 기존 source scout 후보를 중복 제거된 기준선으로 읽는다.
2. 신규 후보 URL을 실제로 열고 source shape, 행 확보, 보이는 수요, 권리, 민감도, 제작자·커뮤니티 가능성을 기록한다.
3. 현재 P0 24개를 네 편입 단계로 재분류하고 과도한 Item·임의 날짜·완료 기준을 표시한다.
4. 다음 콘텐츠 제작 후보 6~8개와 Link/Bucket·Hold 대조군을 확정한다.
5. 현재 UX/UI surface와 모바일 390px에서 실제 사용 가능한지 판정한다.

산출물:
- 콘텐츠 발굴 편입 계약 JSON
- 현재 P0 24개 재분류 원장 JSON
- 신규 웹 후보 검증 원장 JSON
- CEO·제품·콘텐츠팀용 12~14장 PPT형 한국어 HTML

완료 기준:
- 모든 후보에 실제 URL, source shape, 보이는 수요와 추론 수요의 구분, 현재 tier, 목표 tier, gate, 다음 행동이 있다.
- P0 24개가 빠짐없이 재분류된다.
- 다음 제작 후보 6~8개와 제외·보류 이유가 명확하다.
- 사용자 최초 입력은 기본 0~1개로 설명된다.
- 앱 코드와 seed는 변경하지 않는다.
- JSON 파싱, docs:check, 390px·1280px HTML 렌더링을 검증한다.
```
