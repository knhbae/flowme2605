# P3-K 개발2 요구·UX 대조

개발2의 부모 요구 64개와 기존 하위 조건 121개를 빠짐없이 목록에 넣고, 원본·후속 결정·현재 코드의 연결을 정리했다. 이 숫자는 **121개를 새로 테스트해 모두 충족했다는 뜻이 아니다**. 현재 화면의 기능과 UX가 같은지, 실제 브라우저 근거가 있는지는 별도로 판정했다.

최신 D2 대화의 5개 턴을 직접 읽었다. 사용자가 별도 틀 편집 화면을 거부하고, 같은 Flow 편집기에서 미완성 TXT를 자유롭게 편집하며, 입력 예시를 편집기 전체에 적용하라고 정정한 내용과 후속 로컬 승인을 확인했다. 모든 과거 대화를 재열람했다고 주장하지 않는다.

## 먼저 고칠 문제

| 우선순위 | 현재 확인한 문제 | 사용자 영향 | 다음 구현 묶음 |
| --- | --- | --- | --- |
| P0 | 속성 form을 열고 앞에 새 Item을 넣으면 그 새 Item에 값이 붙음 | 사용자가 고르지 않은 항목을 변경함 | 편집 대상·source snapshot 고정, stale 무적용 |
| P1 | 속성 초안 저장이 실패해도 일반 원문 반영 토스트로 덮임. reload하면 새 값이 사라짐 | 무엇이 보관됐는지 알 수 없음 | source helper의 저장 결과·복구·안내 통일 |
| P1 | React의 항목 정보 메뉴가 네 범주만 보여 주지 않고 16개 속성을 모두 펼침 | 작은 화면에서 긴 메뉴를 탐색해야 함 | 범주 → 필요한 정보 → 값 입력으로 연결 |
| P1 | standalone은 문서형 Flow 편집과 문맥 +를 재현하지 않음 | 로컬 HTML에서 원본과 같은 작성 UX를 검토할 수 없음 | 런타임별 작성 경험 차이를 닫는 범위 확정 |
| 확인 필요 | standalone 한글 조합 Enter 방어가 코드에서 확인되지 않음 | 조합 종료가 의도하지 않은 적용으로 이어질 가능성 | 조합 중 Enter·submenu·중복 적용 회귀 |
| P2 | 작성 틀에 compiler·버전·카탈로그 정보와 두 적용 행동이 섞임 | 빈 틀과 완성 예시의 차이를 판단하기 어려움 | 기본 선택 화면 감산, 기술 정보는 상세에 보존 |

브라우저에서 재현된 사항은 `P3K-D2-01`(K-X1), `P3K-D2-02`(chooser DOM/캡처), `P3K-D2-03`(K-X3 양쪽 런타임)이다. IME 위험은 재현 결과가 없는 코드 검토 후보다. K-X3의 실제 문구는 “원문에 반영했어요”이며, “저장 성공”이라는 문구가 보였다고 확대하지 않는다.

## 원본 → 현재 → 수정 제안

### 속성의 대상과 저장 결과

원본의 안전 계약은 정확한 source와 Item을 확인한 뒤 한 번만 적용하는 것이다. 현재 React form은 여는 시점의 fingerprint 없이 줄 번호만 기억한다. 적용 시점에 최신 fingerprint를 다시 받아 비교하므로, 그 줄 번호에 다른 Item이 들어왔는지 놓친다. 현재 native editor 자체의 stale 검사만으로는 form을 열 때의 owner를 보호할 수 없다.

form을 여는 순간 editor/document/source fingerprint·dispatch epoch·owner binding을 고정해야 한다. 원문이 바뀌면 입력값은 보존하되 적용을 막고 정확한 대상 이름과 다시 선택할 행동을 보여 준다. 취소와 같은 값은 무적용이며 정상 적용과 Undo는 각각 한 번이다.

저장 실패도 같은 묶음에서 다룬다. 화면 원문과 durable draft를 함께 성공으로 판정해야 한다. 마지막 저장본은 그대로인데 원문만 바뀐 상태를 정상 반영 안내로 덮지 않는다. template/example에는 있는 rollback 판단을 속성 helper에도 일관되게 적용하도록 설계한다.

### 정보 메뉴

원본 팔레트 (로컬 전용 근거: `D:/flowme2605/flow-text-authoring-flow-view-poc-20260824/docs/specs/2026-08-26-flowme-text-authoring-contextual-item-palette/spec.md`)와 [P2-C 계약](D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-03-flowme-integrated-poc-personal-editing-closure-v1/spec.md)은 처음에 네 범주만 보여 주도록 한다. 현재 React는 전체 16개 속성을 동시에 표시한다. standalone은 네 범주 버튼을 선택한 후 해당 목록만 연다.

수정 제안은 다음과 같다.

```text
현재 항목 이름
  일정 / 실행 / 내용 / 더 보기
    선택한 범주의 정보
      단순 값: 같은 편집기의 inline 입력
      의존 값: 범위가 제한된 함께 설정 화면
```

속성의 지원 범위를 줄이지 않는다. Escape는 한 단계씩 돌아오고 Tab은 정상 문서 순서를 유지한다. 시간대·반복 종료처럼 함께 저장해야 하는 값은 transaction 하나와 Undo 하나로 남긴다. 원본의 범주 배치와 현재 코드의 범주 배치도 다르므로, 별도 승인 근거 없이 “의도적 변경”으로 처리하지 않는다.

### 빈 문서·작성 틀·입력 예시

최신 승인 원본 (로컬 전용 근거: `D:/flowme2605/flow-text-authoring-structure-template-inline-baseline-20260830/docs/content-audit/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc-results/flowme-text-authoring-unified-editor-guidance-poc.html`)의 핵심은 별도 작성 틀 편집 화면이 아닌 기존 편집기 하나다. 원본의 빈 제목·단계·할 일·속성은 미완성 원문으로 남고, 값이 있는 유효한 형제 줄만 결과가 된다. 예시는 실제 source가 아닌 화면 안내다.

현재 통합의 6개 scaffold, native Undo, blank 해석, ghost는 이미 존재한다. “예시가 없다”는 옛 메모만 보고 이 기능을 새로 만들면 안 된다. 다만 이번 화면 검사에서 실제 예시가 보이는지 확인해야 하며, 코드에 ghost가 있다는 사실과 화면에서 읽힌다는 사실을 구분한다.

P3-C가 완성 검증 예시와 명시적인 글 만들기를 후속 허용했다. 따라서 그 기능을 무조건 제거하지 않는다. 기본 작성 틀 화면에서는 구조명·짧은 예시·빈 골격 넣기를 우선하고, 완성 예시 적용은 별도의 명확한 보조 맥락에서 preview 후 실행한다. compiler·카탈로그·버전 정보는 검토 상세로 옮긴다. 6개 틀, 31개 검증 사례, 6개 compiler fixture의 bytes와 guard는 보존한다.

### 로컬 HTML과 React의 작성 경험

React에는 순수 텍스트/Flow 표현 전환, 현재 줄의 raw 문법, 문서형 나머지 줄, 문맥 +, 한 단계 계층 가이드가 있다. standalone은 textarea와 ghost를 제공하고, 속성은 결과의 항목 검토에서 연다. 같은 데이터·결과가 나온다고 같은 UX인 것은 아니다.

[이전 parity 범위](D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-03-flowme-integrated-poc-authoring-workspace-parity-v1/requirements.md)가 standalone의 일부 차이를 P1로 미뤘으므로 이 차이를 모두 “미승인 퇴행”으로 부르지는 않는다. 그러나 현재 parent 충족을 두 런타임 모두의 UX 완성으로 보고할 수 없다. 다음 묶음은 한 source·한 editor·한 Undo owner를 유지하며 문서형 표현과 문맥 명령을 공유하는 설계다. 두 번째 편집기나 운영 writer를 만드는 일은 아니다.

### 원문 정렬과 개인 순서

D2-018의 원본은 “날짜순을 원문에도 적용”을 명시적으로 실행할 때 같은 Step 안의 Item·속성·하위 체크 block을 같이 옮기는 기능까지 포함한다. 현재는 표시 순서·개인 계획 순서·TimelineOrder·source order를 분리하지만 해당 WorkingSource 명령은 확인하지 못했다.

개인공간에서 정렬할 때 원문을 바꾸지 않는 계약은 계속 지킨다. 작성 중 WorkingSource에 명시 재정렬을 제공할지는 원자 요구로 따로 판정해야 한다. source 역쓰기 금지는 저장된 개인 변경의 운영 원문 역류 금지이지, 작성 중 기능의 존재 증거가 아니다.

## 이미 있는 기능과 오래된 판정을 구분한 사례

| 요구 | 기존 기록의 문제 | 현재 감사 |
| --- | --- | --- |
| D2-012 | 하위 체크 owner가 없어 의도적 차단이라고 남음 | 현재 parser/P2-C는 한 단계 subcheck를 지원 |
| D2-016 | 반복 occurrence 제외라는 초기 사유가 남음 | P2-B가 bounded occurrence와 상태·TXT를 후속 구현 |
| D2-035 | parent 충족, subcheck는 부분/미충족/제외 | 16개 catalog는 존재. chooser UX는 별도 실제 갭 |
| D2-036 | parent 충족, 3개 subcheck 모두 미충족 | inline/native/dependent form은 존재. 그룹 탐색과 stale는 별도 |
| D2-040 | parent 충족, 사유는 미검증 | 실제 다른 Item 적용이 재현됨 |
| D2-041 | near-miss 복구가 없다는 사유 | React·standalone에 명시 복구 경로 존재 |
| D2-018 | 원문 재정렬이 없다는 사유와 parent 충족 공존 | 전체 expected의 적용 범위를 다시 분리 |
| D2-063 | 옛 전체 테스트 실패 수치 | 후속 실행 기록과 이번 감사 실행을 날짜별로 구분 |

기존 추적 HTML을 바꾸지 않았다. 새 [상세 원장](./d2-audit.json)에 역사 판정과 current 감사 칼럼을 함께 보존했다.

## 원본 결정의 대체 관계

| 원본/후속 근거 | 유지하는 것 | 대체·축소된 범위 |
| --- | --- | --- |
| D2 최신 사용자 정정 → Unified Editor 승인 | 같은 편집기, 자유 편집, 전역 입력 예시 | 실패한 별도 틀 입력 화면·완성 gate를 정본으로 되돌리지 않음 |
| A0-1 | 명시 개인 Flow 저장을 첫 성공으로 | D2 CreatorDraft-only를 개인 handoff로 대체 |
| P3-B | CreatorDraft의 별도 저장·검색·복제·보관 | A0의 library 보류를 PoC 로컬 범위에서만 열음 |
| A0-2 / P2-C | 개인 변경은 shadow, source와 분리 | 저장 뒤 결과 수정의 source 역쓰기 제외 |
| P2-B / P2-C | 원본 무변경, 일관된 Item/회차·TXT | 초기 subcheck·recurrence 미지원의 일부를 후속 지원 |
| P3-C | 빈 골격/완성 예시 구분, 명시적 적용 | versioned compiler·sidecar 자산을 연결하되 기술 UI 상시 노출을 요구한 것은 아님 |
| P3-F | 격리 후보 identity·owner·visual 규칙 | 운영 schema·공개 발행·계정·cloud·배포 승인이 아님 |

## 64개 부모 요구 대조 목록

코드 확인은 기능 전체 합격 판정이 아니다. 각 행의 기능·UX·UI·증거 구분과 원본/현재 파일 위치는 JSON에 있다. 기존 121개 하위 조건은 역사 판정으로 보존했으며 새 증거 없이 올리지 않았다.

| ID | 요구 | 현재 감사 분류 | 관련 문제/후속 |
| --- | --- | --- | --- |
| D2-001 | AI 없이 평문을 우선하는 저작 | 코드 확인 | 현행 보존 |
| D2-002 | Canonical 계층과 Item 상태 소유권 | 코드 확인 | 현행 보존 |
| D2-003 | Calendar·Todo·Sheet·TXT는 같은 Item의 projection | 코드 확인 | P3K-D2-07 |
| D2-004 | Source·Creator·Public·Personal·Execution 계층 분리 | 코드 확인 | 현행 보존 |
| D2-005 | 저작 결과의 저장 대상 | 코드 확인 | 현행 보존 |
| D2-006 | Main 앱과 분리된 제작 PoC | 코드 확인 | 현행 보존 |
| D2-007 | FlowMe 시각 체계 유지와 Claude 구조 참고 | 코드 확인 | 현행 보존 |
| D2-008 | 자동 QA와 관찰 사용자 검증 분리 | 제외 | 현행 보존 |
| D2-009 | 직접 조작 가능한 로컬 HTML | 코드 확인 | 현행 보존 |
| D2-010 | 기존 dirty 작업 보존 | 코드 확인 | 현행 보존 |
| D2-011 | 표식 없는 일반 문장 보존 | 코드 확인 | 현행 보존 |
| D2-012 | Item·하위 체크·속성의 들여쓰기 문법 | 과거 판정 갱신 필요 | P3K-D2-07 |
| D2-013 | 정의되지 않은 속성의 설명 보존 | 후속 의도 변경 | 현행 보존 |
| D2-014 | 잘못된 날짜·URL과 빈 값의 구분 | 코드 확인 | 현행 보존 |
| D2-015 | 상대 날짜는 기준일이 있을 때만 해석 | 코드 확인 | 현행 보존 |
| D2-016 | Routine은 recurrence 속성과 occurrence로 표현 | 과거 판정 갱신 필요 | P3K-D2-07 |
| D2-017 | Calendar는 실제 월간 달력 projection | 코드 확인 | 현행 보존 |
| D2-018 | 표시 정렬과 원문 재정렬 분리 | 범위 판정 필요 | P3K-D2-07, P3K-D2-08 |
| D2-019 | 고정된 네 결과 슬롯 | 코드 확인 | 현행 보존 |
| D2-020 | WorkingSource와 복사용 TXT 결과 구분 | 코드 확인 | 현행 보존 |
| D2-021 | 원문과 결과의 원자 동기화 | 후속 의도 변경 | 현행 보존 |
| D2-022 | 항목 구조 검토는 선택형 | 코드 확인 | 현행 보존 |
| D2-023 | 실제·검증 콘텐츠 예시 전체 보존 | 코드 확인 | 현행 보존 |
| D2-024 | 표 사례도 표준 Flow 문법과 보존 경계 사용 | 코드 확인 | 현행 보존 |
| D2-025 | P1-C 장문·표의 원문 손실 방지 | 코드 확인 | 현행 보존 |
| D2-026 | P1-E versioned source candidate의 원자 적용 | 코드 확인 | 현행 보존 |
| D2-027 | P1-G linked Flow lineage는 spec·fixture only | 제외 | 현행 보존 |
| D2-028 | 미승인 P1/P2 관리·발행 기능 보류 | 제외 | 현행 보존 |
| D2-029 | 같은 source를 보는 순수 텍스트·Flow 편집 | 실제 차이/결함 | P3K-D2-05 |
| D2-030 | 카드가 아닌 문서형 Flow 표현 | 실제 차이/결함 | P3K-D2-05 |
| D2-031 | 현재 줄만 raw, 나머지는 rendered | 실제 차이/결함 | P3K-D2-05 |
| D2-032 | 입력 중 전체 화면 raw/rendered 깜빡임 방지 | 실제 차이/결함 | P3K-D2-05 |
| D2-033 | 상시 툴바 없이 문맥형 작은 + | 실제 차이/결함 | P3K-D2-05 |
| D2-034 | 문맥별 첫 단계·첫 할 일·다음 할 일·다음 체크 | 실제 차이/결함 | P3K-D2-05 |
| D2-035 | Item 정보 catalog 전체 지원 | 코드 확인 | P3K-D2-02, P3K-D2-07 |
| D2-036 | 단순 입력은 inline, 복합 설정만 popover | 코드 확인 | P3K-D2-02, P3K-D2-07 |
| D2-037 | 추가 메뉴에 실제 문법과 계층 미리보기 | 실제 차이/결함 | P3K-D2-05 |
| D2-038 | + anchor 고정과 키보드 위 메뉴 | 실제 차이/결함 | 현행 보존 |
| D2-039 | 속성 재진입 caret과 실제 값 선택 | 코드 확인 | P3K-D2-01 |
| D2-040 | IME·Enter·stale 상태의 write 0 | 실제 차이/결함 | P3K-D2-01, P3K-D2-02, P3K-D2-03, P3K-D2-04, P3K-D2-07 |
| D2-041 | 거의 맞는 문법의 명시적 복구 | 과거 판정 갱신 필요 | P3K-D2-07 |
| D2-042 | 작은 화면·키보드에서 마지막 내용과 CTA 접근 | 실제 차이/결함 | 현행 보존 |
| D2-043 | 불필요한 설명과 QA 정보 감산 | 코드 확인 | P3K-D2-02, P3K-D2-06 |
| D2-044 | Obsidian식 한 단계 hierarchy guide | 실제 차이/결함 | P3K-D2-05 |
| D2-045 | 구조명 중심 6개 작성 틀 직접 노출 | 코드 확인 | P3K-D2-06 |
| D2-046 | 기존 편집기에 TXT scaffold 한 번 삽입 | 코드 확인 | 현행 보존 |
| D2-047 | 별도 템플릿 편집 화면·완성 gate 제거 | 코드 확인 | 현행 보존 |
| D2-048 | 미완성 틀의 자유 편집과 부분 해석 | 코드 확인 | 현행 보존 |
| D2-049 | Template browse는 no-op, 선택은 명시 insertion | 코드 확인 | P3K-D2-06 |
| D2-050 | 빈 원문·fingerprint·stale guard | 코드 확인 | 현행 보존 |
| D2-051 | Blank scaffold는 canonical 객체·issue 0 | 코드 확인 | 현행 보존 |
| D2-052 | Template 전체 native Undo·Redo | 코드 확인 | 현행 보존 |
| D2-053 | Flow 편집 전체의 입력 예시 보기·숨기기 | 코드 확인 | P3K-D2-06 |
| D2-054 | Ghost 예시의 source·clipboard·undo 무영향 | 코드 확인 | 현행 보존 |
| D2-055 | 구조 menu의 최종 계층 | 실제 차이/결함 | P3K-D2-05 |
| D2-056 | StructureDraft·compiler는 versioned 내부 자산 | 코드 확인 | P3K-D2-06 |
| D2-057 | Creator draft 저장·재진입·관리 | 코드 확인 | 현행 보존 |
| D2-058 | 취소·실패·stale의 원자성 및 복구 | 실제 차이/결함 | P3K-D2-01, P3K-D2-03 |
| D2-059 | 최신 Unified Editor PoC의 게시 상태 | 후속 의도 변경 | 현행 보존 |
| D2-060 | Main-stack PR과 격리 PoC 계보 구분 | 후속 의도 변경 | 현행 보존 |
| D2-061 | Unified Editor 접근성·반응형 계약 | 실제 차이/결함 | 현행 보존 |
| D2-062 | 실제 Android/iOS와 관찰 사용자 미실행 | 제외 | 현행 보존 |
| D2-063 | Fresh QA와 기준선 실패의 분리 | 검증 부족 | P3K-D2-07 |
| D2-064 | 계정·cloud·AI·정식 발행·외부 동기화 제외 | 제외 | 현행 보존 |

## 실행 범위와 한계

- 이 분담에서 제품 변경·테스트 실행·배포는 0이다. 브라우저 재현과 화면 검사는 root의 P3-K 신규 근거를 연결했다.
- D2 최신 5턴은 직접 읽었으나 모든 D2 과거 대화는 다시 읽지 않았다. 나머지는 기존 trace의 대화 alias를 상속했다.
- 실제 Android Chrome, iOS Safari, 보조기술은 미실행이며 관찰 사용자 0명이다.
- 원본·기존 dirty·기존 trace는 수정하지 않았다. 이 문서와 JSON만 새 파일로 작성했다.
- commit·push·PR·Preview·Production은 진행하지 않았다.

