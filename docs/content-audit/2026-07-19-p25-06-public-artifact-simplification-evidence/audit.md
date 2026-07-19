# P25-06 audit

## 이전 문제

공개 Flow의 첫 화면은 입력, 저장 결과, 첫 할 일, artifact 미니 목록을 먼저 설명한 뒤 본문에서 같은 artifact를 다시 보여줬다. 본문 체크박스는 저장 범위를 바꾸지 않는데도 완료 또는 포함 선택처럼 보였고, 일부 routine 화면은 저장 전 진행률과 기록 입력까지 제공했다. 사용자는 무엇을 저장하는지 확인하기보다 화면의 여러 표현이 같은 것인지 해석해야 했다.

## 제품 판단

공개 화면의 기본 저장 단위는 Flow 전체다. 따라서 체크박스를 `포함`으로 재명명하는 것은 실제 동작과 맞지 않는다. P25-06은 저장 전 artifact를 읽기 전용으로 만들고 다음 두 결정만 남긴다.

| 행동 | 의미 |
| --- | --- |
| `그대로 저장` | 현재 공개 Flow 전체를 My Flow에 저장 |
| `내 버전으로 조정` | 저장 전에 필요한 개인 조정 경로로 이동 |

개별 할 일 완료는 저장 후 실행 상태다. public artifact의 marker는 구성 항목임을 보여줄 뿐 상태를 변경하지 않는다.

## 정보 구조

1. Flow 이름과 제작자
2. 필요한 경우에만 기준일 또는 반복 요일 입력
3. 저장 또는 조정 결정
4. 실제 Flow 구성 한 개
5. source/detail disclosure와 Flow 단위 export

입력/결과/첫 할 일 triptych, 저장될 Flow 미니 목록, 자동 저장 설명 band, 반복 badge를 제거했다. 긴 설명은 접힌 description에서만 접근한다.

## 브라우저 확인

대표 route `/f/vehicle-inspection-prep`를 모바일과 wide에서 확인했다.

- 모바일 첫 viewport 안에서 실제 차량 점검표가 시작된다.
- wide에서는 입력과 저장 결정 다음에 하나의 artifact만 보인다.
- pre-save completion/selection checkbox는 없다.
- 저장 후 완료 체크를 담당하는 My Flow contract는 회귀 테스트로 유지된다.

추가 회귀 route는 moving, monthly maintenance, new-car, used-car, fridge-cleanout을 포함한다.

## Evidence 경계

자동 검증은 representation 수, checkbox 부재, save CTA 순서, source/detail 접근, export 접근과 레이아웃을 증명한다. 사용자가 `그대로 저장`과 `내 버전으로 조정`을 설명 없이 구분하는지, artifact를 충분히 빠르게 파악하는지는 실제 관찰 전에는 확정하지 않는다.

## 검증 결과

- `npm.cmd run build`: 통과
- `tests/e2e/public-share-cta-order.spec.ts` + `tests/e2e/workbench-source-density.spec.ts`: `44 / 44` 통과
- 갱신한 Flow MVP 회귀 대상: `2 / 2` 통과
- `git diff --check`: 오류 없음, Windows line-ending 경고만 존재
