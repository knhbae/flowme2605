# P22-03 URL-first Miss Compression Audit

## 원인

기존 miss 결과는 `아직 없음`, `초안 요청 가능`, `저장 대기`, `아직 실행 가능한 Flow 아님`을 동시에 보여줬다. 여기에 원 URL, 재조회, 제목/메모 수정, 삭제가 초안 편집 행동과 같은 위계로 노출돼 사용자가 첫 결정을 내리기 전에 시스템 상태를 해석해야 했다.

## 적용한 위계

1. miss 결과는 `바로 시작할 Flow를 찾지 못했어요`로 결과만 설명한다.
2. 첫 행동은 `초안 준비하기` 하나다.
3. 입력은 `Flow 이름`과 `원하는 결과`라는 사용자어를 쓴다.
4. 저장 후 카드는 `내 초안`으로 보이며 `초안 편집 시작`을 우선한다.
5. 원 URL, 다시 조회, 제목/메모 수정, 삭제, 정리본 복사는 `원문·메모 보기` 안에 둔다.
6. resolved candidate는 `Flow 준비됨`과 `Flow 결과로 이동`을 우선한다.

## 바꾸지 않은 것

- 실제 AI API 또는 자동 생성 기능
- canonical URL lookup과 candidate 중복 정책
- candidate/draft localStorage schema
- 결정론적 draft item 제안
- My Flow, Calendar, export projection
- Studio 초안 선반

## 시각 판정

- 390px miss: primary CTA가 하단 nav 위에 완전히 보인다.
- 390px saved candidate: 편집 행동과 보조 관리 행동만 보인다.
- 1024px miss: 입력 흐름이 한 열로 자연스럽게 읽힌다.
- 1024px saved candidate: 초안이 한 개일 때 반쪽 열을 남기지 않고 전체 열을 사용한다.

## 검증

- `npm.cmd test`: 379 passed
- `npm.cmd run build`: passed
- `tests/e2e/url-first-user-surface.spec.ts`: 7 passed
- 관련 `tests/e2e/flow-mvp.spec.ts`: 4 passed
- `tests/e2e/public-share-cta-order.spec.ts` + `tests/e2e/workbench-source-density.spec.ts`: 29 passed
- 390px/1024px horizontal overflow: 0

## 남은 제품 과제

이번 slice는 miss의 첫 결정을 정리했다. 완료 후 회고, 개인 수정과 원본 정정 요청의 경계, 계정·기기 연속성은 별도 P22 작업으로 남는다.
