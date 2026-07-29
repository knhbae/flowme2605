# P35-R5 메모 결과 우선 문법 audit

## 기존 문제

메모 입력 뒤 사용자가 실제로 얻게 될 결과보다 제목, 목적, 구조 편집 입력이 먼저
나타났다. 메모를 5개 행동으로 나눴어도 첫 화면에서 결과의 모양과 개수를 판단하기
어려웠고 public Flow와 다른 조정 문법을 사용했다.

## 변경

1. 메모에서 파싱한 행을 공통 `FlowArtifactDataPreview`로 먼저 보여준다.
2. 기본 체크리스트와 적합한 보조 artifact만 노출한다.
3. 빠른 값은 Flow 제목과 첫 항목 날짜 두 개로 제한한다.
4. 전체 구조는 접힌 disclosure에 둔다.
5. 행 수정은 P35-R2의 contextual editor를 재사용한다.
6. 저장은 기존 P35-R3 receipt와 focused workspace 경로를 재사용한다.

## 시나리오 evidence

| 시나리오 | viewport | 결과 |
| --- | ---: | --- |
| 5줄 메모 입력 | 390x844 | 실제 5개 결과 행과 artifact 선택을 먼저 표시 |
| 빠른 값 입력 | 390x844 | 제목과 첫 날짜 두 input만 표시 |
| 둘째 행 조정 | 390x844 | 제목, 상세, 날짜를 한 행 editor에서 수정 |
| Calendar 선택 | 390x844 | 날짜가 있는 2개 행만 미리보기 |
| 저장 후 열기 | 390x844 | 같은 제목과 수정 행을 focused workspace에서 확인 |
| 항목 조정 | 1024x768 | 오른쪽 inspector, Escape 닫기, trigger focus 복귀 |

## Projection 판정

| destination | 날짜 없는 5개 기준 | 날짜 2개 지정 후 |
| --- | ---: | ---: |
| checklist | 5 | 5 |
| memo | 5 | 5 |
| sheet | 5 | 5 |
| calendar | 0 | 2 |

## 품질과 비범위

- horizontal overflow: `0`
- unnamed focusable: `0`
- console/page error: `0`
- parser rewrite: 없음
- AI/crawler: 없음
- public Flow grammar fork: 없음
- storage schema 변경: 없음

Evidence kind는 current source와 current browser automation이다. 실제 관찰 사용자 수는
`0`이다.
