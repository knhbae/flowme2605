# P26-11 구성 편집과 여러 항목 조정 evidence

## 판정

- 상태: `complete_internal_evidence`
- 기준선: `40d88ec`
- 실제 관찰 사용자: `0`
- evidence: `current_source`, `current_command`, `current_browser`, `reference_pattern`

개인 draft의 실행 화면과 구조 변경 화면을 분리했다. 일반 모드에서는 완료 체크, `열기`, 빠른 조정만 보이고, `구성 편집`에 들어간 뒤에만 항목 추가, 순서 이동, 여러 항목 선택, 날짜 조정, 목록에서 빼기, 복구가 나타난다. source-backed Flow에는 이 구조 편집 진입점이 나타나지 않는다.

`2026-07-19-flow-content-usage-preview-ko.html`의 compact hierarchy를 참고해 제목과 할 일 목록을 우선하고, 편집 설명은 선택 도구 주변의 한 문장으로 제한했다. 해당 prototype의 문구나 내부 구조어를 제품 화면에 복제하지는 않았다.

## 동작 계약

- 정상 실행 모드: 완료 체크와 상세 열기 중심, 구조 변경 control `0`
- 구성 편집 모드: 실행 완료 control `0`, 항목 선택과 순서·구조 변경만 표시
- 순서 변경: source 배열이 아니라 personal `orderOverride`만 갱신
- 삭제: personal tombstone으로 처리하며 확인 후 즉시 `되돌리기` 제공
- 영구 복구: 새로고침 뒤 `목록에서 뺀 할 일`에서 같은 stable ID로 복구
- 여러 항목 조정: 선택 개수 live status, 날짜 도구 disclosure, 가져가기, 목록에서 빼기
- 내보내기: 구성 편집을 끝낸 뒤 effective personal order와 같은 순서 사용

## 화면

### 모바일 390x844

- 여러 항목 도구는 하단 4탭 바로 위에 고정된다.
- 항목을 선택하기 전 날짜 편집 필드는 펼쳐지지 않는다.
- 완료 체크와 구조 편집 control은 같은 모드에서 경쟁하지 않는다.
- 하단 탭과 toolbar overlap, horizontal overflow, console/page error는 모두 `0`이다.

### wide 1024x768

- 구성 목록과 여러 항목 toolbar가 같은 Flow workspace 안에 inline으로 놓인다.
- 별도의 modal이나 두 번째 편집 목록을 만들지 않는다.
- source/user-created 혼합 순서를 한 목록에서 조정한다.

## 현재 검증

- P26-11 전용 Playwright: `1 / 1` pass
- P24 batch 및 P23 구조 편집·Calendar/ICS·list export 호환 시나리오: `6 / 6` pass
- source-backed 구조 편집 진입/control: `0`
- stable ID 복구, reload 순서 유지, checklist export 순서: pass
- 실제 사용자 관찰: 수행하지 않음

## 캡처

- [모바일 구성 편집](./screenshots/01-mobile-structure-edit.png)
- [wide 구성 편집](./screenshots/02-wide-structure-edit.png)

## 다음 범위

P26-12는 완료 직후 되돌리기와 완료 목록의 다시 열기를 하나의 가역적 실행 계약으로 정리한다. 구조 편집과 완료 상태를 다시 섞지 않는다.
