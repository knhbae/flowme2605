# 용어 층 정리

## 한 장 요약

```text
원문 사실              FlowMe 원본                  목적지 표현
SourceRow / Occurrence → Item → Step → Flow → Map → Projection → Export
                                                    ├ Calendar → ICS / VEVENT
                                                    ├ Todo     → VTODO / native task
                                                    ├ Checklist→ Markdown / native list
                                                    ├ Sheet    → CSV / TSV / XLSX
                                                    └ Memo     → TXT / Markdown
```

## 1. Canonical entity

FlowMe가 상태와 provenance를 잃지 않기 위해 저장하는 원본 엔티티다.
SourceRow, Item, Step, Flow, Bundle/Map, UserFlowCopy, ExecutionRun,
SourceOccurrence가 여기에 속한다.

## 2. Artifact

사용자가 실제로 받거나 저장하는 결과물의 제품 단위다. 같은 canonical
내용에서 Calendar artifact와 Sheet artifact를 각각 만들 수 있다.

## 3. Projection

canonical 데이터를 목적에 맞게 선택·묶기·평탄화한 표현이다. Projection은
원본이 아니며, 손실과 필요한 사용자 입력을 함께 기록한다.

## 4. Export format

projection을 외부로 전달하는 파일·텍스트 형식이다.

- Calendar: ICS
- Checklist: Markdown / plain text / native checklist payload
- Todo: native task payload 또는 지원 시 ICS의 VTODO
- Sheet: CSV / TSV / XLSX
- Memo: TXT / Markdown
- canonical raw: JSON/DTO

## 5. Destination capability

외부 서비스가 실제로 지원하는 기능이다. parent task/subtask, VTODO,
알림, 위치, recurrence, custom columns 지원 여부가 서로 다르다. 지원을
추정하지 않고 adapter가 capability를 선언해야 한다.

## 6. iCalendar component

- `.ics`: 교환 파일
- `VCALENDAR`: 여러 component를 담는 컨테이너
- `VEVENT`: 일정·참석·시간 블록
- `VTODO`: 독립 할 일과 선택적 DUE
- `VALARM`: 사용자가 요청한 알림

VEVENT와 VTODO는 VCALENDAR 안의 형제다. 서로를 중첩하지 않는다.
Flow·Step·Map을 iCalendar component로 만들지 않는다.

## 7. 세 가지 schedule

- source schedule: 원문에 실제로 적힌 날짜·시각·반복
- user schedule overlay: 사용자가 고른 시작일·방문 회차·하루 N개
- system-derived schedule: anchor 또는 확인된 pacing으로 계산한 결과

각 record에는 owner, derivation, suggestionStatus가 함께 있어야 한다.
