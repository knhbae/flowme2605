# P22 사용자 관찰본 현행성 메모

작성일: 2026-07-11

## 현재 관찰 기준

- 관찰 진입 주소: <https://flowme2605-knhbae-3510-flowme.vercel.app/>
- 현재 resolved preview: <https://flowme2605-ihsyeyj13-flowme.vercel.app/>
- Vercel deployment: `dpl_3qbM1UrMJGnzLhQYb4pT3dLF11F4`
- Git commit: `1be82ce7c19a7934b1a133e926e13b56413875ae`
- 상태: Vercel `Ready`

관찰 키트는 일회성 preview 주소 대신 현재 `main` preview를 가리키는 branch alias를 사용한다. 세션 시작 전에 alias가 위 resolved preview와 commit을 가리키는지 확인하고, 실제 확인값을 세션 기록 양식에 남긴다.

## 오래된 페이지와 콘텐츠 처리 원칙

1. 날짜가 붙은 과거 review/evidence package는 당시 상태를 설명하는 기록이므로 링크나 판정을 일괄 갱신하지 않는다.
2. 실제 참가자가 다시 쓰는 관찰 키트, 세션 양식, 배포 진입 링크는 현재 빌드 기준으로 유지한다.
3. 외부 원문이 바뀌었거나 Flow 문구가 현재 원문과 맞지 않으면 사용성 실패와 섞지 않고 `source/page freshness issue`로 별도 기록한다.
4. 공개 사용자 표면의 자동 최신성 기준은 [공개 콘텐츠 최신성 evidence](./2026-07-11-flowme-content-freshness-evidence/README.md)를 따른다. 이 기준은 실제 사용자 관찰이나 모든 외부 원문의 영구적 최신성을 보장하지 않는다.
5. 관찰 중 오래된 페이지나 콘텐츠가 발견되면 원문 URL, 현재 화면 문구, 기대한 최신 상태, 사용자 행동 영향을 함께 남긴다.
6. 정상 사용자 콘텐츠의 URL 생존 기준은 [출처 도달성 evidence](./2026-07-11-flowme-live-source-reachability-evidence/README.md)를 따른다. 자동 접근 차단은 404와 분리하고, 연도 고정 자료와 정책 수치는 HTTP 상태와 별도로 확인한다.
7. 민감 콘텐츠의 연도 고정 정책 문구와 내부 provenance 비노출 기준은 [시점 의존 문구 evidence](./2026-07-11-flowme-semantic-claim-freshness-evidence/README.md)를 따른다. 남은 공식 기한·예시 비율 9개는 관찰 중 이해와 신뢰 영향을 별도로 기록한다.

## 대체된 주소

이전 관찰 주소 `flowme2605-cjf039cxf-flowme.vercel.app`은 현재 반복 관찰에서 사용하지 않는다. 과거 evidence 안의 링크는 역사적 기록으로 보존하되, 현재 관찰 키트에서는 제거했다.

## 남은 검증 경계

- 실제 반복 사용자 관찰: `0/15`
- 실제 Calendar 앱 import와 중복 import: 미실행
- 다른 브라우저 또는 기기에서 백업·복원: 미실행
- 계정 기반 저장·동기화 정책: 미결정

이 문서는 관찰 대상 빌드가 최신인지 확인하는 운영 메모이며, 제품 검증 완료 evidence가 아니다.
