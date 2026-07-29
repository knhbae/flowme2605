# P35-R2 Contextual item personalization evidence

- 작성일: 2026-07-27
- 작업 브랜치: `codex/p35-mece-ux-reset`
- 기준 `origin/main`: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 선행 owner checkpoint: `P35-R0 approved_after_revision`
- 실제 관찰 사용자 수: `0`

## 판정

`P35-R2`의 public 저장 전 결과에서 한 항목의 제목, 상세 내용, 날짜를
바꾸는 최소 경로를 연결했다.

- 모바일: 결과 행의 `수정`을 한 번 누르면 bottom sheet가 열린다.
- wide: 같은 행동이 오른쪽 inspector로 열린다.
- 동시에 열리는 항목 editor는 최대 1개다.
- 저장 전 미리보기는 개인 수정값을 읽고 source Item은 바꾸지 않는다.
- `내 Flow로 저장`할 때 기존 My Flow item draft/date override 저장 경로로
  승격한다.
- 저장 후 My Flow와 Calendar는 같은 stable Item ID, 제목, 날짜를 읽는다.

owner 피드백에 따라 `포함 항목` 목록도 콘텐츠를 왼쪽에서 읽고 포함
checkbox를 각 행 오른쪽 끝에 두는 문법으로 통일했다.

## 구현

1. `public-item-personalization` pure adapter가 public 화면의 임시 수정값을
   `FlowExperienceItemOverride`로 투영한다.
2. 저장 시 기존 canonical item draft key와 fixed-date override key를
   사용한다.
3. 제목·상세·날짜 중 실제로 편집한 필드만 갱신하며, 날짜만 바꿔도 기존
   개인 메모가 지워지지 않는다.
4. 모바일 sheet와 wide inspector는 같은 form과 save handler를 사용한다.
5. add, delete, reorder, time, recurrence, source mutation은 추가하지 않았다.

## Screenshot

- [모바일 한 항목 수정 sheet](./screenshots/p35-r2-item-editor-390.png)
- [모바일 저장 후 My Flow](./screenshots/p35-r2-my-flow-personalized-390.png)
- [wide 오른쪽 item inspector](./screenshots/p35-r2-item-inspector-1024.png)

## 검증

- pretest: `84 / 84` 통과
- unit: `590 / 590` 통과
- P35-R2 targeted E2E: `2 / 2` 통과
- 기존 P35 one-kind adjustment E2E: `5 / 5` 통과
- 기존 moving My Flow/portable export/Calendar E2E: `1 / 1` 통과
- P35-R0 temporal parity 재검증: `1 / 1` 통과
- production build: 통과
- 390px / 1024px:
  - horizontal overflow `0`
  - 한 번에 열린 editor 최대 `1`
  - console/page error `0`
  - checkbox가 행 콘텐츠보다 오른쪽에 있음

전체 E2E와 독립 final gate는 `P35-R7`에서 다시 실행한다.

## Publish

- commit: 없음
- push: 없음
- PR: 없음
- merge: 없음
- preview 배포: 없음
- production 배포: 없음

자동화와 screenshot 검증은 실제 사용자 관찰이 아니다.
