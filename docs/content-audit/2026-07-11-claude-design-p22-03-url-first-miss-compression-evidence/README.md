# P22-03 URL-first Miss Compression Evidence

`/flows` URL-first miss 화면에서 운영 상태 설명을 줄이고, 사용자가 한 번에 결정할 첫 행동을 `초안 준비하기` 하나로 고정한 evidence package입니다.

## 먼저 보기

1. [review.html](./review.html)
2. [audit.md](./audit.md)
3. [route-evidence.json](./route-evidence.json)
4. [screenshots](./screenshots/)

## 결과

- miss 첫 화면 primary action: `초안 준비하기` 1개
- `아직 없음`, `저장 대기`, `초안 요청 가능`, `아직 실행 가능한 Flow 아님`: 0건
- 저장 후 기본 행동: `초안 편집 시작`
- 원 URL, 재조회, 제목/메모 수정, 삭제, 요청 정리본 복사: `원문·메모 보기` 안의 보조 관리 행동
- live AI로 읽히는 문구: 0건
- 390px/1024px horizontal overflow: 0
- 저장 실패 입력 보존, canonical 중복 방지, Studio/My Flow 연결: 기존 E2E 유지

## 기준선

- UI commit: `6436f51`
- 4탭 IA, public `/f` 공유 shell, My Flow/Calendar 역할은 변경하지 않았습니다.
- candidate localStorage 구조, draft item 생성, 저장/실행/export payload는 변경하지 않았습니다.
