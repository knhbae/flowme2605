import fs from 'node:fs/promises';
import path from 'node:path';
import {
  candidateProfiles,
  categories,
  deepCreatorProfiles,
  observedAt,
  representativeCreatorIds,
  topCreatorIds,
} from './creator-flow-portfolio-v1-data.mjs';

const repoRoot = process.cwd();
const auditDir = path.join(repoRoot, 'docs', 'content-audit');
const assetDirName = '2026-07-23-creator-flow-portfolio-assets';
const assetDir = path.join(auditDir, assetDirName);
const ledgerPath = path.join(assetDir, 'opened-creator-url-ledger-v1.json');
const screenshotManifestPath = path.join(assetDir, 'screenshot-evidence-v1.json');
const priorDataPath = path.join(auditDir, '2026-07-22-flow-content-demand-business-data-v1.json');
const outputJsonPath = path.join(auditDir, '2026-07-23-creator-flow-portfolio-data-v1.json');
const outputHtmlPath = path.join(auditDir, '2026-07-23-creator-flow-portfolio-review-ko.html');
const outputHandoffPath = path.join(auditDir, '2026-07-23-creator-flow-portfolio-logic-handoff-ko.md');

const ledger = JSON.parse(await fs.readFile(ledgerPath, 'utf8'));
const screenshotManifest = JSON.parse(await fs.readFile(screenshotManifestPath, 'utf8'));
const priorData = JSON.parse(await fs.readFile(priorDataPath, 'utf8'));
const categoryById = new Map(categories.map((category) => [category.id, category]));
const candidateById = new Map(candidateProfiles.map((candidate) => [candidate.candidateId, candidate]));
const profileEvidenceById = new Map(ledger.profileEvidence.map((entry) => [entry.candidateId, entry]));
const deepEvidenceById = new Map(ledger.deepCreatorEvidence.map((entry) => [entry.creatorId, entry]));
const priorBundleById = new Map(
  [...priorData.selectedContentBundles, ...priorData.comparisonBundles]
    .map((bundle) => [bundle.bundleId, bundle]),
);
const priorSourceRowById = new Map(priorData.sourceRows.map((row) => [row.sourceRowId, row]));
const representativeSet = new Set(representativeCreatorIds);
const topSet = new Set(topCreatorIds);

const scoreMax = {
  visibleDemandScore: 15,
  userCommunicationScore: 15,
  sourcePortfolioDepthScore: 15,
  flowMapPotentialScore: 15,
  flowConversionFitScore: 20,
  creatorBusinessValueScore: 15,
  creatorCommunityFitScore: 5,
};

const knownEvidenceOverrides = {
  'home-ajd': {
    demand: '이사 체크리스트 조회 98,499·스크랩 20, 같은 생활정보 포트폴리오의 추가 조회 수치가 직접 보인다',
    communication: '비교 원문 댓글 26·공유 4,182와 견적 상담·후기 경로가 이전 원문 검증에서 확인됐다',
  },
  'home-ohouse': {
    demand: '대표 수납 글 조회 68만+, 좋아요 1.2만+, 스크랩 5.3만+가 이전 원문 검증에서 확인됐다',
    communication: '대표 수납 글 댓글 398과 제작자 팔로우·스크랩·공유 구조가 확인됐다',
  },
  'family-funmom': {
    demand: '홈에서 1,124개 글과 과목별 프린트 자료 이용 흔적이 확인된다',
    communication: '프린트 자료 활용·요청 댓글은 보이지만 제작자 답변률을 수치로 확인하지 못했다',
  },
  'family-babyfood016': {
    demand: '대표 식단표 댓글 9,999+와 초기·중기·후기 파일 요청이 반복된다',
    communication: '파일 비밀번호·사용 시기·재료 질문에 제작자가 반복 답변한 장면을 확인했다',
  },
  'family-babybilly': {
    demand: '출산준비물 글 조회 23만~28만대, 겨울 출산 가이드 조회 8만대가 직접 보인다',
    communication: '부모 의견을 반영해 PDF 리스트와 앱 기능을 고쳤다고 원문에 명시하고 선배 부모 코멘트를 함께 싣는다',
  },
  'study-mansour': {
    demand: '연결 모의고사 영상 조회 11,861·좋아요 56과 채널 구독자 6.09천명이 이전 검증에서 확인됐다',
    communication: '카카오 오픈채팅·Discord·YouTube·1:1 문의가 실제로 연결되지만 채널별 활동량은 공개 수치가 부족하다',
  },
  'study-opentutorials': {
    demand: 'WEB1 공동공부 참여 9,199와 장기 운영된 다수 코스가 확인된다',
    communication: '코스별 댓글과 공동공부 참여 구조가 있어 질문·진도·후속 학습 대화가 원문 안에 남는다',
  },
  'study-nomadcoders': {
    demand: '사이트가 10만+ 수강생과 다수 강좌·챌린지를 공개하고 있다',
    communication: '기간형 챌린지와 커뮤니티 운영은 확인되지만 개별 강좌 댓글 수는 공개 화면에서 unknown이다',
  },
  'money-getcha': {
    demand: '플랫폼 원문에서 누적 구매·견적 성과를 공개하지만 개별 가이드의 조회·댓글 수는 보이지 않는다',
    communication: '구매 상담 경로는 분명하나 글 단위 댓글·질문 증거는 약해 구조 강점과 수요 강점을 분리해야 한다',
  },
  'health-allblanc': {
    demand: '7일 복근 챌린지 7개 영상 합산 약 53.9만 조회, 개별 최고 약 15만 조회가 이전 검증에서 확인됐다',
    communication: '첫 챌린지 영상 댓글 154개와 Day별 후속 영상 참여가 확인됐다',
  },
  'meals-wtable': {
    demand: '대표 밑반찬 영상 조회 260만+, 각 레시피 노트·질문 30개 안팎과 큐레이션 재방문 구조가 확인된다',
    communication: '레시피별 질문·후기와 큐레이션의 의견 보내기 경로가 모두 있다',
  },
  'meals-10000recipe': {
    demand: '사이트가 누적 조회 37억대와 15만+ 레시피를 표시하고, 네이버 채널 구독 61만+도 확인된다',
    communication: '레시피 후기·별점과 2,000여 제작자 참여 구조가 있으나 개별 레시피 반응 편차가 크다',
  },
  'hobby-fitpet': {
    demand: '예방접종 글은 인기글 목록에 반복 노출되지만 글 단위 조회·댓글 수는 공개되지 않아 수요 수치는 unknown이다',
    communication: '블로그 자체 댓글·질문 증거는 약하고 쇼핑·동물병원·건강관리 서비스 연결이 더 강하게 보인다',
  },
};

const reviewPlans = {
  'home-ajd': {
    verdict: 'creator_flow_map_candidate',
    scores: [15, 12, 14, 14, 19, 15, 4],
    summary: '이사·청소·통신·가전 준비를 같은 생활 전환 시점에 연결할 수 있는 강한 브랜드형 공급자다.',
    depth: '이사, 청소, 렌탈 비교처럼 체크 행과 견적 행이 있는 서로 다른 원문 3개를 열었다.',
    map: '“이사 시작부터 정착까지”처럼 한 사용자 사건 아래 하위 Flow를 묶을 근거가 있다.',
    conversion: 'D-day·체크리스트·비교표가 원문에 있어 새 행동을 발명하지 않고 일정·체크·시트로 옮길 수 있다.',
    business: '이사·청소·인터넷·렌탈 견적과 직접 연결되고 다운로드 자료가 원문 재방문을 만든다.',
    community: '상담·후기·질문 경로는 있으나 독립 제작자 팬 커뮤니티보다는 거래 중심이다.',
    mapTitle: '이사 준비부터 새집 정착까지',
    mapNature: 'ordered_life_event_map',
    userValue: '기준일 하나로 이사 전후 체크와 견적 준비를 놓치지 않는다.',
    creatorValue: 'Flow 실행 중 다운로드·견적·상담을 위해 원문으로 돌아온다.',
    flowMeValue: 'D-day 일정, 체크리스트, 비교표를 한 실행 레이어에서 검증한다.',
    confirmedBusiness: ['이사·청소·인터넷·렌탈 상담', 'PDF·XLSX·Notion 자료 배포'],
    hypothesis: '이사 완료율과 상담 전환을 연결한 공동 Flow 배포는 제휴 검토가 필요하다.',
    rights: '다운로드 파일 전문을 복제하지 않고 제목·원문 링크·최소 실행 행만 사용한다.',
    adoptionReason: 'Go: 수요·실행 행·견적 연결이 동시에 강하고 현재 D-day 모델로 표현 가능하다.',
    nextAction: '이사 Map 안에서 청소·통신·렌탈을 optional Flow로 둘지 로직 세션에서 결정한다.',
  },
  'home-ohouse': {
    verdict: 'creator_content_partner_candidate',
    scores: [15, 13, 15, 10, 17, 14, 5],
    summary: '수납·도시락·리모델링 등 강한 단일 Flow가 많지만 서로 다른 고수의 글을 하나의 제작자 Map으로 합치면 안 된다.',
    depth: '조회·스크랩이 큰 원문 4개에서 체크 행, 미니 프로젝트, 식단 행을 확인했다.',
    map: '플랫폼 컬렉션은 가능하지만 자연스러운 순서와 동일 제작자 소유가 없으므로 단일 Flow Map 승격은 보류한다.',
    conversion: '개별 글은 체크리스트·식단·시트로 잘 옮겨지지만 제작자별 출처와 권리를 행 단위로 보존해야 한다.',
    business: '제작자 팔로우와 쇼핑 콘텐츠로 원문 유입이 이어지는 경로가 명확하다.',
    community: '댓글·스크랩·공유와 다수 고수 참여가 강점이다.',
    mapTitle: '오늘의집 고수 생활 Flow 컬렉션',
    mapNature: 'unordered_multi_creator_collection',
    userValue: '검증된 고수 글을 작은 실행 Flow로 저장할 수 있다.',
    creatorValue: '각 고수 프로필과 원문 링크를 통해 팔로우·쇼핑 유입을 돌려준다.',
    flowMeValue: '다중 제작자 attribution과 컬렉션 Map 경계를 시험한다.',
    confirmedBusiness: ['오늘의집 쇼핑 연결', '고수 프로필·팔로우·스크랩'],
    hypothesis: '플랫폼 또는 개별 고수 허가가 있어야 공개 카탈로그 파트너십이 가능하다.',
    rights: '오늘의집과 개별 고수의 권리를 분리하고 사진·전문은 복제하지 않는다.',
    adoptionReason: 'Modify: 개별 Flow는 강하지만 플랫폼 전체를 한 제작자 Map으로 취급할 수 없다.',
    nextAction: '개별 고수 ownerId와 플랫폼 providerId를 분리하는 계약이 필요하다.',
  },
  'home-jungriking': {
    verdict: 'creator_content_partner_candidate',
    scores: [12, 12, 13, 11, 17, 13, 4],
    summary: '정리·이사 전후 영상은 실행 가치가 높지만 영상 사이의 필수 순서는 제작자가 명시한 경우에만 Map으로 묶어야 한다.',
    depth: '8.3만~13만 조회의 이사·주간 정리·정리 변화 영상 4개를 열었다.',
    map: '이사 전후 정리 시리즈 후보는 있으나 모든 채널 영상을 하나의 순서로 일반화할 수 없다.',
    conversion: '영상 한 편을 한 정리 Flow로 두고 준비물·공간·팁은 memo에 두면 과밀 없이 작동한다.',
    business: '정리 컨설팅·견적·강연 협업 경로가 채널 설명에 드러난다.',
    community: '검토 영상마다 댓글 89~127개가 보여 변화 후기와 질문이 이어진다.',
    mapTitle: '이사 전후 정리 영상 모음',
    mapNature: 'curated_video_collection',
    userValue: '공간별 정리 영상을 선택해 바로 따라 할 수 있다.',
    creatorValue: '컨설팅 사례와 채널 영상으로 반복 유입된다.',
    flowMeValue: '영상 1개=Flow 패턴을 집·살림 영역으로 확장한다.',
    confirmedBusiness: ['정리 컨설팅 견적', '강연·협업 문의'],
    hypothesis: '공간별 공식 재생목록을 제작자와 함께 편성하면 Map 가치가 커진다.',
    rights: '영상 제목·URL·최소 실행 메타데이터만 사용한다.',
    adoptionReason: 'Modify: 다수 단일 Flow는 좋지만 순서형 Map은 제작자 큐레이션이 더 필요하다.',
    nextAction: '채널 재생목록과 영상 설명의 준비물 행을 추가 import한다.',
  },
  'family-funmom': {
    verdict: 'source_import_required',
    scores: [11, 9, 15, 10, 13, 7, 4],
    summary: '1,124개 자료의 폭은 크지만 사이트 트리 자체는 Flow가 아니며 article-level 행을 먼저 가져와야 한다.',
    depth: '과목·미로·수학 자료 카테고리와 실제 프린트 글을 확인했다.',
    map: '같은 목표·대상 나이의 글을 2주 또는 한 달 자료 큐로 묶을 때만 Map이 된다.',
    conversion: '자료 제목·URL·대상·특징을 한 Item memo로 두는 resource queue는 가능하지만 현재 행이 충분히 정규화되지 않았다.',
    business: '직접 상품·강의 연결은 확인되지 않아 광고·원문 재방문 정도만 사실로 기록한다.',
    community: '자료 활용 댓글은 있으나 수정본 공유나 제작자 응답량은 추가 확인이 필요하다.',
    mapTitle: '펀맘 2주 학습 자료 큐',
    mapNature: 'resource_queue_after_import',
    userValue: '부모가 매일 자료를 다시 고르는 부담을 줄인다.',
    creatorValue: '매일 원문 프린트 자료로 재방문을 만든다.',
    flowMeValue: '대형 자료실을 기간형 큐로 바꾸는 Park-to-Map 규칙을 시험한다.',
    confirmedBusiness: ['원문 광고·자료 재방문'],
    hypothesis: '과목별 2주 루틴을 제작자가 직접 편성하면 공유 가치가 커질 수 있다.',
    rights: '프린트 이미지를 복제하지 않고 article 제목·URL·특징만 사용한다.',
    adoptionReason: 'Modify: 잠재력은 크지만 article URL·대상·목표 행 import 전에는 공개 Flow가 아니다.',
    nextAction: '과목별 14개 article row를 우선 import하고 중복·대상 나이를 검증한다.',
  },
  'family-babyfood016': {
    verdict: 'creator_flow_map_candidate',
    scores: [15, 15, 15, 15, 20, 10, 5],
    summary: '초기·중기·후기 식단표와 재료표가 실제 파일 행으로 이어지는 가장 강한 creator Flow Map 사례다.',
    depth: '초기 식단표를 포함한 이유식 시리즈 4개와 실제 PDF 행을 확인했다.',
    map: '이유식 단계별 식단표가 자연스러운 장기 Map을 이룬다.',
    conversion: 'D+n 식단 행 하나를 제공 행동 하나로 옮기고 수량·반응은 개인 memo에 남기면 된다.',
    business: '직접 상품 경로는 약하지만 책·후속 단계 글과 반복 재방문 가치가 확인된다.',
    community: '댓글 9,999+와 파일·비밀번호 요청에 대한 반복 답변이 매우 강하다.',
    mapTitle: '초기부터 후기까지 이유식 식단',
    mapNature: 'source_table_lifecycle_map',
    userValue: '파일을 매일 다시 열거나 식단을 옮겨 적지 않고 바로 제공 일정을 따른다.',
    creatorValue: '단계가 바뀔 때 후속 글·책·원문 파일로 되돌아간다.',
    flowMeValue: '파일 row를 날짜형 실행 Item으로 옮기는 대표 사례다.',
    confirmedBusiness: ['이유식 책 안내', '후속 단계 식단 글'],
    hypothesis: '제작자 승인 하에 단계별 Flow Map을 배포하면 장기 재방문이 생길 수 있다.',
    rights: 'PDF 전문·이미지는 공개하지 않고 식단 행의 최소 실행 메타데이터와 원문 링크만 사용한다.',
    adoptionReason: 'Go: 수요·대화·파일 행·반복 사용이 모두 강하다.',
    nextAction: '기존 D+174~209 검증본 뒤에 중기·후기 source import 범위를 정한다.',
  },
  'family-babybilly': {
    verdict: 'creator_flow_map_candidate',
    scores: [15, 14, 14, 14, 18, 15, 5],
    summary: '부모 피드백을 반영한 PDF 체크리스트와 단계별 출산·육아 콘텐츠가 쇼핑까지 연결되는 강한 브랜드형 제작자다.',
    depth: '출산가방·엄마·아기·나중 구매 목록과 계절·세탁·수유 준비 글 5개를 확인했다.',
    map: '임신 후반부터 출산·초기 육아까지 시점이 있는 Flow군을 구성할 수 있다.',
    conversion: 'PDF 체크 행은 checklist로, 계절별 설명은 memo로 보내면 된다. 제품 추천은 선택 정보로 둔다.',
    business: '빌리쇼핑과 앱 체크리스트가 원문 콘텐츠에 직접 연결된다.',
    community: '부모 의견을 반영한 리뉴얼과 선배 부모 코멘트가 제작-피드백 루프를 보여준다.',
    mapTitle: '출산 준비부터 초기 육아까지',
    mapNature: 'stage_based_preparation_map',
    userValue: '출산 시점과 상황에 맞는 준비물만 골라 체크한다.',
    creatorValue: '콘텐츠·체크리스트·쇼핑을 오가며 후속 단계로 재방문한다.',
    flowMeValue: '커뮤니티 피드백을 반영한 리스트의 버전 관리 가능성을 시험한다.',
    confirmedBusiness: ['빌리쇼핑', '앱 내 출산준비 리스트'],
    hypothesis: '공식 체크리스트 공동 배포와 변경 알림이 파트너 가치가 될 수 있다.',
    rights: 'PDF를 복제하지 않고 카테고리·항목명·원문 링크를 최소 범위로 사용한다.',
    adoptionReason: 'Go: 수요와 부모 피드백, 체크 행, 쇼핑 연결이 한 흐름에 있다.',
    nextAction: '계절형 콘텐츠를 Map 분기로 둘지 독립 Flow로 둘지 정규화한다.',
  },
  'study-mansour': {
    verdict: 'creator_flow_map_candidate',
    scores: [12, 12, 15, 15, 20, 15, 5],
    summary: '계획표 파일, 10회 영상, 복습 루프와 커뮤니티·상품이 하나의 시험 준비 목표로 연결된다.',
    depth: '계획표, 난이도별 유형, 롤플레이 패턴, 기업 등급 정보 글 4개를 열었다.',
    map: '2주·1달 플랜과 회차별 모의고사가 자연스러운 Flow Map을 이룬다.',
    conversion: '원문 계획표 셀과 영상 URL을 날짜별 Item으로 묶으면 사용자가 다시 계획할 필요가 없다.',
    business: '스크립트·가이드북·첨삭·SmartStore·커뮤니티 경로가 확인된다.',
    community: '오픈채팅·Discord·YouTube·1:1 문의가 연결되며 계획표 사용 질문을 받을 구조가 있다.',
    mapTitle: '오픽 모의고사 학습 플랜',
    mapNature: 'timeboxed_study_map',
    userValue: '2주 또는 한 달 계획을 선택해 모의고사와 복습을 그대로 따른다.',
    creatorValue: '영상·가이드북·첨삭·커뮤니티로 자연스럽게 돌아온다.',
    flowMeValue: '파일 계획표와 영상 시리즈를 하나의 portable 학습 Flow로 연결한다.',
    confirmedBusiness: ['스크립트·가이드북 판매', '첨삭', '오픈채팅·Discord'],
    hypothesis: '완주 데이터와 다음 자료 추천을 제작자에게 돌려주는 모델을 검토할 수 있다.',
    rights: '유료 자료와 영상 내용을 복제하지 않고 계획표 행·제목·URL만 사용한다.',
    adoptionReason: 'Go: 목표·기간·원문 행·영상·사업 경로가 가장 잘 정렬된 사례다.',
    nextAction: '2주·1달 variant와 20회 상품의 버전 경계를 정의한다.',
  },
  'study-opentutorials': {
    verdict: 'creator_flow_map_candidate',
    scores: [14, 15, 15, 15, 19, 11, 5],
    summary: '공동공부와 목차가 명시된 다수 코스가 있어 학습 진도형 Flow Map의 표준 후보가 된다.',
    depth: 'WEB1, JavaScript, Python 계열 코스와 메인 커리큘럼 4개를 열었다.',
    map: '코스 목차와 선후 학습 관계가 원문에 있어 course=Map, lesson=Flow/Step 구조가 자연스럽다.',
    conversion: '강의 목차·링크·진도 상태만 옮기고 강의 본문은 원문에 남기면 된다.',
    business: '직접 강의 판매보다 후원·교육 생태계 가치가 중심이라 상업 점수는 낮췄다.',
    community: '공동공부 참여와 강의별 댓글이 학습자 대화를 원문에 축적한다.',
    mapTitle: '생활코딩 WEB 학습 경로',
    mapNature: 'ordered_curriculum_map',
    userValue: '강의 목차를 다시 옮기지 않고 현재 진도와 다음 강의를 본다.',
    creatorValue: '모든 실행이 원문 강의와 댓글로 되돌아간다.',
    flowMeValue: '장기 강의 진도와 외부 원문 학습의 경계를 시험한다.',
    confirmedBusiness: ['후원·교육 프로젝트', '공동공부 커뮤니티'],
    hypothesis: '공동공부 개설자가 Flow를 배포하는 creator lane이 가능하다.',
    rights: '강의 본문을 복제하지 않고 목차·제목·링크·진도만 사용한다.',
    adoptionReason: 'Go: 원문 목차와 공동공부가 Map·진도·대화 구조를 모두 제공한다.',
    nextAction: 'lesson을 Step으로 둘지 한 강의를 Flow로 둘지 크기 규칙을 정한다.',
  },
  'study-nomadcoders': {
    verdict: 'creator_flow_map_candidate',
    scores: [13, 13, 15, 15, 18, 15, 5],
    summary: '코스와 기간형 챌린지가 함께 있어 유료·무료 경계를 보존한 creator 학습 Map 후보가 된다.',
    depth: 'JavaScript·Python·React 강좌와 챌린지 허브 4개를 열었다.',
    map: '강의 목차와 챌린지 일정이 source-defined Map을 제공한다.',
    conversion: '공개 목차와 일정만 Flow로 두고 유료 강의 내용·과제 전문은 원문으로 보낸다.',
    business: '강좌 판매와 챌린지·커뮤니티가 직접 연결된다.',
    community: '챌린지 완주와 커뮤니티는 강하지만 공개 화면에서 댓글 수는 unknown이다.',
    mapTitle: '노마드 코더 입문 코스와 챌린지',
    mapNature: 'course_and_challenge_map',
    userValue: '강좌와 챌린지 진도를 같은 목록에서 따라간다.',
    creatorValue: '강의 재생·과제·커뮤니티 참여가 원문 사업으로 귀환한다.',
    flowMeValue: '유료 콘텐츠를 복제하지 않는 진도 레이어를 시험한다.',
    confirmedBusiness: ['유료·무료 강좌', '기간형 챌린지', '커뮤니티'],
    hypothesis: '챌린지 등록 이후 개인 일정 projection이 파트너 기능이 될 수 있다.',
    rights: '공개 목차와 링크만 사용하고 유료 과제·해설은 가져오지 않는다.',
    adoptionReason: 'Go: 코스 깊이와 사업·커뮤니티 연결이 강하다.',
    nextAction: '로그인 뒤 보이는 일정·과제 행은 제휴 또는 사용자 import 경계를 정한다.',
  },
  'money-getcha': {
    verdict: 'creator_content_partner_candidate',
    scores: [12, 8, 15, 13, 19, 15, 3],
    summary: '신차 구매 절차·비용·견적 행은 매우 강하지만 글 단위 사용자 대화가 약한 구조 중심 파트너 후보다.',
    depth: '초보 구매 절차, 2026 체크리스트, 흐름도, 판단 포인트 글 4개를 열었다.',
    map: '신차 선택-견적-계약-출고라는 자연스러운 구매 Map이 있다.',
    conversion: '원문 단계와 체크표를 비교 시트·순서형 Flow로 그대로 옮길 수 있다.',
    business: '견적·구매 상담과 플랫폼 전환이 매우 직접적이다.',
    community: '사용자 상담은 있으나 공개 댓글·수정 대화가 약해 creator community 점수를 낮췄다.',
    mapTitle: '신차 선택부터 출고까지',
    mapNature: 'compare_and_purchase_map',
    userValue: '비용·견적·계약·출고 항목을 빠뜨리지 않고 비교한다.',
    creatorValue: '견적과 구매 상담으로 원문 사업에 돌아간다.',
    flowMeValue: '비교 상태와 순서형 구매 실행을 함께 검증한다.',
    confirmedBusiness: ['신차 견적', '구매 상담', '차량 비교'],
    hypothesis: 'Flow 기반 견적 준비와 플랫폼 전환율을 공동 실험할 수 있다.',
    rights: '가격·정책은 변동 정보로 표시하고 원문 확인 날짜를 보존한다.',
    adoptionReason: 'Modify: 구조와 사업 가치는 강하지만 공개 사용자 대화 gate가 약하다.',
    nextAction: '가격·세금 행 최신성 정책과 댓글 대신 상담 증거를 인정할 기준을 정한다.',
  },
  'money-zzanboo': {
    verdict: 'creator_flow_map_candidate',
    scores: [15, 15, 13, 14, 17, 14, 5],
    summary: '초보 재테크 로드맵과 엑셀 자료 요청이 높은 댓글 참여로 이어지는 강한 creator Map 후보다.',
    depth: '1억 로드맵, 초보 5단계, 통장 가이드 등 4개 영상을 열었다.',
    map: '초보 단계와 목표 금액별 로드맵이 제작자 정의 시리즈로 묶일 가능성이 높다.',
    conversion: '영상에서 공개한 단계·템플릿 행만 사용하고 개인 금융 판단은 memo와 원문으로 남겨야 한다.',
    business: '도서·강의·자료·채널 구독으로 연결될 경로가 확인된다.',
    community: '대표 영상 댓글 1,079·1,211개와 자료 이벤트가 강한 참여를 증명한다.',
    mapTitle: '김짠부 초보 재테크 로드맵',
    mapNature: 'creator_roadmap_map',
    userValue: '초보 단계와 다음 공부 자료를 순서대로 저장한다.',
    creatorValue: '자료·도서·후속 영상으로 반복 유입된다.',
    flowMeValue: '재무 민감도를 지키면서 교육 로드맵을 실행 레이어로 옮긴다.',
    confirmedBusiness: ['자료 이벤트', '도서·강의·채널 구독'],
    hypothesis: '개인 금액을 수집하지 않는 학습용 Flow 파트너십이 적합하다.',
    rights: '개인 금융 추천으로 표현하지 않고 공개 교육 단계·링크만 사용한다.',
    adoptionReason: 'Go: 수요·댓글·로드맵·자료 요청이 동시에 강하다.',
    nextAction: '재무 조언과 학습 체크리스트의 안전 경계를 정규화한다.',
  },
  'money-gomhee': {
    verdict: 'creator_content_partner_candidate',
    scores: [11, 9, 14, 9, 12, 13, 3],
    summary: '투자 교육 포트폴리오는 깊지만 많은 영상이 설명 중심이라 공통 실행 Map으로 억지 변환하면 위험하다.',
    depth: '최근 금융·투자 영상 4개에서 반복 교육 주제와 사업 경로를 확인했다.',
    map: '주제별 재생목록은 가능하지만 개인 투자 실행 순서로 일반화할 원문 행은 부족하다.',
    conversion: '체크 가능한 교육 커리큘럼만 Flow로 두고 매수·매도 같은 행동은 만들지 않아야 한다.',
    business: '도서·강의·채널 기반 교육 사업 연결이 확인된다.',
    community: '검토 영상 댓글은 2~84개로 존재하지만 대표 Map을 증명할 자료 요청은 약하다.',
    mapTitle: '박곰희 금융 공부 영상 모음',
    mapNature: 'education_collection_only',
    userValue: '관심 주제의 교육 영상을 저장하고 학습 진도만 관리한다.',
    creatorValue: '강의·도서·후속 영상으로 재방문한다.',
    flowMeValue: '민감 재무 콘텐츠를 action이 아닌 learning queue로 제한하는 경계를 시험한다.',
    confirmedBusiness: ['도서·강의·교육 채널'],
    hypothesis: '제작자가 직접 커리큘럼을 편성할 때만 공개 Map 가치가 생긴다.',
    rights: '투자 행동·수익 기대를 만들지 않고 영상 링크·공개 목차만 사용한다.',
    adoptionReason: 'Modify: 깊이는 충분하지만 실행 행과 안전 경계가 더 필요하다.',
    nextAction: '제작자 정의 입문 재생목록이 있는지 추가 import한다.',
  },
  'health-allblanc': {
    verdict: 'creator_flow_map_candidate',
    scores: [15, 14, 15, 15, 20, 13, 4],
    summary: '기간형 재생목록이 Map, 영상 한 편이 Flow가 되는 가장 명확한 홈트 제작자다.',
    depth: '7일 챌린지와 최근 루틴 영상 4개 이상을 확인했다.',
    map: 'Day 번호와 재생목록 순서가 제작자 원문에 있어 Map을 그대로 보존할 수 있다.',
    conversion: '영상 제목·URL·순서만 Item으로 두며 통증·중단 체크는 별도 필드로 만들지 않는다.',
    business: '멤버십·비즈니스 문의·후속 채널 유입이 확인된다.',
    community: '댓글과 Day별 완주 참여가 반복 루틴 수요를 보여준다.',
    mapTitle: 'Allblanc 7일 복근 챌린지',
    mapNature: 'playlist_challenge_map',
    userValue: 'Day 순서대로 영상 하나씩 바로 실행한다.',
    creatorValue: '매 실행마다 영상·채널·멤버십으로 되돌아간다.',
    flowMeValue: '영상 1개=Flow, playlist=Map 규칙의 대표 사례다.',
    confirmedBusiness: ['YouTube 멤버십', '비즈니스 문의', '후속 재생목록'],
    hypothesis: '제작자가 챌린지 일정을 Flow로 공식 배포할 파트너 모델이 가능하다.',
    rights: '영상 제목·URL·공개 순서만 사용하며 동작 설명·자막은 복제하지 않는다.',
    adoptionReason: 'Go: 원문 순서·수요·댓글·반복 실행이 모두 분명하다.',
    nextAction: 'playlist 수정 시 기존 사용자 실행 기록을 보존하는 버전 규칙을 적용한다.',
  },
  'health-bigsis': {
    verdict: 'creator_flow_map_candidate',
    scores: [14, 14, 15, 14, 19, 14, 4],
    summary: '운동 길이·대상·부위별 영상이 풍부하고 책·협업까지 이어지는 반복 홈트 공급자다.',
    depth: '최근 루틴 4개와 채널의 다수 재생목록·시리즈 구조를 확인했다.',
    map: '기간·부위·난이도별 재생목록은 Map이 될 수 있으나 제작자 순서가 있는 목록만 채택해야 한다.',
    conversion: '영상 한 편을 한 루틴으로 두고 제목·URL·시간만 보여주면 된다.',
    business: '도서와 협업 문의가 채널 설명에 확인된다.',
    community: '검토 영상 최고 12.6만 조회, 댓글 최고 214개로 실행 후기와 질문이 이어진다.',
    mapTitle: '빅씨스 부위별 홈트 루틴',
    mapNature: 'playlist_routine_map',
    userValue: '원하는 부위·시간의 영상을 골라 반복 일정에 넣는다.',
    creatorValue: '책·채널·후속 영상으로 재방문한다.',
    flowMeValue: '영상 루틴의 난이도·길이 메타데이터 최소 계약을 시험한다.',
    confirmedBusiness: ['도서', '협업 문의', '영상 채널'],
    hypothesis: '제작자 재생목록을 공식 Flow Map으로 동기화할 가치가 있다.',
    rights: '영상 링크와 공개 메타데이터만 사용한다.',
    adoptionReason: 'Go: 포트폴리오 깊이와 댓글 수요가 강하다.',
    nextAction: '순서형 챌린지와 선택형 부위 컬렉션을 다른 Map type으로 구분한다.',
  },
  'health-thankyoububu': {
    verdict: 'creator_flow_map_candidate',
    scores: [15, 15, 14, 14, 19, 12, 4],
    summary: '백만 단위 조회와 댓글 참여가 있는 따라하기 영상 포트폴리오로 반복 루틴 공급력이 매우 높다.',
    depth: '검토 영상 4개 모두 수십만~144만 조회를 보였고 루틴 주제가 반복된다.',
    map: '부위·기간 재생목록은 Map 후보지만 영상 간 필수 순서는 원문 재생목록에서만 가져와야 한다.',
    conversion: '영상 한 편당 한 실행 Item으로 충분하며 부가 기록은 개인 memo에 둔다.',
    business: '채널·후속 영상 유입은 강하나 별도 상품 경로는 이번 공개 화면에서 확인하지 못했다.',
    community: '영상 댓글 67~1,306개가 실제 따라하기와 반응을 보여준다.',
    mapTitle: 'Thankyou BUBU 따라하기 홈트',
    mapNature: 'playlist_routine_map',
    userValue: '검증된 영상 루틴을 일정에 넣고 바로 따라 한다.',
    creatorValue: '매번 원본 영상과 후속 루틴으로 돌아간다.',
    flowMeValue: '대규모 영상 수요가 저장·반복 실행으로 전환되는지 검증한다.',
    confirmedBusiness: ['YouTube 채널·후속 영상'],
    hypothesis: '공식 기간형 재생목록을 제작자와 공동 큐레이션할 수 있다.',
    rights: '영상 자막·동작을 복제하지 않고 제목·URL·길이만 사용한다.',
    adoptionReason: 'Go: 수요와 댓글은 최상급이며 영상 단위 Flow가 명확하다.',
    nextAction: '공식 Day 순서가 있는 재생목록을 별도로 import한다.',
  },
  'travel-kkday': {
    verdict: 'hold',
    scores: [8, 4, 15, 10, 16, 15, 2],
    summary: '여행지별 준비 행과 예약 상품 연결은 강하지만 글 단위 조회·댓글이 보이지 않고 입국 정보 최신성 위험이 있다.',
    depth: '푸꾸옥·사이판·하와이·후쿠오카 준비 글 4개를 열었다.',
    map: '여행지 하나 안에서는 준비-예약 Map이 가능하지만 서로 다른 국가 글을 한 Map으로 묶을 수 없다.',
    conversion: '여권·통신·픽업·예약 행은 checklist로 옮기되 입국 규정은 확인 날짜와 공식 trust anchor가 필요하다.',
    business: '티켓·투어·교통·통신 상품 예약으로 직접 연결된다.',
    community: '블로그 공개 댓글·후기 수치가 없어 creator community 근거가 약하다.',
    mapTitle: '여행지별 출국 준비 Flow',
    mapNature: 'destination_specific_flow_collection',
    userValue: '여행지별 준비물과 예약 링크를 한 체크리스트로 본다.',
    creatorValue: '필요한 투어·티켓·통신 상품으로 원문 유입이 이어진다.',
    flowMeValue: '상업 여행 가이드의 최신성·예약 링크 경계를 시험한다.',
    confirmedBusiness: ['티켓·투어·교통·통신 상품 예약'],
    hypothesis: '여행 전 일정 projection과 예약 전환을 공동 검증할 수 있다.',
    rights: '입국·비자 사실은 공식 최신 정보로 재확인하고 오래된 글은 공개 승격하지 않는다.',
    adoptionReason: 'Hold: 구조와 사업 가치는 강하지만 공개 수요·사용자 대화·최신성 hard gate를 아직 통과하지 못했다.',
    nextAction: '2026 최신 글만 선별하고 공식 입국 trust anchor를 연결한다.',
  },
  'travel-triple': {
    verdict: 'creator_content_partner_candidate',
    scores: [10, 8, 15, 12, 18, 14, 4],
    summary: '저장·리뷰가 보이는 여행 준비 글과 일정·체크리스트·커뮤니티가 연결된 강한 서비스형 파트너 후보다.',
    depth: '출국 준비, 울릉도 준비, 해외여행 아이템, 앱 체크리스트 글 4개를 열었다.',
    map: '여행지별 준비 Flow군은 가능하지만 전체 아티클에 공통 순서를 강제하면 안 된다.',
    conversion: '저장된 checklist 행과 지역별 준비물을 source-specific Flow로 옮길 수 있다.',
    business: '일정 추천·예약·앱 사용으로 연결되는 경로가 명확하다.',
    community: '검토 글에서 저장 15·495, 리뷰 1·4와 배낭톡 질문 구조가 확인된다.',
    mapTitle: '여행지별 준비 체크리스트',
    mapNature: 'destination_specific_flow_collection',
    userValue: '출국 전에 필요한 행을 바로 체크하고 여행 일정에 연결한다.',
    creatorValue: '일정 추천·가이드·예약 화면으로 사용자를 돌려보낸다.',
    flowMeValue: '외부 여행 앱과 중복하지 않는 export·링크 중심 경계를 시험한다.',
    confirmedBusiness: ['여행 일정 추천', '예약·가이드 앱', '배낭톡 커뮤니티'],
    hypothesis: '트리플 내 저장 목록을 FlowMe export 대상으로 연결할 수 있다.',
    rights: '지역별 사실은 확인 날짜를 보존하고 원문 이미지·전문은 복제하지 않는다.',
    adoptionReason: 'Modify: 저장과 source row는 좋지만 플랫폼 기능과 FlowMe 역할 중복을 정리해야 한다.',
    nextAction: 'FlowMe는 일정 앱을 대체하지 않고 원문 체크 행을 portable checklist로 내보내는 데 한정한다.',
  },
  'travel-yeomi': {
    verdict: 'single_content_candidate',
    scores: [10, 10, 14, 6, 10, 12, 4],
    summary: '수요와 댓글은 있으나 다수 영상이 여행 영감·소개 중심이라 실행 행이 있는 특정 콘텐츠만 선별해야 한다.',
    depth: '최근·인기 영상 4개를 열어 조회 편차와 댓글을 확인했다.',
    map: '채널 전체에는 동일 목표·순서가 없어 하나의 Flow Map으로 만들 근거가 부족하다.',
    conversion: '일정표·코스·준비물 행이 명시된 영상만 single Flow 또는 bucket으로 승격해야 한다.',
    business: '브랜드 협업·여행 콘텐츠 유입 경로가 확인된다.',
    community: '한 검토 영상은 댓글 235개지만 다른 영상은 댓글 1개 수준으로 편차가 크다.',
    mapTitle: '실행 행이 있는 여행 콘텐츠 선별함',
    mapNature: 'single_content_only',
    userValue: '실제 코스나 준비표가 있는 영상만 저장한다.',
    creatorValue: '선별된 영상과 채널로 원문 유입을 만든다.',
    flowMeValue: '인기 콘텐츠와 실행 가능한 콘텐츠를 구분하는 gate를 검증한다.',
    confirmedBusiness: ['브랜드 협업·여행 콘텐츠 채널'],
    hypothesis: '제작자가 코스·준비물 템플릿을 추가하면 partner 후보로 올라갈 수 있다.',
    rights: '영상 내용을 요약해 임의 일정을 만들지 않는다.',
    adoptionReason: 'Single: 채널 전체 Map보다 source row가 분명한 영상 1~2개 선별이 맞다.',
    nextAction: '조회 상위 영상 중 실제 일정표·준비물 행이 있는 원문을 추가 탐색한다.',
  },
  'meals-wtable': {
    verdict: 'creator_flow_map_candidate',
    scores: [15, 14, 15, 15, 20, 15, 5],
    summary: '큐레이션이 Map, 레시피가 Flow가 되고 질문·후기·상품이 연결되는 가장 완성도 높은 식사 제작자다.',
    depth: '일주일 반찬 큐레이션과 개별 레시피 5개를 실제로 열었다.',
    map: '원문 큐레이션의 5개 메뉴 순서가 child Flow 목록을 제공한다.',
    conversion: '레시피 하나를 한 Flow로 두고 재료·시간·팁은 memo와 원문에 남기면 된다.',
    business: '레시피·쇼핑 상품·앱·큐레이션이 직접 연결된다.',
    community: '레시피 노트·질문과 큐레이션 의견 보내기가 다음 콘텐츠 피드백을 만든다.',
    mapTitle: '이번 주 여름 반찬 5가지',
    mapNature: 'source_curation_map',
    userValue: '한 주 반찬 5개를 고르고 각 레시피로 바로 실행한다.',
    creatorValue: '조리할 때마다 레시피·상품·앱으로 돌아온다.',
    flowMeValue: '큐레이션→레시피 Flow→장보기/체크 export 연결을 검증한다.',
    confirmedBusiness: ['레시피 연계 상품', '앱·큐레이션', '의견 보내기'],
    hypothesis: '제작자 큐레이션을 공식 Map으로 배포하면 장보기 export 가치가 커진다.',
    rights: '재료·조리 전문과 이미지는 복제하지 않고 제목·시간·URL·최소 실행 메타데이터만 사용한다.',
    adoptionReason: 'Go: Map 구조, 댓글·질문, 쇼핑, 실행성이 모두 강하다.',
    nextAction: '장보기 projection은 레시피 재료 원문 권리와 중복 통합 규칙을 먼저 정한다.',
  },
  'meals-10000recipe': {
    verdict: 'creator_content_partner_candidate',
    scores: [15, 13, 15, 10, 17, 15, 5],
    summary: '수요와 제작자 커뮤니티는 매우 크지만 플랫폼 전체를 한 제작자로 취급하지 말고 레시피 작성자별 출처를 보존해야 한다.',
    depth: '실제 레시피 5개와 15만+ 레시피·2,000여 제작자 포트폴리오를 확인했다.',
    map: '플랫폼 컬렉션은 가능하지만 동일 목표·작성자·순서가 있는 원문 묶음만 Map이 된다.',
    conversion: '레시피 한 건은 Quick Flow가 가능하나 재료·단계를 과도한 Item으로 쪼개지 않는다.',
    business: '스토어·광고·콘텐츠 공급·제작자 프로그램이 확인된다.',
    community: '후기·별점·레시피 등록과 제작자 참여 구조가 강하다.',
    mapTitle: '작성자별 레시피 Flow 컬렉션',
    mapNature: 'multi_creator_recipe_collection',
    userValue: '좋아하는 작성자의 레시피를 작은 실행 Flow로 저장한다.',
    creatorValue: '작성자 프로필·레시피·스토어로 유입을 돌려준다.',
    flowMeValue: '플랫폼·작성자 이중 attribution과 recipe Quick Flow를 검증한다.',
    confirmedBusiness: ['만개스토어', '광고·콘텐츠 공급', '쉐프 프로그램'],
    hypothesis: '작성자별 공식 Flow 채널을 만들려면 플랫폼 제휴가 필요하다.',
    rights: '플랫폼과 개별 작성자 권리를 분리하고 레시피 전문·사진은 복제하지 않는다.',
    adoptionReason: 'Modify: 공급력은 최상급이지만 제작자 ownership과 권리 계약이 선행돼야 한다.',
    nextAction: 'provider=만개의레시피, creator=개별 쉐프의 이중 소유 모델을 정의한다.',
  },
  'meals-deliciousday': {
    verdict: 'creator_content_partner_candidate',
    scores: [12, 9, 13, 12, 18, 9, 3],
    summary: '간결한 영상 레시피가 반복 공급되며 한 영상=한 Quick Flow 전환이 쉽다.',
    depth: '최근 레시피 영상 4개를 열어 437~13.2만 조회의 포트폴리오를 확인했다.',
    map: '재생목록이나 주제 큐레이션이 있는 경우만 Map으로 묶고 개별 영상은 독립 Flow로 둔다.',
    conversion: '영상 제목·URL·조리 시간·재료 링크만 보여주면 되고 조리 단계를 임의 재작성하지 않는다.',
    business: '채널·후속 영상 유입은 있으나 별도 상품·상담 경로는 이번 화면에서 약하다.',
    community: '검토 영상 댓글 5~29개가 있지만 대규모 자료 요청 구조는 아니다.',
    mapTitle: '매일맛나 영상 레시피 모음',
    mapNature: 'video_recipe_collection',
    userValue: '짧은 레시피 영상을 저장하고 필요할 때 바로 조리한다.',
    creatorValue: '영상 재생과 후속 레시피 탐색으로 채널에 돌아온다.',
    flowMeValue: '영상 레시피의 최소 Quick Flow 경계를 시험한다.',
    confirmedBusiness: ['YouTube 채널·후속 영상'],
    hypothesis: '제작자 큐레이션과 장보기 링크가 추가되면 사업 가치가 높아질 수 있다.',
    rights: '영상 자막과 조리 단계를 복제하지 않고 링크 중심으로 둔다.',
    adoptionReason: 'Modify: 단일 Flow 공급력은 좋지만 Map·사업·커뮤니티 근거는 중간 수준이다.',
    nextAction: '공식 재생목록과 설명란의 재료 행을 추가 확인한다.',
  },
  'work-leebro': {
    verdict: 'creator_content_partner_candidate',
    scores: [11, 8, 15, 12, 13, 15, 4],
    summary: '취업 준비 포트폴리오와 사업 경로는 깊지만 설명형 영상에서 실행 항목을 과도하게 만들지 않아야 한다.',
    depth: '자소서·면접·커리어 영상 4개와 채널 포트폴리오를 확인했다.',
    map: '제작자가 정의한 강의·재생목록만 Map으로 인정하고 일반 조언 영상은 resource queue로 둔다.',
    conversion: '체크 가능한 프레임이나 과제가 명시된 영상만 Flow로 승격한다.',
    business: '강의·도서·컨설팅·커뮤니티 경로가 강하다.',
    community: '검토 영상 댓글은 0~29개로 최근 표본의 공개 대화가 상대적으로 약하다.',
    mapTitle: '면접왕 이형 취업 준비 커리큘럼',
    mapNature: 'creator_curriculum_after_import',
    userValue: '자소서와 면접 준비 자료를 목표별 큐로 저장한다.',
    creatorValue: '강의·도서·상담과 후속 영상으로 유입된다.',
    flowMeValue: '설명 콘텐츠가 실행 Flow가 되는 최소 조건을 시험한다.',
    confirmedBusiness: ['강의·도서·상담·커뮤니티'],
    hypothesis: '공식 커리큘럼 목차를 제공받으면 Map 후보가 강해진다.',
    rights: '영상 조언을 임의 체크리스트로 재작성하지 않는다.',
    adoptionReason: 'Modify: 공급력은 높지만 source-defined 실행 행을 더 선별해야 한다.',
    nextAction: '체크리스트·워크북이 연결된 콘텐츠만 우선 import한다.',
  },
  'work-andstudio': {
    verdict: 'creator_flow_map_candidate',
    scores: [15, 14, 14, 13, 18, 15, 5],
    summary: '자소서·산업분석·면접 시리즈가 높은 조회·댓글과 책·커뮤니티·협업으로 연결된다.',
    depth: '지원동기 6단계, 산업분석, 면접 준비 영상 등 4개를 열었다.',
    map: '마스터 자소서처럼 제작자 명시 시리즈는 Map이 되며 서로 다른 주제 영상은 순서 없는 컬렉션으로 둔다.',
    conversion: '영상 제목에 공개된 프레임만 Item으로 두고 세부 6단계는 자막·원문 확보 전 만들지 않는다.',
    business: 'HIINT 커뮤니티, 도서, 제휴·협업 문의가 영상 설명에서 직접 확인된다.',
    community: '대표 영상 88.9만 조회·댓글 201개와 답글 스레드가 보인다.',
    mapTitle: 'AND 취업 준비 영상 컬렉션',
    mapNature: 'creator_series_and_collection',
    userValue: '지원동기·산업분석·면접 자료를 골라 바로 실행한다.',
    creatorValue: '도서·HIINT·후속 영상·협업 채널로 돌아온다.',
    flowMeValue: '영상 시리즈와 비순서 컬렉션을 구분하는 Map 모델을 시험한다.',
    confirmedBusiness: ['HIINT 커뮤니티', '도서', '제휴·협업 문의'],
    hypothesis: '공식 워크북이나 영상 목차를 연결하면 creator Map 완성도가 높아진다.',
    rights: '영상 자막·책 내용을 복제하지 않고 제목·URL·공개 시리즈 메타데이터만 사용한다.',
    adoptionReason: 'Go: 수요·댓글·시리즈·사업 연결이 모두 강하다.',
    nextAction: '마스터 자소서 시리즈 전체 목록을 import하고 비순서 컬렉션 타입을 명시한다.',
  },
  'work-baeminsquare': {
    verdict: 'hold',
    scores: [6, 5, 14, 11, 15, 15, 4],
    summary: '외식업 운영 콘텐츠와 사업 연결은 분명하지만 검토 영상의 공개 조회·댓글이 낮아 canary보다 second wave가 맞다.',
    depth: '매장 운영·마케팅·노무·성장 관련 영상 4개를 확인했다.',
    map: '개점·운영·정산 같은 source-defined 교육 코스가 있을 때 Map이 가능하다.',
    conversion: '사업자 체크 행이나 캘린더가 있는 콘텐츠만 Flow로 두고 전략 조언은 memo로 남긴다.',
    business: '배민 외식업 서비스와 사장님 교육·정보로 직접 연결된다.',
    community: '검토 영상 조회 1천~3천대, 댓글 0~4개로 공개 상호작용은 약하다.',
    mapTitle: '외식업 운영 실무 자료 모음',
    mapNature: 'operator_content_collection',
    userValue: '가게 운영 시 필요한 실무 자료만 체크·메모로 저장한다.',
    creatorValue: '외식업광장 서비스와 후속 교육으로 유입된다.',
    flowMeValue: '소상공인 운영 템플릿이 Flow가 되는 조건을 시험한다.',
    confirmedBusiness: ['배민 외식업광장', '사장님 교육·정보'],
    hypothesis: '체크리스트·양식 콘텐츠가 확인되면 파트너 가치가 커진다.',
    rights: '사업 전략을 보편 실행 항목으로 만들지 않고 원문 행만 사용한다.',
    adoptionReason: 'Hold: 사업 가치는 높지만 검토 표본의 공개 수요·커뮤니케이션 hard gate가 약하다.',
    nextAction: '다운로드 양식·운영 캘린더가 있는 원문을 추가 탐색한다.',
  },
  'hobby-fitpet': {
    verdict: 'single_content_candidate',
    scores: [8, 5, 15, 10, 14, 15, 2],
    summary: '반려 건강 포트폴리오와 병원·쇼핑 연결은 깊지만 의료성 글은 공식 확인과 수의사 경계가 필요해 특정 일정표만 선별한다.',
    depth: '예방접종 일정과 강아지·고양이 건강 카테고리 4개를 열었다.',
    map: '반려 생애 Map을 만들기엔 글마다 대상·위험·공식성 차이가 커서 현재는 단일 콘텐츠 선별이 맞다.',
    conversion: '예방접종의 6개 공식형 행은 일정 Flow가 되지만 증상·치료 글은 실행 체크로 바꾸지 않는다.',
    business: '쇼핑·건강관리·동물병원 서비스가 직접 연결된다.',
    community: '공개 댓글·조회 수치가 약하고 서비스 전환이 상호작용의 중심이다.',
    mapTitle: '반려동물 일정형 콘텐츠 선별',
    mapNature: 'single_sensitive_flow_only',
    userValue: '명시된 일정 행만 참고용으로 저장하고 실제 진료는 병원에 확인한다.',
    creatorValue: '병원·건강관리·쇼핑 서비스로 원문 유입된다.',
    flowMeValue: '민감 반려 건강 콘텐츠의 trust anchor·memo 경계를 시험한다.',
    confirmedBusiness: ['핏펫몰', '건강관리', '동물병원 찾기'],
    hypothesis: '수의사 검토와 최신성 계약이 있어야 공개 Map으로 확장할 수 있다.',
    rights: '의료 조언으로 단정하지 않고 수의사 확인 문구와 확인 날짜를 보존한다.',
    adoptionReason: 'Single: 예방접종 일정 한 건은 가능하지만 제작자 전체를 Map으로 승격하지 않는다.',
    nextAction: '공식 수의학 trust anchor와 최신성 검토 후 공개 범위를 결정한다.',
  },
  'hobby-bodeum': {
    verdict: 'creator_content_partner_candidate',
    scores: [15, 14, 15, 9, 14, 13, 4],
    summary: '높은 조회·댓글과 훈련 전문성은 강하지만 행동 문제를 짧은 체크리스트로 일반화하면 위험해 영상 단위 선별이 필요하다.',
    depth: '검토 영상 4개가 15만~92만 조회, 댓글 213~468개를 보였다.',
    map: '문제 행동별 영상은 컬렉션이지만 모든 개에게 적용되는 순서형 훈련 Map은 아니다.',
    conversion: '영상 링크와 대상 상황만 Quick Flow로 두고 훈련 방법은 원문 영상에 남긴다.',
    business: '보듬 교육·채널·브랜드 연결이 확인된다.',
    community: '댓글 질문과 반려 경험 공유가 매우 활발하다.',
    mapTitle: '상황별 반려견 교육 영상 모음',
    mapNature: 'expert_video_collection',
    userValue: '내 상황에 맞는 전문가 영상을 저장하고 다시 본다.',
    creatorValue: '교육 프로그램과 후속 영상으로 유입된다.',
    flowMeValue: '전문가 조언을 과도한 실행 항목으로 만들지 않는 Quick Flow 경계를 시험한다.',
    confirmedBusiness: ['반려견 교육 브랜드', 'YouTube 채널'],
    hypothesis: '제작자가 직접 단계형 코스를 제공할 때만 Full Flow Map이 가능하다.',
    rights: '훈련법을 재서술하지 않고 제목·URL·대상 상황만 사용한다.',
    adoptionReason: 'Modify: 수요·대화는 최상급이지만 개별 상황과 안전 때문에 Map 일반화는 제한한다.',
    nextAction: '공식 단계형 교육 재생목록이나 워크북이 있는지 확인한다.',
  },
  'hobby-catdoctor': {
    verdict: 'creator_content_partner_candidate',
    scores: [12, 13, 15, 7, 12, 13, 4],
    summary: '고양이 행동·건강 영상의 수요와 댓글은 강하지만 의료·행동 맥락을 잃지 않도록 링크 중심으로 제한해야 한다.',
    depth: '검토 영상 4개와 행동·건강 주제 포트폴리오를 확인했다.',
    map: '주제별 컬렉션은 가능하지만 진단·치료 순서로 만드는 것은 부적절하다.',
    conversion: '일상 관리 팁이 명시된 영상만 Quick Flow로 두고 증상 판단은 원문·병원으로 보낸다.',
    business: '전문가 브랜드·채널·후속 콘텐츠 연결이 확인된다.',
    community: '검토 영상 최고 12.4만 조회, 댓글 27~142개로 질문과 경험 공유가 이어진다.',
    mapTitle: '고양이 행동·생활 영상 모음',
    mapNature: 'expert_video_collection',
    userValue: '상황별 전문가 영상을 저장하고 필요할 때 다시 본다.',
    creatorValue: '채널과 전문 콘텐츠로 반복 유입된다.',
    flowMeValue: '반려 건강·행동 콘텐츠의 Quick Flow와 Hold 경계를 시험한다.',
    confirmedBusiness: ['전문가 채널·후속 콘텐츠'],
    hypothesis: '비의료 생활 관리 시리즈는 제작자 승인 후 Flow군으로 확장 가능하다.',
    rights: '영상 자막·진단 내용을 복제하지 않고 원문 링크 중심으로 둔다.',
    adoptionReason: 'Modify: 대화와 전문성은 좋지만 민감도와 실행 행 선별이 필요하다.',
    nextAction: '생활 관리와 의료 조언을 content subtype으로 분리한다.',
  },
};

function parseCompactNumber(value) {
  if (value == null) return null;
  const normalized = String(value).replace(/[^\d.,만천억KMBkmb]/g, '').replaceAll(',', '');
  if (!normalized) return null;
  const number = Number.parseFloat(normalized);
  if (!Number.isFinite(number)) return null;
  if (/억/.test(normalized)) return Math.round(number * 100_000_000);
  if (/만/.test(normalized)) return Math.round(number * 10_000);
  if (/[Kk]/.test(normalized)) return Math.round(number * 1_000);
  if (/[Mm]/.test(normalized)) return Math.round(number * 1_000_000);
  if (/[Bb]/.test(normalized)) return Math.round(number * 1_000_000_000);
  return Math.round(number);
}

function formatNumber(value) {
  if (value == null) return 'unknown';
  return new Intl.NumberFormat('ko-KR').format(value);
}

function creatorMetrics(creatorId) {
  const evidence = deepEvidenceById.get(creatorId);
  const contents = evidence?.contents || [];
  const viewCounts = contents.map((entry) => entry.viewCount).filter(Number.isFinite);
  const commentCounts = contents
    .map((entry) => parseCompactNumber(entry.commentCountText))
    .filter(Number.isFinite);
  const pageDemandSignals = [...new Set(contents.flatMap((entry) => entry.demandSignals || []))];
  const pageCommunicationSignals = [...new Set(contents.flatMap((entry) => entry.communicationSignals || []))];
  const profile = evidence?.profile || profileEvidenceById.get(creatorId);
  const override = knownEvidenceOverrides[creatorId];
  const demand = override?.demand
    || (viewCounts.length
      ? `검토 영상 최고 조회 ${formatNumber(Math.max(...viewCounts))}, ${viewCounts.length}개 영상 조회 수치를 직접 확인했다`
      : pageDemandSignals.length
        ? `공개 원문에서 ${pageDemandSignals.slice(0, 3).join(' · ')} 신호를 확인했다`
        : '프로필과 원문은 열었지만 공개 조회·저장 수치는 unknown이다');
  const communication = override?.communication
    || (commentCounts.length
      ? `검토 영상 최고 댓글 ${formatNumber(Math.max(...commentCounts))}개, ${commentCounts.length}개 영상의 댓글 수를 직접 확인했다`
      : pageCommunicationSignals.length
        ? `공개 원문에서 ${pageCommunicationSignals.slice(0, 3).join(' · ')} 신호를 확인했다`
        : '공개 댓글·질문·후기 수치는 unknown이며 확인되지 않은 반응을 추정하지 않았다');
  return {
    attemptedContentCount: contents.length,
    openedContentCount: contents.filter((entry) => entry.opened).length,
    maxVisibleViewCount: viewCounts.length ? Math.max(...viewCounts) : null,
    maxVisibleCommentCount: commentCounts.length ? Math.max(...commentCounts) : null,
    subscriberText: profile?.subscriberText || null,
    pageDemandSignals,
    pageCommunicationSignals,
    demand,
    communication,
  };
}

function scoreCard(plan, metrics) {
  const values = plan.scores;
  const comments = [
    `${metrics.demand}. ${values[0] === scoreMax.visibleDemandScore ? '최고점 근거가 충분하다.' : '보이지 않는 수치 또는 표본 편차를 감점했다.'}`,
    `${metrics.communication}. ${values[1] === scoreMax.userCommunicationScore ? '자료 요청·질문·후기가 반복되어 최고점이다.' : '공개 대화의 양·답변률 또는 직접성이 부족한 만큼 감점했다.'}`,
    `실제 대표 원문 ${metrics.openedContentCount}/${metrics.attemptedContentCount}개를 열었다. ${plan.depth}`,
    plan.map,
    plan.conversion,
    plan.business,
    plan.community,
  ];
  return Object.fromEntries(
    Object.entries(scoreMax).map(([key, max], index) => [
      key,
      { score: values[index], max, comment: comments[index] },
    ]),
  );
}

const sourceShapeByCategory = {
  home_living: 'checklist_or_procedure_article',
  family_parenting: 'checklist_file_or_stage_article',
  study_reading: 'curriculum_plan_or_learning_resource',
  money_admin_purchase: 'comparison_roadmap_or_explainer',
  health_fitness: 'follow_along_video_or_playlist',
  travel_outings: 'destination_checklist_or_itinerary',
  meals_grocery: 'recipe_or_source_curation',
  work_career: 'career_framework_video_or_operator_guide',
  hobby_pet: 'expert_advice_or_sensitive_schedule',
};

const naturalArtifactByCategory = {
  home_living: 'calendar_checklist',
  family_parenting: 'checklist_or_source_table',
  study_reading: 'progress_checklist',
  money_admin_purchase: 'sheet_or_learning_queue',
  health_fitness: 'repeating_video_routine',
  travel_outings: 'travel_checklist',
  meals_grocery: 'recipe_queue_or_checklist',
  work_career: 'resource_queue_or_checklist',
  hobby_pet: 'quick_flow_or_reference',
};

const userJobByCategory = {
  home_living: '집안일·이사·정리의 다음 행동을 놓치지 않기',
  family_parenting: '아이 단계에 맞는 준비·식단·자료를 바로 실행하기',
  study_reading: '정해진 강의·회차·자료의 다음 진도를 이어가기',
  money_admin_purchase: '구매·재무 학습의 비교 항목과 순서를 빠뜨리지 않기',
  health_fitness: '영상 루틴을 골라 바로 따라 하고 반복하기',
  travel_outings: '출발 전에 필요한 준비물·서류·예약을 빠뜨리지 않기',
  meals_grocery: '메뉴를 정하고 원문 레시피로 바로 조리하기',
  work_career: '지원·면접·가게 운영 자료의 다음 행동을 실행하기',
  hobby_pet: '취미·반려 상황에 맞는 원문을 저장하고 필요한 행동만 실행하기',
};

function contentReview(creator, entry) {
  const signals = entry.shapeSignals || [];
  const explicitRows = signals.length > 0
    || creator.candidateId === 'family-babyfood016'
    || creator.candidateId === 'study-mansour'
    || creator.candidateId === 'hobby-fitpet';
  const sourceShape = signals[0] || sourceShapeByCategory[creator.categoryId];
  const title = entry.title || entry.requestedUrl;
  const demandEvidence = entry.viewCount
    ? `조회 ${formatNumber(entry.viewCount)}${entry.commentCountText ? ` · ${entry.commentCountText}` : ''}`
    : entry.demandSignals?.length
      ? entry.demandSignals.slice(0, 3).join(' · ')
      : 'visible demand unknown';
  return {
    title,
    url: entry.requestedUrl,
    sourceOpened: Boolean(entry.opened),
    sourceShape,
    userJob: userJobByCategory[creator.categoryId],
    naturalArtifact: naturalArtifactByCategory[creator.categoryId],
    sourceRowReadiness: explicitRows ? 'visible_rows_or_metadata' : 'needs_deeper_row_import',
    flowVerdict: explicitRows ? 'flow_candidate' : 'single_content_or_bucket_only',
    flowMapRole: explicitRows ? 'candidate_child_flow' : 'not_a_map_row_yet',
    demandEvidence,
    communicationEvidence: entry.commentCountText
      || entry.communicationSignals?.slice(0, 2).join(' · ')
      || 'public communication unknown',
    sourceTrace: {
      sourceUrl: entry.requestedUrl,
      sourceTitle: title,
      observedAt,
      evidenceLedger: `${assetDirName}/opened-creator-url-ledger-v1.json`,
    },
  };
}

function decisionBand(verdict) {
  if (verdict === 'creator_flow_map_candidate') return 'Go';
  if (verdict === 'creator_content_partner_candidate' || verdict === 'source_import_required') return 'Modify';
  if (verdict === 'single_content_candidate') return 'Single';
  return 'Hold';
}

function verdictLabel(verdict) {
  return {
    creator_flow_map_candidate: 'Flow Map 제작자',
    creator_content_partner_candidate: '콘텐츠 파트너',
    single_content_candidate: '특정 콘텐츠만',
    source_import_required: '원문 행 추가 필요',
    hold: '보류',
    reject: '제외',
  }[verdict] || verdict;
}

const creatorPortfolioRecords = deepCreatorProfiles.map((creator) => {
  const plan = reviewPlans[creator.candidateId];
  if (!plan) throw new Error(`Missing review plan for ${creator.candidateId}`);
  const evidence = deepEvidenceById.get(creator.candidateId);
  const metrics = creatorMetrics(creator.candidateId);
  const scores = scoreCard(plan, metrics);
  const totalScore = Object.values(scores).reduce((sum, entry) => sum + entry.score, 0);
  const reviews = (evidence?.contents || []).map((entry) => contentReview(creator, entry));
  return {
    creatorId: creator.candidateId,
    name: creator.name,
    categoryId: creator.categoryId,
    categoryLabel: categoryById.get(creator.categoryId).label,
    platform: creator.platform,
    profileUrl: creator.profileUrl,
    profileOpened: Boolean(evidence?.profile?.opened),
    profileTitle: evidence?.profile?.title || null,
    verdict: plan.verdict,
    verdictLabel: verdictLabel(plan.verdict),
    decisionBand: decisionBand(plan.verdict),
    topCreatorReview: topSet.has(creator.candidateId),
    representativeFlowOwner: representativeSet.has(creator.candidateId),
    summary: plan.summary,
    observedMetrics: metrics,
    demandEvidence: metrics.demand,
    communicationEvidence: metrics.communication,
    portfolioDepthEvidence: plan.depth,
    proposedFlowMap: {
      title: plan.mapTitle,
      nature: plan.mapNature,
      childFlowCandidates: reviews.map((review) => ({
        title: review.title,
        sourceUrl: review.url,
        readiness: review.flowVerdict,
      })),
    },
    contentReviews: reviews,
    value: {
      user: plan.userValue,
      creator: plan.creatorValue,
      flowMe: plan.flowMeValue,
    },
    businessConnection: {
      confirmed: plan.confirmedBusiness,
      hypothesis: plan.hypothesis,
    },
    scores,
    totalScore,
    rightsFreshnessSafety: plan.rights,
    adoptionReason: plan.adoptionReason,
    logicNextAction: plan.nextAction,
    hardGates: {
      profileOpened: Boolean(evidence?.profile?.opened),
      atLeastThreeContentsOpened: metrics.openedContentCount >= 3,
      sourceRowsForRepresentativeExample: representativeSet.has(creator.candidateId)
        ? true
        : reviews.some((review) => review.sourceRowReadiness === 'visible_rows_or_metadata'),
      noInventedActionsRequired: plan.verdict !== 'hold' && plan.verdict !== 'reject',
      publicRightsReady: !/제휴|허가|승인|계약/.test(plan.rights),
      sensitiveBoundaryRequired: creator.categoryId === 'money_admin_purchase'
        || creator.categoryId === 'health_fitness'
        || creator.candidateId === 'hobby-fitpet'
        || creator.candidateId === 'hobby-catdoctor',
    },
  };
});

function sourceTrace(row) {
  return [{
    sourceRowId: row.sourceRowId,
    sourceUrl: row.sourceUrl,
    sourceLocator: row.sourceLocator,
  }];
}

function makeItem(row, itemTitle, memo, schedule = null) {
  return {
    itemId: `${row.sourceRowId}-item`,
    itemTitle,
    memo,
    completionMode: 'manual_check',
    optional: false,
    schedule,
    sourceRowIds: [row.sourceRowId],
    sourceTrace: sourceTrace(row),
  };
}

function buildTravelBundle() {
  const sourceUrl = 'https://triple.guide/articles/6bebeecc-83e2-4b03-8b22-04dccf80c729';
  const rowDefinitions = [
    ['travel-triple-passport', '여권', '여권 유효기간 6개월 이상 확인', '원문 25행: 여권 유효기간 6개월 이상'],
    ['travel-triple-ticket', '항공권 일정', '출국·귀국 일정 다시 확인', '원문 25행: 출국·귀국 일정'],
    ['travel-triple-exchange', '환전', '여행 예산에 맞게 환전', '원문 25·42~47행: 환전'],
    ['travel-triple-insurance', '여행자 보험', '여행자 보험 준비', '원문 25·55~60행: 여행자 보험'],
    ['travel-triple-documents', '출력 서류', 'E-티켓·바우처·여권 사본 출력', '원문 29~30행: 출력 서류'],
    ['travel-triple-data', '데이터 이용', '유심·eSIM·포켓와이파이·로밍 중 준비', '원문 34~40행: 데이터 이용법'],
    ['travel-triple-electronics', '전자제품·현지 준비물', '전자제품·복장·비상약 챙기기', '원문 62~69행: 전자제품·복장·비상약'],
    ['travel-triple-baggage', '수하물 규정', '무게와 기내·위탁 수하물 규정 확인', '원문 77~91행: 수하물 규정'],
  ];
  const rows = rowDefinitions.map(([sourceRowId, label, detail, sourceLocator]) => ({
    sourceRowId,
    bundleId: 'bundle-triple-cappadocia-departure',
    sourceUrl,
    sourceLocator,
    label,
    detail,
    verifiedAt: observedAt,
  }));
  const groups = [
    ['travel-triple-step-core', '출국 기본 확인', rows.slice(0, 4)],
    ['travel-triple-step-documents', '서류와 통신', rows.slice(4, 6)],
    ['travel-triple-step-packing', '짐과 수하물', rows.slice(6)],
  ];
  const steps = groups.map(([stepId, title, groupRows]) => ({
    stepId,
    title,
    schedule: null,
    prerequisite: null,
    items: groupRows.map((row) => makeItem(
      row,
      row.detail,
      `카파도키아 출국 전 체크 원문: ${sourceUrl}`,
    )),
  }));
  const bundle = {
    bundleId: 'bundle-triple-cappadocia-departure',
    title: '카파도키아 출국 전 체크',
    category: '여행·외출',
    status: 'representative_example',
    sourceType: 'brand_community',
    sourceUrls: [sourceUrl],
    userPromise: '저장하면 카파도키아 출국 전에 확인할 8개 체크가 생긴다.',
    firstAction: '여권 유효기간이 6개월 이상 남았는지 확인한다.',
    setupFields: [],
    defaultArtifact: 'checklist',
    rightsMode: 'link_and_minimal_execution_metadata',
    cautions: ['입국·수하물 규정은 여행 시점에 항공사와 공식 기관에서 다시 확인한다.'],
    map: {
      mapId: 'bundle-triple-cappadocia-departure-map',
      title: '카파도키아 출국 전 체크',
      mapType: 'single_flow',
      flows: [{
        flowId: 'bundle-triple-cappadocia-departure-flow',
        title: '카파도키아 출국 전 체크',
        expectedItemCount: 8,
        steps,
      }],
    },
  };
  return { bundle, rows };
}

function buildMealsBundle() {
  const curationUrl = 'https://wtable.co.kr/curations/562';
  const definitions = [
    ['wtable-summer-1', '오이지무침', 'https://wtable.co.kr/recipes/otoQ5JpRjgNPpuDtsYUwpRxC', '초급 · 15분', '원문 19·63·184행'],
    ['wtable-summer-2', '한치 초무침', 'https://wtable.co.kr/recipes/ACxZbqBF1Vb3snHtZdTMwPDe', '초급 · 30분', '원문 25·84·186행'],
    ['wtable-summer-3', '브로콜리 참깨무침', 'https://wtable.co.kr/recipes/Phq1srHvzgYtDueKGZFcBHS5', '초급 · 20분', '원문 31·107·188행'],
    ['wtable-summer-4', '오이고추 된장 무침', 'https://wtable.co.kr/recipes/cZvq4myCFaK4Es7uJzaUyUBn', '초급 · 15분', '원문 37·130·190행'],
    ['wtable-summer-5', '꽈리고추찜무침', 'https://wtable.co.kr/recipes/kPW41Sk1utYTteW8jzzzigvp', '초급 · 20분', '원문 42·161·191행'],
  ];
  const rows = definitions.map(([sourceRowId, label, sourceUrl, detail, sourceLocator]) => ({
    sourceRowId,
    bundleId: 'bundle-wtable-summer-banchan-five',
    sourceUrl,
    sourceLocator: `${sourceLocator}; 큐레이션 ${curationUrl}`,
    label,
    detail,
    verifiedAt: observedAt,
  }));
  const flows = rows.map((row, index) => ({
    flowId: `${row.sourceRowId}-flow`,
    title: row.label,
    expectedItemCount: 1,
    sourceVideoUrl: null,
    sourceOrder: index + 1,
    steps: [{
      stepId: `${row.sourceRowId}-step`,
      title: '레시피 실행',
      schedule: null,
      prerequisite: null,
      items: [makeItem(
        row,
        `${row.label} 만들기`,
        `${row.detail} · 원문 레시피: ${row.sourceUrl}`,
      )],
    }],
  }));
  const bundle = {
    bundleId: 'bundle-wtable-summer-banchan-five',
    title: '이번 주 여름 반찬 5가지',
    category: '식사·장보기',
    status: 'representative_example',
    sourceType: 'creator_brand',
    sourceUrls: [curationUrl, ...rows.map((row) => row.sourceUrl)],
    userPromise: '저장하면 우리의식탁 큐레이션에 있는 여름 반찬 5개가 각각 실행 가능한 레시피 Flow로 생긴다.',
    firstAction: '만들 반찬 하나를 골라 원문 레시피를 연다.',
    setupFields: [],
    defaultArtifact: 'checklist_memo',
    rightsMode: 'link_and_minimal_execution_metadata',
    cautions: ['재료·조리 단계 전문은 원문에서 확인한다.'],
    map: {
      mapId: 'bundle-wtable-summer-banchan-five-map',
      title: '이번 주 여름 반찬 5가지',
      mapType: 'source_curation',
      ordering: 'source_display_order_not_calendar_order',
      flows,
    },
  };
  return { bundle, rows };
}

function buildWorkBundle() {
  const definitions = [
    ['andstudio-job-1', '자소서 지원동기 6단계', 'https://www.youtube.com/watch?v=OIliv2jpDyM', '조회 889,279 · 좋아요 17,011 · 댓글 201', '영상 제목·공개 설명'],
    ['andstudio-job-2', '산업분석 방법', 'https://www.youtube.com/watch?v=qXRMV7TgsSg', '조회 186,826 · 댓글 139', '영상 제목·공개 설명'],
    ['andstudio-job-3', '면접 전 확인할 6가지', 'https://www.youtube.com/watch?v=Sd176kgo1Es', '조회 103,294 · 댓글 32', '영상 제목·공개 설명'],
  ];
  const rows = definitions.map(([sourceRowId, label, sourceUrl, detail, sourceLocator]) => ({
    sourceRowId,
    bundleId: 'bundle-andstudio-job-prep-videos',
    sourceUrl,
    sourceLocator,
    label,
    detail,
    verifiedAt: observedAt,
  }));
  const flows = rows.map((row) => ({
    flowId: `${row.sourceRowId}-flow`,
    title: row.label,
    expectedItemCount: 1,
    sourceVideoUrl: row.sourceUrl,
    steps: [{
      stepId: `${row.sourceRowId}-step`,
      title: '영상 1편',
      schedule: null,
      prerequisite: null,
      items: [makeItem(
        row,
        `${row.label} 영상으로 준비하기`,
        `${row.detail} · 영상: ${row.sourceUrl}`,
      )],
    }],
  }));
  const bundle = {
    bundleId: 'bundle-andstudio-job-prep-videos',
    title: 'AND 취업 준비 영상 3편',
    category: '일·커리어',
    status: 'representative_example',
    sourceType: 'creator_business',
    sourceUrls: rows.map((row) => row.sourceUrl),
    userPromise: '저장하면 지원동기·산업분석·면접 준비 영상 3개가 각각 독립 Flow로 생긴다.',
    firstAction: '지금 필요한 주제의 영상을 하나 연다.',
    setupFields: [],
    defaultArtifact: 'resource_queue',
    rightsMode: 'link_and_minimal_execution_metadata',
    cautions: ['세 영상 사이에 필수 순서는 없으며 영상의 6단계 세부 내용은 원문을 열어 확인한다.'],
    map: {
      mapId: 'bundle-andstudio-job-prep-videos-map',
      title: 'AND 취업 준비 영상 3편',
      mapType: 'unordered_collection',
      ordering: 'none',
      flows,
    },
  };
  return { bundle, rows };
}

function buildPetBundle() {
  const sourceUrl = 'https://www.fitpetmall.com/blog/dog-vaccinations';
  const definitions = [
    ['fitpet-vaccine-1', 6, '1차 접종', 'DHPPL 1차 + 코로나 장염 1차', '원문 93·174행'],
    ['fitpet-vaccine-2', 8, '2차 접종', 'DHPPL 2차 + 코로나 장염 2차', '원문 95·176행'],
    ['fitpet-vaccine-3', 10, '3차 접종', 'DHPPL 3차 + 켄넬 코프 1차', '원문 97·178행'],
    ['fitpet-vaccine-4', 12, '4차 접종', 'DHPPL 4차 + 켄넬 코프 2차', '원문 99·180행'],
    ['fitpet-vaccine-5', 14, '5차 접종', 'DHPPL 5차 + 신종 플루 1차', '원문 101·182행'],
    ['fitpet-vaccine-6', 16, '6차 접종', '신종 플루 2차 + 광견병 예방 접종', '원문 103·184행'],
  ];
  const rows = definitions.map(([sourceRowId, week, label, detail, sourceLocator]) => ({
    sourceRowId,
    bundleId: 'bundle-fitpet-puppy-vaccination',
    sourceUrl,
    sourceLocator,
    label: `생후 ${week}주 ${label}`,
    detail,
    sourceAgeWeeks: week,
    verifiedAt: observedAt,
  }));
  const steps = rows.map((row) => ({
    stepId: `${row.sourceRowId}-step`,
    title: `생후 ${row.sourceAgeWeeks}주`,
    schedule: { type: 'source_age_week', week: row.sourceAgeWeeks },
    prerequisite: null,
    items: [makeItem(
      row,
      `${row.label}`,
      `${row.detail} · 실제 접종 일정은 담당 수의사·동물병원에 확인하고 특이사항은 개인 메모에 기록하세요. · 원문: ${sourceUrl}`,
      { type: 'source_age_week', week: row.sourceAgeWeeks },
    )],
  }));
  const bundle = {
    bundleId: 'bundle-fitpet-puppy-vaccination',
    title: '강아지 생후 6~16주 예방접종 일정',
    category: '취미·반려',
    status: 'representative_example_sensitive',
    sourceType: 'creator_brand_sensitive',
    sourceUrls: [sourceUrl],
    userPromise: '저장하면 원문에 적힌 생후 6~16주 접종 6회가 참고 일정으로 생긴다.',
    firstAction: '생후 6주 1차 접종 항목을 동물병원과 확인한다.',
    setupFields: [{
      key: 'birthDate',
      label: '생년월일',
      type: 'date',
      required: false,
      purpose: '입력한 경우에만 생후 주차를 실제 날짜로 계산한다.',
    }],
    defaultArtifact: 'calendar_checklist',
    rightsMode: 'link_and_minimal_execution_metadata',
    cautions: [
      '의료 참고용이며 실제 접종 종류·시기·비용은 수의사와 동물병원에 확인한다.',
      '이상반응 같은 별도 기록 필드는 만들지 않고 필요한 내용은 개인 메모에 적는다.',
    ],
    map: {
      mapId: 'bundle-fitpet-puppy-vaccination-map',
      title: '강아지 생후 6~16주 예방접종 일정',
      mapType: 'single_sensitive_schedule',
      flows: [{
        flowId: 'bundle-fitpet-puppy-vaccination-flow',
        title: '강아지 생후 6~16주 예방접종 일정',
        expectedItemCount: 6,
        steps,
      }],
    },
  };
  return { bundle, rows };
}

function collectNestedItems(bundle) {
  return (bundle.map?.flows || []).flatMap((flow) => (
    (flow.steps || []).flatMap((step) => step.items || [])
  ));
}

function collectNestedSteps(bundle) {
  return (bundle.map?.flows || []).flatMap((flow) => flow.steps || []);
}

function clonePriorExample(bundleId, creatorId, categoryId) {
  const bundle = structuredClone(priorBundleById.get(bundleId));
  if (!bundle) throw new Error(`Prior bundle not found: ${bundleId}`);
  const items = collectNestedItems(bundle);
  const rowIds = new Set(items.flatMap((item) => item.sourceRowIds || []));
  const rows = [...rowIds].map((rowId) => priorSourceRowById.get(rowId)).filter(Boolean);
  return {
    creatorId,
    categoryId,
    provenance: {
      type: 'reused_source_backed_bundle',
      sourceArtifact: 'docs/content-audit/2026-07-22-flow-content-demand-business-data-v1.json',
      reviewedAt: observedAt,
    },
    userContentBundle: bundle,
    sourceRows: rows,
  };
}

const travel = buildTravelBundle();
const meals = buildMealsBundle();
const work = buildWorkBundle();
const pet = buildPetBundle();

const representativeFlowExamples = [
  clonePriorExample('bundle-moving-d30', 'home-ajd', 'home_living'),
  clonePriorExample('bundle-baby-food-174', 'family-babyfood016', 'family_parenting'),
  clonePriorExample('bundle-opic-plan', 'study-mansour', 'study_reading'),
  clonePriorExample('bundle-new-car-comparison', 'money-getcha', 'money_admin_purchase'),
  clonePriorExample('bundle-allblanc-7day-abs', 'health-allblanc', 'health_fitness'),
  {
    creatorId: 'travel-triple',
    categoryId: 'travel_outings',
    provenance: { type: 'new_source_backed_example', reviewedAt: observedAt },
    userContentBundle: travel.bundle,
    sourceRows: travel.rows,
  },
  {
    creatorId: 'meals-wtable',
    categoryId: 'meals_grocery',
    provenance: { type: 'new_source_backed_example', reviewedAt: observedAt },
    userContentBundle: meals.bundle,
    sourceRows: meals.rows,
  },
  {
    creatorId: 'work-andstudio',
    categoryId: 'work_career',
    provenance: { type: 'new_source_backed_example', reviewedAt: observedAt },
    userContentBundle: work.bundle,
    sourceRows: work.rows,
  },
  {
    creatorId: 'hobby-fitpet',
    categoryId: 'hobby_pet',
    provenance: { type: 'new_source_backed_sensitive_example', reviewedAt: observedAt },
    userContentBundle: pet.bundle,
    sourceRows: pet.rows,
  },
].map((example) => {
  const bundle = example.userContentBundle;
  return {
    ...example,
    counts: {
      flows: bundle.map?.flows?.length || 0,
      steps: collectNestedSteps(bundle).length,
      items: collectNestedItems(bundle).length,
      sourceRows: example.sourceRows.length,
    },
  };
});

const exampleByCreatorId = new Map(representativeFlowExamples.map((example) => [example.creatorId, example]));
const allRepresentativeSourceRows = representativeFlowExamples.flatMap((example) => example.sourceRows);

const candidateDiscoveryLedger = candidateProfiles.map((candidate) => {
  const evidence = profileEvidenceById.get(candidate.candidateId);
  return {
    candidateId: candidate.candidateId,
    name: candidate.name,
    categoryId: candidate.categoryId,
    platform: candidate.platform,
    profileUrl: candidate.profileUrl,
    screenStatus: reviewPlans[candidate.candidateId] ? 'deep_reviewed' : 'screened_only',
    profileOpened: Boolean(evidence?.opened),
    observedTitle: evidence?.title || null,
    status: evidence?.status ?? null,
    error: evidence?.error || null,
  };
});

const screenshotRecords = screenshotManifest.screenshots.map((capture) => {
  let filename = capture.filename;
  let sourceNote = null;
  if (capture.creatorId === 'family-babyfood016' && capture.evidenceRole === 'user_communication') {
    filename = 'creator-family-babyfood016-communication-verified.png';
    sourceNote = '2026-07-22 동일 원문 검증에서 댓글 9,999+ 영역을 캡처한 파일을 재사용했다.';
  }
  if (capture.creatorId === 'health-allblanc' && capture.evidenceRole === 'user_communication') {
    filename = 'creator-health-allblanc-communication-verified.png';
    sourceNote = '2026-07-22 동일 재생목록 검증에서 실제 댓글 영역을 캡처한 파일을 재사용했다.';
  }
  if (capture.creatorId === 'home-ohouse' && capture.evidenceRole === 'creator_profile') {
    filename = 'creator-home-ohouse-profile-fallback.png';
    sourceNote = '직접 브라우저는 CDN Access Denied여서 2026-07-22 공개 원문 HTML 스냅샷을 재사용했다.';
  }
  return {
    ...capture,
    filename,
    relativePath: `${assetDirName}/${filename}`,
    sourceNote,
  };
});

const categorySummary = categories.map((category) => {
  const creators = creatorPortfolioRecords
    .filter((creator) => creator.categoryId === category.id)
    .sort((a, b) => b.totalScore - a.totalScore);
  return {
    categoryId: category.id,
    categoryLabel: category.label,
    deepCreatorCount: creators.length,
    topCreatorId: creators[0]?.creatorId || null,
    topCreatorName: creators[0]?.name || null,
    topScore: creators[0]?.totalScore || null,
    decisions: creators.map((creator) => ({
      creatorId: creator.creatorId,
      name: creator.name,
      decisionBand: creator.decisionBand,
      verdict: creator.verdict,
      totalScore: creator.totalScore,
    })),
    representativeExampleCreatorId: representativeFlowExamples.find((example) => example.categoryId === category.id)?.creatorId || null,
  };
});

const validation = {
  candidateCountAtLeast60: candidateDiscoveryLedger.length >= 60,
  profileOpenedAtLeast45: ledger.summary.profileUrlsOpened >= 45,
  deepCreatorCount24To27: creatorPortfolioRecords.length >= 24 && creatorPortfolioRecords.length <= 27,
  threeCreatorsPerCategory: categories.every((category) => (
    creatorPortfolioRecords.filter((creator) => creator.categoryId === category.id).length === 3
  )),
  contentOpenedAtLeast90: ledger.summary.contentUrlsOpened >= 90,
  atLeastThreeContentsPerCreator: creatorPortfolioRecords.every((creator) => creator.observedMetrics.openedContentCount >= 3),
  allScoresHaveScoreAndComment: creatorPortfolioRecords.every((creator) => (
    Object.entries(scoreMax).every(([key, max]) => (
      Number.isFinite(creator.scores[key]?.score)
      && creator.scores[key].max === max
      && Boolean(creator.scores[key].comment)
    ))
  )),
  representativeExampleEveryCategory: categories.every((category) => (
    representativeFlowExamples.some((example) => example.categoryId === category.id)
  )),
  representativeItemsHaveSourceTrace: representativeFlowExamples.every((example) => (
    collectNestedItems(example.userContentBundle).every((item) => (
      item.sourceRowIds?.length > 0
      && item.sourceTrace?.length > 0
      && item.sourceTrace.every((trace) => trace.sourceRowId && trace.sourceUrl && trace.sourceLocator)
    ))
  )),
  profileCaptureEveryDeepCreator: deepCreatorProfiles.every((creator) => (
    screenshotRecords.some((capture) => (
      capture.creatorId === creator.candidateId
      && capture.evidenceRole.includes('creator_profile')
    ))
  )),
  topCreatorCaptureTriplets: topCreatorIds.every((creatorId) => (
    ['creator_profile_and_demand', 'user_communication', 'flow_conversion_source_rows']
      .every((role) => screenshotRecords.some((capture) => (
        capture.creatorId === creatorId && capture.evidenceRole === role
      )))
  )),
};

const data = {
  schemaVersion: 'flowme-creator-flow-portfolio-v1',
  generatedAt: new Date().toISOString(),
  observedAt,
  purpose: '9개 생활 카테고리에서 지속적인 Flow 공급자가 될 제작자와 특정 콘텐츠만 가능한 제작자를 실제 원문 기반으로 구분한다.',
  evidenceBoundary: [
    '조회·댓글·저장·구독 등 보이지 않는 수치는 추정하지 않고 unknown으로 둔다.',
    'creator_flow_map_candidate는 공개 적용 승인이나 제휴 체결을 뜻하지 않는다.',
    '공식·민감 사실은 제작자 경험과 분리하며 최신 trust anchor 검토가 필요하다.',
    '사용자용 representativeFlowExamples와 내부 creatorPortfolioRecords를 분리했다.',
    '앱 코드·앱 seed·canonical 로직은 이 산출물에서 수정하지 않았다.',
  ],
  scoreModel: {
    dimensions: scoreMax,
    rule: '총점만으로 승격하지 않고 source row, one-user-job, 권리, 최신성, 안전성 hard gate를 함께 적용한다.',
  },
  researchSummary: {
    ...ledger.summary,
    finalDeepCreators: creatorPortfolioRecords.length,
    topCreatorReviewCount: topCreatorIds.length,
    representativeFlowExampleCount: representativeFlowExamples.length,
    representativeFlowCounts: representativeFlowExamples.reduce((totals, example) => ({
      flows: totals.flows + example.counts.flows,
      steps: totals.steps + example.counts.steps,
      items: totals.items + example.counts.items,
      sourceRows: totals.sourceRows + example.counts.sourceRows,
    }), { flows: 0, steps: 0, items: 0, sourceRows: 0 }),
  },
  categorySummary,
  candidateDiscoveryLedger,
  creatorPortfolioRecords,
  openedUrlEvidence: {
    path: `${assetDirName}/opened-creator-url-ledger-v1.json`,
    summary: ledger.summary,
  },
  screenshotEvidence: {
    path: `${assetDirName}/screenshot-evidence-v1.json`,
    summary: screenshotManifest.summary,
    records: screenshotRecords,
  },
  representativeFlowExamples,
  representativeSourceRows: allRepresentativeSourceRows,
  logicHandoffRisks: [
    '플랫폼 provider와 개별 creator attribution을 분리해야 한다.',
    'ordered map과 unordered collection을 같은 순서형 Flow Map으로 취급하면 안 된다.',
    '유료 파일·PDF·영상 자막·레시피 전문은 링크와 최소 실행 메타데이터로 제한한다.',
    '재무·건강·반려 의료 콘텐츠는 공식 trust anchor와 최신성 정책이 필요하다.',
    'creator 후보 점수와 공개 카탈로그 승인은 별도 상태다.',
  ],
  validation,
};

await fs.writeFile(outputJsonPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function captureCards(creatorId) {
  const captures = screenshotRecords.filter((capture) => capture.creatorId === creatorId);
  const roleLabel = {
    creator_profile: '제작자 화면',
    creator_profile_and_demand: '제작자·수요',
    user_communication: '사용자 대화',
    flow_conversion_source_rows: 'Flow 변환 근거',
  };
  return captures.map((capture) => `
    <figure class="capture">
      <a href="${escapeHtml(capture.url)}" target="_blank" rel="noreferrer">
        <img src="${escapeHtml(capture.relativePath)}" alt="${escapeHtml(candidateById.get(creatorId)?.name)} ${escapeHtml(roleLabel[capture.evidenceRole])}" loading="lazy">
      </a>
      <figcaption>
        <strong>${escapeHtml(roleLabel[capture.evidenceRole] || capture.evidenceRole)}</strong>
        ${capture.sourceNote ? `<span>${escapeHtml(capture.sourceNote)}</span>` : ''}
      </figcaption>
    </figure>
  `).join('');
}

function scheduleLabel(schedule) {
  if (!schedule) return '';
  if (schedule.type === 'source_age_week') return `생후 ${schedule.week}주`;
  if (schedule.type === 'relative_weekday') return `${schedule.week}주차 ${schedule.weekday}`;
  if (schedule.type === 'relative_day') return `D${schedule.offset >= 0 ? '+' : ''}${schedule.offset}`;
  if (schedule.type === 'source_day_index') return `D+${schedule.dayIndex}`;
  if (schedule.type === 'source_day_range') return `D+${schedule.start}~${schedule.end}`;
  return Object.values(schedule).filter((value) => typeof value === 'string' || typeof value === 'number').join(' · ');
}

function renderFlowExample(example) {
  const bundle = example.userContentBundle;
  return `
    <section class="flow-example">
      <div class="flow-example-head">
        <div>
          <span class="eyebrow">실제 적용 데이터 · ${escapeHtml(example.provenance.type)}</span>
          <h4>${escapeHtml(bundle.title)}</h4>
          <p>${escapeHtml(bundle.userPromise)}</p>
        </div>
        <div class="count-line">
          <span>Flow ${example.counts.flows}</span>
          <span>Step ${example.counts.steps}</span>
          <span>Item ${example.counts.items}</span>
        </div>
      </div>
      <div class="promise-line"><strong>첫 행동</strong><span>${escapeHtml(bundle.firstAction)}</span></div>
      ${(bundle.setupFields || []).length ? `
        <div class="setup-line"><strong>사용자 입력</strong><span>${bundle.setupFields.map((field) => `${escapeHtml(field.label)}${field.required ? ' (필수)' : ' (선택)'}`).join(' · ')}</span></div>
      ` : '<div class="setup-line"><strong>사용자 입력</strong><span>0개</span></div>'}
      ${(bundle.cautions || []).length ? `<div class="caution">${bundle.cautions.map((caution) => `<span>${escapeHtml(caution)}</span>`).join('')}</div>` : ''}
      <div class="flow-list">
        ${(bundle.map?.flows || []).map((flow, flowIndex) => `
          <details class="flow-block" ${flowIndex === 0 ? 'open' : ''}>
            <summary>
              <span><b>Flow ${flowIndex + 1}</b>${escapeHtml(flow.title)}</span>
              <small>${flow.expectedItemCount ?? (flow.steps || []).flatMap((step) => step.items || []).length} Items</small>
            </summary>
            <div class="step-list">
              ${(flow.steps || []).map((step, stepIndex) => `
                <section class="step-block">
                  <header>
                    <span>Step ${stepIndex + 1}</span>
                    <strong>${escapeHtml(step.title)}</strong>
                    ${scheduleLabel(step.schedule) ? `<small>${escapeHtml(scheduleLabel(step.schedule))}</small>` : ''}
                  </header>
                  <ul class="item-list">
                    ${(step.items || []).map((item) => `
                      <li>
                        <span class="check" aria-hidden="true"></span>
                        <div>
                          <strong>${escapeHtml(item.itemTitle)}</strong>
                          ${item.memo ? `<p>${escapeHtml(item.memo)}</p>` : ''}
                          <div class="trace-line">
                            ${(item.sourceTrace || []).map((trace) => `
                              <a href="${escapeHtml(trace.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(trace.sourceLocator)}</a>
                            `).join('')}
                          </div>
                        </div>
                      </li>
                    `).join('')}
                  </ul>
                </section>
              `).join('')}
            </div>
          </details>
        `).join('')}
      </div>
    </section>
  `;
}

function scoreRows(creator) {
  const labels = {
    visibleDemandScore: '보이는 수요',
    userCommunicationScore: '사용자 대화',
    sourcePortfolioDepthScore: '포트폴리오 깊이',
    flowMapPotentialScore: 'Flow Map 가능성',
    flowConversionFitScore: 'Flow 변환 적합도',
    creatorBusinessValueScore: '제작자 사업 가치',
    creatorCommunityFitScore: '커뮤니티 확장성',
  };
  return Object.entries(creator.scores).map(([key, entry]) => `
    <div class="score-row">
      <div><strong>${escapeHtml(labels[key])}</strong><span>${entry.score}/${entry.max}</span></div>
      <p>${escapeHtml(entry.comment)}</p>
    </div>
  `).join('');
}

function contentRows(creator) {
  return creator.contentReviews.map((review) => `
    <li class="content-row">
      <div>
        <a href="${escapeHtml(review.url)}" target="_blank" rel="noreferrer">${escapeHtml(review.title)}</a>
        <span>${escapeHtml(review.sourceShape)} · ${escapeHtml(review.naturalArtifact)}</span>
      </div>
      <div class="content-signals">
        <span>${escapeHtml(review.demandEvidence)}</span>
        <span>${escapeHtml(review.communicationEvidence)}</span>
      </div>
      <b class="${review.flowVerdict === 'flow_candidate' ? 'good' : 'muted'}">${review.flowVerdict === 'flow_candidate' ? 'Flow 후보' : '행 추가 확인'}</b>
    </li>
  `).join('');
}

const categoryCards = categorySummary.map((category) => `
  <button class="category-card" type="button" data-category-jump="${escapeHtml(category.categoryId)}">
    <span>${escapeHtml(category.categoryLabel)}</span>
    <strong>${escapeHtml(category.topCreatorName)}</strong>
    <small>상위 ${category.topScore}점 · ${category.deepCreatorCount}명 검토</small>
  </button>
`).join('');

const creatorCards = creatorPortfolioRecords
  .sort((a, b) => {
    const categoryOrder = categories.findIndex((category) => category.id === a.categoryId)
      - categories.findIndex((category) => category.id === b.categoryId);
    return categoryOrder || b.totalScore - a.totalScore;
  })
  .map((creator) => {
    const example = exampleByCreatorId.get(creator.creatorId);
    return `
      <article class="creator-card" id="${escapeHtml(creator.creatorId)}" data-category="${escapeHtml(creator.categoryId)}" data-band="${escapeHtml(creator.decisionBand)}">
        <header class="creator-head">
          <div>
            <div class="meta-line">
              <span>${escapeHtml(creator.categoryLabel)}</span>
              <span>${escapeHtml(creator.platform)}</span>
              ${creator.topCreatorReview ? '<span class="top-mark">상위 검토</span>' : ''}
            </div>
            <h3><a href="${escapeHtml(creator.profileUrl)}" target="_blank" rel="noreferrer">${escapeHtml(creator.name)}</a></h3>
            <p>${escapeHtml(creator.summary)}</p>
          </div>
          <div class="verdict verdict-${escapeHtml(creator.decisionBand.toLowerCase())}">
            <strong>${escapeHtml(creator.decisionBand)}</strong>
            <span>${escapeHtml(creator.verdictLabel)}</span>
            <b>${creator.totalScore}점</b>
          </div>
        </header>

        <div class="signal-grid">
          <div><span>수요</span><p>${escapeHtml(creator.demandEvidence)}</p></div>
          <div><span>대화</span><p>${escapeHtml(creator.communicationEvidence)}</p></div>
          <div><span>예상 Map</span><p><strong>${escapeHtml(creator.proposedFlowMap.title)}</strong><br>${escapeHtml(creator.proposedFlowMap.nature)}</p></div>
          <div><span>비즈니스</span><p>${escapeHtml(creator.businessConnection.confirmed.join(' · '))}</p></div>
        </div>

        <div class="capture-strip">${captureCards(creator.creatorId)}</div>

        <section class="decision-note">
          <strong>${escapeHtml(creator.adoptionReason)}</strong>
          <span>다음 확인: ${escapeHtml(creator.logicNextAction)}</span>
        </section>

        ${example ? renderFlowExample(example) : `
          <section class="map-preview">
            <div>
              <span class="eyebrow">포트폴리오 Flow 후보</span>
              <h4>${escapeHtml(creator.proposedFlowMap.title)}</h4>
              <p>${escapeHtml(creator.proposedFlowMap.nature)} · 순서가 원문에 없으면 컬렉션으로만 둔다.</p>
            </div>
            <ol>
              ${creator.proposedFlowMap.childFlowCandidates.slice(0, 5).map((child) => `
                <li><a href="${escapeHtml(child.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(child.title)}</a><span>${escapeHtml(child.readiness)}</span></li>
              `).join('')}
            </ol>
          </section>
        `}

        <details class="review-detail">
          <summary>열어본 원문 ${creator.contentReviews.length}개</summary>
          <ul class="content-list">${contentRows(creator)}</ul>
        </details>

        <details class="review-detail">
          <summary>점수와 감점 이유</summary>
          <div class="score-list">${scoreRows(creator)}</div>
        </details>

        <details class="review-detail">
          <summary>사용자·제작자·FlowMe 가치와 권리</summary>
          <dl class="value-list">
            <div><dt>사용자</dt><dd>${escapeHtml(creator.value.user)}</dd></div>
            <div><dt>제작자</dt><dd>${escapeHtml(creator.value.creator)}</dd></div>
            <div><dt>FlowMe</dt><dd>${escapeHtml(creator.value.flowMe)}</dd></div>
            <div><dt>사업 가설</dt><dd>${escapeHtml(creator.businessConnection.hypothesis)}</dd></div>
            <div><dt>권리·최신성·안전</dt><dd>${escapeHtml(creator.rightsFreshnessSafety)}</dd></div>
          </dl>
        </details>
      </article>
    `;
  }).join('');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FlowMe 제작자 Flow 포트폴리오 검토</title>
  <style>
    :root {
      --ink: #17202a;
      --muted: #667085;
      --line: #dfe3e8;
      --paper: #ffffff;
      --surface: #f6f7f8;
      --blue: #185adb;
      --green: #147d64;
      --amber: #a15c00;
      --red: #b42318;
      --violet: #6d4aff;
      --shadow: 0 8px 24px rgba(23, 32, 42, .08);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--surface);
      color: var(--ink);
      font-family: Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", Arial, sans-serif;
      line-height: 1.55;
      letter-spacing: 0;
    }
    a { color: inherit; text-decoration-thickness: 1px; text-underline-offset: 3px; overflow-wrap: anywhere; }
    button { font: inherit; letter-spacing: 0; }
    .shell { width: min(1180px, calc(100% - 32px)); margin: 0 auto; }
    .hero {
      background: #fff;
      border-bottom: 1px solid var(--line);
      padding: 32px 0 26px;
    }
    .eyebrow { display: block; color: var(--blue); font-size: 12px; font-weight: 800; margin-bottom: 6px; }
    h1 { margin: 0; font-size: 32px; line-height: 1.2; }
    .hero-copy { max-width: 820px; margin: 10px 0 18px; color: var(--muted); }
    .stats { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); border: 1px solid var(--line); background: var(--paper); }
    .stats div { padding: 14px; border-right: 1px solid var(--line); }
    .stats div:last-child { border-right: 0; }
    .stats span { display: block; color: var(--muted); font-size: 11px; }
    .stats strong { display: block; margin-top: 3px; font-size: 21px; }
    .category-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 14px; }
    .category-card {
      appearance: none;
      border: 1px solid var(--line);
      background: var(--surface);
      padding: 12px;
      text-align: left;
      cursor: pointer;
      border-radius: 6px;
      min-height: 90px;
    }
    .category-card:hover, .category-card:focus-visible { border-color: var(--blue); outline: 2px solid rgba(24,90,219,.12); }
    .category-card span, .category-card small { display: block; color: var(--muted); font-size: 11px; }
    .category-card strong { display: block; margin: 5px 0; font-size: 15px; }
    .toolbar-wrap { position: sticky; top: 0; z-index: 20; background: rgba(246,247,248,.96); border-bottom: 1px solid var(--line); backdrop-filter: blur(8px); }
    .toolbar { display: flex; gap: 8px; padding: 10px 0; overflow-x: auto; scrollbar-width: none; }
    .toolbar::-webkit-scrollbar { display: none; }
    .filter {
      border: 1px solid var(--line);
      background: #fff;
      color: var(--ink);
      border-radius: 5px;
      padding: 8px 11px;
      white-space: nowrap;
      cursor: pointer;
    }
    .filter[aria-pressed="true"] { background: var(--ink); color: #fff; border-color: var(--ink); }
    main { padding: 18px 0 60px; }
    .section-title { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin: 0 0 12px; }
    .section-title h2 { margin: 0; font-size: 20px; }
    .section-title p { margin: 0; color: var(--muted); font-size: 13px; }
    .creator-list { display: grid; gap: 16px; }
    .creator-card { background: #fff; border: 1px solid var(--line); box-shadow: var(--shadow); border-radius: 8px; overflow: hidden; scroll-margin-top: 64px; }
    .creator-card[hidden] { display: none; }
    .creator-head { display: flex; justify-content: space-between; gap: 20px; padding: 20px; border-bottom: 1px solid var(--line); }
    .creator-head > div:first-child { min-width: 0; }
    .meta-line { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 7px; }
    .meta-line span { padding: 3px 7px; background: var(--surface); border: 1px solid var(--line); border-radius: 4px; color: var(--muted); font-size: 11px; }
    .meta-line .top-mark { color: var(--violet); border-color: #d8d0ff; background: #f4f1ff; }
    .creator-head h3 { margin: 0; font-size: 24px; }
    .creator-head p { max-width: 760px; margin: 7px 0 0; color: var(--muted); }
    .verdict { width: 126px; flex: 0 0 126px; padding: 10px; border-left: 4px solid var(--line); background: var(--surface); }
    .verdict strong, .verdict span, .verdict b { display: block; }
    .verdict strong { font-size: 18px; }
    .verdict span { color: var(--muted); font-size: 11px; margin: 2px 0 7px; }
    .verdict-go { border-color: var(--green); }
    .verdict-modify { border-color: var(--amber); }
    .verdict-single { border-color: var(--blue); }
    .verdict-hold { border-color: var(--red); }
    .signal-grid { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid var(--line); }
    .signal-grid > div { padding: 14px 16px; border-right: 1px solid var(--line); min-width: 0; }
    .signal-grid > div:last-child { border-right: 0; }
    .signal-grid span { color: var(--muted); font-size: 11px; font-weight: 700; }
    .signal-grid p { margin: 5px 0 0; font-size: 13px; }
    .capture-strip { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(260px, 1fr); gap: 10px; overflow-x: auto; padding: 16px; scroll-snap-type: x mandatory; border-bottom: 1px solid var(--line); }
    .capture { margin: 0; scroll-snap-align: start; min-width: 0; }
    .capture img { display: block; width: 100%; height: 210px; object-fit: cover; object-position: top; border: 1px solid var(--line); background: var(--surface); }
    .capture figcaption { padding-top: 6px; font-size: 11px; color: var(--muted); }
    .capture figcaption strong, .capture figcaption span { display: block; }
    .decision-note { display: flex; justify-content: space-between; gap: 16px; padding: 14px 18px; background: #fff8e8; border-bottom: 1px solid #ead5a0; }
    .decision-note span { color: var(--muted); font-size: 13px; }
    .flow-example, .map-preview { padding: 18px; border-bottom: 1px solid var(--line); }
    .flow-example-head { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
    .flow-example h4, .map-preview h4 { margin: 0; font-size: 19px; }
    .flow-example p, .map-preview p { margin: 5px 0 0; color: var(--muted); }
    .count-line { display: flex; gap: 6px; flex-wrap: wrap; }
    .count-line span { border: 1px solid var(--line); padding: 5px 7px; font-size: 11px; background: var(--surface); }
    .promise-line, .setup-line { display: grid; grid-template-columns: 90px 1fr; gap: 10px; margin-top: 12px; font-size: 13px; }
    .caution { display: grid; gap: 4px; margin-top: 12px; padding: 10px; background: #fff2f0; color: #7a271a; font-size: 12px; }
    .flow-list { margin-top: 14px; display: grid; gap: 8px; }
    .flow-block { border: 1px solid var(--line); background: #fff; }
    .flow-block > summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; list-style: none; cursor: pointer; padding: 12px; }
    .flow-block > summary::-webkit-details-marker { display: none; }
    .flow-block > summary span { display: flex; gap: 8px; align-items: center; min-width: 0; }
    .flow-block > summary b { color: var(--blue); font-size: 11px; }
    .flow-block > summary small { color: var(--muted); white-space: nowrap; }
    .step-list { border-top: 1px solid var(--line); }
    .step-block { border-bottom: 1px solid var(--line); }
    .step-block:last-child { border-bottom: 0; }
    .step-block header { display: flex; align-items: baseline; gap: 8px; padding: 10px 12px; background: var(--surface); }
    .step-block header span { color: var(--green); font-size: 11px; font-weight: 800; }
    .step-block header small { margin-left: auto; color: var(--muted); }
    .item-list { list-style: none; margin: 0; padding: 0; }
    .item-list li { display: grid; grid-template-columns: 18px 1fr; gap: 10px; padding: 11px 12px; border-top: 1px solid #edf0f2; }
    .item-list li:first-child { border-top: 0; }
    .check { width: 16px; height: 16px; border: 2px solid #98a2b3; margin-top: 3px; }
    .item-list p { margin: 4px 0 0; font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
    .trace-line { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; }
    .trace-line a { color: var(--blue); font-size: 11px; }
    .map-preview { display: grid; grid-template-columns: .8fr 1.2fr; gap: 20px; }
    .map-preview ol { margin: 0; padding-left: 20px; }
    .map-preview li { padding: 4px 0; }
    .map-preview li span { display: block; color: var(--muted); font-size: 11px; }
    .review-detail { border-bottom: 1px solid var(--line); }
    .review-detail > summary { cursor: pointer; padding: 14px 18px; font-weight: 800; }
    .content-list { list-style: none; margin: 0; padding: 0 18px 16px; }
    .content-row { display: grid; grid-template-columns: 1.25fr 1fr 90px; gap: 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--line); }
    .content-row > div:first-child span, .content-signals span { display: block; color: var(--muted); font-size: 11px; }
    .content-row b { justify-self: end; font-size: 11px; }
    .good { color: var(--green); }
    .muted { color: var(--muted); }
    .score-list { padding: 0 18px 16px; }
    .score-row { padding: 10px 0; border-top: 1px solid var(--line); }
    .score-row > div { display: flex; justify-content: space-between; gap: 10px; }
    .score-row p { margin: 4px 0 0; color: var(--muted); font-size: 12px; }
    .value-list { margin: 0; padding: 0 18px 16px; }
    .value-list div { display: grid; grid-template-columns: 110px 1fr; gap: 12px; border-top: 1px solid var(--line); padding: 9px 0; }
    .value-list dt { font-weight: 800; }
    .value-list dd { margin: 0; color: var(--muted); }
    .appendix { margin-top: 20px; background: #fff; border: 1px solid var(--line); padding: 16px; }
    .appendix summary { cursor: pointer; font-weight: 800; }
    .candidate-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
    .candidate-grid a { display: block; border: 1px solid var(--line); padding: 9px; font-size: 12px; }
    .candidate-grid small { display: block; color: var(--muted); }
    .footer-note { color: var(--muted); font-size: 12px; margin-top: 18px; }
    @media (max-width: 800px) {
      .shell { width: min(100% - 20px, 1180px); }
      .hero { padding: 20px 0; }
      h1 { font-size: 24px; }
      .stats { grid-template-columns: repeat(3, 1fr); }
      .stats div:nth-child(3) { border-right: 0; }
      .stats div:nth-child(-n+3) { border-bottom: 1px solid var(--line); }
      .category-board { grid-template-columns: 1fr 1fr; }
      .creator-head { align-items: start; }
      .creator-head h3 { font-size: 20px; }
      .signal-grid { grid-template-columns: 1fr 1fr; }
      .signal-grid > div:nth-child(2) { border-right: 0; }
      .signal-grid > div:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
      .decision-note { display: grid; }
      .map-preview { grid-template-columns: 1fr; }
      .candidate-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 520px) {
      .shell { width: min(100% - 14px, 1180px); }
      .stats { grid-template-columns: 1fr 1fr; }
      .stats div { border-right: 1px solid var(--line) !important; border-bottom: 1px solid var(--line); }
      .stats div:nth-child(even) { border-right: 0 !important; }
      .stats div:nth-last-child(-n+2) { border-bottom: 0; }
      .category-board { grid-template-columns: 1fr; }
      .category-card { min-height: 76px; }
      .creator-head { display: grid; padding: 15px; }
      .verdict { width: 100%; display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; }
      .verdict span { margin: 0; }
      .signal-grid { grid-template-columns: 1fr; }
      .signal-grid > div { border-right: 0; border-bottom: 1px solid var(--line); }
      .signal-grid > div:last-child { border-bottom: 0; }
      .capture-strip { grid-auto-columns: calc(100vw - 48px); padding: 12px; }
      .capture img { height: 190px; }
      .flow-example, .map-preview { padding: 14px; }
      .flow-example-head { display: grid; }
      .promise-line, .setup-line { grid-template-columns: 1fr; gap: 2px; }
      .flow-block > summary span { display: grid; gap: 1px; }
      .step-block header { flex-wrap: wrap; }
      .step-block header small { width: 100%; margin-left: 0; }
      .content-row { grid-template-columns: 1fr; gap: 4px; }
      .content-row b { justify-self: start; }
      .value-list div { grid-template-columns: 1fr; gap: 2px; }
      .candidate-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="hero">
    <div class="shell">
      <span class="eyebrow">2026-07-23 · 실제 원문 기반 제작자 포트폴리오 검토</span>
      <h1>9개 카테고리에서 누가 Flow를 계속 만들 수 있나</h1>
      <p class="hero-copy">개별 인기 글이 아니라 제작자 전체의 수요, 댓글·질문, 시리즈 깊이, 사업 연결과 실제 source row를 함께 봤습니다. 첫 화면의 제작자를 누르면 상세 카드로 이동합니다.</p>
      <div class="stats">
        <div><span>발견 제작자</span><strong>${data.researchSummary.discoveredCreatorCandidates}</strong></div>
        <div><span>프로필 열람</span><strong>${data.researchSummary.profileUrlsOpened}</strong></div>
        <div><span>심층 제작자</span><strong>${data.researchSummary.finalDeepCreators}</strong></div>
        <div><span>원문 열람</span><strong>${data.researchSummary.contentUrlsOpened}</strong></div>
        <div><span>대화 증거 원문</span><strong>${data.researchSummary.contentsWithCommunicationEvidence}</strong></div>
        <div><span>실제 Flow 예시</span><strong>${data.researchSummary.representativeFlowExampleCount}</strong></div>
      </div>
      <div class="category-board">${categoryCards}</div>
    </div>
  </header>

  <div class="toolbar-wrap">
    <nav class="toolbar shell" aria-label="제작자 필터">
      <button class="filter" type="button" data-filter-type="band" data-filter-value="all" aria-pressed="true">전체 27</button>
      <button class="filter" type="button" data-filter-type="band" data-filter-value="Go" aria-pressed="false">Go</button>
      <button class="filter" type="button" data-filter-type="band" data-filter-value="Modify" aria-pressed="false">Modify</button>
      <button class="filter" type="button" data-filter-type="band" data-filter-value="Single" aria-pressed="false">Single</button>
      <button class="filter" type="button" data-filter-type="band" data-filter-value="Hold" aria-pressed="false">Hold</button>
      ${categories.map((category) => `<button class="filter" type="button" data-filter-type="category" data-filter-value="${escapeHtml(category.id)}" aria-pressed="false">${escapeHtml(category.label)}</button>`).join('')}
    </nav>
  </div>

  <main class="shell">
    <div class="section-title">
      <h2>제작자 27명</h2>
      <p id="visible-count">27명 표시 중</p>
    </div>
    <div class="creator-list">${creatorCards}</div>

    <details class="appendix">
      <summary>1차 후보 63명 전체 원장</summary>
      <div class="candidate-grid">
        ${candidateDiscoveryLedger.map((candidate) => `
          <a href="${escapeHtml(candidate.profileUrl)}" target="_blank" rel="noreferrer">
            <strong>${escapeHtml(candidate.name)}</strong>
            <small>${escapeHtml(categoryById.get(candidate.categoryId).label)} · ${escapeHtml(candidate.screenStatus)} · ${candidate.profileOpened ? '열림' : `미열림 ${candidate.status ?? ''}`}</small>
          </a>
        `).join('')}
      </div>
    </details>
    <p class="footer-note">이 보고서는 제휴 승인·공개 카탈로그 승격을 뜻하지 않습니다. JSON은 내부 근거와 사용자용 Flow 데이터를 분리하며, 앱 코드·seed·canonical 로직은 수정하지 않았습니다.</p>
  </main>

  <script>
    const cards = [...document.querySelectorAll('.creator-card')];
    const filters = [...document.querySelectorAll('.filter')];
    const visibleCount = document.getElementById('visible-count');
    let activeBand = 'all';
    let activeCategory = 'all';

    function applyFilters() {
      let count = 0;
      cards.forEach((card) => {
        const visible = (activeBand === 'all' || card.dataset.band === activeBand)
          && (activeCategory === 'all' || card.dataset.category === activeCategory);
        card.hidden = !visible;
        if (visible) count += 1;
      });
      visibleCount.textContent = count + '명 표시 중';
    }

    filters.forEach((button) => {
      button.addEventListener('click', () => {
        const type = button.dataset.filterType;
        const value = button.dataset.filterValue;
        if (type === 'band') {
          activeBand = value;
          filters.filter((item) => item.dataset.filterType === 'band')
            .forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        } else {
          const isSame = activeCategory === value;
          activeCategory = isSame ? 'all' : value;
          filters.filter((item) => item.dataset.filterType === 'category')
            .forEach((item) => item.setAttribute('aria-pressed', String(!isSame && item === button)));
        }
        applyFilters();
      });
    });

    document.querySelectorAll('[data-category-jump]').forEach((button) => {
      button.addEventListener('click', () => {
        activeCategory = button.dataset.categoryJump;
        filters.filter((item) => item.dataset.filterType === 'category')
          .forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.filterValue === activeCategory)));
        applyFilters();
        const first = cards.find((card) => card.dataset.category === activeCategory);
        first?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  </script>
</body>
</html>
`;

await fs.writeFile(outputHtmlPath, html, 'utf8');

const categoryLines = categorySummary.map((category) => (
  `| ${category.categoryLabel} | ${category.topCreatorName} (${category.topScore}) | ${category.decisions.map((decision) => `${decision.name}:${decision.decisionBand}`).join(', ')} | ${candidateById.get(category.representativeExampleCreatorId)?.name || '-'} |`
)).join('\n');

const handoff = `# 제작자 Flow 포트폴리오 로직 세션 Handoff

Date: ${observedAt}

## 목적

이 문서는 콘텐츠 발굴 세션에서 검증한 제작자 27명과 카테고리별 대표 Flow 예시 9개를 다음 **로직/정규화 세션**으로 넘긴다. 이 세션에서는 앱 코드, 앱 seed, canonical 로직을 변경하지 않았다.

## 먼저 읽을 파일

1. \`docs/content-audit/2026-07-23-creator-flow-portfolio-data-v1.json\`
2. \`docs/content-audit/2026-07-23-creator-flow-portfolio-review-ko.html\`
3. \`docs/content-audit/${assetDirName}/opened-creator-url-ledger-v1.json\`
4. \`docs/specs/2026-07-11-canonical-flow-data-model/spec.md\`
5. \`docs/flow-rules/source-to-flow-conversion-gate.md\`

## 조사 결과

- 발견 제작자: ${data.researchSummary.discoveredCreatorCandidates}명
- 실제 열린 프로필: ${data.researchSummary.profileUrlsOpened}개
- 심층 검토: ${data.researchSummary.finalDeepCreators}명
- 실제 열린 대표 원문: ${data.researchSummary.contentUrlsOpened}개
- 수요·대화 근거가 잡힌 원문: ${data.researchSummary.contentsWithCommunicationEvidence}개
- 대표 Flow 예시: ${data.researchSummary.representativeFlowExampleCount}개
- 예시 전체: Flow ${data.researchSummary.representativeFlowCounts.flows} / Step ${data.researchSummary.representativeFlowCounts.steps} / Item ${data.researchSummary.representativeFlowCounts.items}

## 카테고리 판정

| 카테고리 | 점수 상위 | 3명 판정 | 대표 정규화 예시 |
| --- | --- | --- | --- |
${categoryLines}

## JSON 읽는 법

- \`creatorPortfolioRecords\`: 내부 검토 데이터다. 점수, 판정, 사업 가설, 권리·안전 메모가 들어 있다.
- \`representativeFlowExamples[].userContentBundle\`: 사용자에게 보일 수 있는 실제 Flow 데이터다.
- \`representativeFlowExamples[].sourceRows\`: 각 Item의 원문 근거다.
- \`candidateDiscoveryLedger\`: 1차 후보 63명 원장이다. 앱 데이터로 쓰지 않는다.
- \`screenshotEvidence\`: 원문 캡처와 URL 대응이다.

## 다음 로직 세션의 작업

1. 9개 \`userContentBundle\`을 Canonical Flow Data Model에 dry-run 정규화한다.
2. \`ordered_life_event_map\`, \`source_curation\`, \`unordered_collection\`, \`single_sensitive_schedule\`을 같은 순서형 Map으로 합치지 않는다.
3. 기존 재사용 번들 5개와 신규 예시 4개의 필드 차이를 비교한다.
4. 모든 Item에서 \`sourceRowIds\`와 \`sourceTrace\`를 보존한다.
5. setup field는 0~2개를 기본으로 하고 source가 요구하지 않는 날짜·반복·완료 기준을 만들지 않는다.
6. creator, provider/platform, source owner를 분리할 최소 attribution 계약을 제안한다.
7. 공개 가능, 내부 canary, source import 필요, 민감도 보류 상태를 하나의 \`status\`로 뭉개지 않는다.
8. 정규화 결과와 손실·충돌만 새 검토 산출물로 만든다. 앱 반영은 별도 승인 후 진행한다.

## 특히 결정할 로직

### 1. Map 종류

- ordered: D-day, 회차, Day 챌린지, 커리큘럼
- source curation: 원문이 고른 메뉴·자료 묶음, 일정 순서 아님
- unordered collection: AND 영상 3편처럼 서로 독립적인 child Flow
- sensitive schedule: 수의사·공식 확인이 필요한 참고 일정

### 2. Attribution

- \`creatorId\`: 실제 글·영상 제작자
- \`providerId\`: 오늘의집·만개의레시피 같은 유통 플랫폼
- \`sourceUrl\`: 사용자가 실행 중 돌아갈 원문
- platform 전체를 한 creator로 합치지 않는다.

### 3. 사용자 입력

- 날짜 없는 저장은 입력 0개
- D-day Flow는 기준일 1개
- 생후 주차 Flow는 생년월일 1개를 선택 입력
- 영상·레시피 큐는 반복 요일을 저장 후 선택 입력

### 4. Item 경계

- Item은 독립적으로 체크할 최소 행동
- 수량, 비용, 재료, 링크, 팁, 상태, 특이사항은 memo/detail
- 운동 통증·중단, 예방접종 이상반응은 별도 Item/Field로 만들지 않고 필요하면 개인 memo
- 설명형 영상의 세부 단계는 자막·워크북 source row 없이 발명하지 않는다.

## 로직 세션에서 하지 말 것

- 앱 코드나 seed에 바로 넣지 않는다.
- 점수가 높다는 이유로 공개 콘텐츠로 승인하지 않는다.
- 유료 PDF·영상 자막·레시피 전문을 복제하지 않는다.
- 서로 다른 제작자의 오늘의집·만개의레시피 글을 한 creator Map으로 합치지 않는다.
- 여행·재무·건강·반려 의료 정보를 최신 공식 확인 없이 일정화하지 않는다.

## 완료 조건

- 9개 예시 모두 canonical dry-run 결과가 있어야 한다.
- ordered Map과 collection Map의 필드 차이가 설명되어야 한다.
- creator/provider/source attribution 손실이 없어야 한다.
- 모든 Item의 source trace가 유지되어야 한다.
- 정규화 중 새 행동·날짜·반복·완료 기준이 생기지 않아야 한다.
- 앱 구현 전 사용자가 Go / Modify / Hold를 다시 결정할 수 있는 비교표를 제공한다.
`;

await fs.writeFile(outputHandoffPath, handoff, 'utf8');

console.log(JSON.stringify({
  outputJsonPath,
  outputHtmlPath,
  outputHandoffPath,
  summary: data.researchSummary,
  validation,
}, null, 2));
