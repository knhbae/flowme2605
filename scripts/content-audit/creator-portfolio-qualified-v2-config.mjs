export const observedAt = '2026-07-27';

export const selectedCreatorIds = [
  'home-ajd',
  'family-babyfood016',
  'study-mansour',
  'study-opentutorials',
  'money-getcha',
  'health-allblanc',
  'meals-wtable',
  'work-andstudio',
];

export const boundaryCreatorIds = [
  'home-ohouse',
  'family-babybilly',
  'health-bigsis',
  'travel-triple',
  'hobby-bodeum',
];

export const entityConfig = {
  'home-ajd': {
    entityType: 'brand',
    providerDisplayName: '아정네트웍스',
    creatorDisplayName: null,
  },
  'home-ohouse': {
    entityType: 'platform',
    providerDisplayName: '오늘의집',
    creatorDisplayName: null,
  },
  'home-jungriking': {
    entityType: 'individual_creator',
    providerDisplayName: '정리왕',
    creatorDisplayName: '정리왕',
  },
  'family-funmom': {
    entityType: 'individual_creator',
    providerDisplayName: '펀맘',
    creatorDisplayName: '펀맘',
  },
  'family-babyfood016': {
    entityType: 'individual_creator',
    providerDisplayName: '희야라이프',
    creatorDisplayName: '뿐이토핑이유식',
  },
  'family-babybilly': {
    entityType: 'brand',
    providerDisplayName: '베이비빌리',
    creatorDisplayName: null,
  },
  'study-mansour': {
    entityType: 'expert',
    providerDisplayName: '오픽만수르',
    creatorDisplayName: '오픽만수르',
  },
  'study-opentutorials': {
    entityType: 'community',
    providerDisplayName: '오픈튜토리얼스',
    creatorDisplayName: 'egoing',
  },
  'study-nomadcoders': {
    entityType: 'brand',
    providerDisplayName: '노마드 코더',
    creatorDisplayName: null,
  },
  'money-getcha': {
    entityType: 'brand',
    providerDisplayName: '겟차',
    creatorDisplayName: null,
  },
  'money-zzanboo': {
    entityType: 'expert',
    providerDisplayName: '김짠부 재테크',
    creatorDisplayName: '김짠부',
  },
  'money-gomhee': {
    entityType: 'expert',
    providerDisplayName: '박곰희TV',
    creatorDisplayName: '박곰희',
  },
  'health-allblanc': {
    entityType: 'brand',
    providerDisplayName: 'Allblanc TV',
    creatorDisplayName: null,
  },
  'health-bigsis': {
    entityType: 'individual_creator',
    providerDisplayName: '빅씨스 Bigsis',
    creatorDisplayName: '빅씨스',
  },
  'health-thankyoububu': {
    entityType: 'brand',
    providerDisplayName: 'Thankyou BUBU',
    creatorDisplayName: null,
  },
  'travel-kkday': {
    entityType: 'platform',
    providerDisplayName: 'KKday',
    creatorDisplayName: null,
  },
  'travel-triple': {
    entityType: 'platform',
    providerDisplayName: '트리플',
    creatorDisplayName: null,
  },
  'travel-yeomi': {
    entityType: 'brand',
    providerDisplayName: '여행에미치다',
    creatorDisplayName: null,
  },
  'meals-wtable': {
    entityType: 'brand',
    providerDisplayName: '우리의식탁',
    creatorDisplayName: null,
  },
  'meals-10000recipe': {
    entityType: 'platform',
    providerDisplayName: '만개의레시피',
    creatorDisplayName: null,
  },
  'meals-deliciousday': {
    entityType: 'brand',
    providerDisplayName: '매일맛나',
    creatorDisplayName: null,
  },
  'work-leebro': {
    entityType: 'expert',
    providerDisplayName: '면접왕 이형',
    creatorDisplayName: '이형',
  },
  'work-andstudio': {
    entityType: 'brand',
    providerDisplayName: 'AND Studio',
    creatorDisplayName: null,
  },
  'work-baeminsquare': {
    entityType: 'brand',
    providerDisplayName: '배민외식업광장',
    creatorDisplayName: null,
  },
  'hobby-fitpet': {
    entityType: 'brand',
    providerDisplayName: '핏펫',
    creatorDisplayName: null,
  },
  'hobby-bodeum': {
    entityType: 'expert',
    providerDisplayName: '보듬컴퍼니',
    creatorDisplayName: '강형욱',
  },
  'hobby-catdoctor': {
    entityType: 'expert',
    providerDisplayName: '미야옹철의 냥냥펀치',
    creatorDisplayName: '미야옹철',
  },
};

export const rightsConfig = {
  'home-ajd': {
    status: 'permission_required',
    reason:
      '공개 페이지의 제목·링크는 표시할 수 있지만, D-day 체크 행 전체를 공개 Flow로 재배포하려면 권리자 확인이 필요하다.',
  },
  'home-ohouse': {
    status: 'permission_required',
    reason:
      '플랫폼과 개별 고수의 권리가 분리되어 있어 플랫폼 콘텐츠 행을 공개 전환하려면 양쪽 귀속과 허가 범위를 확인해야 한다.',
  },
  'home-jungriking': {
    status: 'link_metadata_only',
    reason:
      '영상 제목·URL·공개 재생목록 메타데이터까지만 사용하고 정리 방법의 재서술은 허가 전 공개하지 않는다.',
  },
  'family-funmom': {
    status: 'link_metadata_only',
    reason:
      '학습자료 제목·대상·원문 링크 큐까지만 사용할 수 있으며 인쇄물과 문제 내용을 복제하지 않는다.',
  },
  'family-babyfood016': {
    status: 'private_conversion_only',
    reason:
      '비밀번호가 있는 식단 파일 행은 내부 검토와 개인 실행 변환에만 사용하며 공개 카탈로그에는 제작자 허가가 필요하다.',
  },
  'family-babybilly': {
    status: 'permission_required',
    reason:
      '브랜드가 배포하는 PDF와 준비물 목록의 공개 재구성은 브랜드 허가가 필요하다.',
  },
  'study-mansour': {
    status: 'permission_required',
    reason:
      '공개 글·영상 링크는 표시할 수 있으나 계획표 파일과 회차 구조를 공개 Flow로 배포하려면 제작자 확인이 필요하다.',
  },
  'study-opentutorials': {
    status: 'public_conversion_allowed',
    reason:
      'WEB1 원문이 모든 내용과 이미지의 자유로운 수정·배포 가능성을 명시한다. 이 판정은 WEB1 해당 코스에만 적용한다.',
    evidenceUrl: 'https://opentutorials.org/course/3084',
    evidenceLocator: '수업의 저작권 정책',
  },
  'study-nomadcoders': {
    status: 'permission_required',
    reason:
      '강의 목차와 학습 자료는 서비스 콘텐츠이므로 공개 Flow 전환에는 서비스 운영자의 허가가 필요하다.',
  },
  'money-getcha': {
    status: 'permission_required',
    reason:
      '구매 절차 제목·원문 링크는 표시할 수 있지만 상세 체크 행을 공개 재배포하려면 브랜드 허가가 필요하다.',
  },
  'money-zzanboo': {
    status: 'permission_required',
    reason:
      '영상 링크와 제목 외에 재무목표 로드맵·엑셀 행을 공개 전환하려면 제작자 허가가 필요하다.',
  },
  'money-gomhee': {
    status: 'link_metadata_only',
    reason:
      '영상 제목·URL까지만 사용하고 재무 조언과 투자 절차는 별도 허가 및 민감도 검토 전 재구성하지 않는다.',
  },
  'health-allblanc': {
    status: 'link_metadata_only',
    reason:
      '공개 재생목록의 영상 제목·URL·순서만 사용하며 운동 설명이나 자막을 복제하지 않는다.',
  },
  'health-bigsis': {
    status: 'link_metadata_only',
    reason:
      '영상 제목·URL·재생시간 메타데이터까지만 사용하고 운동법을 별도 Step으로 재서술하지 않는다.',
  },
  'health-thankyoububu': {
    status: 'link_metadata_only',
    reason:
      '영상 제목·URL과 공개 시리즈 메타데이터까지만 사용한다.',
  },
  'travel-kkday': {
    status: 'permission_required',
    reason:
      '브랜드 여행 가이드의 체크 행과 일정 정보를 공개 전환하려면 최신성 검토와 브랜드 허가가 필요하다.',
  },
  'travel-triple': {
    status: 'permission_required',
    reason:
      '플랫폼 가이드의 출국 체크 행과 목적지 정보를 공개 재구성하려면 플랫폼 허가와 최신성 확인이 필요하다.',
  },
  'travel-yeomi': {
    status: 'link_metadata_only',
    reason:
      '영상·게시물 제목과 원문 링크까지만 사용하고 여행 일정 본문은 재구성하지 않는다.',
  },
  'meals-wtable': {
    status: 'permission_required',
    reason:
      '큐레이션 제목·레시피 링크는 표시할 수 있지만 메뉴 묶음과 조리 상세를 공개 Flow로 배포하려면 브랜드 허가가 필요하다.',
  },
  'meals-10000recipe': {
    status: 'permission_required',
    reason:
      '플랫폼과 개별 작성자의 권리가 분리되어 있어 레시피 행을 공개 Flow로 묶기 전에 귀속과 허가가 필요하다.',
  },
  'meals-deliciousday': {
    status: 'link_metadata_only',
    reason:
      '영상 제목·URL까지만 사용하고 레시피 과정과 자막은 복제하지 않는다.',
  },
  'work-leebro': {
    status: 'link_metadata_only',
    reason:
      '영상 제목·URL과 공개 시리즈 순서까지만 사용하고 강의 내용을 재서술하지 않는다.',
  },
  'work-andstudio': {
    status: 'link_metadata_only',
    reason:
      '영상 제목·URL을 학습 큐로 제공할 수 있지만 영상의 6단계 내용과 자막은 허가 없이 복제하지 않는다.',
  },
  'work-baeminsquare': {
    status: 'link_metadata_only',
    reason:
      '영상·가이드 제목과 원문 링크까지만 사용하고 운영 노하우를 공개 체크 행으로 재서술하지 않는다.',
  },
  'hobby-fitpet': {
    status: 'permission_required',
    reason:
      '브랜드의 예방접종 표를 공개 전환하려면 허가가 필요하며 최신 공식 수의학 근거도 별도로 확인해야 한다.',
  },
  'hobby-bodeum': {
    status: 'link_metadata_only',
    reason:
      '영상 제목·URL·대상 상황까지만 사용하고 훈련법과 상담 내용을 재서술하지 않는다.',
  },
  'hobby-catdoctor': {
    status: 'link_metadata_only',
    reason:
      '영상 제목·URL까지만 사용하고 반려묘 건강·행동 조언을 별도 실행 항목으로 재구성하지 않는다.',
  },
};

export const evidenceOverrides = {
  'home-ajd': {
    materialRequest: {
      status: 'observed_current',
      summary: 'PDF·XLSX·Notion 체크리스트를 원문에서 직접 제공한다.',
    },
  },
  'family-babyfood016': {
    materialRequest: {
      status: 'observed_current',
      summary: '댓글 9,999+와 식단 파일·비밀번호 관련 요청 문구가 현재 원문에서 보인다.',
    },
    executionOutcome: {
      status: 'observed_prior_capture',
      summary: '초기·중기·후기 식단 사용 후기와 단계별 질문이 기존 캡처에서 확인됐다.',
    },
    creatorResponse: {
      status: 'observed_prior_capture',
      summary: '제작자가 파일 비밀번호·사용 시기·재료 질문에 답변한 기존 캡처가 있다.',
    },
  },
  'family-babybilly': {
    materialRequest: {
      status: 'observed_current',
      summary: '출산·육아 준비물 PDF 배포를 원문 제목과 본문에서 확인했다.',
    },
  },
  'study-mansour': {
    materialRequest: {
      status: 'observed_current',
      summary: '모의고사 계획표 다운로드와 영상 자료 연결을 현재 원문에서 확인했다.',
    },
  },
  'study-opentutorials': {
    executionOutcome: {
      status: 'observed_current',
      summary: '댓글에 시작일·학습 시작·완료 기록이 반복적으로 보인다.',
    },
    creatorResponse: {
      status: 'community_response_observed',
      summary:
        '질문과 답변이 연결된 대화는 보이지만 답변자가 코스 제작자인지 커뮤니티 구성원인지는 분리 확인이 필요하다.',
    },
  },
  'money-zzanboo': {
    materialRequest: {
      status: 'observed_current',
      summary: '재무목표 로드맵 엑셀표 무료 공유를 대표 영상 제목에서 확인했다.',
    },
  },
};

export const preflightConfig = {
  'home-ajd': {
    admissionType: 'full_flow',
    oneUserJob: '이사일을 기준으로 원문 D-day 체크 행을 빠뜨리지 않고 실행한다.',
    naturalArtifact: 'calendar_checklist',
    requiredInputCount: 1,
    firstAction: '이사 방식과 이사업체 정하기',
    saveResult: '이사일을 기준으로 D-30·D-10·D-3·D-1·당일 할 일이 생긴다.',
    dateRule: '원문의 D-day 구간을 그대로 사용한다.',
    uxAssessment:
      '항목 수가 많지만 D-day별로 접으면 캘린더·체크리스트 구조에 자연스럽다.',
  },
  'family-babyfood016': {
    admissionType: 'full_flow',
    oneUserJob: '원문 식단표의 D+n 순서대로 초기 이유식을 제공한다.',
    naturalArtifact: 'calendar_checklist',
    requiredInputCount: 2,
    firstAction: '선택한 시작일의 첫 식단 제공하기',
    saveResult: '시작일과 시작 구간에 맞춰 D+174~209 식단 행이 일정으로 생긴다.',
    dateRule: '원문 D+n 행을 기준으로 시작일에 상대 배치한다.',
    uxAssessment:
      '날짜별 메뉴는 한 Item으로 유지하고 재료·섭취 상태는 메모로 남겨야 과밀하지 않다.',
  },
  'study-mansour': {
    admissionType: 'full_flow',
    oneUserJob: '2주 또는 1달 계획표를 따라 모의고사 영상 회차를 실행한다.',
    naturalArtifact: 'calendar_checklist',
    requiredInputCount: 2,
    firstAction: '선택한 계획의 첫 모의고사 영상 실행하기',
    saveResult: '선택한 2주·1달 계획과 시작일에 맞춰 회차별 영상 링크가 배치된다.',
    dateRule: '원문 계획표의 회차·기간 구조를 사용하고 임의 횟수를 추가하지 않는다.',
    uxAssessment:
      '영상 실행을 주 Item으로 두고 녹음·복습 설명은 원문이 명시한 회차 안에서만 보조한다.',
  },
  'study-opentutorials': {
    admissionType: 'full_flow',
    oneUserJob: 'WEB1의 공개 토픽 목록을 순서대로 학습하고 진도를 체크한다.',
    naturalArtifact: 'sheet_checklist',
    requiredInputCount: 0,
    firstAction: '프로젝트의 동기 학습하기',
    saveResult: 'WEB1 토픽 26개가 원문 순서대로 진도 체크 목록에 생긴다.',
    dateRule: '원문에 일정이 없으므로 날짜를 만들지 않는다.',
    uxAssessment:
      '긴 커리큘럼은 한 Step의 접힌 진도 목록으로 보여주고 사용자가 필요할 때 개별 날짜를 붙인다.',
  },
  'money-getcha': {
    admissionType: 'full_flow',
    oneUserJob: '신차 구매의 원문 8단계를 순서대로 확인하고 계약·출고 누락을 줄인다.',
    naturalArtifact: 'checklist_sheet',
    requiredInputCount: 1,
    firstAction: '예산과 구매 조건 정리하기',
    saveResult: '예산 설정부터 차량 등록까지 8단계 체크리스트가 생긴다.',
    dateRule: '원문 단계 순서만 유지하고 사용자가 날짜를 정하기 전에는 일정화하지 않는다.',
    uxAssessment:
      '단계는 유지하되 견적·비용·차량 정보는 Item이 아니라 메모나 시트 값으로 둔다.',
  },
  'health-allblanc': {
    admissionType: 'full_flow',
    oneUserJob: '7일 재생목록의 영상을 하루 한 편씩 따라 한다.',
    naturalArtifact: 'calendar_checklist',
    requiredInputCount: 2,
    firstAction: 'Day 1 영상 따라 하기',
    saveResult: '7일 동안 하루 한 편의 영상 제목과 링크가 일정에 생긴다.',
    dateRule: '재생목록의 Day 1~7 순서만 사용한다.',
    uxAssessment:
      '영상 하나를 Item 하나로 유지하고 동작 설명·통증 기록용 별도 Item은 만들지 않는다.',
  },
  'meals-wtable': {
    admissionType: 'quick_flow_collection',
    oneUserJob: '큐레이션의 반찬 5개 중 만들 메뉴를 골라 원문 레시피를 연다.',
    naturalArtifact: 'checklist_memo',
    requiredInputCount: 0,
    firstAction: '첫 번째 반찬 레시피 열고 만들기',
    saveResult: '반찬 5개의 제목과 레시피 링크가 선택 가능한 목록으로 생긴다.',
    dateRule: '원문에 날짜가 없으므로 날짜를 만들지 않는다.',
    uxAssessment:
      '레시피 하나를 Quick Flow 하나로 두고 조리 순서는 원문으로 돌려보낸다.',
  },
  'work-andstudio': {
    admissionType: 'quick_flow_collection',
    oneUserJob: '취업 준비 영상 3편을 필요한 순서로 보고 실행 메모를 남긴다.',
    naturalArtifact: 'resource_queue',
    requiredInputCount: 0,
    firstAction: '지원동기 영상 보기',
    saveResult: '지원동기·산업분석·면접 영상 3편이 링크 큐로 생긴다.',
    dateRule: '원문에 일정이 없으므로 날짜를 만들지 않는다.',
    uxAssessment:
      '영상 내부 6단계를 복제하지 않고 영상 제목·URL 단위로만 관리한다.',
  },
};

export const openTutorialsTopics = [
  ['18438', '프로젝트의 동기', 0],
  ['18437', '기획', 0],
  ['18445', '코딩과 HTML', 0],
  ['18448', 'HTML 코딩 실습 환경 준비', 0],
  ['18392', '기본 문법 - 태그', 0],
  ['18400', '혁명적인 변화', 0],
  ['18452', '통계에 기반한 학습', 0],
  ['18403', '줄바꿈', 0],
  ['18488', 'HTML이 중요한 이유', 0],
  ['18407', '최후의 문법 속성과 img', 0],
  ['18408', '부모 자식과 목록', 0],
  ['18409', '문서의 구조와 슈퍼스타들', 0],
  ['18418', 'HTML 태그의 제왕', 0],
  ['18431', '웹사이트 완성', 0],
  ['18889', '원시웹', 0],
  ['18890', '인터넷을 여는 열쇠 : 서버와 클라이언트', 0],
  ['18891', '웹호스팅 github pages', 0],
  ['31144', '웹서버 운영하기', 0],
  ['18896', '수업을 마치며 1', 0],
  ['18897', '수업을 마치며 2', 0],
  ['18898', '수업을 마치며 3', 0],
  ['18598', '부록 : 코드의 힘', 0],
  ['18453', '부록 : 코드의 힘 - 동영상 삽입', 1],
  ['18594', '부록 : 코드의 힘 - 댓글 기능 추가', 1],
  ['18597', '부록 : 코드의 힘 - 채팅 기능 추가', 1],
  ['18899', '부록 : 코드의 힘 - 방문자 분석기', 1],
];
