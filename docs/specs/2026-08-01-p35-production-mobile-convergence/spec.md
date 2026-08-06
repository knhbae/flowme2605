# P35 프로덕션 모바일 수렴 계약

## 목표 결과

사용자는 공개 Flow의 결과를 먼저 확인하고, 필요하면 한 번의 편집 세션에서
조정한 뒤 저장한다. 이어서 내 Flow에서 같은 결과를 열고 실행하거나 내보낼
수 있다. 이 과정에서 다음 값이 화면마다 달라지지 않아야 한다.

- Flow 이름과 결과 유형
- 포함된 항목과 개수
- 항목 순서
- 날짜 상태와 확정 일정
- 사용자가 수정한 제목, 설명, 날짜, 메모

## 제품 경계

P35 위에서 수행하는 구조 보정이다. 다음 기존 계약은 교체하지 않는다.

- `SourceRow -> Item -> Step -> Flow -> Bundle/Flow Map` 계층
- 안정적인 Flow/Item 식별자와 기존 로컬 저장 키
- calendar, checklist, sheet, memo, routine/execution 렌더러
- 반복 일정, 실행 수명주기, 과거 실행 기록, export builder

기본 이동 순서는 다음과 같다.

```text
공개 결과 미리보기
  -> 전체 높이 편집 초안(선택, 원자적)
  -> 저장
  -> 짧은 저장 결과
  -> 내 Flow의 저장한 Flow
  -> 항목 상세/실행
```

내보내기는 이 흐름의 보조 가지다. 공개 내보내기는 현재 적용된 공개 초안을,
저장한 Flow 내보내기는 현재 저장된 개인·실행 상태를 읽는다. 저장 결과 화면은
별도 내보내기 작업대를 소유하지 않는다.

## 승인된 정책

### 저장 전 내보내기

- 공개 결과에 Flow 단위 보조 진입점 하나만 둔다.
- 저장만 기본 행동으로 둔다.
- 저장 결과 화면에서는 내보내기를 제거한다.
- 미리보기, 저장, 내보내기는 같은 확정 결과 resolver를 사용한다.

### 공개 경로와 Flow Map

- `/f`는 공유 진입점으로 유지하고 `Flow 찾기`로 나갈 수 있게 한다.
- `/flow-maps`의 `saveMode`, 선택, 여러 Flow 저장, review hold,
  snapshot/handoff와 기존 호환 저장 계약은 유지한다.
- Map에는 공통 행동, 전체 높이 편집, 원문, 조건부 위험, hold, 복구 계약을
  어댑터로 적용한다.
- Map의 결과 합성을 단일 `EffectiveFlowSnapshot`으로 바꾸는 일은 P0 완료로
  주장하지 않는다. 무손실 회귀 증거를 갖춘 뒤 별도 결정한다.

### 메모

- 항목 상세에는 `메모` 진입점 하나만 보여준다.
- 새 기본 입력은 Item memo에 쓴다.
- execution note, source-correction note, legacy note, 완료 회고, 과거 실행
  snapshot은 의미와 물리 저장소를 그대로 보존한다.
- 일반 내보내기에 비공개 실행 메모를 섞거나 기존 키를 삭제·병합하지 않는다.
- 저장한 `memo` 결과 유형은 내 Flow까지 그대로 유지하며, 메모 결과를 실행형
  목록으로 바꾸거나 가짜 다음 행동·완료·진행률을 만들지 않는다.

## Effective result 계약

Flow 단위 결과 소비자는 다음 합성 결과를 읽는다.

```text
EffectiveFlowSnapshot
  = FrozenSourceContentVersion
  + CurrentPersonalOverlay
  + CurrentExecutionOverlay
```

스냅샷은 다음을 한 번만 해석한다.

- source, personal, execution 버전 식별자
- 안정적인 Flow/Item 식별자
- 결과 유형과 사용자용 결과 이름
- 포함·제외 항목과 결정적인 순서
- 날짜 의도와 확정 schedule 상태
- 결과·내보내기 개수와 형식별 생략 항목
- 편집, 저장, 내보내기, 완료 capability

공개 미리보기는 working personal overlay를 읽는다. 적용 후 저장은 그
트랜잭션의 persisted overlay를 읽는다. 저장 결과와 공개 재진입은 저장된
결과를 재구성한다. 내 Flow는 source-backed 개인 복사본, Item draft, 날짜
override, 구조 overlay와 실행 identity를 합성해 committed snapshot을 만든다.
내 Flow 행, 항목 상세, 저장 내보내기는 이 committed 행을 기준으로 삼고,
반복 회차처럼 인스턴스 단위인 실행 상태만 sidecar로 덧붙인다.

화면별 정보 밀도는 달라도 원본 bundle을 다시 독자 해석해 이름, 개수, 날짜,
포함 여부를 바꾸면 안 된다.

## 날짜 의도 계약

날짜 의도는 세 상태다.

- `provisional`: 아직 확정하지 않은 예시 배치
- `custom`: 사용자가 확정한 기준일 또는 일정
- `undated`: 날짜 없이 체크리스트로 쓰겠다는 명시적 선택

예시 날짜를 확정 일정처럼 저장하지 않는다. 캘린더로 시작한다고 약속한 뒤
저장 결과가 무기한 체크리스트로 바뀌어서도 안 된다. 날짜를 먼저 정해야 하는
경우 기본 행동은 날짜 입력으로 이동시키고, 사용자가 `undated`를 선택한 경우에는
실제로 저장되는 결과를 행동 문구에 표시한다.

## 공개 개인화와 내보내기 계약

지원하는 공개 수정은 Flow 이름, Item 이름, 설명, 날짜, 포함 여부, 순서다.
저장과 내보내기는 원본 bundle이 아니라 적용된 공개 결과를 받는다.

- text와 XLSX는 포함 항목 순서와 지원하는 이름·설명·메모·날짜를 보존한다.
- ICS는 포함된 event와 지원하는 제목·설명·날짜를 보존한다.
- ICS 내부 event 순서는 제품 약속으로 삼지 않는다.
- routine처럼 형식이 표현할 수 없는 필드는 내보내기 선택 화면에서 명시한다.

## P0 구현 범위

1. Flow 단위 effective snapshot과 결과 용어
2. 날짜 의도와 공개 저장 -> 저장 결과 -> 내 Flow 연속성
3. 공개 개인화의 저장·내보내기 일치
4. 원자적인 전체 높이 Flow/Item 모바일 편집
5. 공개 상태 shell, 한 단계 내보내기, 짧은 저장 결과
6. 내 Flow 첫 진입 단순화와 항목 상세의 단일 완료 소유권
7. 손실 없는 메모 facade
8. Map 행동/편집/원문/위험/복구 어댑터

## 명시적 비범위

- Text-to-Flow 통합
- 관찰 사용자 모집, 세션, 검증 주장
- 파괴적인 저장소 migration 또는 안정 식별자 재작성
- `/flow-maps` 경로나 컨트롤러 제거
- Flow Map 결과의 단일 snapshot 전환
- 물리적 메모 저장소 병합
- Step/group 이름 개인화
- 계정, 외부 연동, marketplace, 무관한 시각 장식

## 다시 열 조건

다음 중 하나가 코드·호환 fixture로 확인될 때만 이 계약을 다시 연다.

- resolver가 기존 source/personal/execution 소유권을 보존하지 못한다.
- Map 공통 계약이 선택, 여러 Flow 저장, review hold 또는 기존 저장 레코드를
  손실시킨다.
- 지원한다고 약속한 개인 필드를 export 형식이 표현하지 못한다.
- 호환 fixture에서 데이터 또는 안정 식별자가 달라진다.

선호나 구현 편의만으로 범위를 다시 열지 않는다.
