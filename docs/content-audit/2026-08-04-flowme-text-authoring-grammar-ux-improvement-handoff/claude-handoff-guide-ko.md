# Claude에 FlowMe HTML을 전달하는 방법

## 결론

GitHub의 HTML 링크 하나만 전달하는 방식은 권하지 않는다. Claude가 파일 내용을 읽는 것과 브라우저에서 화면을 렌더링하고 클릭하는 것은 다르기 때문이다.

가장 안정적인 조합은 다음 여섯 가지다.

1. 외부 의존성이 없는 단일 HTML
2. 데스크톱 스크린샷
3. 모바일 스크린샷
4. 유지할 것과 바꿀 것을 구분한 프롬프트
5. 재현 가능한 시뮬레이션 시나리오 JSON
6. 문법·정렬·결과 형태 계약 JSON

## 권장 방법 A: 파일을 직접 첨부

준비된 `flowme-claude-design-handoff-2026-08-04.zip`을 먼저 푼 뒤, 아래 파일을 Claude에 개별 첨부한다. 압축본에는 현재 standalone HTML, 기준 PNG 4개, 문제 재현 PNG 5개가 포함되어 있다.

Claude 대화에 다음 파일을 개별 첨부한다.

- `flowme-text-authoring-ta-test.html`
- `ui-route-default-1440.png`
- `ui-route-live-reflection-1440.png`
- `ui-route-example-catalog-390x600.png`
- `ui-route-mobile-result-bottom-390x600.png`
- `review-brief-ko.md`
- `grammar-ux-contract-v2-candidate.json`
- `simulation-matrix-v2.json`
- `claude-design-review-prompt-ko.txt`

그 뒤 프롬프트 파일의 전체 내용을 붙여 넣는다.

HTML 첨부만으로 기존 화면이 시각적으로 렌더링된다고 가정하지 않는다. Claude의 일반 파일 업로드는 문서 내용을 추출해 읽는 용도이므로, 화면 기준을 잡을 PNG를 반드시 같이 준다. 프롬프트에는 `첨부 HTML을 self-contained single-page HTML Artifact로 재구성해 실제 상호작용이 가능하게 만들어라`라고 명시한다.

## 권장 방법 B: GitHub 연동

GitHub에 올리기로 별도 승인한 뒤에만 사용한다. 현재 로컬 branch와 dirty worktree는 commit/push되지 않은 상태이므로 지금 바로 Claude의 GitHub에서 보이지 않는다.

승인 후 절차:

1. 별도 범위로 검토된 파일만 commit/push한다.
2. Claude에서 GitHub integration을 연결한다.
3. 저장소와 정확한 branch를 고른다.
4. 전체 저장소 대신 아래 파일·폴더만 대화에 추가한다.
   - 현재 standalone HTML
   - 이 handoff 폴더
   - 데스크톱·모바일 PNG
5. 저장소 파일이 바뀐 뒤에는 Claude에서 `Sync Now`로 다시 동기화한다.
6. GitHub 파일을 읽었다고 화면 상호작용을 검증한 것으로 간주하지 않는다. PNG와 시뮬레이션 프롬프트를 함께 준다.

비공개 저장소는 GitHub App 권한, 조직 관리자 승인, SSO 승인이 필요할 수 있다. GitHub 연동은 선택한 branch의 파일 내용에 접근하기 위한 것이며 commit history나 PR 전체 맥락을 자동으로 제공하는 방식은 아니다.

## 공개 GitHub 링크만 보내는 경우

공개 URL을 가져올 수 있더라도 다음은 보장되지 않는다.

- JavaScript 실행
- 클릭·입력·스크롤
- 로컬 file URL 접근
- 데스크톱/모바일 렌더 차이
- 최신 branch와 파일 동기화

따라서 공개 링크는 보조 참조로만 쓰고, self-contained HTML과 PNG를 직접 첨부하는 편이 낫다.

## 이전 Claude 시안의 사용법

`D:\flowme2605\flow-mvp\claude_work\FlowMe 텍스트 저작 설계 완료_0729_1412.zip`을 함께 참고시키려면 압축 안의 prototype/wireflow HTML과 desktop/mobile PNG를 필요한 것만 추려 개별 첨부한다.

프롬프트에 다음을 분명히 쓴다.

> 이전 Claude 시안에서는 3-pane 구조, 단계적 정보 노출, 모바일 전환 구조만 참고한다. 색감과 컴포넌트 스타일은 현재 FlowMe 화면을 기준으로 유지한다.

이 문장이 없으면 Claude가 과거 시안의 색과 장식까지 새 화면에 섞을 수 있다.

## Claude 결과를 다시 Codex로 가져오는 방법

Claude가 만든 전체 HTML을 파일로 저장하고 다음과 함께 Codex에 전달한다.

- Claude의 변경 요약
- Claude의 viewport별 시뮬레이션 결과
- 통과하지 못한 시나리오
- 적용하지 않은 제안

그 뒤 Codex에는 `codex-implementation-prompt-ko.txt`를 사용하되, Claude HTML을 canonical logic으로 취급하지 말고 구조·상호작용 참고 자료로만 비교하라고 한다. 실제 문법과 데이터 판단은 JSON contract와 현재 code/test가 우선이다.

## 공식 안내

- Claude 파일 업로드: https://support.claude.com/en/articles/8241126-upload-files-to-claude
- GitHub integration: https://support.claude.com/en/articles/10167454-use-the-github-integration
- Web search와 URL fetch: https://support.claude.com/en/articles/10684626-enable-and-use-web-search
- Artifacts: https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them
- Artifact 공유: https://support.claude.com/en/articles/9547008-publish-and-share-artifacts
- HTML custom visuals: https://support.claude.com/en/articles/13979539-custom-visuals-in-chat-and-cowork

## 현재 공개 상태

- 로컬 자료 준비: 진행 중
- GitHub commit/push: 안 함
- 배포/공개 URL: 안 함
- 사용자 검증: 범위 제외
