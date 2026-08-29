# 구현 계획

## 소유 경로

기존 mixed dirty 파일과 predecessor는 수정하지 않는다. 이번 목표는 아래 신규 경로만 소유한다.

- 이 spec 폴더와 `prototype/`
- `scripts/build-text-authoring-property-reentry-simplicity-poc.mjs`
- `playwright.property-reentry-simplicity-poc.config.ts`
- `tests/e2e/text-authoring-property-reentry-simplicity-poc.spec.ts`
- `docs/content-audit/2026-08-29-flowme-text-authoring-property-reentry-simplicity-poc-results/`

## 순서

1. predecessor SHA-256과 current failure를 고정한다.
2. property line re-entry pure planner를 red test로 작성한다.
3. rendered property capture listener를 successor runtime에 연결한다.
4. actual existing value presentation과 more-group subtraction을 구현한다.
5. predecessor에 successor CSS/JS만 추가해 새 HTML을 생성한다.
6. pure → focused browser → predecessor regression → shared Text Authoring → full/build/docs 순으로 검증한다.
7. 390px keyboard journey와 320px·200% text를 실제 browser에서 확인한다.

## rollback

새 successor HTML을 열지 않으면 기존 reliability PoC로 즉시 돌아간다. builder는 빌드 전후 predecessor hash가 같지 않으면 실패해야 한다.

## subtraction

- 제거: existing property의 고정 예시, 반복 existing 안내, more scroll 설명.
- 축약: `9개 더` → `다른 정보`.
- 유지: core 4개, actual syntax/value, blocked 이유, owner title, 뒤로/닫기, 44px target.
- 추가하지 않음: modal, 별도 form, 고정 toolbar, 더 깊은 category menu.
