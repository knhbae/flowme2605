# 소유·게시 범위

기존 세 후보와 방향 점검의91파일(24tracked수정·67untracked실제파일)을 독립 감사로 기존 소유 기록과 대조했다. 공통 작성기/CSS/fixture의 여러 후보 hunk는 이번 통합 승인 범위로 검토하고 한 입력 목표의 단독 변경으로 표시하지 않는다. 이번 추가 파일과 exact allowlist는 [게시 manifest](publication-files.json)에 둔다. 선언된 파일이 존재한다고 자동 승인되거나 stage되는 것은 아니며 최종 diff·private boundary를 따로 확인한다.

- 다른 worktree의 dirty 파일, `.tmp` 설정·실계정, catalog/sample 원문, output JSON/로그/PNG/trace는 포함하지 않는다.
- 세 이전 HTML/QA는 역사 근거다. 폴더 review의PNG2개는 로컬 전용으로 이미 표시되어 있어 Git clone에서는 보이지 않는다. 원시 증거를 게시해 해결하지 않고 이번 요약에 제한을 명시한다.
- 설정과pack은 launcher/test의 명시 파일로 읽기만 한다. 현재 개발계의 이전build와 설정 hash는 로컬 전용 마감 근거로 남긴다.
- 기존36파일 hostcommit1eb9be68은 현재 앱에 이미 사용 중인 기반이다. 원격905c4c31/PR205 위에 쌓인 dependency로 보존하며 main이나 기존PR을 자동 병합하지 않는다.

감사: private client roots106·source546·금지 경로0, 새HTML7개의비공개원문/credential발견0, diff공백오류0. 이는 게시/소유 감사이며 이번 회귀/CI/실기기 검증을 대신하지 않는다.

최종 게시 범위는 최초104개+CI 보완 테스트2개+마감 이력 문서2개로108개 distinct path다. 최초 독립 감사104와후속3ef의4경로·ae5의3경로·마감문서변경은중복파일을포함하므로commit별개수를단순합산하지않는다. 정확한Git누적diff/manifest와마감stage를별도로대조한다. 최종문서게시worktree는제품ae5기준의깨끗한사본이며실행앱의`.next`를빌드하지않는다. standalone검사생성PNG19개는로컬보존하고역사사본을Git원래바이트로복원했으며stage/게시0·다른작업본변경0이다.

최신 독립 검사2026-10-01T05:28:24.486~05:28:24.975Z: manifest104개와실제dirty/untracked104개가정확히일치했고staged/누락/미등록/검사중drift0이다. secret/privatepayload발견0·trackedcatalog0·Alpha importclosure미해결0이다. manifestSHA256 `ec45f48396c2271c9861777534478008ea30389feb4bd3c27f22690ad6ffb50a`, 제품/테스트/스크립트digest `154a2af1f934ca43a120ee6bb50221cf69ee967e75cfdc008ba0b93aa1f43e4a`를기록했다. 이후부모가검증수치문서만갱신했으므로stage직전목록·diff·source를다시대조한다. raw104hash/JSON은로컬전용이다.
