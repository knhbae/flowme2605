# 전체1 연속 사용 — 실제 행동과 남은 검증

2026-09-14 · 전체 목표 진행 중. [전체 실행표](final-whole-loop-plan.md)의 같은 자료·목적을 이어 사용한다. 아래 부분 결과를 전체10상황 또는 두 전체 개선 완료로 세지 않는다.

## S01~S03: 독립 문서를 쓰고 이틀 진행한 뒤 정리하기

사용 목적은 Flow를 만들거나 공개하지 않고 개인 준비 메모·하위 체크를 작성해 폴더에 두고, 같은 항목을 다른 문서와 기간 보기에서 이어 실행하는 것이다. 실제 UI로 만든 문서·폴더·행 ID를 유지하며 기존 제작 초안·공개 판본·다른 인물 자료는 버리지 않았다.

| 원래 요구 | 실제 행동·결과 | 남은 범위 |
| --- | --- | --- |
| P01 독립 문서·폴더·복구 | 새 문서2개·원문 입력·폴더 지정. 휴지통 취소0, quota 실패·같은 입력 재시도, 복원·두 Undo·reload | 긴 자유 기록/검색 실패는 두 번째 목적 상황. 최종판 전체 재대조 필요 |
| P02 같은 항목과 날짜별 누적 기록 | 9/13의10%, 9/14의20%, 과거9/13만15%로 수정. 주간·전체에 같은20%, 완료/다시 열기·두 Undo, 참조 문서 연결·원문 복귀 | 다른 반복/개인 계획은 별도 상황. 실기기 입력 미실행 |
| P03 이동 의미·P08 복구 | 자기 하위 대상 제외, Escape0, 키보드로 하위 묶음 이동·행 ID/기록 보존·Undo. 개인 실행 날짜 이동·취소·Undo/reload | 기존 drag/touch QA를 이번 실행으로 재계산하지 않음. 실제 터치 미실행 |

## 실패를 숨기지 않고 이어 검증한 과정

1. 처음14확인 뒤 실패 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s01-s03-preflight-2026-09-14T11-06-36-449Z.json`): 2pi 실행판의 quota 거절 뒤 휴지통 확인 메뉴가 닫혀 같은 요청의 재시도 버튼이 보이지 않았다. 실제 제품 결함이며 데이터는 revision287에 보존했다.
2. `ProgramSpace`에서 휴지통 작업만 기존 확인 메뉴를 유지하도록 수정했다. 다른 화면을 여는 작업은 메뉴를 닫는다. 실제 핸들러의 실패·성공·이동·인물 변경·예외·미제출 제목 보존 회귀를 추가했다.
3. 새 woSE 실행판의17확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s01-s03-resume-2026-09-14T11-20-14-741Z.json`): 같은287에서 quota 실패 시 확인 버튼이 보임, 원문 불변, 같은 요청 재시도·복원·Undo를 확인했다. 마지막 단언은 비동기 Undo 완료 전에 읽어 실패했다. 최종291의 원문·폴더·행 ID가 시작과 정확히 같았고 휴지통 표시는 없었다. 이 단언 오류를 제품 데이터 유실로 부르지 않는다.
4. 같은291에서 이어35확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s01-s03-continued-2026-09-14T11-23-56-994Z.json`): 전체 상태 hash를 앞선 불변 기록과 대조한 뒤 재생성·초기화 없이 S01 끝→S02→S03을 마쳤다. 세 상황 상태 complete, 오류0, 허용 밖 쓰기0, 기존 문서/Flow/폴더/기록/연결/다른 인물/공개/개인 owner 보존을 확인했다. 이 프로필의 운영 보호키 수는0이므로 채워진 운영 key 불변 증거로 확대하지 않는다.

## 직접 본 화면과 내부 평가

- 390×844 문서 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s01-s03-resume-2026-09-14T11-23-58-225Z-s03-390.png`): 탐색·문서 작업·편집 도구·20% 행이 보이며 가로 넘침0. 긴 QA 식별자가 줄바꿈되어 하위 항목이 아래로 길어진다. 세로 스크롤 필요를 화면 전체 완료로 오해하지 않는다.
- 1194×834 문서 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s01-s03-resume-2026-09-14T11-23-58-225Z-s03-1194.png`): 문서 목록과 편집/실행을 함께 볼 수 있고 가로 넘침0. 긴 문서 제목의 목록 줄바꿈은 남는다.
- 진행 입력부터 확인된 기록까지1680/1556/1785ms였다. 이 PC의 세 번 관측이며 일반 성능 기준이나 실제 사용자의 완료 시간이 아니다.

`flow-ux-review` 기준으로 복구 경로는 실제 실패를 고쳐 다시 확인했다. 별도 안내 카드를 더하지 않고 원래 메뉴 안에서 재시도할 수 있게 했다. 시인성·조작3/5는 긴 제목과 스크롤·누적 자료의 응답 부담이 남는 해당 화면의 내부 평가다. 실기기/OS 입력기/보조기술·관찰 사용자 검증은 미실행이다.

## S04 무저장 출력과 S05 발견·복귀

S04와 S05 시작 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s04-s05-recovered-2026-09-14T11-32-16-916Z.json`)은 woSE 실행판의35확인 뒤 S05에서 중단됐다. S04의 등록 URL·미지원 URL 보완·명시 확인·선택 수정·TXT/CSV/ICS 실제6파일은 미리보기와 다운로드 bytes가 같았다. 날짜 미정의 ICS 제외 안내, 출력 취소와 원문 입력의 별도 보존, 문서/사본 생성0·저장0·reload를 확인했다. 이 기록 전체의 상태는 실패이며 S04만 완료로 구분한다. 실제 외부 수집·외부 도구 import의 증거는 아니다.

S05 첫 단언은 질문 저장이 끝나기 전에 읽었다. 저장된 정확한 질문을 버리거나 새로 만들지 않고 기존 질문에서 이어18확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s05-continued-2026-09-14T11-34-32-859Z.json`)을 수행했다. 질문의 원본/판본/항목, 원본 진입과2항목 일부 사본 생성은 성공했다. 그러나 내 공간에서 탐색으로 돌아왔을 때 검색어는 남고 분야·상황이 기본값으로 바뀌었다. 이는 실제 화면의 맥락 복귀 결함이며 중복 가져오기·두 문서 참조·실행·질문 복귀는 아직 완료하지 않았다.

누적 상태는 revision311, 사본 `copy-8ba20a50-df86-4105-8127-aaaa6ef4c4d4`와 질문 `post-d7971f54-e9c1-4d72-acd8-9b94bcb57ae8`을 보존했다. 허용 밖 쓰기0과 기존 자료 보존을 확인했지만 이 프로필의 운영 보호키는0개다. 실패를 수정한 새 실행판에서 같은 상태를 이어 검증하며 초기화·직접 저장값 주입으로 성공을 만들지 않는다.

## S05 후속: 같은 질문과 사본으로 왕복 완료

`IW8LsXxwu6E9dExSGidFW`에서 탐색 입력 revision을 관리해 늦게 실행된 화면 복원이 새 검색·분야·상황을 덮지 않게 했다. 실제 화면 callback/effect 회귀2개를 추가했고 표적50/50, 전체165파일1606/1606을 확인했다.

같은311에서 이어36확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s05-resumed-final-2026-09-14T11-49-19-560Z.json`)은 필터 왕복 유지·중복 가져오기0·참조 연결·개인 날짜9/14·35% 기록까지 성공했다. 원문 문서의 진행 버튼을 찾는 단언에서 중단됐으므로 기록 상태는 partial로 보존한다. 최종 tail29확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s05-tail-scroll-final-2026-09-14T11-57-16-965Z.json`)은 같은314에서 실제 원문9행과35% 표시→이전 질문의 검색/종류→정확한 질문 ID 복귀→reload를 완료했다. tail은 저장0·page/console오류0·허용 밖쓰기0이다. 확인점 수를 기능 수나 충족률로 합산하지 않는다.

311→314의 성공 저장은 참조·날짜·진행 각1회다. 저장값을 고치지 않고 메모리 복제본에서 정확한 참조 행/연결, 해당 날짜 override/날짜 행,35% 기록, 대응 영수증3개만 되돌려 비교했다. 나머지 전체 데이터 SHA는 원래311의 `debafc3cd9183ef4ffb4f3463bb14fada3d22b4fa3adbc577e59cc1c3fa2bf40`과 일치했다. 원본·판본·사본 정체성·기존 문서/기록/다른 인물은 보존됐다. 운영 보호키0개라는 한계는 그대로다.

원문35% 화면 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s05-tail-2026-09-14T11-57-18-239Z-canonical35.png`)과 정확한 질문 복귀 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s05-tail-2026-09-14T11-57-18-239Z-question-reload.png`)를 직접 확인했다. 커서 이동은 해당 행의 글자만 보이게 했고44px 진행 버튼은 편집기 아래 경계에서 숨었다. 초점을 옮기고 정상 스크롤180px 후 버튼을 확인했으며 제품 수정으로 해결한 것은 아니다. 긴 원문 소개·반복 설명과 편집기 안쪽 스크롤은 남은 사용성 결함이다. 이 두1194px 캡처를 전체 해상도 검사로 표시하지 않는다.

## S06: 경험·답글·근거 지식과 정확한 재진입

같은314에서 가상의 부분/반대 경험22단락과 실제 QA 캡처를 사진으로 넣었다. 사진 설명에 검증용 이미지임을 표시하고 공개 제외/재포함, 나중에 쓰기/복원, 미리보기 취소 후 로컬 공개를 확인했다. 첫13확인 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s06-2026-09-14T12-03-18-080Z.json`)은 생성 영수증의 사진 객체 key 순서를 문자열로 비교한 검사 오류로 중단됐다. 의미상 동일함을 독립 대조했고 같은 글을 재생성하지 않았다. 후속9확인의 selector 대기 오류도 기록으로 보존한다.

같은 글에서39확인 완료 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s06-continued-2026-09-14T12-05-40-475Z.json`): 반응 on/off, 부모/중첩 답글, 내 활동의 정확한 답글 초점과reload, 경험/자식 답글 수정, 부모 답글 삭제 취소/확정과 자식 보존을 확인했다. 실제 경험과 S05 질문을 근거로 지식 글을 만들고 경험을 삭제했다. 지식에는 삭제된 근거가 표시되고 남은 질문 링크가 유지되며 정확한 지식 재진입/reload를 완료했다. tombstone에 경험 본문·사진이 남지 않는 것도 확인했다. 경험 공유를 Flow 사용의 필수 단계로 만들지 않았다.

전체 S06의314→349는 보관 초안·수정·반응·삭제를 포함한다. 새 글2개/답글2개·생성 영수증4개이며 원래 모든 개인공간·기존 글/답글·공개 Flow/판본·다른 인물을 보존했다. 마지막 미완성 초안0, 반응0, 허용 밖쓰기0·page/console오류0이다. 운영 보호키는0개여서 Map 프로필의 보호3키 검증과 구분한다. 마지막 raw SHA는 `41b448cfe1ffc7dad91b9e2d74e92b90d746fd55730a305e8d78fa4095a9d73e`다.

### 화면 평가

390px 긴 경험 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s06-2026-09-14T12-05-41-715Z-long-experience-390.png`), 1194px 긴 경험 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s06-2026-09-14T12-05-41-715Z-long-experience-1194.png`), 정확한 중첩 답글 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s06-2026-09-14T12-05-41-715Z-exact-nested-reply.png`), 삭제 후 근거 지식 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s06-2026-09-14T12-05-41-715Z-knowledge-after-evidence-deletion.png`)을 직접 보았다. 긴 글의 가로 넘침0, 답글 초점 테두리와 삭제 안내를 확인했다. 긴 글 상단에서는 반응/답글까지 스크롤이 필요하다. 화면 상단의 마지막 작업 안내 `글 삭제·저장됨`은 현재 지식 글을 지운 것으로 오해할 여지도 있어 후속 문구/수명 검토 대상으로 남긴다.

답글 미리보기 약3.6초·제출까지5.7~5.8초, 수정 약4.1초, 지식 작성2.25초를 관측했다. 성능 해결로 판정하지 않는다. 모바일/태블릿 브라우저 QA이며 실제 기기·관찰 사용자 증거가 아니다.

## S07: 선택 공개와 독립 개인 기록

IW8의29행동 확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s07-2026-09-14T12-19-14-254Z.json`)에서 실제 제작 원문을 명시 저장하고 개인 문서에 연결한 뒤 개인20%·날짜·메모와 공개1항목을 분리했다. 공개 미리보기 취소, quota 실패의 입력·요청 보존, 같은 요청 재시도의 단일 v1, 활동에서 원문/공개 편집 재진입과 다음 판본 초안 보관을 확인했다. S05 치앙마이 사본을 다른 원본으로 바꾸지 않고 이 새 v1의 별도 사본을 제품 UI로 생성했다.

마지막 보존 단언은 새 개인 문서를 편집하며 정상 저장한 커서 위치까지 이전 값과 같아야 한다고 비교해 실패했다. 원기록은 실패로 보존하며 같은362의 읽기 전용8확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s07-readonly-tail-2026-09-14T12-22-46-460Z.json`)에서 실제 공개 전 위치와 최종 위치·원문 행의 일치, 개인9/13의20%, 공개 미정 일정, 새 사본의 정확한 v1/item/anchor/생성 영수증을 대조했다. reload 전후 raw가 같고 이 tail의 저장0·오류0·허용 밖쓰기0이다. S05/S06 기존 개체와 개인 자료 보존을 확인했으며 운영 보호키0개라는 한계는 유지한다.

최종 revision362의 SHA는 `da7a0cb112d0fae5d6cef2cf65c75a3c96df1add7282740376f22b7b17c0e584`다. 공개 Flow는 `flow-93fd247b-f482-467f-b792-14cbed7b2180`, v1은 `version-fc63c695-0d4b-4a10-a9e2-2129f460a8c1`, 새 사본은 `copy-0d7220b9-23c4-4db7-996f-22aa4d5ad95b`다. S08은 이 동일 원본의 새 판본과 구판 제안을 사용한다. 비공개 다음 초안은 `publication-draft-5ddd671b-8abe-4f7a-abe3-24856ebe6009`이며 S07 끝에서는 공개하지 않았다.

390px 공개 미리보기 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s07-2026-09-14T12-19-15-391Z-publish-preview-390.png`)와 1194px quota 실패 입력 보존 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s07-2026-09-14T12-19-15-391Z-quota-preserved.png`)을 직접 확인했다. 선택1항목·공개 미정·개인 기록 제외와 로컬 PoC 공개 범위가 보이고, 실패 후 같은 미리보기와 재시도 버튼이 유지된다. 좁은 화면에서는 버튼 문구가 줄바꿈되며 긴 공개 내용을 스크롤해야 한다. 전체 크기·실기기 검사나 실제 외부 게시 증거가 아니다.

## S08: 구판 제안·새 판본·부분 수용

첫30확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s08-2026-09-14T12-43-18-379Z.json`)에서 S07의 보관 초안을 명시적으로 수정·공개해v2를 만들고, 실제 구판v1의 항목을 지정해 제안한 뒤 로컬 작성자 검토로v3를 생성했다. 개인 사본의 설명을 별도로 바꿔 충돌을 남겼다. 마지막 기대 문자열이 원래 메타데이터 행의 끝 공백을 빠뜨려 중단됐으며, 제품 본문을 정규화하거나 초기 기록을 통과로 고치지 않았다.

같은371에서 이어진17확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s08-tail-2026-09-14T12-47-05-579Z.json`)은 실제 행 ID와 끝 공백을 포함한 원문을 대조했다. 설명 충돌은 유지하고 완료 기준만 선택 반영한 뒤, Undo/reload로 개인공간 전체를 정확히 복원했다. 개인 날짜·20%·메모·다른 문서/사본과 공개v3·제안·영수증은 보존됐다. 최종373의 SHA는 `bdd9ead98204d424a9ac4b4287a8743c29d500783e9e9bba7f387e48df8c3b33`이다. tail 성공쓰기2, 허용 밖쓰기0·오류0이며 운영 보호키0개 한계는 별도 Map 보호3키 결과와 합치지 않는다.

390px 설명 충돌 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s08-tail-2026-09-14T12-47-06-895Z-private-description-conflict-390.png`)과 1194px 단일 선택 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s08-tail-2026-09-14T12-47-06-895Z-one-selected-field-1194.png`)을 직접 확인했다. 충돌의 checkbox는 비활성이고 별도 완료 기준만 선택할 수 있으며 반영 버튼이 보인다. 긴 비교는 세로 스크롤이 필요하다. IW8에는 충돌한 설명을 새 내용으로 명시 선택하는 경로가 없으므로 이 검사를 SL11 전체 충족으로 세지 않는다. 해당 경로는 후속 새 실행판에서 검증한다.

### S08 개선: 일반 필드의 명시 선택

기존 공유 이후 UX의 SL11에서 빠졌던 제목·설명·완료 기준·출처 링크의 개인 충돌 선택을 연결했다. 기본은 내 내용 유지이며, 비교 때의 원본 판본·개인 행을 적용 직전에 다시 확인한다. 일반 checkbox를 자동 허용하지 않고 선택한 한 필드만 기존 거래로 반영한다. 모델9개·UI6개 새 검사와 관련 회귀를 포함해 b9n의 전체170파일1646검사·strict373/진단0·build가 통과했다.

첫 진입5확인 실패 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s08-field-2026-09-14T13-02-10-506Z.json`)는 접힌 문서 작업을 열지 않은 QA 순서 오류이며 쓰기0·동일373이다. 해당 메뉴 진입만 보강한 새 실행41확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s08-field-entry-fixed-2026-09-14T13-04-17-144Z.json`)에서5크기별 기본 유지·선택·취소·Escape 저장0과 정확한 버튼 초점 복귀를 확인했다. 원래 실패5확인을41에 더하지 않는다.

quota1실패 후 선택을 보존하고 재시도1회로 설명만 반영했다. 날짜·20%·메모·다른 필드/행/문서·공개판본/제안은 그대로였다. 성공 후 사라진 비교 버튼 대신 같은 항목 선택으로 초점이 돌아왔다. Undo/reload 후 개인공간 전체가 복원됐고 최종375/hash `73f16e927a2ce8ad95cf0b37f3f2bf71315bfbd8497e3e1a3fa4caf8b706898c`다. 성공쓰기2·실패1·허용 밖0·page/console0, 보호키0개를 명시한다.

선택 화면의 375px (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s08-field-2026-09-14T13-04-18-343Z-selected-375.png`)·390px (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s08-field-2026-09-14T13-04-18-343Z-selected-390.png`)·844×390 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s08-field-2026-09-14T13-04-18-343Z-selected-844.png`)·1024×768 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s08-field-2026-09-14T13-04-18-343Z-selected-1024.png`)·1440×900 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s08-field-2026-09-14T13-04-18-343Z-selected-1440.png`)을 직접 확인했다. 현재/새 내용과 적용·취소가 보이며 가로 넘침0·44px 이상 실제 hit 검사를 통과했다.844×390에서는 비교 제목과 모든 내용을 한 번에 보려면 세로 스크롤이 필요하다. 긴 비교의 전체 입력 부담과 실제 기기/보조기술 검사는 별도다.

## S09: 저장 후 화면 복구와 실제 새로고침

초기 S09 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s09-2026-09-14T13-11-42-245Z.json`)는 native beforeunload 확인창에서 결과 본문을 회수하지 못했다. `result:null`을 통과로 바꾸거나 스크립트에 적힌 단언 수를 실제 실행 개수로 세지 않는다. 실패 당시 캡처와 원래 실행을 보존하고 문서 생성 버튼을 다시 누르지 않았다.

읽기 전용 진단 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s09-readonly-diagnostic-2026-09-14T13-21-26-378Z.json`)과 375→376 전체 차이 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s09-delta-readonly-2026-09-14T13-22-51-363Z.json`)에서 새 문서37행·생성 receipt1개·성공쓰기1회, quota 거절1회·확인된 저장 이후 화면 알림 실패1회를 확인했다. 기존12문서·99receipt·개인 실행·원본·다른 인물·공개 자료는 동일하다. 확인 가능한 차이는 새 문서/receipt와 revision/Undo뿐이다.

경고를 일으킨 listener는 `ProgramApp`의 탐색 임시 입력 보호였다. 같은 UI에서 빈 URL을 확인해 입력칸을 연 진단 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s09-discovery-diagnostic-2026-09-14T13-24-10-166Z.json`)에서 URL·원문은 비었지만 이 실행의 QA 제목이 남아 있음을 확인했다. 최초 자동화의 제목 비우기가 유지되지 않은 원인은 확정하지 않는다. 제목이 남은 상황에서 경고하는 보호 코드를 약화하지 않았다.

동일376의 후속15확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s09-tail-2026-09-14T13-28-07-986Z.json`)은 그 제목만 키보드로 지우고 즉시/4프레임 뒤 세 입력의 빈값·경고 해제를 확인했다. 같은 문서를 목록에서 다시 열고 실제 reload 후 제목·본문·선택1570/1570·방향·스크롤·저장값을 정확히 대조했다. 쓰기0·범위 밖0·page/console오류0이며 최종376 hash는 `ab84ced32780890ce03748c709ae77471d1610b58e80c30ff45a07ff3367ad14`다. 보호키0개 한계는 그대로다. 제목 비우기 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s09-tail-2026-09-14T13-28-09-124Z-cleared-title.png`)와 실제 reload (로컬 전용 근거: `../../../output/playwright/integrated-program/final-s09-tail-2026-09-14T13-28-09-124Z-reloaded-existing-document.png`)를 직접 보았다.

S09의 마지막 새로고침은 확인했지만 초기 Back/없는 대상/선택·스크롤 구간의 상세 결과 누락은 별도 남긴다. 손상 데이터·다중 탭/CAS·실기기는 이15확인에 포함되지 않는다. URL을 바꾸거나 지울 때 남은 원문 입력칸이 숨는 UX는 후속 수정·재검사 대상이다.

## S05·S06 개선: 진행 버튼 경계와 성공 안내의 화면 범위

최초55단언 뒤 중단 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-interaction-improvement-2026-09-14T13-28-55-261Z.json`)은 원문 모드에서 버튼이 아예 없는 것을 `hidden=true`만으로 판정한 QA 가정 오류다. 원문·커서·스크롤은 보존됐고 쓰기0이었다. 원문 모드의 조작 노출 없음은 부재 또는 hidden으로 확인하도록 검사만 수정했다.

같은376에서62확인 완료 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-interaction-corrected-2026-09-14T13-29-37-590Z.json`): 실제 Control+Home/ArrowDown으로 기존 S05의 논리9행에 도달한 뒤 제목을 클릭했다. 추가 wheel 없이 스크롤278→290으로12px만 이동해44×44 진행 버튼이 편집기 안에 완전히 들어오고 실제 hit 영역이 맞았다. 원문·커서450/450·이벤트·저장값은 그대로다. 수동 휠 이동은 되감지 않았고 내부10행 메뉴 초점 이동과 원문 모드는 자동 스크롤을 일으키지 않았다. 이 읽기 구간은 쓰기0이다.

신규 QA 질문1개를 만들어 해당 결과에서만 `글 공개 · 저장됨`을 유지하고 기존 S05 질문으로 이동하면 사라지는지 확인했다. 제목/본문 초안 저장을 포함한 쓰기5회 뒤381이며 질문1개·receipt1개만 추가됐다. 기존 개인공간 전체·공개 글·판본·답글·사진·원본·다른 인물은 보존했다. 최종 reload 뒤 hash는 `761836d210433b9ac562f7d9afca6b9910d01f1304264e68afa4bb0821826bb2`, 허용 밖쓰기·page/console오류0이다. 초기55와 최종62를 합산하지 않는다.

진행 버튼 (로컬 전용 근거: `../../../output/playwright/integrated-program/interaction-improvement-2026-09-14T13-29-38-735Z-s05-fixed-no-wheel.png`), 자기 글의 성공 안내 (로컬 전용 근거: `../../../output/playwright/integrated-program/interaction-improvement-2026-09-14T13-29-38-735Z-success-on-own-result-mobile.png`), 다른 글에는 안내 없음 (로컬 전용 근거: `../../../output/playwright/integrated-program/interaction-improvement-2026-09-14T13-29-38-735Z-other-question-no-stale-success.png`)을 직접 확인했다. 문서의 반복 원문 소개와 긴 글 스크롤은 남는다.1194 문서·390 글 화면의 지정 경계 확인이며 실제 터치·모든 크기·native Undo 재검사로 확대하지 않는다.

## S10: 네 저장 origin의 원문·개인 문서 왕복

[합성 저장 자료의 이관·조회 기록](s10-synthetic-transfer-preparation.md)은 사라진 이전 QA profile을 초기화하지 않고, 불변 기록의 정확한 source9키와 검증된 Program wire를 새 독립 QA profile에 한 번 이관한 근거다. 준비 seed10회와 제품 쓰기는 구분한다. 실제 factory Map은 이 자료로 대신하지 않는다.

b9n의 새 tail112확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s10-transfer-tail-2026-09-14T13-43-43-864Z.json`)에서 canonical-personal-copy·personal-draft·legacy-saved-plan·source-backed-map의 원문 전체 값과 tuple, 같은 개인 문서 전체 본문·행 ID를 대조했다. 각 문서 버튼의 focus+Enter와 실제 browser Back, 마지막 reload를 확인했다. 전체10키·보호9키 bytes 동일, 제품 set/remove/clear0, 오류0이다. 각 origin의 진행 기록은0이며 별도 S05의35% 기록1개가 보존된 검사다. 네 origin 각각의 비어 있지 않은 이력 보존으로 확대하지 않는다.

최초 readonly23확인 뒤 Alt 단축키 대기 실패는 별도 기록이다. tail의 실제 history 이동 성공으로 OS 단축키를 통과 처리하지 않는다. 현재 S07 제작 작업본의 왕복과 원래 개발2 저장 이력 확인은 각각 별도 범위다.

### S10 현재 Program 제작 초안과 같은 개인 문서

첫36확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s10-creator-readonly-2026-09-14T13-47-41-029Z.json`)은 S07의 정확한 제작 ID·저장 원문·인계 원문·개인 문서를 구별해 열었다. 원문/working/저장본은 일치하고 개인9/13의20%·메모·원본 연결·공개 자료·receipt·전체381 wire는 변하지 않았다. local/session writer0이다. 실제 Back은 같은 개인 문서에 도착했으나 검사의 URL glob이 query와 hash 사이에 없는 `/`를 요구해 실패했다. 원래 기록은 실패로 유지한다.

현재 문서에서 이어진14확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s10-creator-readonly-tail-2026-09-14T13-53-22-717Z.json`)은 최초 경로를 다시 실행하지 않고 정확한 복귀 URL·원문·303/303 선택·scroll0을 확인한 다음 실제 reload를 완료했다. 같은381/hash `761836d210433b9ac562f7d9afca6b9910d01f1304264e68afa4bb0821826bb2`, 모든 저장값 동일·쓰기0·오류0이다. 숨겨진 desktop 제작 폼의 `dialog role=presentation`과 활성 modal을 구별했다. 인계 원문 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-creator-readonly-2026-09-14T13-47-43-996Z-provenance.png`)·같은 제작 원문 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-creator-readonly-2026-09-14T13-47-43-996Z-same-working-raw.png`)은1194 화면에서 직접 확인했다.

이 S07 작업본에는 `nativeDocument`가 없다. 원래 개발2의 전체 native 저장 이력·설정 복구나 기존 PoC 초안 보관함 검사를 대신하지 않는다. 보호 운영키0개인 ordinary와 합성4origin 보호9키, 실제 Map 보호3키를 합산하지 않는다.

## 첫 전체 평가의 중간 판정

위 실제 행동과 직접 본 캡처로 판정했다. `충족`은 각 행의 지정 시나리오 범위이며 기능 전체 전수 보증이 아니다. 부분 행은 후속 개선 후 영향 시나리오를 다시 확인한다.

| 상황·실행판 | 목적 달성 | 다음 행동·맥락 유지 | 입력 부담 | 복구 | 공개/개인 경계 | 모바일·키보드 |
| --- | --- | --- | --- | --- | --- | --- |
| S01 독립 문서·woSE | 충족: Flow/공개 없이 문서·폴더 사용 | 충족: 문서 재진입 | 부분: 긴 목록/제목 | 충족: quota 재시도·휴지통/복원·Undo | 충족: 개인 저장만 | 부분:390/1194, 실기기 미실행 |
| S02 날짜별 진행·woSE | 충족: 이틀 기록·과거 수정·완료/재열기 | 충족: 문서·기간·참조가 같은 항목 | 부분: 실행/원문 이동 부담 | 충족: 두 Undo·reload | 충족: 개인 기록·원본 구분 | 부분: 실제 입력기/터치 미실행 |
| S03 이동·woSE | 충족: 지정 하위 묶음·날짜 이동 | 충족: 행 ID·기록 유지 | 부분: 긴 문서 | 충족: 자기 하위 거절·Escape·Undo | 충족: 원본/개인 실행 분리 | 부분: 키보드/비드래그 확인, drag/실터치 재실행 아님 |
| S04 출력·woSE | 충족: 무저장6파일·bytes 일치 | 충족: 미지원 URL의 붙여넣기·명시 확인 | 부분:390에서 출력까지 스크롤 | 충족: 취소0·reload | 충족: 문서/사본 증가0 | 부분:390/1194, 실제 외부 import 미실행 |
| S05 발견/개인 사용·IW8/b9n | 충족: 같은 질문→일부 사본→참조/35% | 충족: 필터 수정 후 정확 질문 복귀 | 부분: 소개 중복. 지정9행 clipping은 b9n 실제 키보드 진입/blur로 개선 확인 | 충족: 중복 가져오기0·reload | 충족: 개인 날짜·진행만 변경 | 부분: 원문 키보드/스크롤 확인,5크기 전체 아님 |
| S06 참여/지식·IW8/b9n | 충족: 경험·답글·근거 지식의 독립 사용 | 충족: 정확 답글 초점·삭제 근거 표시 | 부분: 긴 글·약5.7초. 다른 글의 성공 안내 잔류는 b9n 개선 확인 | 충족: 보관 초안·취소·수정/삭제·reload | 충족: 공개 사진 선택·개인공간 불변 | 부분:390/1194·답글 초점, 보조기술 미실행 |
| S07 선택 공개·IW8 | 충족: 실제 제작→1항목 공개→별도 사본 | 충족: 활동·원문/공개 재편집 | 부분: 긴 미리보기·보관 도구 | 충족: 취소·quota·같은 요청 재시도·reload | 충족: 개인20%/날짜/메모 제외·v1 불변 | 부분:390/1194 캡처, 전체 크기·실기기 미실행 |
| S08 제안·새 판본·개인 수용·IW8/b9n | 충족: 같은 원본의 구판 제안→v3, 완료 기준 부분 수용과 설명 충돌의 명시 선택 | 충족: 내 내용 유지/새 내용 선택·같은 사본 | 부분: 긴 비교·비활성 원래 선택과 병존 | 충족: 취소/Escape0·quota 재시도·Undo/reload | 충족: 개인 날짜·20%·메모와 과거 판본 불변 | 부분: 일반 충돌5크기·44px/초점 확인, 실기기 미실행 |

S08의 일반 필드 충돌 선택은 b9n에서 추가 확인했다. Map의 빈 실행 표시 제거와 동일 기록 보존도207단언으로 확인했지만 화면 응답6.8~8.6초는 남는다. 진행 버튼 clipping·다른 글의 성공 안내는62단언의 실제 브라우저 개선 근거가 있다. S09는 새 문서1회 저장 뒤 같은 자료의 마지막 reload를15단언으로 확인했으며 초기 Back/없는 대상 구간의 상세 결과 누락은 남는다. S10과 두 번째 전체 평가를 위 표로 대신하지 않는다.

## 이어서 할 일

최신 ordinary381의 기존 자료와 Map7을 각각 보존한다. 기존4origin·제작 원문을 포함한S10의 읽기 왕복을 마친 뒤, URL 변경 때 남은 원문 입력이 숨지 않도록 한 수정의 새 build·실제 검증과 [다른 목적의 두 번째 전체 평가](whole-loop-two-plan.md)를 잇는다. Map의 [b9n 결과와 남은 응답](map-removal-review.md)을 별도 근거로 연결한다. 서로 다른 실행판을 같은 최종판 완료로 합산하지 않는다.
