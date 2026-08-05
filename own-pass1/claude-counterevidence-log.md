# Claude Design Pass 1 — counterevidence log

각 항목은 "무엇을 깨뜨리려 했는가 → 무엇을 관찰했는가 → 결론"으로 기록한다. `NOT_REPRODUCED`는 제품이 그 반례를 견뎠다는 뜻이고, 정적 evidence 밖의 사실을 증명하지 않는다.

## 반증 의무 대상 7개

### CE-01 — `화면 종류와 저장 상태를 label 없이도 구분할 수 있다`
- 시도: 저장 직후 배너(`저장됨 · 24개`)를 제외하고, 공개 미리보기 화면과 저장된 계획 화면을 구분할 단서가 남는지 확인. 배너가 사라진 reload 상태를 반례 후보로 사용.
- 관찰: `S07/07-after-reload.png`와 `S08/05-*.png`에는 배너가 없지만 `계획 관리` 버튼, `전체 0/10 완료` 진행, `전체 10개 옮기기`, 하단 탭 `내 계획` 활성이 남는다. 공개 화면(`S02/01`, `S02/03`)에는 `계획 미리보기` kicker, `원문 ·` 출처 줄, `내 계획에 저장` CTA가 있다. 두 집합은 겹치지 않는다.
- 결론: `NOT_REPRODUCED`. 다만 시간 상태(overdue)는 별개로 깨졌다 → CD-004.

### CE-02 — `primary action은 하나이고 보조 행동과 경쟁하지 않는다`
- 시도: 하단 action 영역이 가장 붐비는 상태(날짜 미설정 공개 계획, 저장 실패 상태)를 골라 동시 노출된 mutation 수를 셈.
- 관찰: `S12/06`에서 `이사일 정하기`(primary) / `저장 없이 체크리스트 복사` / `날짜 없이 내 계획에 저장` 3개가 서로 다른 mutation을 동시에 제안한다. `S04/04`에서는 비활성 `내 계획에 저장`과 활성 `같은 방식으로 다시 저장`이 같은 mutation을 두 곳에서 제안한다.
- 결론: `REPRODUCED` → CD-013, CD-012.

### CE-03 — `CTA label만 보고 mutation과 다음 결과를 예측할 수 있다`
- 시도: label과 실제 결과가 어긋나는 조합을 탐색.
- 관찰: (a) `바로 저장` + 부제 `시작일과 결과 형식 선택`(S01/01). (b) `주 결과 캘린더 · 일정 23개` chip이 선택된 결과가 아님(S02/03 + manifest `selectedDestination: "checklist"`). (c) `변경 반영`이 지속 저장이 아님에도 취소 dialog는 `저장하지 않은 변경`이라 부름(S03).
- 결론: `REPRODUCED` → CD-014, CD-001, CD-008.

### CE-04 — `Item과 plan의 편집·완료 범위가 시각적으로 구분된다`
- 시도: Item 편집·완료가 plan 저장으로 새는지, 범위 표기가 없는 지점을 탐색.
- 관찰: Item detail sheet는 `현재 항목 1개 옮기기`, plan 화면은 `전체 10개 옮기기`로 범위를 수치로 구분한다. 완료 체크의 accessible name은 `자동차검사 기간과 예약 가능일 확인하기 완료 체크`로 Item에 묶여 있고, `수정`도 동일 패턴이다. plan 편집기는 `현재 → 조정 후` diff 카드를 별도로 보여준다.
- 결론: `NOT_REPRODUCED`. 범위 구분은 이 evidence에서 견고하다.

### CE-05 — `결과 형식 선택이 plan 편집과 경쟁하지 않는다`
- 시도: 형식 chip이 편집 진입점처럼 동작하거나 편집 CTA와 같은 위계를 갖는지 확인.
- 관찰: 형식 chip은 미리보기만 바꾸고 편집은 `계획 수정`으로 분리돼 있다. 단, mixed 계획에서 `입력이 더 필요한 결과 · 캘린더` 블록의 `설정` 버튼은 형식 패널 안에서 날짜 편집기로 보내며(S11 `conditional Calendar result -> shared date editor`), 이 지점에서 형식 선택과 계획 편집이 한 블록에 섞인다.
- 결론: 부분 `REPRODUCED`(경계 사례). 단독 finding으로 올리지 않고 CD-001의 근거로 흡수했다.

### CE-06 — `material risk가 disclosure를 열기 전에도 최소한 존재를 알 수 있다`
- 시도: 되돌릴 수 없는 결과 생성 직전 화면에서 경고를 닫힌 상태로 두고 위험 존재가 읽히는지 확인.
- 관찰: `S11/05-warning-closed-full.png`의 닫힌 상태에 이미 `일방향 결과예요. 이후 FlowMe의 수정이 외부 도구에 자동으로 반영되지 않아요.`와 `같은 결과를 다시 만들면 외부 도구에 중복될 수 있어요.` 두 줄이 보인다. 여는 동작은 Enter로 가능하고 Escape 후 포커스가 트리거로 복귀한다(`warningFocusReturned: true`).
- 결론: `NOT_REPRODUCED`. 단, "무엇이 제외되는가"라는 다른 종류의 material risk는 결정 시점에 가려진다 → CD-007.

### CE-07 — `모바일과 데스크톱이 같은 우선순위를 유지한다`
- 시도: 같은 route·같은 seed를 4개 폭에서 비교.
- 관찰: `visiblePlanRows` 10(390·720) 대 22(1024·1440), `visibleInteractiveCount` 25 대 33. 넓은 폭에서 목록이 좁은 rail로 이동하고 3번째 줄이 잘리며 필터가 `select`로 축소되고 화면의 다수 영역이 빈 패널이 된다.
- 결론: `REPRODUCED` → CD-003.

## 추가 반증 시도 (S23 자유 탐색 포함)

### CE-08 — `취소가 저장 상태를 바꾼다`
- 관찰: `S08/cancel-byte-comparison.json` `equal: true`, before/after 5개 key 완전 동일. `S03/editor-cancel.storage-after.json` = 35 B.
- 결론: `NOT_REPRODUCED`.

### CE-09 — `legacy/malformed 기록이 조용히 재작성된다`
- 관찰: `S13/raw/before-after-hashes.json`의 4개 key 모두 `unchanged: true`(129 B / 124 B / 9 B / 21 B).
- 결론: `NOT_REPRODUCED`. 대신 "존재 자체가 화면에 없다"는 별개 문제 → CD-005.

### CE-10 — `preview·artifact·receipt의 Item identity가 어긋난다`
- 관찰: S05에서 confirm(`항목 24개`, `만들 결과 24개`) → receipt(`itemIds` 24개, `itemCount 24`, `projectionOutputCount 24`, `outputCount 24`, `countUnits` 분리) → raw(`3,754 B`, `18e9a2fe…`) → transport(`clipboard.writeText`, `writes: 1`, 같은 byte·hash)까지 일치. 프로젝트로 가져온 `checklist-transfer.raw.txt`의 SHA-256을 직접 계산해 manifest 값과 일치함을 확인했다.
- 결론: `NOT_REPRODUCED`.

### CE-11 — `재시도가 결과를 중복 생성한다`
- 관찰: `S12/01`에서 진행 중 CTA가 `복사하는 중...`으로 잠기고 상태줄 `결과를 복사하는 중이에요...`가 뜬다. `S12/raw/journals.json`의 `afterFailure`에는 receipt key 자체가 없고 `afterRetry`에 receipt가 생성되며 snapshot hash(`a09472d3`)와 payload hash(`d18141ac`)는 최초 시도와 동일하다.
- 결론: `NOT_REPRODUCED`(UI lock 기준). 단, retry가 새 `requestId`로 receipt를 추가하므로 registry 최종 개수는 확인하지 못했다.
- CODEX_VERIFICATION_REQUEST: attached

```md
- scenario: S12 (duplicate → storage failure → receipt-only retry)
- claim needing runtime verification: duplicate와 retry를 모두 거친 뒤 `flow:export-receipts:v1`의 최종 receipt 개수와 requestId 집합
- exact action sequence: 저장한 계획 결과 이동 실행 → 같은 결과 재실행(duplicate) → receipt 저장 실패 주입 → `결과 기록만 다시 저장`
- expected storage/artifact observation: registry의 receipt 배열 길이, 각 receiptId/requestId, outcome
- required raw evidence: truncate하지 않은 `flow:export-receipts:v1` 값과 각 시점 diff
```

### CE-12 — `TSV가 tab·quote·CRLF·emoji를 잃는다`
- 관찰: `S18/parser-result.json`이 `titleRoundTripExact: true`, `containsLiteralTabInsideParsedTitle: true`, `containsEmojiAfterParse: true`, `crlfCount: 7`, `bareLfCount: 0`, `hasUtf8Bom: false`를 기록한다. 원본 TSV(884 B)의 SHA-256을 직접 계산해 `808b99cc…`와 일치함을 확인했다.
- 결론: `NOT_REPRODUCED`. 다만 `expectedInput.description`은 `…있습니다.\n셋째 줄…`로 bare LF를 포함하는데 산출물에서는 `\r\n`으로 정규화된다.
- CODEX_VERIFICATION_REQUEST: attached

```md
- scenario: S18 (TSV edge fixture)
- claim needing runtime verification: 입력에 섞인 bare LF가 CRLF로 정규화되는 것이 명시적 정책인지, 저장된 사용자 원문이 그대로 보존되는지
- exact action sequence: description에 LF와 CRLF를 섞은 Item 저장 → 저장된 record 원문 확인 → TSV 내보내기 → 재파싱
- expected storage/artifact observation: 저장 record의 newline byte, 내보낸 파일의 newline byte
- required raw evidence: record raw JSON hex 일부와 artifact hex 일부, 정규화 정책 문서 링크
```

### CE-13 — `날짜 없는 Item이 근거 없이 일정으로 만들어진다`
- 관찰: `S19` fixture rule(`An undated Item remains undated and is not invented into VEVENT.`), `S20/routine-unit-counts.json`의 단위 분리(`itemCount 1 / recurrenceSeriesCount 1 / veventCount 1`), 런타임 cross-check(`itemCount "3" / seriesCount "1" / veventCount 1`), `S21` 확인 dialog `항목 3개 / 만들 결과 1개`, `S09/state.json`의 `calendarUndatedReason`.
- 결론: `NOT_REPRODUCED`. 단위는 합쳐지지 않았고 없는 날짜를 만들어내지도 않았다.

### CE-14 — `오류가 시각 요소로만 전달된다`
- 관찰: `S16/state.json` `announcementTrace`에 `role: "alert"`와 문구 `저장하지 못했습니다. 선택은 그대로 유지됐어요. 다시 시도해 주세요.`가 기록됐고 `brokenRelations: []`, `unnamedInteractiveCount: 0`(flow-maps).
- 결론: `NOT_REPRODUCED`. `screenReaderSpeech`는 `NOT_ASSESSED`이므로 실제 발화는 미증명.

### CE-15 — `한 계획의 여러 결과가 별도 콘텐츠처럼 보인다`
- 관찰: 결과 패널이 항상 같은 계획 제목 아래에서 `주 결과/다른 결과` chip으로 묶이고, 각 chip이 같은 Item 수를 반복 표기하며(`체크리스트 · 24개`, `시트 · 24행`, `메모 · 24개`), 시트 chip만 단위를 `행`으로 바꾼다. manifest의 `manifestItemIds`는 세 형식에서 동일 24개다.
- 결론: `NOT_REPRODUCED`. 같은 Item 집합이라는 사실이 수치로 유지된다.

### CE-16 — `S23 자유 탐색: 화면 간 명칭·토큰 드리프트`
- 시도: matrix 밖에서 root cause 후보를 찾기 위해, 같은 역할의 요소가 화면을 옮길 때 유지되는지만 따로 훑었다.
- 관찰: (a) 같은 "다음 할 일" 영역이 `다음 할 일` / `이어서 할 일` / `다음 날짜 묶음` 3개 이름. (b) 목록 영역이 `저장한 계획 관리` / `라이브러리` / `계획 목록`. (c) primary fill이 초록 / 검정 / 파랑. (d) 범위 어휘가 `계획 전체`(탭)와 `Flow 전체`(형식 카드)로 공존.
- 결론: `REPRODUCED` → CD-011, CD-012, CD-016. 공통 root cause 후보: 화면별로 소유자가 다른 문자열·토큰 집합이 공유 role table 없이 쓰이고 있다.

## 검토하지 않은 것

- S17: 입력에 없음. `NOT_RUN — CODEX_ONLY`.
- 실제 브라우저 200% zoom: `NOT_RUN — ACTUAL_ZOOM_NOT_ASSESSED`. 720×500은 reflow proxy로만 읽었다.
- 실제 스크린 리더 발화, performance budget, 실제 DST 전환 브라우저 동작: 각각 `NOT_ASSESSED`.
- persistence·payload·artifact 동일성 중 정적 evidence로 확인할 수 없는 항목은 위 4개의 `CODEX_VERIFICATION_REQUEST`로 넘겼다(CD-002, CD-009, CD-017, CE-11, CE-12).
