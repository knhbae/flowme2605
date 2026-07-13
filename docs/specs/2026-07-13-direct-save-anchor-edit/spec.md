# P23-05B Direct Save Anchor Edit

## 목표

공개 Flow Map에서 직접 저장한 일정형 콘텐츠도 My Flow에서 전체 기준일을 다시 바꿀 수 있게 한다. 개인 사본 설정이나 구조 편집을 열지 않고, 저장된 source version과 항목별 개인 수정은 보존한다.

## 적용 대상

- `SavedFlowMapSnapshot`이 있고 `personalCopy`가 없는 직접 저장본
- map의 첫 child Flow
- setup input, 기존 anchor 또는 `anchor_type !== none`인 콘텐츠

URL-first 개인 사본과 개인 draft는 기존 설정 경로를 그대로 사용한다. 날짜 기준이 없는 source-backed Flow에는 이 control을 노출하지 않는다.

## 소유권

- Source: 원본 제목, 순서, 상대 날짜, source version
- Saved map: 사용자가 선택한 전체 기준일
- Personal value: 항목별 날짜 override, 제목 alias, 메모
- Execution run: 완료와 완료 취소

기준일 변경은 source version을 갱신하거나 `personalCopy`를 새로 만들지 않는다.

## 저장 규칙

1. snapshot과 persistence record의 anchor를 같은 값으로 갱신한다.
2. map의 모든 child Flow saved record와 stored anchor를 갱신한다.
3. 새 anchor로 달라진 원본 날짜 key에 기존 항목별 date override와 날짜 기반 item draft를 재연결한다.
4. duration 기반 check ID가 달라질 경우 완료 값을 같은 항목의 새 check ID로 옮긴다.
5. source version, source rows, stable item ID, 개인 메모는 유지한다.

## 사용자 문구

- 진입: Flow 맥락에 맞는 `이사일 바꾸기`, `학습 시작일 수정`, `기준일 수정`
- 폼 제목: `전체 일정 기준`
- 정책: `전체 상대 일정이 다시 맞춰집니다. 따로 바꾼 할 일 날짜와 메모는 그대로 유지돼요.`

## 제외 범위

- source-backed 항목 추가, 삭제, 순서 변경
- 원본 버전 자동 적용
- 날짜가 없는 map의 기준일 생성
- account, DB, cloud sync, OAuth
