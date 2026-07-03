# Claude Design P4 final review package

이 패키지는 FlowMe Claude Design 3차 재검토 이후 P4-01~P4-05 개선 루프를 마감 감사하고, Claude Design에게 GitHub 소스/문서/screenshot만으로 다시 평가를 요청하기 위한 자료다.

## 읽는 순서

1. [review.html](./review.html) - route별 screenshot과 판단 요약
2. [scenario-review.html](./scenario-review.html) - 사용자 시나리오별 screenshot storyboard
3. [scenario-guide.md](./scenario-guide.md) - 시나리오별 확인 포인트
4. [audit.md](./audit.md) - P4 적용 요약, route별 evidence, 남은 리스크
5. [route-evidence.json](./route-evidence.json) - 모바일 390px route 수치 evidence
6. [scenario-evidence.json](./scenario-evidence.json) - 모바일 390px scenario 수치 evidence
7. [screenshots](./screenshots/) - 최신 route screenshot 15장
8. [scenario-screenshots](./scenario-screenshots/) - 최신 scenario screenshot 24장
9. [prompt-ko.md](./prompt-ko.md) - Claude Design 재검토 요청 프롬프트

## 생성 기준

- 브랜치: `codex/flowme-uxui-second-loop`
- 기준 커밋: `f1bfcf2`
- viewport: 390 x 844
- base URL: `http://127.0.0.1:3104`
- 생성 스크립트: [capture-claude-p4-final-review-package.mjs](../../../scripts/content-audit/capture-claude-p4-final-review-package.mjs)

## GitHub 링크

- [P4 review package](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p4-final-review-package/README.md)
- [review.html](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p4-final-review-package/review.html)
- [scenario-review.html](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p4-final-review-package/scenario-review.html)
- [scenario-guide.md](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p4-final-review-package/scenario-guide.md)
- [audit.md](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p4-final-review-package/audit.md)
- [route-evidence.json](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p4-final-review-package/route-evidence.json)
- [scenario-evidence.json](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p4-final-review-package/scenario-evidence.json)
- [screenshots](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p4-final-review-package/screenshots)
- [scenario-screenshots](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p4-final-review-package/scenario-screenshots)

원본 Claude Design 3차 재검토 zip은 입력 자료로 사용했지만, 재검토 요청은 이 패키지의 screenshot/evidence와 소스 링크만으로 진행할 수 있게 구성했다.

## 재생성 명령

```powershell
npm.cmd run build
npm.cmd run start -- -p 3104
node scripts\content-audit\capture-claude-p4-final-review-package.mjs
node scripts\content-audit\capture-claude-p4-scenario-screenshots.mjs
```
