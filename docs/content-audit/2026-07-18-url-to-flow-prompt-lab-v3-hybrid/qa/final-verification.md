# URL-to-FLOW Prompt Lab 최종 검증

검증일: 2026-07-18  
브랜치: `codex/url-to-flow-prompt-lab-final`  
기준 HEAD: `a71a0c7af46a04a61639d72aa923b2390ae6511c`

## 결과

| 검증 | 결과 | 근거 |
| --- | --- | --- |
| v3 동결 무결성 | 통과 | freeze SHA-256 `9b66e8204c0b4485afacd1f45b7e3467e2c60645702b5251b8b2889d527b4a3d` |
| v2 stop gate | 통과 | Round 1·2 각각 11/12 No-Go, Round 3 미실행 |
| v3 자동 검증 | 통과 | 두 독립 프로세스 모두 12/12, 16/16 SourceRow, 15 Item, 음성 2/2, unsupported 0 |
| v3 안정성 | 통과 | 두 실행 12/12 동일, fresh process separation 확인 |
| 블라인드 model-proxy | 통과 | 3개 격리 배치, 10개 양성 검토, 15/15 keep, unsupported 0, 7축 4.9857/5 |
| 변이 self-test | 통과 | 정상 기준 + 11개 변이 probe가 기대한 pass/fail로 판정 |
| 스크립트 구문 | 통과 | v3 core/build/review/report 4개 `node --check` |
| 보고서 구조 | 통과 | 14 slide, 10 positive preview, 2 blocked preview, 로컬 링크 오류 0 |
| 브라우저 QA | 통과 | 데스크톱·모바일 가로 넘침 0, 콘솔 error/warning 0, 버튼·키보드 이동 정상 |
| 독립 최종 감사 | 통과 | 별도 sub-agent가 보고서 숫자·범위·근거를 대조해 P0/P1 0, 과장 0 판정 |
| 전체 저장소 테스트 | 통과 | `npm test`: 480/480 pass. 임시 worktree가 의존성을 갖지 않아 메인 저장소의 동일 `node_modules`를 junction으로 연결해 실행 후 즉시 제거 |
| Git whitespace | 통과 | `git diff --check` exit 0 |
| 문서 그래프 | 기준선 실패 | `npm run docs:check`는 현재 HEAD에도 이미 존재하는 끊어진 링크 3건 때문에 exit 1. 이번에 추가한 v2/v3 링크는 모두 존재 |

## 기존 문서 그래프 오류 3건

다음 링크는 기준 HEAD에도 동일하게 존재하며 이번 Prompt Lab 변경에서 생긴 오류가 아니다.

1. `docs/content-audit/2026-07-12-flowme-public-flow-visual-system-evidence/README.md` → 누락된 `2026-07-12-flowme-user-creator-value-chain-ceo-ko.html`
2. `docs/DECISIONS.md` → 누락된 `../my_tests/260616_check_01.md`
3. `docs/IDEAS.md` → 누락된 `content-audit/2026-07-12-flowme-user-creator-value-chain-ceo-ko.html`

## 실행하지 않은 검증

- 앱 빌드·앱 E2E: 이 작업은 앱 라우트·컴포넌트·런타임을 바꾸지 않고 독립 스크립트·증거·HTML 보고서만 추가/수정했다. 대신 실제 Playwright CLI로 정적 보고서와 미리보기를 검수했다.
- 실제 URL fetch·실제 LLM API·외부 계정 쓰기: 실험 비목표이며 실행하지 않았다.
- human/observed-user validation: 수행하지 않았다. 블라인드 검토는 격리된 model-proxy evidence다.

## 게시 상태

- 로컬 편집: 완료
- 커밋: 하지 않음
- push/upstream: 하지 않음 / upstream 없음
- PR·merge·deploy: 하지 않음
- 자동 save/publish 및 외부 서비스 쓰기: 하지 않음
