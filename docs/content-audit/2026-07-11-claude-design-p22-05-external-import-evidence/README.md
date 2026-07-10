# Claude Design P22-05 External Import Evidence

FlowMe export가 파일 생성에서 끝나지 않고 외부 도구에서 읽히는지 검증한 package입니다. 대표 Flow 3개와 개인 수정 항목 1개를 캘린더·시트·메모 형식으로 다시 생성했습니다.

## 판정

**조건부 완료**입니다.

- Microsoft Excel 실제 읽기 전용 열기: **3/3 통과**
- Microsoft Word 실제 읽기 전용 열기: **3/3 통과**
- 독립 iCalendar parser(`ical.js 2.2.1`): 대표 Flow **3/3**, 개인 항목 **1/1 통과**
- ICS 물리 줄 75 UTF-8 bytes 초과: **0**
- 보이는 export 내부어 hit: 대표 Flow **0**, 개인 항목 **0**
- Microsoft Outlook 실제 import: **미확인**. 최소 표준 ICS도 거절해 로컬 MAPI profile import가 사용 불가했습니다.

Outlook 성공을 추정하지 않았고 기본 캘린더에는 아무 항목도 쓰지 않았습니다. Google Calendar, Apple Calendar 또는 설정된 Outlook profile에서 수동 import 1회와 중복 import 1회를 확인해야 P22-05를 완전히 닫을 수 있습니다.

## 먼저 볼 파일

1. [review.html](./review.html) - 형식별 실제 관찰과 남은 수동 확인
2. [audit.md](./audit.md) - 원인, 수정, 중복 정책, acceptance 판정
3. [route-evidence.json](./route-evidence.json) - Claude 판정용 summary
4. [office-observation.json](./office-observation.json) - Excel, Word, Outlook COM 관찰
5. [calendar-parser-observation.json](./calendar-parser-observation.json) - 독립 iCalendar parser 결과
6. [fixture-manifest.json](./fixture-manifest.json) - 생성 payload와 재생성 안정성
7. [prompt-ko.md](./prompt-ko.md) - Claude Design 복붙용 요청문

Review rendering:

- [mobile 390px](./screenshots/01-review-mobile.png)
- [wide 1024px](./screenshots/02-review-wide.png)

## 대표 시나리오

| 시나리오 | 기준일 | 캘린더 이벤트 | 실행표 행 | 사용자 메모 |
| --- | --- | ---: | ---: | --- |
| 이사 D-30 준비 | 2026-08-15 | 24 | 24 | 견적 후보 연락 범위 |
| 컴퓨터활용능력 D-30 학습 | 2026-09-05 | 9 | 9 | 취약 단원과 반복 구간 |
| 냉장고 파먹기 7일 | 2026-07-20 | 6 | 6 | 우선 소진·냉동 메모 |

개인 수정 항목은 제목 `내 일정에 맞춘 첫 단계`, 날짜 `2026-07-27 09:30`, 장소 `집`, 사용자 메모를 캘린더·TSV·메모·체크리스트에 동일하게 투영했습니다.

## 구현 변경

- 메모 export의 깨진 `??:` label을 `설명:`으로 복구했습니다.
- 캘린더 설명 label을 `구간`, `기준`, `완료 기준`, `내 메모`, `주의`, `링크`, `원문`으로 통일했습니다.
- Flow item 사용자 메모가 ICS `DESCRIPTION`에 포함됩니다.
- ICS folding을 글자 수가 아니라 UTF-8 byte 기준 75 bytes 이하로 공통화했습니다.
- 내부 `sourceTrace`는 원본 metadata에 보존하되 캘린더·시트·메모 projection에서는 제거합니다.
- 사용자 결과물의 `Step` fallback/header를 `할 일`로 바꿨습니다.

Implementation commits: `73adff0`, `9caec3c`, `40ffa8f`

## 재현

```powershell
npx.cmd tsx scripts/content-audit/generate-p22-05-external-import-fixtures.mts
node scripts/content-audit/verify-p22-05-calendar-parser.mjs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/content-audit/verify-p22-05-office-import.ps1
```

`verify-p22-05-calendar-parser.mjs`는 저장소 밖 임시 경로의 `ical.js` 설치를 사용합니다. provider sync나 사용자 계정 연결은 추가하지 않았습니다.
