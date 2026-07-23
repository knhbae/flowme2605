export const platformVisuals = {
  GitHub: {
    slug: "github",
    screenUrls: ["https://github.com/explore"],
    fallbackAsset: "./assets/2026-07-14-flowme-parenting-creator-action-strategy/github-good-first-issue.png",
    screenCaption: "저장소와 이슈를 탐색하고, 원본을 보존한 채 수정안을 제안하는 공개 화면",
    whatItIs: "소스 코드와 작업 이력을 함께 관리하는 개발 협업 플랫폼",
    audience: "개발자, 프로젝트 관리자, 오픈소스 기여자",
    contentUnit: "저장소 · 이슈 · Pull Request · 릴리스",
    coreLoop: ["작은 이슈를 찾는다", "개인 작업본에서 고친다", "검토 후 원본에 반영한다"],
    wireframe: {
      mode: "fork",
      eyebrow: "GitHub의 원본·사본 구조를 적용",
      title: "아이와 첫 캠핑 준비",
      source: "원본 Flow · 캠핑 제작자 김OO · v3",
      context: "내 사본 · 날짜 미정 · 4인 가족",
      items: ["캠핑장 후보 저장", "날짜가 정해지면 예약하기", "출발 전날 준비물 확인"],
      primary: "내 Flow로 복사",
      secondary: "오래된 정보 제보",
      signal: "복사한 사용자가 첫 행동을 실제로 체크하는가"
    }
  },
  "n8n Templates": {
    slug: "n8n-templates",
    screenUrls: ["https://n8n.io/workflows/"],
    fallbackAsset: "./assets/2026-07-20-flowme-contributor-platform-growth-strategy/n8n-workflows-official.png",
    screenCaption: "목적과 앱 조합으로 자동화 템플릿을 찾고 바로 가져오는 공식 워크플로 화면",
    whatItIs: "여러 앱을 연결해 반복 업무를 자동화하는 도구와 템플릿 라이브러리",
    audience: "업무 자동화를 원하는 개인과 팀, 템플릿 제작자",
    contentUnit: "트리거와 작업 노드가 연결된 실행 가능한 워크플로",
    coreLoop: ["목적에 맞는 템플릿을 찾는다", "완성본을 먼저 확인한다", "복제한 뒤 내 앱에 맞춘다"],
    wireframe: {
      mode: "export",
      eyebrow: "n8n의 완성본 먼저 보기 방식을 적용",
      title: "가족여행 D-7 실행 결과",
      source: "원본: 가족여행 체크 가이드",
      context: "7월 30일 출발 · 3인 · 제주",
      items: ["캘린더 3건", "체크리스트 12개", "공유 메모 1개"],
      primary: "이대로 내보내기",
      secondary: "항목 먼저 보기",
      signal: "설명보다 결과 미리보기가 내보내기 선택을 높이는가"
    }
  },
  "Product Hunt": {
    slug: "product-hunt",
    screenUrls: ["https://www.producthunt.com/"],
    fallbackAsset: "./assets/2026-07-20-flowme-contributor-platform-growth-strategy/product-hunt-founder-first-2000.png",
    fallbackSourceUrl: "https://www.ryanhoover.me/post/how-we-got-our-first-2-000-users-doing-things-that-dont-scale",
    fallbackCaption: "Product Hunt 창업자가 첫 2,000명 확보 과정을 직접 설명한 원자료 화면",
    screenCaption: "새 제품을 매일 소개하고 반응과 대화를 한곳에 모으는 공개 피드",
    whatItIs: "새로운 디지털 제품을 발견하고 출시 반응을 모으는 커뮤니티",
    audience: "초기 제품 사용자, 창업자, 제작자, 투자자",
    contentUnit: "제품 소개 · 제작자 설명 · 투표 · 댓글",
    coreLoop: ["오늘 공개된 제품을 본다", "제작자와 질문을 주고받는다", "다음 날 새 목록으로 돌아온다"],
    wireframe: {
      mode: "launch",
      eyebrow: "Product Hunt의 좁은 출시 단위를 적용",
      title: "이번 주 공개 Flow",
      source: "육아 생활 운영 · 제작자 3명 공동 검토",
      context: "어린이집 첫 등원 · 가족여행 · 주말 체험",
      items: ["실행본 미리보기", "제작자에게 질문", "사용 후 한 줄 피드백"],
      primary: "첫 Flow 써보기",
      secondary: "다음 공개 알림",
      signal: "초대 사용자가 일주일 안에 다시 돌아오는가"
    }
  },
  "Notion Marketplace": {
    slug: "notion-marketplace",
    screenUrls: ["https://www.notion.com/templates"],
    fallbackAsset: "./assets/2026-07-12-flowme-user-creator-value-chain/notion-marketplace-official.webp",
    screenCaption: "용도별 완성 템플릿을 미리 보고 제작자 정보와 함께 복제하는 공식 마켓",
    whatItIs: "Notion에서 바로 복제해 쓰는 템플릿을 찾고 판매하는 공식 마켓",
    audience: "빈 문서부터 만들기 어려운 사용자와 템플릿 제작자",
    contentUnit: "미리보기와 설명, 제작자 정보가 붙은 복제 가능한 템플릿",
    coreLoop: ["용도별 템플릿을 찾는다", "완성된 모습을 미리 본다", "내 작업 공간으로 복제한다"],
    wireframe: {
      mode: "template",
      eyebrow: "Notion의 복제 전 미리보기를 적용",
      title: "이사 D-30 Flow",
      source: "제작자 박OO · 원문과 수정일 표시",
      context: "체크리스트 18개 · 캘린더 5건 · 비용표",
      items: ["실행 화면 미리보기", "포함 데이터 확인", "원본 제작자 페이지 열기"],
      primary: "내 도구로 가져가기",
      secondary: "Flow 상세 보기",
      signal: "완성된 결과를 본 뒤 복제하는 비율이 높아지는가"
    }
  },
  note: {
    slug: "note",
    screenUrls: ["https://note.com/"],
    fallbackAsset: "./assets/2026-07-20-flowme-contributor-platform-growth-strategy/note-growth-official.png",
    screenCaption: "글과 경험을 발행하고 독자가 구독하거나 유료로 구매할 수 있는 공개 홈",
    whatItIs: "개인이 글과 경험을 발행하고 독자 관계와 수익을 쌓는 일본 콘텐츠 플랫폼",
    audience: "전문가가 아니어도 경험을 꾸준히 기록하려는 제작자와 독자",
    contentUnit: "무료·유료 글 · 시리즈 · 멤버십",
    coreLoop: ["경험을 짧게 발행한다", "독자 반응과 구독이 쌓인다", "연재와 유료 상품으로 이어진다"],
    wireframe: {
      mode: "creator",
      eyebrow: "note의 평범한 경험도 자산이 되는 구조를 적용",
      title: "아이가 편식할 때 시도한 저녁 루틴",
      source: "엄마 제작자 이OO의 원본 글",
      context: "체크할 행동 4개 · 원문 사진은 링크로 유지",
      items: ["오늘 해볼 한 가지", "다음 식사 때 바꿀 점", "실제로 도움 됐는지 기록"],
      primary: "실행용으로 저장",
      secondary: "원문 읽기",
      signal: "제작자의 기존 글에서 실행 저장이 발생하는가"
    }
  },
  Substack: {
    slug: "substack",
    screenUrls: ["https://substack.com/home", "https://substack.com/"],
    screenCaption: "뉴스레터와 게시물을 발견하고 제작자를 직접 구독하는 공개 홈",
    whatItIs: "제작자가 이메일·웹·앱으로 콘텐츠를 발행하고 구독료를 받는 플랫폼",
    audience: "독자 관계를 직접 소유하려는 작가, 전문가, 미디어 제작자",
    contentUnit: "뉴스레터 · 게시물 · 팟캐스트 · 구독",
    coreLoop: ["제작자의 글을 발견한다", "이메일이나 앱으로 구독한다", "무료 독자가 유료 독자로 전환된다"],
    wireframe: {
      mode: "creator",
      eyebrow: "Substack의 제작자 직접 관계를 적용",
      title: "주간 러닝 레터에서 4주 Flow로",
      source: "원문 뉴스레터와 제작자 구독 링크 유지",
      context: "주 3회 · 4주 · 달력과 체크리스트",
      items: ["이번 주 계획 보기", "내 일정에 맞춰 날짜 선택", "다음 편 업데이트 받기"],
      primary: "4주 실행본 만들기",
      secondary: "제작자 구독",
      signal: "Flow 사용이 원문 구독과 재방문을 함께 만드는가"
    }
  },
  wikiHow: {
    slug: "wikihow",
    screenUrls: ["https://www.wikihow.com/Main-Page"],
    screenCaption: "생활 문제를 단계별 그림과 설명으로 풀어낸 공개 방법 안내 화면",
    whatItIs: "생활 속 질문을 단계별 방법과 그림으로 설명하는 실용 지식 서비스",
    audience: "지금 해결해야 할 구체적인 문제가 있는 검색 사용자",
    contentUnit: "방법 문서 · 단계 · 팁 · 경고 · 질문과 답변",
    coreLoop: ["검색으로 문제를 찾는다", "단계별 방법을 따라 한다", "도움 여부와 수정 의견을 남긴다"],
    wireframe: {
      mode: "micro-edit",
      eyebrow: "wikiHow의 단계별 설명과 작은 수정을 적용",
      title: "아이와 종이 공룡 만들기",
      source: "원문 제작자 링크 · 준비물과 단계만 구조화",
      context: "지금 실행 · 25분 · 보호자와 함께",
      items: ["준비물 확인", "접고 붙이기", "완성 사진 남기기"],
      primary: "지금 시작",
      secondary: "단계가 틀렸어요",
      signal: "실행 직후 한 단계 수정 제안이 들어오는가"
    }
  },
  "Figma Community": {
    slug: "figma-community",
    screenUrls: ["https://www.figma.com/community"],
    screenCaption: "디자인 파일과 플러그인을 탐색하고 복제해 수정하는 공식 커뮤니티",
    whatItIs: "디자인 파일, 플러그인, 위젯을 공개하고 복제해 쓰는 제작자 커뮤니티",
    audience: "디자이너, 개발자, 팀, 리소스 제작자",
    contentUnit: "복제 가능한 디자인 파일 · 플러그인 · 위젯",
    coreLoop: ["완성본을 둘러본다", "내 작업 공간으로 복제한다", "수정하고 제작자를 팔로우한다"],
    wireframe: {
      mode: "template",
      eyebrow: "Figma의 리믹스 가능한 공개 원본을 적용",
      title: "가족 생일 준비 Flow",
      source: "제작자 기준본 · 사용 조건과 버전 표시",
      context: "복제 후 역할·예산·날짜만 바꾸기",
      items: ["완성본 한눈에 보기", "내 가족 역할로 바꾸기", "수정본은 비공개로 유지"],
      primary: "내 버전 만들기",
      secondary: "제작자 팔로우",
      signal: "복제 뒤 최소 한 항목을 자기 상황에 맞게 고치는가"
    }
  },
  "Canva Creators": {
    slug: "canva-creators",
    screenUrls: ["https://www.canva.com/creators/templates/", "https://www.canva.com/creators/"],
    screenCaption: "템플릿 제작자가 작품을 제출하고 사용량에 따라 보상받는 공식 프로그램",
    whatItIs: "Canva 템플릿과 요소를 만드는 제작자에게 유통과 로열티를 제공하는 프로그램",
    audience: "디자인 템플릿 제작자와 완성본을 빠르게 쓰려는 사용자",
    contentUnit: "검토를 거쳐 배포되는 편집 가능한 템플릿과 디자인 요소",
    coreLoop: ["제작자가 포트폴리오로 지원한다", "기준에 맞는 템플릿을 발행한다", "사용량에 따라 도달과 보상이 쌓인다"],
    wireframe: {
      mode: "creator",
      eyebrow: "Canva의 품질 심사와 제작자 보상을 적용",
      title: "제작자 Flow 발행 신청",
      source: "원본 콘텐츠 1개 · 실행본 미리보기",
      context: "출처 · 결과물 · 주의사항 · 업데이트 책임",
      items: ["자동 변환 초안 확인", "제작자가 수정 승인", "사용 반응 요약 받기"],
      primary: "검토 요청",
      secondary: "발행 기준 보기",
      signal: "지원 제작자가 두 번째 Flow도 발행하는가"
    }
  },
  Wikipedia: {
    slug: "wikipedia",
    screenUrls: ["https://ko.wikipedia.org/wiki/위키백과:대문"],
    screenCaption: "문서, 출처, 토론, 수정 이력이 함께 보이는 한국어 위키백과 대문",
    whatItIs: "누구나 문서와 출처를 고치되 수정 이력을 공개하는 협업 백과사전",
    audience: "정보를 찾는 독자, 문서를 보완하는 편집자, 검토 공동체",
    contentUnit: "문서 · 문장 · 출처 · 토론 · 수정 이력",
    coreLoop: ["문서를 읽는다", "작은 오류나 출처를 고친다", "다른 편집자가 검토하고 되돌린다"],
    wireframe: {
      mode: "micro-edit",
      eyebrow: "Wikipedia의 문장 단위 기여를 행동 단위로 바꿈",
      title: "여권 갱신 준비 Flow",
      source: "외교부 공식 출처 · 2026.07.23 확인",
      context: "공식 사실은 잠금 · 경험 팁은 별도 표시",
      items: ["오래된 링크 신고", "지역별 방문 팁 추가", "준비물 누락 제보"],
      primary: "한 가지 고치기",
      secondary: "수정 이력 보기",
      signal: "전체 Flow 작성보다 작은 보완 참여가 더 많이 발생하는가"
    }
  },
  OpenStreetMap: {
    slug: "openstreetmap",
    screenUrls: ["https://www.openstreetmap.org/"],
    screenCaption: "사용자가 직접 장소와 길 정보를 편집하는 공개 협업 지도",
    whatItIs: "현장에서 확인한 길과 장소 정보를 누구나 보완하는 공개 지도 데이터 플랫폼",
    audience: "지도 사용자, 지역 기여자, 지도 데이터를 활용하는 서비스",
    contentUnit: "지도 객체 · 위치 · 속성 · 변경 묶음",
    coreLoop: ["현장에서 틀린 정보를 발견한다", "한 장소나 길을 수정한다", "변경 이력과 지역 검토가 쌓인다"],
    wireframe: {
      mode: "field",
      eyebrow: "OpenStreetMap의 현장 한 건 수정을 적용",
      title: "아이와 가기 좋은 공원 Flow",
      source: "지역 제작자 원본 · 장소 5곳",
      context: "오늘 방문한 장소만 빠르게 확인",
      items: ["유모차 진입 가능", "화장실 위치", "운영시간이 바뀜"],
      primary: "현장 정보 1개 수정",
      secondary: "사진 없이 제보",
      signal: "방문 직후 30초 안에 최신성 제보를 끝내는가"
    }
  },
  "Hugging Face Hub": {
    slug: "hugging-face-hub",
    screenUrls: ["https://huggingface.co/models"],
    screenCaption: "모델을 검색하고 카드, 버전, 파일, 파생 앱을 확인하는 공개 허브",
    whatItIs: "AI 모델, 데이터셋, 데모 앱을 공개하고 버전별로 재사용하는 협업 허브",
    audience: "AI 개발자, 연구자, 모델 제작자와 활용자",
    contentUnit: "모델 · 데이터셋 · Space · 모델 카드 · 버전",
    coreLoop: ["목적에 맞는 자산을 찾는다", "설명과 라이선스를 확인한다", "복제·파생한 결과를 다시 공개한다"],
    wireframe: {
      mode: "fork",
      eyebrow: "Hugging Face의 파생 관계와 설명 카드를 적용",
      title: "초등 입학 준비 Flow",
      source: "기준본 v4 · 교육청 자료 + 제작자 경험",
      context: "내 실행본은 v4에서 파생 · 개인 메모 비공개",
      items: ["어떤 출처로 만들었는지", "무엇을 수정했는지", "최신 버전이 있는지"],
      primary: "이 버전으로 시작",
      secondary: "버전 비교",
      signal: "최신 기준본 안내가 오래된 개인본의 오사용을 줄이는가"
    }
  },
  "NAVER 지식iN": {
    slug: "naver-knowledge-in",
    screenUrls: ["https://kin.naver.com/"],
    screenCaption: "사람들이 생활 문제를 질문하고 여러 답변 중 채택 답변을 고르는 공개 Q&A",
    whatItIs: "사용자의 구체적인 질문에 경험자와 전문가가 답하는 한국형 Q&A 서비스",
    audience: "즉시 답이 필요한 질문자와 경험·전문 지식을 나누는 답변자",
    contentUnit: "질문 · 답변 · 채택 · 추가 질문",
    coreLoop: ["생활 문제를 질문한다", "여러 답변을 비교한다", "도움 된 답을 채택하고 검색 자산으로 남긴다"],
    wireframe: {
      mode: "demand",
      eyebrow: "지식iN의 실제 질문을 콘텐츠 수요로 활용",
      title: "‘어린이집 첫날 뭘 챙기나요?’",
      source: "반복 질문 27건에서 공통 행동 후보 추출",
      context: "답변을 그대로 복사하지 않고 원출처를 다시 확인",
      items: ["반복되는 준비물", "기관마다 다른 항목", "공식 확인이 필요한 항목"],
      primary: "Flow 후보로 검토",
      secondary: "원 질문 보기",
      signal: "같은 질문이 반복되는 주제에서 저장과 실행이 발생하는가"
    }
  },
  "Stack Overflow": {
    slug: "stack-overflow",
    screenUrls: [
      "https://stackoverflow.com/questions/list",
      "https://stackoverflow.com/help/how-to-ask"
    ],
    screenCaption: "구체적인 프로그래밍 질문, 답변, 투표, 채택 상태를 함께 보여주는 공개 목록",
    whatItIs: "재현 가능한 프로그래밍 문제와 답을 검색 자산으로 축적하는 Q&A 서비스",
    audience: "문제를 해결하려는 개발자와 검증 가능한 답을 제공하는 기여자",
    contentUnit: "질문 · 답변 · 투표 · 채택 · 태그",
    coreLoop: ["구체적인 문제를 묻는다", "재현 가능한 답을 비교한다", "채택과 투표로 검색 품질을 높인다"],
    wireframe: {
      mode: "demand",
      eyebrow: "Stack Overflow의 구체성 기준을 적용",
      title: "K-MOOC 완주 계획이 자꾸 밀려요",
      source: "상황: 주 2시간 · 6주 남음 · 진도 20%",
      context: "막연한 조언 대신 재현 가능한 실행 조건을 받음",
      items: ["남은 강의 수", "가능한 시간", "중단·재계획 조건"],
      primary: "내 상황으로 계산",
      secondary: "가정 확인",
      signal: "조건이 분명한 Flow가 일반 계획보다 완주를 더 돕는가"
    }
  },
  오늘의집: {
    slug: "today-house",
    screenUrls: [
      "https://play.google.com/store/apps/details?id=net.bucketplace&hl=ko",
      "https://ohou.se/"
    ],
    fallbackAsset: "./assets/2026-07-13-flowme-ecosystem-platform-vertical-strategy/ohouse-official.png",
    fallbackSourceUrl: "https://www.bucketplace.com/",
    screenCaption: "실제 집 사진에서 공간 아이디어와 관련 상품을 함께 찾는 공개 홈",
    whatItIs: "사용자 집 사진과 노하우를 상품 탐색·구매로 연결하는 생활 플랫폼",
    audience: "집을 꾸미거나 정리하려는 사용자, 생활 콘텐츠 제작자, 판매자",
    contentUnit: "집들이 사진 · 노하우 · 상품 태그 · 구매 링크",
    coreLoop: ["실제 공간에서 아이디어를 얻는다", "사진 속 정보를 자세히 본다", "상품이나 실행 행동으로 이어간다"],
    wireframe: {
      mode: "visual",
      eyebrow: "오늘의집의 결과 사진에서 행동으로 내려가는 방식을 적용",
      title: "아이 책장 정리 전·후",
      source: "정리 제작자 원본 사진과 글 링크",
      context: "사진은 원문에서 보고 FlowMe에는 행동만 저장",
      items: ["분류 기준 정하기", "버릴 책 골라내기", "아이 손이 닿는 높이에 재배치"],
      primary: "정리 Flow 저장",
      secondary: "원문 사진 보기",
      signal: "영감 저장이 실제 첫 행동으로 이어지는가"
    }
  },
  "Google Maps Local Guides": {
    slug: "google-local-guides",
    screenUrls: ["https://www.google.com/local/guides/"],
    screenCaption: "리뷰, 사진, 장소 정보 수정 등 작은 현장 기여 방식을 설명하는 공식 페이지",
    whatItIs: "Google 지도에서 리뷰·사진·장소 정보를 보완하는 전 세계 기여자 프로그램",
    audience: "지역 경험을 공유하는 지도 사용자와 장소를 찾는 사람",
    contentUnit: "리뷰 · 사진 · 장소 추가 · 정보 수정 · 사실 확인",
    coreLoop: ["방문한 장소의 정보를 남긴다", "작은 기여마다 포인트를 받는다", "다른 사용자의 선택을 돕는다"],
    wireframe: {
      mode: "field",
      eyebrow: "Local Guides의 방문 직후 작은 기여를 적용",
      title: "가족 나들이 Flow를 방금 사용했나요?",
      source: "광릉수목원 당일 코스 · 7월 23일 실행",
      context: "개인 기록은 비공개 · 집계 신호만 동의 후 사용",
      items: ["운영시간이 맞았어요", "아이와 이동 난이도", "준비물 한 가지 추가"],
      primary: "도움 된 정보 1개 남기기",
      secondary: "건너뛰기",
      signal: "완료 직후 한 항목 피드백에 응답하는가"
    }
  },
  YouTube: {
    slug: "youtube",
    screenUrls: [
      "https://www.youtube.com/results?search_query=%EC%95%84%EC%9D%B4%EC%99%80+%EC%BA%A0%ED%95%91+%EC%A4%80%EB%B9%84",
      "https://www.youtube.com/feed/trending"
    ],
    fallbackAsset: "./assets/2026-07-13-flowme-ecosystem-platform-vertical-strategy/youtube-creators.png",
    fallbackSourceUrl: "https://www.youtube.com/creators/",
    preferFallback: true,
    fallbackCaption: "제작자가 채널 운영과 수익 정보를 찾는 YouTube 공식 제작자 화면",
    screenCaption: "영상 썸네일과 채널을 중심으로 콘텐츠를 발견하고 구독하는 공개 홈",
    whatItIs: "영상 제작자와 시청자, 광고·구독·쇼핑 수익이 모인 글로벌 동영상 플랫폼",
    audience: "영상을 찾는 시청자와 채널을 운영하는 제작자",
    contentUnit: "영상 · Shorts · 재생목록 · 채널 · 댓글",
    coreLoop: ["추천이나 검색으로 영상을 본다", "채널을 구독하고 반응한다", "관련 영상과 상품으로 이어진다"],
    wireframe: {
      mode: "creator",
      eyebrow: "YouTube 원본 아래 실행 버튼을 붙이는 방식",
      title: "영상: 초보 캠핑 준비 15분",
      source: "영상과 제작자 채널은 YouTube에 그대로 유지",
      context: "FlowMe에는 준비 행동 6개와 날짜 선택만",
      items: ["영상 보며 준비물 저장", "캠핑 날짜가 생기면 일정 추가", "완료 후 제작자 링크로 돌아가기"],
      primary: "이 영상으로 준비하기",
      secondary: "원본 영상 보기",
      signal: "영상 시청 뒤 저장한 Flow가 실제 실행으로 이어지는가"
    }
  },
  Instructables: {
    slug: "instructables",
    screenUrls: ["https://www.instructables.com/"],
    fallbackAsset: "./assets/2026-07-22-flowme-vertical-service-content-coverage-atlas/instructables-01.png",
    screenCaption: "완성작 사진, 재료, 도구, 제작 단계를 함께 보여주는 공개 DIY 홈",
    whatItIs: "직접 만든 물건과 만드는 과정을 사진 단계로 공유하는 DIY 커뮤니티",
    audience: "무언가 만들고 싶은 사용자와 과정을 공유하는 제작자",
    contentUnit: "완성작 · 재료·도구 · 사진 단계 · 팁 · 댓글",
    coreLoop: ["완성작을 보고 만들고 싶어진다", "재료와 단계를 따라 한다", "완성 결과와 개선점을 공유한다"],
    wireframe: {
      mode: "guide",
      eyebrow: "Instructables의 완성작·재료·단계 구성을 적용",
      title: "우유팩 미니 화분 만들기",
      source: "DIY 제작자 원본 · 사진은 링크로 열기",
      context: "지금 실행 · 30분 · 준비물 5개",
      items: ["준비물 펼쳐놓기", "자르고 꾸미기", "흙과 씨앗 넣기"],
      primary: "만들기 시작",
      secondary: "완성작 먼저 보기",
      signal: "완성 결과를 먼저 본 사용자가 실행을 시작하는가"
    }
  },
  Cookpad: {
    slug: "cookpad",
    screenUrls: ["https://cookpad.com/"],
    fallbackAsset: "./assets/2026-07-22-flowme-vertical-service-content-coverage-atlas/cookpad-01.png",
    screenCaption: "재료와 조리법, 실제로 만들어 본 후기 사진을 연결하는 공개 레시피 화면",
    whatItIs: "가정 요리 레시피와 ‘만들어 봤어요’ 후기를 축적하는 요리 커뮤니티",
    audience: "매일 요리하는 생활 사용자와 자신의 레시피를 나누는 제작자",
    contentUnit: "레시피 · 재료 · 조리 단계 · 만든 후기",
    coreLoop: ["먹고 싶은 레시피를 찾는다", "재료와 순서를 따라 만든다", "후기와 변형을 남긴다"],
    wireframe: {
      mode: "recipe",
      eyebrow: "Cookpad의 원본 레시피와 실행 후기를 적용",
      title: "두부 버섯 덮밥",
      source: "레시피 제작자 원문 · 2인분",
      context: "전체 레시피 메모 + 장보기 4개",
      items: ["재료 확인", "조리 순서 펼쳐보기", "다음번에 바꿀 점 메모"],
      primary: "요리 모드 열기",
      secondary: "원문 레시피",
      signal: "만든 뒤 남긴 짧은 메모가 다음 실행을 개선하는가"
    }
  },
  Reddit: {
    slug: "reddit",
    screenUrls: ["https://www.reddit.com/"],
    screenCaption: "관심사별 커뮤니티에서 게시물과 댓글, 투표가 이어지는 공개 피드",
    whatItIs: "관심사별 커뮤니티를 사용자가 만들고 운영하는 대규모 토론 플랫폼",
    audience: "세부 관심사를 깊게 나누는 사용자, 게시자, 자원 운영자",
    contentUnit: "커뮤니티 · 게시물 · 댓글 · 투표 · 운영 규칙",
    coreLoop: ["관심사 커뮤니티에 들어간다", "글과 댓글에 반응한다", "운영 규칙과 문화가 재방문을 만든다"],
    wireframe: {
      mode: "community",
      eyebrow: "Reddit의 작은 관심사와 운영자 역할을 적용",
      title: "서울 서북권 아이와 외출 Flow 모임",
      source: "지역 운영자 2명 · 공개 원칙과 검토 범위 표시",
      context: "새 Flow보다 오래된 장소 정보 보완을 우선",
      items: ["이번 주 검토할 Flow", "지역 정보 한 건 제보", "운영자 승인 대기"],
      primary: "작은 기여 시작",
      secondary: "운영 원칙 보기",
      signal: "가짜 활동 없이 실제 지역 기여자가 다시 돌아오는가"
    }
  },
  Disquiet: {
    slug: "disquiet",
    screenUrls: ["https://disquiet.io/"],
    screenCaption: "한국의 디지털 제품과 제작 과정을 소개하고 메이커가 반응을 주고받는 공개 화면",
    whatItIs: "한국의 메이커가 제품과 제작 기록을 공개하고 피드백을 나누는 커뮤니티",
    audience: "초기 제품을 만드는 창업자, 메이커, 얼리어답터",
    contentUnit: "프로덕트 · 메이커 로그 · 게시물 · 댓글",
    coreLoop: ["작은 제작자 집단이 제품을 공개한다", "서로 피드백을 주고받는다", "운영 주체와 방향이 바뀌며 잔존을 시험한다"],
    wireframe: {
      mode: "launch",
      eyebrow: "Disquiet의 좁은 초기 집단을 적용하되 잔존을 먼저 봄",
      title: "육아 제작자 10명 공동 제작실",
      source: "기존 콘텐츠 1개씩 FlowMe가 변환 지원",
      context: "공개 전 동료 검토 · 발행 후 사용 신호 공유",
      items: ["이번 주 변환 초안", "서로의 Flow 검토", "두 번째 발행 여부 확인"],
      primary: "초안 검토하기",
      secondary: "파일럿 현황",
      signal: "조회보다 제작자의 두 번째 발행과 사용자 재사용이 생기는가"
    }
  },
  "NAVER Cafe": {
    slug: "naver-cafe",
    screenUrls: ["https://section.cafe.naver.com/ca-fe/"],
    screenCaption: "관심사와 지역별 카페를 찾고 운영자 중심의 게시판으로 들어가는 공개 홈",
    whatItIs: "지역·육아·취미 등 공통 상황을 중심으로 오래 운영되는 한국 커뮤니티",
    audience: "같은 상황의 정보를 찾는 회원과 카페 운영자·활동 회원",
    contentUnit: "카페 · 게시판 · 게시물 · 댓글 · 등급 · 운영 규칙",
    coreLoop: ["상황에 맞는 카페를 찾는다", "운영 규칙 안에서 질문하고 답한다", "핵심 회원과 운영자가 정보 품질을 지킨다"],
    wireframe: {
      mode: "community",
      eyebrow: "NAVER Cafe의 상황별 운영자와 신뢰 관계를 적용",
      title: "2026년 어린이집 입소 준비 Flow",
      source: "육아 카페 운영자·제작자 공동 검토",
      context: "공식 사실과 지역 경험을 분리해 표시",
      items: ["공식 준비사항", "지역별 경험 팁", "오래된 정보 신고"],
      primary: "카페용 실행 링크 만들기",
      secondary: "원 게시글 보기",
      signal: "운영자가 반복 질문에 Flow 링크를 다시 사용하는가"
    }
  }
};

export function getPlatformVisual(name) {
  const visual = platformVisuals[name];
  if (!visual) {
    throw new Error(`Missing visual dossier data for ${name}`);
  }
  return visual;
}
