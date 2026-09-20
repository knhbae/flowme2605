# FlowMe 통합 PoC 빠른 할 일→Flow 연결 v1 Tasks

## 1. 계약

- [x] `BP-017`의 기존 보류 이유를 확인했다.
- [x] 사용자 지시에 따라 원본 존치, 새 identity, receipt, Undo 계약을 PoC v1 임시
  결정으로 고정했다.
- [x] 제목·메모·폴더·실행 날짜의 전환 시점 snapshot을 정의했다.
- [x] completion을 복사하지 않고 새 Item을 open으로 시작하도록 정했다.
- [x] 운영 정책·schema·migration·배포가 아니라는 경계를 기록했다.
- [x] recurrence, 공개 후보, table/source update의 기존 보류를 유지했다.

## 2. 순수 모델·state

- [x] QuickItem→one-Item authored Flow materializer를 추가했다.
- [x] exact Quick ref, expected revision, Flow 제목 검증을 추가했다.
- [x] deterministic conversion/handoff identity와 충돌 차단을 추가했다.
- [x] versioned Quick conversion receipt를 snapshot에 추가했다.
- [x] receipt와 authored Flow·Item·handoff의 교차 참조를 검증한다.
- [x] 폴더·날짜·메모를 snapshot으로 복사한다.
- [x] 원본 QuickItem과 completion을 보존한다.
- [x] 새 Item을 open으로 만든다.
- [x] 전환 전체를 한 칸 Undo snapshot으로 묶었다.
- [x] 영구 삭제된 전환 Flow의 관련 receipt 정리를 정의했다.
- [x] 손상 payload와 receipt를 fail-closed한다.

## 3. React UX

- [x] QuickItem 관리 화면에 `Flow로 정리` 진입을 추가했다.
- [x] Flow 이름 확인 form과 취소 경로를 추가했다.
- [x] 전환 결과와 원본 보존 범위를 설명한다.
- [x] 성공하면 새 Flow 상세를 연다.
- [x] 이미 전환한 QuickItem에서는 기존 Flow를 연다.
- [x] 실패 receipt와 동일 snapshot 기반 재시도를 연결했다.
- [x] 전환 Undo 뒤 사라진 Flow가 선택 상태로 남지 않게 했다.
- [x] 전환된 QuickItem Flow를 가짜 source-update fixture에서 제외했다.

## 4. React 검증

- [x] 원본 완료 QuickItem 보존, folder/date/memo 복사, 새 open Item을 검사한다.
- [x] receipt와 reload-valid/ref-valid를 검사한다.
- [x] Undo가 전환 전 state를 정확히 복원하는지 검사한다.
- [x] stale, 잘못된 제목, missing, collision, repeated, corrupt receipt의 mutation 0을
  검사한다.
- [x] focused 모델·state·storage·component suite 104/104 PASS를 확인했다.
- [x] React 전환 E2E 1/1 PASS를 확인했다.
- [x] production build PASS를 확인했다.

## 5. standalone parity

- [x] standalone model에 같은 계약과 receipt를 반영했다.
- [x] standalone UI에 전환·기존 결과 열기·실패·재시도·Undo를 연결했다.
- [x] standalone model/UI tests 92/92를 fresh 실행했다.
- [x] standalone Chromium smoke 2/2를 fresh 실행했다.
- [x] 단일 파일 HTML을 다시 만들고 source asset과 동작 일치를 확인했다.
- [x] Android 전달본과 정본 standalone이 923,787 bytes와 같은 SHA-256임을 확인했다.

## 6. 확대 검증

- [x] React와 standalone의 결과 signature를 비교했다.
- [x] 저장 오류 뒤 raw state bytes 불변과 retry 성공을 두 surface에서 확인했다.
- [x] reload 뒤 성공 state/receipt 복원과 손상 payload fail-closed를 확인했다.
- [x] 허용 prefix 밖 `setItem`·`removeItem` 0건을 확인했다.
- [x] `localStorage.clear()` 0건을 확인했다.
- [x] operating `flow:*` sentinel 전후 byte equality를 확인했다.
- [x] `npm test` 2,201/2,201을 fresh 실행했다.
- [x] production build 18/18 page를 최종 변경 상태에서 다시 실행했다.
- [x] `npm run docs:check`를 실행해 16개 필수 문서·4,651개 로컬 링크를 확인했다.
- [x] scoped diff와 whitespace 오류를 확인했다.

## 7. 브라우저 matrix

- [x] 390×844
- [x] 375×812
- [x] 844×390
- [x] 1024×768
- [x] 1440×900
- [x] 각 화면의 가로 넘침 0을 확인했다.
- [x] console error와 page error 0을 확인했다.
- [x] `Flow로 정리`, 확인, 취소, 재시도, Undo가 가려지지 않는지 확인했다.
- [x] 키보드와 비드래그 경로를 확인했다.

## 8. 증거·보고

- [x] `BP-017` current verdict를 `충족/E4`로 갱신했다.
- [x] 자동 테스트의 실제 실행 개수를 보고했다.
- [x] 브라우저 화면별 결과를 보고했다.
- [x] 실제 Android/iOS·보조기술 미실행 여부를 별도 보고했다.
- [x] 관찰 사용자 수를 별도 보고했다.
- [x] commit, push, PR, Preview, Production 상태를 각각 보고했다.

## 9. 현재 외부 상태

- [ ] 실제 Android Chrome: 미실행
- [ ] 실제 iOS Safari: 미실행
- [ ] screen reader·OS 글자 확대·browser 200%: 미실행
- [ ] 관찰 사용자: 0명
- [ ] commit: 미진행
- [ ] push: 미진행
- [ ] PR: 미진행
- [ ] Preview: 미진행
- [ ] Production: 미진행

체크되지 않은 항목은 실패가 아니라 아직 증거를 만들지 않은 상태다. 실행 전에는 완료로
올리지 않는다.
