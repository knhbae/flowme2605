# P3-F handoff

## 결과 요약

P3-F는 P3-E의 두 planning 가정을 정본에 맞게 고치고 네 primary gap을 격리 통합 PoC 범위에서만 닫는다.

- 전역 application shell: 기존 PlatformNav·ink/cobalt 유지
- exact-query surface: white/gray/teal·flat 유지
- identity collision: `(snapshotId,stableKey)`와 `(contentId,nodeKind,stableKey)` 적용
- 승격: `V41-001`, `D2-002`, `D2-004`, `D2-007` → 격리 통합 PoC `충족/E4`
- 집계: `138/4/3/11/12`, gap 7
- candidate+shell focused: 32/32 통과(데이터 26 + shell 6)
- P2-B~P3-F additive trace: 45/45 통과
- 전체 `npm test`: 2,126/2,126 통과(12개 Node invocation)
- production build: 18/18 static page 통과
- 최종 Playwright: 77/77 통과(6개 spec, Stage 3 포함)
- docs check: 필수 파일 16개·로컬 링크 4,632/4,632 통과
- security audit: 실패 — 고위험 1건·낮음 1건, 자동 수정 미실행
- Production ready: false

## 주요 파일

- [P3-F spec](./spec.md)
- [실행 계획](./plan.md)
- [작업 목록](./tasks.md)
- [QA](./qa.md)
- [결정 계약](./decision-contract.md)
- P3-F verdict override (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/current-verdict-overrides-p3f.json`)
- P3-F 요구사항 요약 (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-this-run-p3f.json`)
- P3-F trace 자산 검사 (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-p3f-assets.test.cjs`)

## 판정 변화

| 제품 | P3-E | P3-F |
|---|---:|---:|
| V41 | 61/2/3/6/6 | 62/1/3/6/6 |
| D1 | 26/0/0/0/0 | 26/0/0/0/0 |
| D2 | 47/6/0/5/6 | 50/3/0/5/6 |
| 전체 | 134/8/3/11/12 | 138/4/3/11/12 |

표의 순서는 `충족/부분/미충족/의도적 변경/제외`다.

## 남은 7개 gap

1. `V41-062` — 실제 Android Chrome
2. `V41-063` — 실제 iOS Safari
3. `V41-064` — TalkBack·VoiceOver·글자·200% 실기
4. `V41-066` — 실제 touch 이동·cancel
5. `D2-038` — 실제 모바일 가상 키보드
6. `D2-042` — 320·360·200%·visualViewport
7. `D2-061` — 전체 keyboard·focus·reduced motion·보조기술

## 다음 작업

1. 의존성 보정 범위를 별도로 승인한 뒤 `browserslist`와 `postcss-selector-parser` 취약점을 해결하고 전체 검증을 다시 실행한다.
2. 같은 안정 후보를 실제 Android Chrome과 iOS Safari에서 실행한다.
3. TalkBack·VoiceOver·OS 최대 글자·browser 200%를 실행한다.
4. 실패하면 해당 실제 기기/접근성 gap을 유지하고 candidate UI를 수정한다.
5. 일곱 gap이 닫힌 뒤에도 운영 schema/writer/migration/provider sync는 별도 목표와 승인이 있어야 시작한다.

## 미실행·공개 상태

- 운영 schema/writer/migration/provider sync: 미실행
- security audit 자동 수정: 미실행
- 실제 Android Chrome: 미실행
- 실제 iOS Safari: 미실행
- TalkBack: 미실행
- VoiceOver: 미실행
- 관찰 사용자: 0명
- commit: 미실행
- push: 미실행
- PR: 미실행
- Preview: 미실행
- Production: 미실행

자동 테스트·Chromium·화면 캡처는 실제 기기·보조기술·관찰 사용자 검증이 아니다.
