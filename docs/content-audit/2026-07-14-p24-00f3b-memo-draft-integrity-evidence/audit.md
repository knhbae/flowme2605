# P24-00F3B 감사

## 원인

기준일이 있는 개인 메모 초안은 첫 항목이 `calendar`, 나머지가 `todo`로 저장된다. 기존 `getMyFlowRows()`는 일정 행이 하나라도 있으면 일정 행만 반환했다. structural projection이 날짜 없는 원본 Item을 My Flow 행으로 바꾸는 단계에서도 이미 만들어진 행만 찾았기 때문에 `todo` Item이 저장소에는 남고 화면에서는 사라졌다.

URL miss 후보는 사용자가 제목과 원하는 결과를 모두 비워도 조회 결과의 상태 문장인 `바로 시작할 Flow를 찾지 못했어요`를 fallback 제목으로 사용했다. 이 제목은 다시 초안 Item 제안에 들어가 실행 문구까지 오염시켰다.

## 수정 계약

1. 개인 draft structural projection의 source-owned Item이 기존 일정 행에 없으면 원본 bundle Item에서 안전하게 My Flow 행을 복원한다.
2. 이 복원은 source Item을 수정하지 않고 stable Item ID, section, detail을 유지한다.
3. 날짜 없는 Item은 My Flow와 checklist/sheet/memo projection에 남고 Calendar/ICS에서는 제외된다.
4. URL miss 후보는 Flow 이름 또는 원하는 결과 중 하나가 있어야 저장된다.
5. 원하는 결과만 있으면 첫 사용자 문장을 제목으로 사용하고 서비스 상태 문구는 사용하지 않는다.

## 실제 확인

- 입력 메모: 2개 사용자 문장 + 1개 실행 순서 제안
- 저장 Item: 3개 (`calendar` 1, `todo` 2)
- My Flow effective Item: 3개
- 새로고침 후 Item: 3개
- Flow 전체 메모 export: 3개
- Calendar event: 1개
- 빈 요청 저장: 0개
- memo-only 요청의 상태 문구 제목 hit: 0개

## Claude Design 목업과의 연결

이번 slice는 정확성만 닫았다. 현재 모바일 상세에서 항목 이동·편집·export가 한 번에 길게 보이고, wide 화면도 여러 설명 카드가 겹친다. `(8)` 목업의 다음 패턴은 후속 단계에서 적용한다.

- A: 기본 편집은 제목·날짜·메모만 먼저 보여주는 progressive disclosure
- D: 먼저 전체/선택/현재 범위를 고르고 그 다음 형식을 선택하는 export scope

따라서 현재 screenshot의 긴 편집·가져가기 표면을 최종 디자인으로 판정하지 않는다.

## 검증 한계

자동화는 DOM, localStorage, clipboard, Calendar event, overflow와 console error를 확인했다. 사용자가 `이 Flow 가져가기`를 Flow 전체 export로 인지하는지는 실제 사용자 관찰이 필요하다.
