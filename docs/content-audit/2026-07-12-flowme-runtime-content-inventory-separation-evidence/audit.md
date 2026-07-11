# 런타임 콘텐츠 재고 분리 감사

## 문제

기존 canonical seed는 정상 사용자 콘텐츠와 생성형 채널 샘플을 함께 담았다. 이 때문에 440개 샘플이 앱 시작 시 생성되고 localStorage 마이그레이션 대상이 되었으며, direct /f URL도 존재했다. 오래된 페이지를 숨겨도 기존 브라우저에는 샘플이 남을 수 있었다.

## 조치

1. 정상 seed에서 flow-preview-* 생성 샘플을 제거했다.
2. 내부 /creators와 /content-flows만 별도 internalReviewBundles를 읽는다.
3. 기존 localStorage 마이그레이션은 flow-preview-*와 명시적 archive 4개만 제거하고 사용자 draft를 보존한다.
4. 생성 샘플과 archive direct /f URL은 다른 Flow 찾기와 홈 복귀가 가능한 한국어 서비스용 404로 닫았다.
5. /creators의 공개 링크는 source-fit 승인 Flow만 허용한다.

## 오래된 콘텐츠 해석

- 공개 승인 77개: 정상 실행과 index 허용.
- 검토 게이트 96개: 원문 또는 UX 승인 전이며 noindex, 저장/export 차단. “공개 콘텐츠” 수에 포함하지 않는다.
- 생성 샘플 440개: 실제 콘텐츠가 아닌 구조 검토 재고. runtime과 public route에서 제거.
- 명시적 archive 4개: 출처 불충분 또는 공개 숨김 판정이 확정되어 runtime과 public route에서 제거.
- 정상 source freshness: current 130, stale 0, review-due 0, missing 0.

## 남은 리스크

- 검토 게이트 96개는 아직 runtime 재고에 남아 있다. 다음 포트폴리오 배치에서 promote / keep-gated / archive를 계속 결정해야 한다.
- 정상 4탭 route는 여전히 큰 AppClient client bundle을 공유한다. 생성 객체 제거와 별개로 route/component split이 필요하다.
- 자동 QA는 실제 사용자 검증을 대신하지 않는다.
