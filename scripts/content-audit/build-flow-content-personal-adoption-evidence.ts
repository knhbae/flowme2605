import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { reviewContentInventory } from '../../lib/flow/content-inventory';
import { seedBundles } from '../../lib/flow/seed-flows';

type EvidenceLevel = 'E0' | 'E1' | 'E2' | 'E3' | 'E4' | 'E5';
type EvidenceStatus = 'direct' | 'adjacent' | 'none' | 'access_limited';

type FixedReaction = {
  reactionId: string;
  permalink: string;
  observedDate?: string;
  excerpt: string;
  evidenceLevel: EvidenceLevel;
  artifactSignals?: string[];
};

type FixedSource = {
  sourceId: string;
  platform: string;
  category: string;
  market: string;
  sourceTitle: string;
  sourceUrl: string;
  channel?: string;
  uploadDate?: string;
  checkedAt: string;
  publicMetricsAtCheck?: Record<string, number>;
  sampling: Record<string, unknown>;
  reactions: FixedReaction[];
};

type FixedInput = {
  generatedAt: string;
  checkedAt: string;
  method: Record<string, string>;
  summary: Record<string, unknown>;
  sources: FixedSource[];
};

type SupplementSource = {
  sourceId: string;
  platform: string;
  category: string;
  market: 'ko' | 'global';
  sourceTitle: string;
  sourceUrl: string;
  provider: string;
  contentFormat: string;
  checkedAt: string;
  captureAsset?: string;
  accessNote: string;
};

type StrongEvidence = {
  evidenceId: string;
  sourceId: string;
  platform: string;
  category: string;
  sourceTitle: string;
  sourceUrl: string;
  evidenceUrl: string;
  checkedAt: string;
  evidenceLevel: Exclude<EvidenceLevel, 'E0' | 'E1'>;
  evidenceSignal: string;
  excerptKo: string;
  excerptOriginal?: string;
  userAddedInputs: string[];
  arrivalShape: string[];
  evidenceMode: string;
  confidence: 'high' | 'medium' | 'limited';
  interpretationKo: string;
  limitationKo: string;
};

const root = process.cwd();
const auditDirectory = path.join(root, 'docs', 'content-audit');
const assetDirectoryName =
  '2026-07-27-flowme-content-personal-adoption-evidence-assets';
const assetDirectory = path.join(auditDirectory, assetDirectoryName);
const fixedInputPath = path.join(
  root,
  'output',
  'research-tools',
  'youtube-public-reaction-sample.sanitized.json',
);
const p0InputPath = path.join(
  auditDirectory,
  '2026-07-22-flowme-vertical-service-content-coverage-atlas-ceo-ko-p0-portfolio.json',
);
const reportPath = path.join(
  auditDirectory,
  '2026-07-27-flowme-content-personal-adoption-evidence-ceo-ko.html',
);
const ledgerPath = path.join(
  auditDirectory,
  '2026-07-27-flowme-content-personal-adoption-evidence-ledger.json',
);
const samplePath = path.join(
  auditDirectory,
  '2026-07-27-flowme-public-reaction-sample.json',
);
const mapPath = path.join(
  auditDirectory,
  '2026-07-27-flowme-current-content-adoption-evidence-map.json',
);

const checkedAt = '2026-07-27';
const levels: EvidenceLevel[] = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5'];
const levelRank: Record<EvidenceLevel, number> = {
  E0: 0,
  E1: 1,
  E2: 2,
  E3: 3,
  E4: 4,
  E5: 5,
};
const levelMeta: Record<
  EvidenceLevel,
  { label: string; short: string; interpretation: string }
> = {
  E0: {
    label: '일반 반응',
    short: '좋다·고맙다',
    interpretation: '관심 신호일 뿐 실행 증거가 아니다.',
  },
  E1: {
    label: '실행 의향',
    short: '해볼 생각',
    interpretation: '계획은 있으나 실행은 확인되지 않았다.',
  },
  E2: {
    label: '결과물 수요',
    short: '표·파일·목록 요청',
    interpretation: '콘텐츠를 옮겨 쓸 형식이 필요하다는 구체적 신호다.',
  },
  E3: {
    label: '실행 중',
    short: '며칠째 진행',
    interpretation: '기간·진도·수정 내용이 있는 공개 자기보고다.',
  },
  E4: {
    label: '완료·결과',
    short: '직접 완료',
    interpretation: '완료, 결과 또는 실패가 구체적으로 언급됐다.',
  },
  E5: {
    label: '반복·재사용',
    short: '다시 사용',
    interpretation: '동일 콘텐츠를 반복하거나 변형·공유했다.',
  },
};

const fixedInput = JSON.parse(readFileSync(fixedInputPath, 'utf8')) as FixedInput;
const p0Input = JSON.parse(readFileSync(p0InputPath, 'utf8')) as {
  candidates: Array<{
    rank: number;
    contentId: string;
    contentTitle: string;
    sourceUrl: string;
    sourceProvider: string;
    serviceName: string;
    categoryId: string;
    category: string;
    flowType: string;
    status: string;
    risk: string;
  }>;
};

const manualFinalOverrides: Record<string, EvidenceLevel> = {
  'YT-EXE-01-R01': 'E0',
  'YT-EXE-01-R06': 'E0',
  'YT-EXE-02-R07': 'E0',
  'YT-FOD-01-R09': 'E0',
  'YT-FOD-02-R12': 'E0',
  'YT-FOD-03-R04': 'E0',
  'YT-HOB-02-R02': 'E0',
  'YT-HOB-02-R06': 'E0',
  'YT-HOB-02-R11': 'E0',
  'YT-HOM-01-R11': 'E0',
  'YT-HOM-02-R01': 'E0',
  'YT-HOM-02-R16': 'E0',
  'YT-HOM-02-R19': 'E0',
  'YT-HOM-02-R20': 'E0',
  'YT-LRN-01-R02': 'E0',
  'YT-LRN-02-R09': 'E0',
  'YT-LRN-03-R15': 'E0',
  'YT-LRN-04-R14': 'E0',
  'YT-TRV-02-R10': 'E0',
  'YT-TRV-02-R15': 'E0',
  'YT-TRV-04-R19': 'E0',
  'YT-FOD-03-R18': 'E1',
  'YT-EXE-04-R03': 'E1',
  'YT-LRN-01-R11': 'E1',
  'YT-LRN-02-R03': 'E1',
  'YT-FOD-04-R09': 'E1',
  'YT-PAR-01-R10': 'E1',
  'YT-EXE-01-R20': 'E5',
  'YT-EXE-03-R07': 'E5',
  'YT-EXE-03-R13': 'E5',
  'YT-EXE-03-R19': 'E5',
  'YT-EXE-04-R13': 'E5',
  'YT-TRV-02-R13': 'E5',
  'YT-LRN-02-R17': 'E2',
  'YT-LRN-04-R09': 'E2',
  'YT-HOB-03-R17': 'E4',
  'YT-TRV-03-R18': 'E2',
};

const weakRereadIds = [
  'YT-EXE-01-R02',
  'YT-EXE-02-R06',
  'YT-EXE-03-R12',
  'YT-FOD-01-R01',
  'YT-FOD-02-R03',
  'YT-FOD-03-R06',
  'YT-FOD-04-R08',
  'YT-HOB-01-R09',
  'YT-HOB-02-R16',
  'YT-HOB-03-R17',
  'YT-HOB-04-R19',
  'YT-HOM-02-R03',
  'YT-HOM-03-R09',
  'YT-HOM-04-R09',
  'YT-LRN-01-R13',
  'YT-LRN-02-R20',
  'YT-LRN-04-R02',
  'YT-PAR-01-R05',
  'YT-PAR-02-R09',
  'YT-PAR-03-R09',
  'YT-PAR-04-R10',
  'YT-TRV-01-R11',
  'YT-TRV-02-R16',
  'YT-TRV-03-R18',
  'YT-TRV-04-R20',
];

const passDisagreements: Record<
  string,
  { pass1: EvidenceLevel; pass2: EvidenceLevel; final: EvidenceLevel }
> = {
  'YT-FOD-04-R09': { pass1: 'E3', pass2: 'E1', final: 'E1' },
  'YT-PAR-01-R10': { pass1: 'E3', pass2: 'E1', final: 'E1' },
};

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const value = key(item);
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function percentage(value: number, denominator: number): number {
  return denominator ? Math.round((value / denominator) * 1000) / 10 : 0;
}

function normalizeUrl(value?: string): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    url.hash = '';
    url.hostname = url.hostname.replace(/^www\./, '').toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim().replace(/\/+$/, '');
  }
}

function arrivalFromText(text: string, category: string): string[] {
  const values = new Set<string>();
  if (/엑셀|스프레드|spreadsheet|식단표|planner|tracker|표\b/iu.test(text)) {
    values.add('표');
  }
  if (/캘린더|calendar|일정|schedule|날짜|date|여행/iu.test(text)) {
    values.add('캘린더');
  }
  if (/체크|checklist|준비물|packing|단계|step/iu.test(text)) {
    values.add('체크리스트');
  }
  if (/루틴|routine|day\s*\d+|\d+일차|매일|매주|challenge|챌린지/iu.test(text)) {
    values.add('루틴');
  }
  if (/레시피|recipe|메모|note/iu.test(text)) values.add('메모');
  if (/가족|family|함께|역할/iu.test(text)) values.add('협업');
  if (/만들|made|수리|repair|프로젝트|project/iu.test(text)) values.add('프로젝트');

  if (!values.size) {
    if (category === '운동·습관·챌린지') values.add('루틴');
    else if (category === '요리·식단') values.add('메모');
    else if (category === '여행·외출') values.add('체크리스트');
    else if (category === '취미·만들기·프로젝트') values.add('프로젝트');
    else values.add('체크리스트');
  }
  return [...values];
}

function personalSignals(text: string): string[] {
  const values = new Set<string>();
  if (/day\s*\d+|\d+일차|\d+\/\d+|today|오늘|started|시작/iu.test(text)) {
    values.add('날짜·진도');
  }
  if (/kg|cm|inch|weight|몸무게|허리/iu.test(text)) values.add('개인 측정값');
  if (/아이|child|toddler|son|daughter|가족|family/iu.test(text)) {
    values.add('가족 구성');
  }
  if (/바꿨|줄였|늘렸|modified|instead|without|대신|조정/iu.test(text)) {
    values.add('개인 수정');
  }
  if (/준비물|mat|이불|sock|재료|ingredient|도구/iu.test(text)) {
    values.add('보유 준비물');
  }
  return [...values];
}

const fixedSources = fixedInput.sources;
const allFixedReactions = fixedSources.flatMap((source) =>
  source.reactions.map((reaction) => ({ source, reaction })),
);
const automaticStrongIds = allFixedReactions
  .filter(({ reaction }) => levelRank[reaction.evidenceLevel] >= 2)
  .map(({ reaction }) => reaction.reactionId);
const rereadIds = new Set([...automaticStrongIds, ...weakRereadIds]);

const reviewedReactions = allFixedReactions.map(({ source, reaction }) => {
  const finalLevel =
    manualFinalOverrides[reaction.reactionId] ?? reaction.evidenceLevel;
  const disagreement = passDisagreements[reaction.reactionId];
  const reviewed = rereadIds.has(reaction.reactionId);
  return {
    ...reaction,
    sourceId: source.sourceId,
    platform: source.platform,
    category: source.category,
    sourceTitle: source.sourceTitle,
    sourceUrl: source.sourceUrl,
    automaticLevel: reaction.evidenceLevel,
    finalLevel,
    reread: reviewed,
    pass1: reviewed ? disagreement?.pass1 ?? finalLevel : null,
    pass2: reviewed ? disagreement?.pass2 ?? finalLevel : null,
    adjudication: disagreement ? '두 판정이 달라 낮은 단계로 보수적 확정' : null,
    interpretationKo: levelMeta[finalLevel].interpretation,
    userAddedInputs: personalSignals(reaction.excerpt),
    arrivalShape: arrivalFromText(reaction.excerpt, source.category),
  };
});

const reviewedSubset = reviewedReactions.filter((reaction) => reaction.reread);
const agreementCount = reviewedSubset.filter(
  (reaction) => reaction.pass1 === reaction.pass2,
).length;
const fixedLevelCounts = Object.fromEntries(
  levels.map((level) => [
    level,
    reviewedReactions.filter((reaction) => reaction.finalLevel === level).length,
  ]),
) as Record<EvidenceLevel, number>;

const categoryComparison = [...new Set(fixedSources.map((source) => source.category))]
  .map((category) => {
    const sources = fixedSources.filter((source) => source.category === category);
    const reactions = reviewedReactions.filter(
      (reaction) => reaction.category === category,
    );
    const e2Plus = reactions.filter(
      (reaction) => levelRank[reaction.finalLevel] >= 2,
    ).length;
    const e3Plus = reactions.filter(
      (reaction) => levelRank[reaction.finalLevel] >= 3,
    ).length;
    const e4Plus = reactions.filter(
      (reaction) => levelRank[reaction.finalLevel] >= 4,
    ).length;
    const sourceIdsWithE3 = new Set(
      reactions
        .filter((reaction) => levelRank[reaction.finalLevel] >= 3)
        .map((reaction) => reaction.sourceId),
    );
    return {
      category,
      sourceCount: sources.length,
      reactionCount: reactions.length,
      levelCounts: Object.fromEntries(
        levels.map((level) => [
          level,
          reactions.filter((reaction) => reaction.finalLevel === level).length,
        ]),
      ),
      e2Plus,
      e3Plus,
      e4Plus,
      e2PlusRate: percentage(e2Plus, reactions.length),
      e3PlusRate: percentage(e3Plus, reactions.length),
      e4PlusRate: percentage(e4Plus, reactions.length),
      sourceWithE3Rate: percentage(sourceIdsWithE3.size, sources.length),
      note:
        '동일한 YouTube 상위 댓글 방식으로 수집한 고정 표본 안의 비율이다. 전체 시청자 전환율이 아니다.',
    };
  })
  .sort((a, b) => b.e3PlusRate - a.e3PlusRate);

const fixedStrongEvidence: StrongEvidence[] = reviewedReactions
  .filter((reaction) => levelRank[reaction.finalLevel] >= 2)
  .map((reaction) => ({
    evidenceId: reaction.reactionId,
    sourceId: reaction.sourceId,
    platform: reaction.platform,
    category: reaction.category,
    sourceTitle: reaction.sourceTitle,
    sourceUrl: reaction.sourceUrl,
    evidenceUrl: reaction.permalink,
    checkedAt,
    evidenceLevel: reaction.finalLevel as StrongEvidence['evidenceLevel'],
    evidenceSignal: levelMeta[reaction.finalLevel].label,
    excerptKo: reaction.excerpt,
    userAddedInputs: reaction.userAddedInputs,
    arrivalShape: reaction.arrivalShape,
    evidenceMode: '비교용 고정 표본의 공개 상위 댓글',
    confidence: 'medium',
    interpretationKo: levelMeta[reaction.finalLevel].interpretation,
    limitationKo:
      '공개 자기보고이며 실제 행동을 직접 관찰하지 않았다. 댓글 작성자와 전체 시청자의 차이도 알 수 없다.',
  }));

const supplementSources: SupplementSource[] = [
  {
    sourceId: 'SUP-REC-01',
    platform: '만개의레시피',
    category: '요리·식단',
    market: 'ko',
    sourceTitle: '야채 참치 볶음',
    sourceUrl: 'https://www.10000recipe.com/recipe/6865737',
    provider: '공개 레시피 제작자',
    contentFormat: '레시피·조리 후기',
    checkedAt,
    captureAsset: 'source-10000recipe-tuna.png',
    accessNote: '로그인 없이 레시피와 공개 후기를 확인',
  },
  {
    sourceId: 'SUP-REC-02',
    platform: '만개의레시피',
    category: '요리·식단',
    market: 'ko',
    sourceTitle: '닭볶음탕 황금레시피',
    sourceUrl: 'https://www.10000recipe.com/recipe/6876357',
    provider: '공개 레시피 제작자',
    contentFormat: '레시피·조리 후기',
    checkedAt,
    captureAsset: 'source-10000recipe-chicken.png',
    accessNote: '로그인 없이 레시피와 공개 후기를 확인',
  },
  {
    sourceId: 'SUP-REC-03',
    platform: '만개의레시피',
    category: '요리·식단',
    market: 'ko',
    sourceTitle: '소고기 미역국 끓이는 법',
    sourceUrl: 'https://www.10000recipe.com/recipe/6873683',
    provider: '공개 레시피 제작자',
    contentFormat: '레시피·조리 후기',
    checkedAt,
    accessNote: '로그인 없이 레시피와 공개 후기를 확인',
  },
  {
    sourceId: 'SUP-REC-04',
    platform: '만개의레시피',
    category: '요리·식단',
    market: 'ko',
    sourceTitle: '열무물김치 담는 법',
    sourceUrl: 'https://www.10000recipe.com/recipe/6934861',
    provider: '공개 레시피 제작자',
    contentFormat: '레시피·조리 후기',
    checkedAt,
    accessNote: '로그인 없이 레시피와 공개 후기를 확인',
  },
  {
    sourceId: 'SUP-INS-01',
    platform: 'Instructables',
    category: '취미·만들기·프로젝트',
    market: 'global',
    sourceTitle: 'How to Make Slime Without Borax',
    sourceUrl: 'https://www.instructables.com/How-to-Make-Slime-Without-Borax/',
    provider: 'Instructables 제작자',
    contentFormat: '단계형 만들기 가이드',
    checkedAt,
    captureAsset: 'source-instructables-slime.png',
    accessNote: '공개 페이지의 People Made This Project 수를 확인',
  },
  {
    sourceId: 'SUP-INS-02',
    platform: 'Instructables',
    category: '취미·만들기·프로젝트',
    market: 'global',
    sourceTitle: 'Sewing the Whip Stitch',
    sourceUrl: 'https://www.instructables.com/Sewing-Whip-Stitch-Coasters/',
    provider: 'Instructables 제작자',
    contentFormat: '단계형 만들기 가이드',
    checkedAt,
    captureAsset: 'source-instructables-coaster.png',
    accessNote: '공개 페이지의 People Made This Project 수를 확인',
  },
  {
    sourceId: 'SUP-INS-03',
    platform: 'Instructables',
    category: '취미·만들기·프로젝트',
    market: 'global',
    sourceTitle: 'Origami Single-sheet Cube',
    sourceUrl:
      'https://www.instructables.com/How-to-make-an-Origami-single-sheet-cube/',
    provider: 'Instructables 제작자',
    contentFormat: '단계형 만들기 가이드',
    checkedAt,
    accessNote: '공개 페이지의 People Made This Project 수를 확인',
  },
  {
    sourceId: 'SUP-INS-04',
    platform: 'Instructables',
    category: '취미·만들기·프로젝트',
    market: 'global',
    sourceTitle: 'Pop Up Skyline Card',
    sourceUrl: 'https://www.instructables.com/Pop-Up-Skyline-Card/',
    provider: 'Instructables 제작자',
    contentFormat: '단계형 만들기 가이드',
    checkedAt,
    accessNote: '공개 페이지의 People Made This Project 수를 확인',
  },
  {
    sourceId: 'SUP-IFX-01',
    platform: 'iFixit',
    category: '취미·만들기·프로젝트',
    market: 'global',
    sourceTitle: 'iPhone 4S Battery Replacement',
    sourceUrl: 'https://www.ifixit.com/Guide/iPhone+4S+Battery+Replacement/7111',
    provider: 'iFixit 편집 가이드',
    contentFormat: '단계형 수리 가이드',
    checkedAt,
    accessNote: '공개 페이지의 completed this guide 수를 확인',
  },
  {
    sourceId: 'SUP-IFX-02',
    platform: 'iFixit',
    category: '취미·만들기·프로젝트',
    market: 'global',
    sourceTitle: 'iPhone 12 Battery Replacement',
    sourceUrl:
      'https://www.ifixit.com/Guide/iPhone+12+Battery+Replacement/140588',
    provider: 'iFixit 편집 가이드',
    contentFormat: '단계형 수리 가이드',
    checkedAt,
    captureAsset: 'source-ifixit-iphone12.png',
    accessNote: '공개 페이지의 completed this guide 수를 확인',
  },
  {
    sourceId: 'SUP-IFX-03',
    platform: 'iFixit',
    category: '취미·만들기·프로젝트',
    market: 'global',
    sourceTitle: 'How to Repair a Tear Inside a Backpack',
    sourceUrl:
      'https://www.ifixit.com/Guide/How+to+Repair+a+Tear+Inside+a+Backpack/53528',
    provider: 'iFixit 커뮤니티 가이드',
    contentFormat: '단계형 수리 가이드',
    checkedAt,
    accessNote: '공개 페이지의 completed this guide 수를 확인',
  },
  {
    sourceId: 'SUP-IFX-04',
    platform: 'iFixit',
    category: '취미·만들기·프로젝트',
    market: 'global',
    sourceTitle: 'How to Lubricate a Zipper',
    sourceUrl: 'https://www.ifixit.com/Guide/How+to+Lubricate+a+Zipper/19450',
    provider: 'iFixit 커뮤니티 가이드',
    contentFormat: '단계형 수리 가이드',
    checkedAt,
    accessNote: '공개 페이지의 completed this guide 수를 확인',
  },
  {
    sourceId: 'SUP-IG-01',
    platform: 'Instagram',
    category: '육아·가족',
    market: 'ko',
    sourceTitle: '수정 가능한 초기 이유식 식단표',
    sourceUrl: 'https://www.instagram.com/p/DX6-viaj3eV/',
    provider: '육아 콘텐츠 제작자',
    contentFormat: '게시물·댓글·엑셀 안내',
    checkedAt,
    captureAsset: 'evidence-instagram-mealplan-anonymized.png',
    accessNote: '로그인 유도 화면이 있으나 공개 게시물과 일부 댓글을 확인',
  },
  {
    sourceId: 'SUP-IG-02',
    platform: 'Instagram',
    category: '육아·가족',
    market: 'ko',
    sourceTitle: '예비 초등학교 입학 체크리스트',
    sourceUrl: 'https://www.instagram.com/p/DSPsMRwj1eC/',
    provider: '초등 학습·정서 콘텐츠 제작자',
    contentFormat: '게시물·댓글·파일 DM 안내',
    checkedAt,
    captureAsset: 'evidence-instagram-school-checklist-anonymized.png',
    accessNote: '로그인 유도 화면이 있으나 공개 게시물과 일부 댓글을 확인',
  },
  {
    sourceId: 'SUP-THR-01',
    platform: 'Threads',
    category: '육아·가족',
    market: 'ko',
    sourceTitle: '돌잔치 준비 체크리스트 엑셀',
    sourceUrl: 'https://www.threads.com/@momentree.kr/post/DXJWpX8Dyrs',
    provider: '가족행사 콘텐츠 제작자',
    contentFormat: '게시물·답글·파일 DM 안내',
    checkedAt,
    captureAsset: 'evidence-threads-checklist-anonymized.png',
    accessNote: '로그인 없이 공개 스레드와 답글을 확인',
  },
  {
    sourceId: 'SUP-WAC-01',
    platform: '와캠퍼스',
    category: '학습·커리어',
    market: 'ko',
    sourceTitle: '실무 강의 수강 후기 모음',
    sourceUrl: 'https://v2.wacampus.kr/community/reviews',
    provider: '와캠퍼스 수강생 공개 후기',
    contentFormat: '강의 후기·업무 적용·엑셀 요청',
    checkedAt,
    accessNote: '로그인 없이 공개 후기와 페이지별 과목명을 확인',
  },
];

function evidence(
  sourceId: string,
  suffix: string,
  level: StrongEvidence['evidenceLevel'],
  excerptKo: string,
  options: Partial<StrongEvidence> = {},
): StrongEvidence {
  const source = supplementSources.find((item) => item.sourceId === sourceId);
  if (!source) throw new Error(`Unknown supplement source: ${sourceId}`);
  return {
    evidenceId: `${sourceId}-${suffix}`,
    sourceId,
    platform: source.platform,
    category: source.category,
    sourceTitle: source.sourceTitle,
    sourceUrl: source.sourceUrl,
    evidenceUrl: source.sourceUrl,
    checkedAt,
    evidenceLevel: level,
    evidenceSignal: levelMeta[level].label,
    excerptKo,
    userAddedInputs: [],
    arrivalShape: ['체크리스트'],
    evidenceMode: '강한 사례 탐색 표본의 공개 후기·플랫폼 완료 신호',
    confidence: 'medium',
    interpretationKo: levelMeta[level].interpretation,
    limitationKo:
      '공개 자기보고 또는 플랫폼의 자기신고형 완료 수다. 실제 행동을 FlowMe가 관찰한 결과가 아니다.',
    ...options,
  };
}

const supplementEvidence: StrongEvidence[] = [
  evidence(
    'SUP-REC-01',
    'E01',
    'E5',
    '남은 채소와 참치 양을 바꿔 만들었고, 다시 해 먹을 메뉴라고 남겼다.',
    { userAddedInputs: ['보유 재료', '재료 양'], arrivalShape: ['메모', '체크리스트'] },
  ),
  evidence(
    'SUP-REC-01',
    'E02',
    'E4',
    '어린 자녀가 먹을 수 있게 매운 양념을 줄인 뒤 한 끼를 완성했다.',
    { userAddedInputs: ['자녀 연령', '매운맛 조정'], arrivalShape: ['메모'] },
  ),
  evidence(
    'SUP-REC-01',
    'E03',
    'E5',
    '간단히 따라 한 뒤 한 끼를 해결했고 자주 다시 만들겠다고 했다.',
    { arrivalShape: ['메모', '체크리스트'] },
  ),
  evidence(
    'SUP-REC-01',
    'E04',
    'E4',
    '아이용과 어른용 반찬을 조리 중간에 나눠 한 번에 만들었다.',
    { userAddedInputs: ['먹는 사람', '양념 분기'], arrivalShape: ['메모'] },
  ),
  evidence(
    'SUP-REC-02',
    'E01',
    'E5',
    '같은 레시피로 대여섯 번 만들고 간장 양을 줄인 방식으로 정착했다.',
    { userAddedInputs: ['간장 양'], arrivalShape: ['메모'] },
  ),
  evidence(
    'SUP-REC-02',
    'E02',
    'E5',
    '몇 년째 이 레시피를 기준으로 닭볶음탕을 만들고 있다고 했다.',
    { arrivalShape: ['메모'] },
  ),
  evidence(
    'SUP-REC-02',
    'E03',
    'E5',
    '세 번째로 만들었고 가족 반응이 좋았다고 남겼다.',
    { userAddedInputs: ['가족 반응'], arrivalShape: ['메모'] },
  ),
  evidence(
    'SUP-REC-02',
    'E04',
    'E4',
    '레시피 순서를 따라 완성했고 결과가 안정적이었다고 설명했다.',
    { arrivalShape: ['체크리스트', '메모'] },
  ),
  evidence(
    'SUP-REC-03',
    'E01',
    'E5',
    '가족 생일 두 번에 같은 미역국 레시피를 사용해 모두 완성했다.',
    { userAddedInputs: ['가족 생일'], arrivalShape: ['캘린더', '메모'] },
  ),
  evidence(
    'SUP-REC-03',
    'E02',
    'E5',
    '같은 레시피를 수십 번 사용했다고 남겼다.',
    { arrivalShape: ['메모'] },
  ),
  evidence(
    'SUP-REC-03',
    'E03',
    'E4',
    '배우자 생일에 처음 끓였고 한 번에 완성했다고 했다.',
    { userAddedInputs: ['가족 생일'], arrivalShape: ['캘린더', '메모'] },
  ),
  evidence(
    'SUP-REC-03',
    'E04',
    'E5',
    '다음 생일에도 쓰려고 원문을 다시 찾아왔다고 했다.',
    { userAddedInputs: ['다음 생일'], arrivalShape: ['캘린더', '메모'] },
  ),
  evidence(
    'SUP-REC-04',
    'E01',
    'E4',
    '처음 레시피를 보고 열무물김치를 담가 가족 식사에 사용했다.',
    { userAddedInputs: ['가족 식사'], arrivalShape: ['메모', '체크리스트'] },
  ),
  evidence('SUP-REC-04', 'E02', 'E5', '벌써 세 번째 만들어 먹었다고 남겼다.', {
    arrivalShape: ['메모'],
  }),
  evidence(
    'SUP-REC-04',
    'E03',
    'E4',
    '레시피 순서를 따라 직접 완성할 수 있었다고 했다.',
    { arrivalShape: ['체크리스트'] },
  ),
  evidence(
    'SUP-REC-04',
    'E04',
    'E5',
    '여름 반찬과 국수에 반복해서 활용했다고 했다.',
    { userAddedInputs: ['활용 메뉴'], arrivalShape: ['메모'] },
  ),
  evidence('SUP-INS-01', 'E01', 'E4', '126명이 이 프로젝트를 만들었다고 표시된다.', {
    arrivalShape: ['프로젝트', '체크리스트'],
    evidenceMode: '플랫폼의 People Made This Project 누적 자기신고 수',
    confidence: 'high',
  }),
  evidence('SUP-INS-02', 'E01', 'E4', '10명이 이 프로젝트를 만들었다고 표시된다.', {
    arrivalShape: ['프로젝트', '체크리스트'],
    evidenceMode: '플랫폼의 People Made This Project 누적 자기신고 수',
    confidence: 'high',
  }),
  evidence('SUP-INS-03', 'E01', 'E4', '6명이 이 프로젝트를 만들었다고 표시된다.', {
    arrivalShape: ['프로젝트', '체크리스트'],
    evidenceMode: '플랫폼의 People Made This Project 누적 자기신고 수',
    confidence: 'high',
  }),
  evidence('SUP-INS-04', 'E01', 'E4', '4명이 이 프로젝트를 만들었다고 표시된다.', {
    arrivalShape: ['프로젝트', '체크리스트'],
    evidenceMode: '플랫폼의 People Made This Project 누적 자기신고 수',
    confidence: 'high',
  }),
  evidence('SUP-IFX-01', 'E01', 'E4', '4,094명이 이 수리 안내서를 완료했다고 표시된다.', {
    arrivalShape: ['프로젝트', '체크리스트'],
    evidenceMode: '플랫폼의 I did it 누적 자기신고 수',
    confidence: 'high',
  }),
  evidence('SUP-IFX-02', 'E01', 'E4', '135명이 이 수리 안내서를 완료했다고 표시된다.', {
    arrivalShape: ['프로젝트', '체크리스트'],
    evidenceMode: '플랫폼의 I did it 누적 자기신고 수',
    confidence: 'high',
  }),
  evidence('SUP-IFX-03', 'E01', 'E4', '3명이 이 수리 안내서를 완료했다고 표시된다.', {
    arrivalShape: ['프로젝트', '체크리스트'],
    evidenceMode: '플랫폼의 I did it 누적 자기신고 수',
    confidence: 'high',
  }),
  evidence('SUP-IFX-04', 'E01', 'E4', '6명이 이 수리 안내서를 완료했다고 표시된다.', {
    arrivalShape: ['프로젝트', '체크리스트'],
    evidenceMode: '플랫폼의 I did it 누적 자기신고 수',
    confidence: 'high',
  }),
  evidence(
    'SUP-IG-01',
    'E01',
    'E2',
    '게시된 식단표를 그대로 따라 쓰고 싶다며 입자감과 단계 전환을 물었다.',
    {
      userAddedInputs: ['자녀 단계', '입자감'],
      arrivalShape: ['표', '메모'],
      evidenceMode: '공개 댓글',
    },
  ),
  evidence(
    'SUP-IG-01',
    'E02',
    'E2',
    '현재 식단표가 끝난 뒤 사용할 다음 단계 식단표도 공유해 달라고 요청했다.',
    { userAddedInputs: ['다음 단계'], arrivalShape: ['표'], evidenceMode: '공개 댓글' },
  ),
  evidence(
    'SUP-IG-02',
    'E01',
    'E2',
    '아이 이름을 넣어 출력할 수 있는 입학 준비 체크리스트를 받고 싶다고 했다.',
    {
      userAddedInputs: ['아이 이름'],
      arrivalShape: ['체크리스트'],
      evidenceMode: '공개 댓글',
    },
  ),
  evidence('SUP-IG-02', 'E02', 'E2', '출력용 체크리스트 공유를 직접 요청했다.', {
    arrivalShape: ['체크리스트'],
    evidenceMode: '공개 댓글',
  }),
  evidence('SUP-THR-01', 'E01', 'E2', '돌잔치 준비 엑셀 다운로드 링크 공유를 요청했다.', {
    arrivalShape: ['표', '체크리스트'],
    evidenceMode: '공개 답글',
  }),
  evidence(
    'SUP-THR-01',
    'E02',
    'E2',
    '전에 받은 링크가 사라져 같은 체크리스트를 다시 보내 달라고 요청했다.',
    { arrivalShape: ['표', '체크리스트'], evidenceMode: '공개 답글' },
  ),
  evidence(
    'SUP-WAC-01',
    'E01',
    'E2',
    '후기를 남긴 뒤 약속된 엑셀 양식이 보이지 않는다며 재요청했다.',
    {
      arrivalShape: ['표'],
      evidenceMode: '공개 수강 후기',
      evidenceUrl:
        'https://v2.wacampus.kr/story/reviews?pg=1&sort_review_id=desc',
    },
  ),
  evidence(
    'SUP-WAC-01',
    'E02',
    'E4',
    '월별 업무 순서를 적용해 실제 업무에 도움이 됐고 야근이 줄었다고 했다.',
    {
      userAddedInputs: ['월별 업무'],
      arrivalShape: ['캘린더', '체크리스트'],
      evidenceMode: '공개 수강 후기',
      evidenceUrl: 'https://v2.wacampus.kr/community/reviews?course_id=81',
    },
  ),
  evidence(
    'SUP-WAC-01',
    'E03',
    'E5',
    '같은 실무 강의를 두세 번째 반복 중이며 다시 시험에 도전하겠다고 했다.',
    {
      userAddedInputs: ['반복 횟수'],
      arrivalShape: ['루틴', '체크리스트'],
      evidenceMode: '공개 수강 후기',
      evidenceUrl:
        'https://v2.wacampus.kr/community/reviews?course_id=&sort_review_id=desc',
    },
  ),
];

const strongEvidence = [...fixedStrongEvidence, ...supplementEvidence];
const allSourceCount = fixedSources.length + supplementSources.length;
const platformCount = new Set([
  ...fixedSources.map((source) => source.platform),
  ...supplementSources.map((source) => source.platform),
]).size;
const totalE2Plus = strongEvidence.length;
const totalE3Plus = strongEvidence.filter(
  (item) => levelRank[item.evidenceLevel] >= 3,
).length;
const fixedE2Plus = fixedStrongEvidence.length;
const fixedE3Plus = fixedStrongEvidence.filter(
  (item) => levelRank[item.evidenceLevel] >= 3,
).length;
const strongestCategory = categoryComparison[0];

function canonicalCategory(input: {
  category?: string;
  categoryId?: string;
  title?: string;
  sourceUrl?: string;
}): string {
  const text = `${input.category ?? ''} ${input.categoryId ?? ''} ${
    input.title ?? ''
  } ${input.sourceUrl ?? ''}`.toLowerCase();
  if (/family_parenting|육아|영유아|아이|어린이집|출산|가족|baby|parent/.test(text)) {
    return '육아·가족';
  }
  if (/food|meal|요리|식단|레시피|이유식|김치|냉장고 파먹기/.test(text)) {
    return '요리·식단';
  }
  if (/exercise|운동|달리|스쿼트|플랭크|fitness|routine/.test(text)) {
    return '운동·습관·챌린지';
  }
  if (/learning|career|학습|강의|면접|입사|포트폴리오|프로그래밍|k-mooc/.test(text)) {
    return '학습·커리어';
  }
  if (/travel|여행|외출|공주|e-?sim|캠핑|박물관|여권|trail/.test(text)) {
    return '여행·외출';
  }
  if (/home|집|정리|청소|옷장|이사|생활관리/.test(text)) {
    return '집·정리·생활관리';
  }
  if (/hobby|craft|취미|만들기|미술|수리|창작|프로젝트/.test(text)) {
    return '취미·만들기·프로젝트';
  }
  return '공식·기타';
}

const strongSourceUrls = new Set(
  strongEvidence.map((item) => normalizeUrl(item.sourceUrl)),
);
const strongHosts = new Set(
  strongEvidence.map((item) => {
    try {
      return new URL(item.sourceUrl).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }),
);
const strongCategoryCounts = countBy(strongEvidence, (item) => item.category);

function mapEvidenceStatus(input: {
  sourceUrl?: string;
  category: string;
  risk?: string;
  sourceProvider?: string;
}): {
  status: EvidenceStatus;
  label: string;
  reason: string;
  action: string;
} {
  const normalized = normalizeUrl(input.sourceUrl);
  if (!normalized) {
    return {
      status: 'access_limited',
      label: '판단 불가',
      reason: '연결할 원본 URL이 없거나 현재 항목에 기록되지 않았다.',
      action: '원본을 먼저 확정한 뒤 공개 반응과 도착 형태를 확인',
    };
  }
  if (strongSourceUrls.has(normalized)) {
    return {
      status: 'direct',
      label: '직접 적용 증거 있음',
      reason: '동일 원본에서 E2 이상 공개 반응 또는 플랫폼 완료 신호를 확인했다.',
      action: '대표 Flow로 보강하고 실제 FlowMe 관찰 세션에서 검증',
    };
  }

  const official =
    /official|공식|정부|공단|외교부|gov|go\.kr|nps|kotsa|passport/iu.test(
      `${input.sourceProvider ?? ''} ${input.sourceUrl} ${input.category}`,
    ) ||
    input.risk === 'medical_sensitive' ||
    input.risk === 'financial_sensitive' ||
    input.category === '공식·기타';
  if (official) {
    return {
      status: 'none',
      label: '공개 증거를 확인하지 못함',
      reason:
        '공식 절차형은 댓글이 적거나 행동이 외부 사이트에서 끝난다. 공개 댓글과 별개로 정확성·기한·공익성을 평가해야 한다.',
      action: '공식 필수형으로 분리하고 실제 사용자 과업 세션으로 검증',
    };
  }

  let host = '';
  try {
    host = new URL(input.sourceUrl ?? '').hostname.replace(/^www\./, '');
  } catch {
    host = '';
  }
  if (strongHosts.has(host) || (strongCategoryCounts[input.category] ?? 0) > 0) {
    return {
      status: 'adjacent',
      label: '같은 유형의 인접 증거 있음',
      reason:
        '같은 플랫폼 또는 같은 실행 유형에서 적용·완료·결과물 요청 신호를 확인했지만 이 원본 자체를 검증한 것은 아니다.',
      action: '인접 신호를 선별 기준으로만 쓰고 원본별 소규모 관찰 검증',
    };
  }

  return {
    status: 'none',
    label: '공개 증거를 확인하지 못함',
    reason: '이번 공개 조사 범위에서 연결 가능한 적용 신호를 찾지 못했다.',
    action: '전략 가설형으로 표시하고 우선순위를 낮추거나 추가 조사',
  };
}

const p0EvidenceMap = p0Input.candidates.map((candidate) => {
  const category = canonicalCategory({
    category: candidate.category,
    categoryId: candidate.categoryId,
    title: candidate.contentTitle,
    sourceUrl: candidate.sourceUrl,
  });
  const assessment = mapEvidenceStatus({
    sourceUrl: candidate.sourceUrl,
    category,
    risk: candidate.risk,
    sourceProvider: candidate.sourceProvider,
  });
  return {
    rank: candidate.rank,
    contentId: candidate.contentId,
    title: candidate.contentTitle,
    sourceUrl: candidate.sourceUrl,
    category,
    flowType: candidate.flowType,
    priorStatus: candidate.status,
    priorRisk: candidate.risk,
    evidenceStatus: assessment.status,
    evidenceStatusLabel: assessment.label,
    evidenceReason: assessment.reason,
    recommendedAction: assessment.action,
  };
});

const currentEligibleBundles = seedBundles
  .map((bundle) => ({ bundle, review: reviewContentInventory(bundle) }))
  .filter(({ review }) => review.publicHandling === 'representative_eligible');

const currentEvidenceMap = currentEligibleBundles.map(({ bundle, review }) => {
  const category = canonicalCategory({
    category: bundle.flow.category,
    title: bundle.flow.title,
    sourceUrl: bundle.flow.source_url,
  });
  const assessment = mapEvidenceStatus({
    sourceUrl: bundle.flow.source_url,
    category,
    risk: bundle.flow.risk_level,
    sourceProvider: bundle.flow.source_title,
  });
  return {
    slug: bundle.flow.slug,
    title: bundle.flow.title,
    originalCategory: bundle.flow.category,
    category,
    sourceTitle: bundle.flow.source_title ?? null,
    sourceUrl: bundle.flow.source_url ?? null,
    sourceStatus: bundle.flow.source_status ?? null,
    sourcePrecision: bundle.flow.source_precision ?? null,
    primaryDestination: bundle.flow.primary_destination ?? null,
    structureType: bundle.flow.structure_type,
    riskLevel: bundle.flow.risk_level ?? 'low',
    itemCount: bundle.items.length,
    inventoryScore: review.score,
    evidenceStatus: assessment.status,
    evidenceStatusLabel: assessment.label,
    evidenceReason: assessment.reason,
    recommendedAction: assessment.action,
  };
});

const mappingSummary = {
  p0: {
    total: p0EvidenceMap.length,
    byStatus: countBy(p0EvidenceMap, (item) => item.evidenceStatus),
  },
  currentRepresentativeEligible: {
    total: currentEvidenceMap.length,
    byStatus: countBy(currentEvidenceMap, (item) => item.evidenceStatus),
  },
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(fixedSources.length === 28, `Expected 28 fixed sources, got ${fixedSources.length}`);
assert(
  reviewedReactions.length === 560,
  `Expected 560 fixed reactions, got ${reviewedReactions.length}`,
);
assert(rereadIds.size === 84, `Expected 84 reread reactions, got ${rereadIds.size}`);
assert(
  reviewedSubset.length === 84,
  `Expected 84 reviewed records, got ${reviewedSubset.length}`,
);
assert(allSourceCount >= 40, `Expected at least 40 sources, got ${allSourceCount}`);
assert(platformCount >= 4, `Expected at least 4 platforms, got ${platformCount}`);
assert(categoryComparison.length === 7, 'Expected exactly 7 fixed-sample categories');
assert(p0EvidenceMap.length === 24, `Expected 24 P0 candidates, got ${p0EvidenceMap.length}`);
assert(
  currentEvidenceMap.length === 44,
  `Expected 44 representative-eligible flows, got ${currentEvidenceMap.length}`,
);

const publicReactionSample = {
  schemaVersion: 'flowme-public-reaction-sample-v1',
  generatedAt: new Date().toISOString(),
  checkedAt,
  status: 'public_self_report_proxy_not_flowme_user_validation',
  methodology: {
    fixedSample:
      '7개 카테고리별 YouTube 4개 원본, 원본마다 상위 정렬의 공개 최상위 댓글 20개를 동일 방식으로 확인',
    sourceCount: fixedSources.length,
    reactionCount: reviewedReactions.length,
    sort: 'YouTube top comments',
    inclusion: '최상위 댓글, 업로더 댓글 제외, 공개 반응',
    exclusion: '답글, 비공개 반응, 사용자 식별자',
    interpretation:
      '고정 표본의 비율은 표본 댓글 안의 신호 분포다. 전체 시청자나 전체 사용자의 전환율이 아니다.',
  },
  qualityControl: {
    rereadRule:
      '자동으로 E2~E5가 붙은 59건 전수와 E0~E1의 간격 표본 25건을 두 차례 판정',
    rereadCount: reviewedSubset.length,
    rereadRate: percentage(reviewedSubset.length, reviewedReactions.length),
    agreementCount,
    agreementRate: percentage(agreementCount, reviewedSubset.length),
    disagreements: Object.entries(passDisagreements).map(([reactionId, value]) => ({
      reactionId,
      ...value,
      resolution: '더 낮은 단계로 보수적 확정',
    })),
    limitation:
      '수작업 재판정은 분류 일관성을 점검한 것이며 별도 연구자 간 신뢰도 연구가 아니다.',
  },
  summary: {
    levelCounts: fixedLevelCounts,
    e2Plus: fixedE2Plus,
    e3Plus: fixedE3Plus,
    strongestCategoryByFixedE3Rate: strongestCategory.category,
  },
  categoryComparison,
  sources: fixedSources.map((source) => ({
    ...source,
    channel: source.channel ?? null,
    reactions: reviewedReactions
      .filter((reaction) => reaction.sourceId === source.sourceId)
      .map((reaction) => ({
        reactionId: reaction.reactionId,
        permalink: reaction.permalink,
        observedDate: reaction.observedDate ?? null,
        excerpt: reaction.excerpt,
        automaticLevel: reaction.automaticLevel,
        finalLevel: reaction.finalLevel,
        reread: reaction.reread,
        pass1: reaction.pass1,
        pass2: reaction.pass2,
        adjudication: reaction.adjudication,
        userAddedInputs: reaction.userAddedInputs,
        arrivalShape: reaction.arrivalShape,
        privacy: '댓글 작성자 이름·프로필·채널 식별자 제거',
      })),
  })),
};

const evidenceLedger = {
  schemaVersion: 'flowme-content-personal-adoption-evidence-v1',
  generatedAt: new Date().toISOString(),
  checkedAt,
  status: 'strategy_research_public_self_report_proxy',
  headline: {
    checkedSources: allSourceCount,
    fixedReactions: reviewedReactions.length,
    platforms: platformCount,
    categories: categoryComparison.length,
    e2ToE5Evidence: totalE2Plus,
    e3ToE5Evidence: totalE3Plus,
    fixedE2ToE5: fixedE2Plus,
    fixedE3ToE5: fixedE3Plus,
    rereadCount: reviewedSubset.length,
    agreementRate: percentage(agreementCount, reviewedSubset.length),
  },
  evidenceLadder: levels.map((level) => ({ level, ...levelMeta[level] })),
  evidenceUnits: strongEvidence,
  sourceIndex: [
    ...fixedSources.map((source) => ({
      sourceId: source.sourceId,
      platform: source.platform,
      category: source.category,
      market: source.market,
      sourceTitle: source.sourceTitle,
      sourceUrl: source.sourceUrl,
      provider: source.channel ?? null,
      contentFormat: '영상·공개 댓글',
      checkedAt: source.checkedAt,
      accessNote: '공개 영상과 최상위 댓글을 고정 방식으로 확인',
      sampleRole: 'fixed_comparison',
    })),
    ...supplementSources.map((source) => ({
      ...source,
      sampleRole: 'strong_case_discovery',
    })),
  ],
  officialFeatureSources: [
    {
      platform: 'Instructables',
      url: 'https://www.instructables.com/I-Made-It-a-Teachers-Guide/',
      findingKo:
        'I Made It은 전체 새 가이드를 쓰지 않고 사진과 짧은 설명으로 완성 결과를 남기는 작은 기여 단위다.',
    },
    {
      platform: 'iFixit',
      url: 'https://www.ifixit.com/News/14165/three-new-guide-features',
      findingKo:
        'I did it 버튼은 완료한 가이드를 프로필과 연결하고 누적 수리 횟수를 남긴다.',
    },
  ],
  interpretationLimits: [
    '공개 댓글과 완료 버튼은 자기보고다. 실제 행동의 독립적 관찰이 아니다.',
    '강한 사례 탐색 표본은 사례 발견용이며 비율 계산에 쓰지 않는다.',
    '플랫폼마다 댓글과 완료 버튼을 쓰는 문화가 달라 단순 수치 비교를 피한다.',
    'FlowMe의 사용성, 전환율, 반복률은 아직 미측정이다.',
  ],
};

const contentEvidenceMap = {
  schemaVersion: 'flowme-current-content-adoption-evidence-map-v1',
  generatedAt: new Date().toISOString(),
  checkedAt,
  status: 'external_proxy_mapping_not_product_validation',
  mappingRule: {
    direct: '동일 원본에서 E2 이상 공개 신호 확인',
    adjacent: '같은 플랫폼 또는 같은 실행 유형에서 인접 신호 확인',
    none: '이번 조사 범위에서 원본 또는 인접 공개 신호를 확인하지 못함',
    access_limited: '원본 URL·댓글·접근 조건 때문에 판단 불가',
  },
  summary: mappingSummary,
  p0Candidates: p0EvidenceMap,
  currentRepresentativeEligible: currentEvidenceMap,
  decisionBoundary:
    '외부 공개 반응은 콘텐츠 선별 가설을 강화하지만 FlowMe 안에서의 도착 형식·저장·실행 UX를 검증하지 않는다.',
};

mkdirSync(auditDirectory, { recursive: true });
mkdirSync(assetDirectory, { recursive: true });
writeFileSync(samplePath, `${JSON.stringify(publicReactionSample, null, 2)}\n`, 'utf8');
writeFileSync(ledgerPath, `${JSON.stringify(evidenceLedger, null, 2)}\n`, 'utf8');
writeFileSync(mapPath, `${JSON.stringify(contentEvidenceMap, null, 2)}\n`, 'utf8');

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sourceAnchor(url: string, label = '원문 열기'): string {
  return `<a class="source-link" href="${escapeHtml(
    url,
  )}" target="_blank" rel="noreferrer">${escapeHtml(label)} ↗</a>`;
}

function evidenceBadge(level: EvidenceLevel): string {
  return `<span class="evidence-badge level-${level.toLowerCase()}">${level} · ${escapeHtml(
    levelMeta[level].label,
  )}</span>`;
}

function statusClass(status: EvidenceStatus): string {
  if (status === 'direct') return 'status-direct';
  if (status === 'adjacent') return 'status-adjacent';
  if (status === 'access_limited') return 'status-limited';
  return 'status-none';
}

function asset(name: string): string {
  return `./${assetDirectoryName}/${name}`;
}

const evidenceById = new Map(strongEvidence.map((item) => [item.evidenceId, item]));

type CaseStudy = {
  title: string;
  kicker: string;
  evidenceId: string;
  image: string;
  seen: string;
  userAdded: string;
  personalFlow: string;
  arrival: string;
  boundary: string;
};

const caseStudies: CaseStudy[] = [
  {
    title: '운동 영상이 7일 실행 기록으로 바뀐다',
    kicker: 'YouTube · 글로벌 운동 챌린지',
    evidenceId: 'YT-EXE-01-R20',
    image: 'source-youtube-exercise-global.png',
    seen: '2주 운동 영상',
    userAdded: '시작일, 몸무게·허리 수치, Day 1~7 완료 표시',
    personalFlow: '오늘 운동 + 누적 진도 + 개인 측정값',
    arrival: '반복 루틴과 진도표',
    boundary: '건강 효과를 보장하거나 체중 감량을 약속하지 않는다.',
  },
  {
    title: '같은 5분 운동도 날짜별 상태가 쌓인다',
    kicker: 'YouTube · 한국 운동 루틴',
    evidenceId: 'YT-EXE-03-R07',
    image: 'source-youtube-exercise-ko.png',
    seen: '5분 플랭크 루틴',
    userAdded: '날짜, 성공 여부, 통증·난이도, 자세 변화',
    personalFlow: '매일 한 번 실행하고 짧은 상태를 남기는 루틴',
    arrival: '루틴 + 완료 메모',
    boundary: '통증이 있으면 중단하도록 원본 주의와 별도 기준이 필요하다.',
  },
  {
    title: '큰 정리 과제가 하루 5분 행동으로 쪼개진다',
    kicker: 'YouTube · 집 정리 챌린지',
    evidenceId: 'YT-HOM-02-R06',
    image: 'source-youtube-declutter.png',
    seen: '하루 5분 정리 챌린지',
    userAdded: 'Day 5 완료, 다음 날 재개 의사',
    personalFlow: '오늘 한 구역만 정리하고 내일 이어가는 반복 행동',
    arrival: '오늘 체크리스트 + 다음 실행',
    boundary: '영상의 동기 부여와 커뮤니티 분위기는 원문에 남긴다.',
  },
  {
    title: '학습 영상은 플래너·복습표 수요를 만든다',
    kicker: 'YouTube · 외국어 학습',
    evidenceId: 'YT-LRN-02-R10',
    image: 'source-youtube-learning.png',
    seen: '언어 학습 루틴 영상',
    userAdded: '공부할 언어, 보유 자료, 사용할 플래너',
    personalFlow: '자료 수집 → 주간 계획 → 복습',
    arrival: '학습 체크리스트와 주간 표',
    boundary: '영상 전체나 강의 내용을 복제하지 않고 실행 구조만 남긴다.',
  },
  {
    title: '만들기 영상은 “나중에”가 아니라 완성으로 이어진다',
    kicker: 'YouTube · 만들기 프로젝트',
    evidenceId: 'YT-HOB-02-R12',
    image: 'source-youtube-craft.png',
    seen: '소품 만들기 영상',
    userAdded: '보유 재료, 실제 완성 여부',
    personalFlow: '재료 확인 → 원문 보며 만들기 → 완성 표시',
    arrival: '즉시 실행 체크리스트',
    boundary: '도안·영상·사진은 제작자 원문에 남긴다.',
  },
  {
    title: '레시피는 가족 조건에 맞춰 갈라진다',
    kicker: '만개의레시피 · 아이 반찬',
    evidenceId: 'SUP-REC-01-E02',
    image: 'source-10000recipe-tuna.png',
    seen: '야채 참치 볶음 레시피',
    userAdded: '자녀 연령, 매운맛, 아이용·어른용 분기',
    personalFlow: '같은 조리 중간에 양념을 나눠 두 반찬 완성',
    arrival: '레시피 메모 또는 조리 체크리스트',
    boundary: '원문 사진과 제작자의 설명은 링크로 돌아가 본다.',
  },
  {
    title: '반복 조리는 개인 기준 레시피로 정착한다',
    kicker: '만개의레시피 · 가족 식사',
    evidenceId: 'SUP-REC-02-E01',
    image: 'source-10000recipe-chicken.png',
    seen: '닭볶음탕 레시피',
    userAdded: '간장 양을 줄인 개인 수정',
    personalFlow: '대여섯 번 다시 쓴 나만의 조리 기준',
    arrival: '개인 수정 메모 + 다시 사용',
    boundary: '사용자의 수정본과 제작자 원본 버전을 분리한다.',
  },
  {
    title: '“만들었다” 버튼이 완료의 흔적을 남긴다',
    kicker: 'Instructables · 슬라임',
    evidenceId: 'SUP-INS-01-E01',
    image: 'source-instructables-slime.png',
    seen: '9단계 만들기 가이드',
    userAdded: '완성 사진과 짧은 후기',
    personalFlow: '재료 확인 → 단계 실행 → 완성 표시',
    arrival: '프로젝트 체크리스트',
    boundary: '완료 수는 자기신고 누적값이며 성공률이 아니다.',
  },
  {
    title: '작은 프로젝트도 완료자 10명이 보인다',
    kicker: 'Instructables · 바느질',
    evidenceId: 'SUP-INS-02-E01',
    image: 'source-instructables-coaster.png',
    seen: '3단계 바느질 가이드',
    userAdded: '만들었다는 표시',
    personalFlow: '짧은 준비와 세 단계 실행',
    arrival: '즉시 실행 프로젝트',
    boundary: '완성 사진과 제작자 자산을 FlowMe가 재호스팅하지 않는다.',
  },
  {
    title: '수리 가이드는 완료 수와 안전 경고가 함께 있어야 한다',
    kicker: 'iFixit · 배터리 교체',
    evidenceId: 'SUP-IFX-02-E01',
    image: 'source-ifixit-iphone12.png',
    seen: '50단계 수리 가이드와 도구 목록',
    userAdded: '기기 상태, 보유 도구, 완료 표시',
    personalFlow: '시작 전 적합성 확인 → 원문 실행 → 완료 기록',
    arrival: '준비 체크리스트 + 원문 링크',
    boundary: '고위험 수리를 요약만 보고 하게 만들지 않는다.',
  },
  {
    title: '식단표 이미지는 수정 가능한 표를 이기지 못한다',
    kicker: 'Instagram · 이유식',
    evidenceId: 'SUP-IG-01-E01',
    image: 'evidence-instagram-mealplan-anonymized.png',
    seen: '초기 이유식 식단표 게시물',
    userAdded: '자녀 단계, 입자감, 다음 단계 질문',
    personalFlow: '아이 상황에 맞게 수정하는 주간 식단표',
    arrival: '편집 가능한 표 + 원문 링크',
    boundary: '아동 건강 판단은 제공하지 않고 출처·주의를 함께 둔다.',
  },
  {
    title: '체크리스트는 “받고 싶다”는 구체적 요청을 만든다',
    kicker: 'Instagram · 예비 초등',
    evidenceId: 'SUP-IG-02-E02',
    image: 'evidence-instagram-school-checklist-anonymized.png',
    seen: '입학 전 생활·사회성·안전 체크리스트',
    userAdded: '아이 이름, 현재 준비 상태',
    personalFlow: '가정에서 확인할 항목만 골라 쓰는 개인 체크리스트',
    arrival: '출력·저장 가능한 체크리스트',
    boundary: '댓글 유도형 배포 구조를 수요 규모로 확대 해석하지 않는다.',
  },
];

const casePairs = Array.from({ length: 6 }, (_, index) =>
  caseStudies.slice(index * 2, index * 2 + 2),
);

function caseCard(item: CaseStudy): string {
  const evidenceItem = evidenceById.get(item.evidenceId);
  if (!evidenceItem) throw new Error(`Missing case evidence: ${item.evidenceId}`);
  return `
    <article class="case-card">
      <div class="case-visual">
        <img src="${asset(item.image)}" alt="${escapeHtml(
          `${item.kicker} 공개 화면`,
        )}" loading="lazy">
        <span class="capture-label">공개 콘텐츠 화면 · 식별정보 제거</span>
      </div>
      <div class="case-copy">
        <div class="case-kicker">${escapeHtml(item.kicker)}</div>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="evidence-row">
          ${evidenceBadge(evidenceItem.evidenceLevel)}
          ${sourceAnchor(evidenceItem.sourceUrl)}
        </div>
        <blockquote>${escapeHtml(evidenceItem.excerptKo)}</blockquote>
        <div class="flow-transform">
          <div><b>본 것</b><span>${escapeHtml(item.seen)}</span></div>
          <div><b>더한 것</b><span>${escapeHtml(item.userAdded)}</span></div>
          <div><b>개인 Flow</b><span>${escapeHtml(item.personalFlow)}</span></div>
          <div><b>도착 형태</b><span>${escapeHtml(item.arrival)}</span></div>
        </div>
        <p class="boundary"><b>경계</b> ${escapeHtml(item.boundary)}</p>
      </div>
    </article>`;
}

const categoryRows = categoryComparison
  .map(
    (row) => `
      <tr>
        <th>${escapeHtml(row.category)}</th>
        <td>${row.reactionCount}</td>
        <td><div class="bar-cell"><span style="width:${row.e2PlusRate}%"></span></div><b>${row.e2PlusRate}%</b></td>
        <td><div class="bar-cell strong"><span style="width:${row.e3PlusRate}%"></span></div><b>${row.e3PlusRate}%</b></td>
        <td>${row.sourceWithE3Rate}%</td>
      </tr>`,
  )
  .join('');

const p0Direct = p0EvidenceMap.filter((item) => item.evidenceStatus === 'direct');
const p0Adjacent = p0EvidenceMap.filter(
  (item) => item.evidenceStatus === 'adjacent',
);
const p0None = p0EvidenceMap.filter((item) => item.evidenceStatus === 'none');
const currentAdjacent = currentEvidenceMap.filter(
  (item) => item.evidenceStatus === 'adjacent',
);
const currentNone = currentEvidenceMap.filter(
  (item) => item.evidenceStatus === 'none',
);

const sourceIndexRows = [
  ...fixedSources.map((source) => ({
    sourceId: source.sourceId,
    platform: source.platform,
    category: source.category,
    market: source.market,
    title: source.sourceTitle,
    url: source.sourceUrl,
    role: '고정 비교',
  })),
  ...supplementSources.map((source) => ({
    sourceId: source.sourceId,
    platform: source.platform,
    category: source.category,
    market: source.market,
    title: source.sourceTitle,
    url: source.sourceUrl,
    role: '강한 사례',
  })),
]
  .map(
    (source) => `
      <tr>
        <td>${escapeHtml(source.sourceId)}</td>
        <td>${escapeHtml(source.platform)}</td>
        <td>${escapeHtml(source.category)}</td>
        <td>${escapeHtml(source.market)}</td>
        <td>${sourceAnchor(source.url, source.title)}</td>
        <td>${escapeHtml(source.role)}</td>
      </tr>`,
  )
  .join('');

const p0Rows = p0EvidenceMap
  .map(
    (item) => `
      <tr>
        <td>${item.rank}</td>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${sourceAnchor(item.sourceUrl, '원본')}</td>
        <td><span class="status-pill ${statusClass(item.evidenceStatus)}">${escapeHtml(
          item.evidenceStatusLabel,
        )}</span></td>
        <td>${escapeHtml(item.recommendedAction)}</td>
      </tr>`,
  )
  .join('');

const currentRows = currentEvidenceMap
  .map(
    (item) => `
      <tr>
        <td>${escapeHtml(item.slug)}</td>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${
          item.sourceUrl ? sourceAnchor(item.sourceUrl, '원본') : '원본 없음'
        }</td>
        <td>${escapeHtml(item.primaryDestination ?? '미지정')}</td>
        <td><span class="status-pill ${statusClass(item.evidenceStatus)}">${escapeHtml(
          item.evidenceStatusLabel,
        )}</span></td>
      </tr>`,
  )
  .join('');

const reviewRows = reviewedSubset
  .map(
    (item) => `
      <tr>
        <td>${escapeHtml(item.reactionId)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.automaticLevel)}</td>
        <td>${escapeHtml(item.pass1)}</td>
        <td>${escapeHtml(item.pass2)}</td>
        <td>${evidenceBadge(item.finalLevel)}</td>
        <td>${escapeHtml(item.excerpt.slice(0, 120))}</td>
      </tr>`,
  )
  .join('');

const caseSlides = casePairs
  .map(
    (pair, index) => `
      <section class="slide core case-slide" id="slide-${8 + index}">
        <div class="slide-head">
          <span class="slide-no">${String(8 + index).padStart(2, '0')}</span>
          <div>
            <div class="eyebrow">강한 사례 ${index * 2 + 1}–${index * 2 + 2}</div>
            <h2>${escapeHtml(
              [
                '진행 기록이 생기는 콘텐츠',
                '저장한 콘텐츠가 다시 열리는 순간',
                '가족 조건이 원본을 개인 기준으로 바꾼다',
                '완료 버튼은 작은 참여를 만든다',
                '안전과 결과물이 함께 설계돼야 한다',
                '표와 체크리스트는 실행을 앞당긴다',
              ][index],
            )}</h2>
          </div>
          <span class="claim-tag">공개 자기보고</span>
        </div>
        <div class="case-grid">${pair.map(caseCard).join('')}</div>
      </section>`,
  )
  .join('');

const reportHtml = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>FlowMe 콘텐츠 개인 적용 증거 전략 보고서</title>
  <style>
    :root {
      --ink:#17231f;
      --muted:#63716b;
      --paper:#f4f5f1;
      --white:#ffffff;
      --line:#d9ded9;
      --green:#126b51;
      --mint:#d9f0e7;
      --coral:#d85d45;
      --peach:#f8dfd8;
      --yellow:#d7a619;
      --cream:#f8efc9;
      --blue:#2d67a6;
      --sky:#dceaf8;
      --gray:#eef0ed;
      --shadow:0 10px 28px rgba(31,43,38,.08);
    }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; background:var(--paper); }
    body {
      margin:0;
      color:var(--ink);
      background:
        linear-gradient(90deg, rgba(23,35,31,.025) 1px, transparent 1px) 0 0/32px 32px,
        var(--paper);
      font-family:"Pretendard","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;
      line-height:1.5;
      letter-spacing:0;
    }
    a { color:inherit; }
    .topbar {
      position:sticky;
      top:0;
      z-index:20;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      padding:10px 20px;
      background:rgba(244,245,241,.94);
      border-bottom:1px solid var(--line);
      backdrop-filter:blur(10px);
    }
    .brand { font-weight:800; font-size:14px; }
    .topbar nav { display:flex; gap:8px; flex-wrap:wrap; }
    .topbar a {
      text-decoration:none;
      font-size:12px;
      color:var(--muted);
      padding:6px 8px;
      border-bottom:2px solid transparent;
    }
    .topbar a:hover { color:var(--ink); border-color:var(--green); }
    main { padding:16px 0 64px; }
    .slide {
      width:min(1408px, calc(100vw - 32px));
      min-height:calc(100vh - 82px);
      margin:0 auto 18px;
      padding:42px 48px;
      background:var(--white);
      border:1px solid var(--line);
      border-radius:8px;
      box-shadow:var(--shadow);
      overflow:hidden;
      position:relative;
    }
    .slide.core { min-height:818px; }
    .slide::after {
      content:"FLOWME · 2026.07.27";
      position:absolute;
      right:28px;
      bottom:18px;
      color:#9aa49f;
      font-size:10px;
      font-weight:700;
    }
    .slide-head {
      display:grid;
      grid-template-columns:56px 1fr auto;
      align-items:start;
      gap:14px;
      margin-bottom:26px;
    }
    .slide-no {
      display:flex;
      align-items:center;
      justify-content:center;
      width:44px;
      height:44px;
      color:#fff;
      background:var(--ink);
      font-size:13px;
      font-weight:800;
      border-radius:4px;
    }
    .eyebrow {
      color:var(--green);
      font-size:12px;
      font-weight:800;
      text-transform:uppercase;
      margin-bottom:4px;
    }
    h1,h2,h3,p { margin-top:0; }
    h1 { font-size:46px; line-height:1.15; max-width:1000px; margin-bottom:18px; }
    h2 { font-size:30px; line-height:1.22; margin-bottom:0; }
    h3 { font-size:20px; line-height:1.3; margin-bottom:10px; }
    .lead { font-size:21px; line-height:1.55; color:#33423c; max-width:1080px; }
    .claim-tag, .source-tag {
      white-space:nowrap;
      color:var(--green);
      border:1px solid #a7c9bd;
      background:#eef8f4;
      border-radius:999px;
      padding:5px 10px;
      font-size:11px;
      font-weight:800;
    }
    .hero {
      display:grid;
      grid-template-columns:1.3fr .7fr;
      gap:38px;
      align-items:center;
      min-height:610px;
    }
    .hero-mark {
      height:520px;
      display:flex;
      flex-direction:column;
      justify-content:space-between;
      padding:34px;
      background:var(--ink);
      color:#fff;
      border-radius:6px;
    }
    .hero-mark .big {
      font-size:96px;
      line-height:.9;
      font-weight:900;
      color:#f0c741;
    }
    .hero-mark p { color:#cbd6d1; font-size:17px; margin-bottom:0; }
    .metric-grid {
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:12px;
      margin-top:26px;
    }
    .metric {
      padding:18px;
      border-top:4px solid var(--green);
      background:var(--gray);
      min-height:116px;
    }
    .metric:nth-child(2) { border-color:var(--coral); }
    .metric:nth-child(3) { border-color:var(--yellow); }
    .metric:nth-child(4) { border-color:var(--blue); }
    .metric b { display:block; font-size:34px; line-height:1.05; margin-bottom:7px; }
    .metric span { display:block; font-size:12px; color:var(--muted); }
    .executive-line {
      margin-top:24px;
      padding:18px 20px;
      border-left:5px solid var(--coral);
      background:var(--peach);
      font-size:18px;
      font-weight:750;
    }
    .decision-grid, .three-grid, .four-grid {
      display:grid;
      gap:14px;
    }
    .decision-grid, .three-grid { grid-template-columns:repeat(3,1fr); }
    .four-grid { grid-template-columns:repeat(4,1fr); }
    .decision-card, .plain-card {
      border:1px solid var(--line);
      border-radius:6px;
      padding:22px;
      background:#fff;
    }
    .decision-card { border-top:5px solid var(--green); min-height:300px; }
    .decision-card:nth-child(2) { border-top-color:var(--coral); }
    .decision-card:nth-child(3) { border-top-color:var(--blue); }
    .decision-card .num { font-size:12px; font-weight:900; color:var(--muted); }
    .decision-card .recommend {
      display:block;
      margin:16px 0 10px;
      padding:9px 10px;
      background:var(--mint);
      color:#0b513d;
      font-weight:800;
      font-size:13px;
    }
    .decision-card ul, .plain-card ul { padding-left:18px; margin:10px 0 0; }
    .decision-card li, .plain-card li { margin:7px 0; }
    .method-strip {
      display:grid;
      grid-template-columns:repeat(4,1fr);
      border:1px solid var(--line);
      margin:18px 0 24px;
    }
    .method-strip > div { padding:20px; border-right:1px solid var(--line); }
    .method-strip > div:last-child { border-right:0; }
    .method-strip b { display:block; font-size:30px; }
    .method-strip span { font-size:12px; color:var(--muted); }
    .platform-list {
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      margin-top:16px;
    }
    .platform-list span {
      padding:7px 10px;
      border:1px solid var(--line);
      background:var(--gray);
      font-size:12px;
      font-weight:700;
    }
    .ladder {
      display:grid;
      grid-template-columns:repeat(6,1fr);
      gap:8px;
      align-items:end;
      min-height:430px;
      margin-top:34px;
    }
    .ladder-step {
      padding:16px 14px;
      min-height:calc(160px + var(--rise));
      display:flex;
      flex-direction:column;
      justify-content:flex-end;
      border:1px solid var(--line);
      background:var(--gray);
      border-bottom:6px solid var(--muted);
    }
    .ladder-step:nth-child(3) { background:var(--cream); border-color:#dfc869; }
    .ladder-step:nth-child(n+4) { background:var(--mint); border-color:#80b8a5; }
    .ladder-step b { font-size:28px; }
    .ladder-step strong { display:block; font-size:15px; margin:3px 0 8px; }
    .ladder-step p { font-size:12px; color:var(--muted); margin:0; }
    .ladder-line {
      margin-top:16px;
      display:grid;
      grid-template-columns:2fr 1fr 3fr;
      gap:8px;
      text-align:center;
      font-size:12px;
      font-weight:800;
    }
    .ladder-line span { padding:8px; }
    .ladder-line span:nth-child(1) { background:var(--gray); }
    .ladder-line span:nth-child(2) { background:var(--cream); }
    .ladder-line span:nth-child(3) { background:var(--mint); }
    .funnel {
      display:flex;
      flex-direction:column;
      gap:9px;
      width:78%;
      margin:26px auto 18px;
      align-items:center;
    }
    .funnel-row {
      width:var(--width);
      min-width:280px;
      padding:14px 18px;
      color:#fff;
      background:var(--ink);
      display:flex;
      justify-content:space-between;
      align-items:center;
      font-weight:800;
    }
    .funnel-row:nth-child(2) { background:var(--blue); }
    .funnel-row:nth-child(3) { background:var(--yellow); color:#2d270d; }
    .funnel-row:nth-child(4) { background:var(--green); }
    .funnel-row:nth-child(5) { background:var(--coral); }
    .funnel-row b { font-size:25px; }
    .note-grid {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:14px;
      margin-top:18px;
    }
    .note {
      padding:16px;
      border-left:4px solid var(--yellow);
      background:var(--cream);
      font-size:13px;
    }
    .note.danger { border-color:var(--coral); background:var(--peach); }
    .data-table {
      width:100%;
      border-collapse:collapse;
      font-size:13px;
    }
    .table-wrap { max-width:100%; overflow-x:auto; }
    .data-table th, .data-table td {
      border-bottom:1px solid var(--line);
      padding:11px 9px;
      text-align:left;
      vertical-align:middle;
    }
    .data-table thead th {
      background:var(--ink);
      color:#fff;
      font-size:11px;
    }
    .data-table tbody th { width:190px; font-size:13px; }
    .bar-cell {
      display:inline-block;
      width:120px;
      height:8px;
      margin-right:8px;
      background:#ecefef;
      overflow:hidden;
    }
    .bar-cell span { display:block; height:100%; background:var(--yellow); }
    .bar-cell.strong span { background:var(--green); }
    .platform-mechanisms {
      display:grid;
      grid-template-columns:repeat(5,1fr);
      gap:10px;
      margin-top:26px;
    }
    .mechanism {
      min-height:330px;
      padding:18px;
      border-top:7px solid var(--ink);
      background:var(--gray);
    }
    .mechanism:nth-child(2) { border-color:var(--coral); background:var(--peach); }
    .mechanism:nth-child(3) { border-color:var(--yellow); background:var(--cream); }
    .mechanism:nth-child(4) { border-color:var(--blue); background:var(--sky); }
    .mechanism:nth-child(5) { border-color:var(--green); background:var(--mint); }
    .mechanism .symbol { font-size:32px; font-weight:900; margin-bottom:14px; }
    .mechanism p { font-size:13px; color:#3f4d47; }
    .mechanism .take { font-weight:800; color:var(--ink); margin-top:18px; }
    .case-slide { padding-bottom:34px; }
    .case-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
    .case-card {
      border:1px solid var(--line);
      border-radius:6px;
      overflow:hidden;
      background:#fff;
      min-width:0;
    }
    .case-visual {
      height:230px;
      background:#e9ece9;
      position:relative;
      overflow:hidden;
    }
    .case-visual img { width:100%; height:100%; object-fit:cover; object-position:top; display:block; }
    .capture-label {
      position:absolute;
      left:10px;
      bottom:10px;
      padding:5px 8px;
      background:rgba(23,35,31,.88);
      color:#fff;
      font-size:10px;
      font-weight:700;
    }
    .case-copy { padding:17px 18px 16px; }
    .case-kicker { color:var(--green); font-size:11px; font-weight:800; }
    .case-copy h3 { font-size:18px; margin:5px 0 9px; }
    .evidence-row { display:flex; gap:8px; align-items:center; margin-bottom:9px; }
    .evidence-badge {
      display:inline-flex;
      padding:4px 7px;
      border-radius:999px;
      font-size:10px;
      font-weight:900;
      background:var(--gray);
    }
    .level-e2 { background:var(--cream); color:#6a5100; }
    .level-e3, .level-e4, .level-e5 { background:var(--mint); color:#0c513d; }
    .source-link { color:var(--blue); font-size:11px; font-weight:800; text-decoration:none; }
    blockquote {
      margin:0 0 10px;
      padding:10px 12px;
      background:#f6f7f4;
      border-left:3px solid var(--coral);
      font-size:12px;
      color:#3f4d47;
    }
    .flow-transform {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:7px;
    }
    .flow-transform div { padding:8px; border:1px solid var(--line); min-width:0; }
    .flow-transform b { display:block; color:var(--muted); font-size:9px; margin-bottom:2px; }
    .flow-transform span { display:block; font-size:11px; overflow-wrap:anywhere; }
    .boundary { margin:9px 0 0; font-size:10px; color:var(--muted); }
    .journey {
      display:grid;
      grid-template-columns:repeat(6,1fr);
      gap:6px;
      margin:26px 0;
    }
    .journey-step {
      min-height:138px;
      padding:14px;
      border-top:5px solid var(--ink);
      background:var(--gray);
    }
    .journey-step:nth-child(2) { border-color:var(--yellow); }
    .journey-step:nth-child(3) { border-color:var(--coral); }
    .journey-step:nth-child(4) { border-color:var(--blue); }
    .journey-step:nth-child(5) { border-color:var(--green); }
    .journey-step:nth-child(6) { border-color:#7a5b9e; }
    .journey-step b { font-size:14px; }
    .journey-step p { font-size:11px; color:var(--muted); margin:7px 0 0; }
    .journey-step .signal { font-size:10px; font-weight:900; color:var(--green); }
    .scorecard {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:18px;
    }
    .score-list { display:grid; gap:8px; }
    .score-row {
      display:grid;
      grid-template-columns:170px 1fr auto;
      gap:10px;
      align-items:center;
      padding:10px 12px;
      border-bottom:1px solid var(--line);
    }
    .score-row b { font-size:13px; }
    .score-row span { font-size:12px; color:var(--muted); }
    .score-row em { font-style:normal; font-weight:900; color:var(--green); }
    .mapping-band {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:12px;
      margin:20px 0;
    }
    .mapping-stat {
      min-height:150px;
      padding:20px;
      border:1px solid var(--line);
      border-top:6px solid var(--green);
    }
    .mapping-stat:nth-child(2) { border-top-color:var(--yellow); }
    .mapping-stat:nth-child(3) { border-top-color:#8a9690; }
    .mapping-stat b { font-size:40px; display:block; }
    .mapping-stat span { font-size:13px; color:var(--muted); }
    .status-pill {
      display:inline-flex;
      padding:4px 7px;
      border-radius:999px;
      font-size:10px;
      font-weight:850;
      white-space:nowrap;
    }
    .status-direct { background:var(--mint); color:#0c513d; }
    .status-adjacent { background:var(--cream); color:#695000; }
    .status-none { background:var(--gray); color:#55625d; }
    .status-limited { background:var(--peach); color:#853421; }
    .supply-lanes {
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:10px;
      margin-top:22px;
    }
    .lane { padding:16px; min-height:190px; background:var(--gray); border-top:6px solid var(--ink); }
    .lane:nth-child(1) { border-color:var(--green); background:var(--mint); }
    .lane:nth-child(2) { border-color:var(--yellow); background:var(--cream); }
    .lane:nth-child(3) { border-color:var(--blue); background:var(--sky); }
    .lane:nth-child(4) { border-color:var(--coral); background:var(--peach); }
    .lane b { display:block; font-size:27px; margin-bottom:3px; }
    .lane strong { font-size:14px; }
    .lane p { font-size:11px; color:#4a5852; margin-top:10px; }
    .decision-final {
      display:grid;
      grid-template-columns:1.3fr .7fr;
      gap:22px;
      margin-top:24px;
    }
    .approval-list { display:grid; gap:12px; }
    .approval {
      display:grid;
      grid-template-columns:44px 1fr auto;
      gap:13px;
      align-items:center;
      padding:16px;
      border:1px solid var(--line);
    }
    .approval .check {
      width:36px; height:36px; display:flex; align-items:center; justify-content:center;
      background:var(--green); color:#fff; font-weight:900;
    }
    .approval b { display:block; font-size:15px; }
    .approval span { font-size:11px; color:var(--muted); }
    .approval em { font-style:normal; font-weight:900; color:var(--green); font-size:12px; }
    .next-card { padding:22px; background:var(--ink); color:#fff; }
    .next-card h3 { color:#f0c741; }
    .next-card ol { padding-left:19px; }
    .next-card li { margin:10px 0; color:#d8e0dc; }
    .appendix { min-height:auto; padding-bottom:56px; }
    .appendix .table-wrap { overflow-x:auto; border:1px solid var(--line); }
    .appendix .data-table { min-width:980px; font-size:11px; }
    .appendix .data-table th, .appendix .data-table td { padding:8px; }
    .appendix-links { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .appendix-link {
      display:block;
      padding:14px;
      border:1px solid var(--line);
      text-decoration:none;
      background:var(--gray);
      font-weight:750;
      font-size:13px;
    }
    .footer-note { color:var(--muted); font-size:11px; margin-top:14px; }
    @media (max-width:900px) {
      .topbar nav { display:none; }
      .slide, .slide.core {
        width:calc(100vw - 16px);
        min-height:auto;
        padding:24px 18px 42px;
        margin-bottom:10px;
      }
      .slide-head { grid-template-columns:42px 1fr; }
      .slide-head .claim-tag { grid-column:2; justify-self:start; }
      h1 { font-size:34px; }
      h2 { font-size:24px; }
      .lead { font-size:17px; }
      .hero { grid-template-columns:1fr; min-height:auto; }
      .hero-mark { height:auto; min-height:250px; }
      .hero-mark .big { font-size:68px; }
      .metric-grid, .decision-grid, .three-grid, .four-grid,
      .method-strip, .platform-mechanisms, .case-grid, .note-grid,
      .scorecard, .mapping-band, .supply-lanes, .decision-final,
      .appendix-links { grid-template-columns:1fr; }
      .metric-grid { grid-template-columns:1fr 1fr; }
      .metric { min-height:108px; padding:14px; }
      .metric b { font-size:30px; }
      .method-strip > div { border-right:0; border-bottom:1px solid var(--line); }
      .ladder { grid-template-columns:1fr 1fr; min-height:auto; align-items:stretch; }
      .ladder-step { min-height:160px; }
      .ladder-line { grid-template-columns:1fr; }
      .funnel { width:100%; }
      .funnel-row { width:100% !important; min-width:0; }
      .data-table { min-width:760px; }
      .journey { grid-template-columns:1fr 1fr; }
      .case-visual { height:210px; }
      .flow-transform { grid-template-columns:1fr; }
      .score-row { grid-template-columns:1fr; }
      .approval { grid-template-columns:42px 1fr; }
      .approval em { grid-column:2; }
      .bar-cell { width:80px; }
    }
    @media print {
      .topbar { display:none; }
      body { background:#fff; }
      main { padding:0; }
      .slide { width:100%; min-height:100vh; border:0; box-shadow:none; margin:0; page-break-after:always; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand">FLOWME · 콘텐츠 개인 적용 증거</div>
    <nav>
      <a href="#slide-1">결론</a>
      <a href="#slide-4">증거 기준</a>
      <a href="#slide-6">카테고리</a>
      <a href="#slide-8">사례</a>
      <a href="#slide-16">P0</a>
      <a href="#slide-18">결정</a>
      <a href="#appendix-sources">근거</a>
    </nav>
  </header>
  <main>
    <section class="slide core" id="slide-1">
      <div class="hero">
        <div>
          <div class="eyebrow">CEO 전략 보고 · 공개 행동 증거 조사</div>
          <h1>콘텐츠를 본 사람은<br>정말 자기 계획으로 옮기는가?</h1>
          <p class="lead">그렇다. 다만 흔적은 ‘좋아요’가 아니라 <b>표를 요청하고, 자기 조건에 맞게 바꾸고, 진행을 기록하고, 다시 사용하는 행동</b>에서 보였다.</p>
          <div class="metric-grid">
            <div class="metric"><b>${allSourceCount}</b><span>확인한 공개 원본<br>한국·글로벌</span></div>
            <div class="metric"><b>${reviewedReactions.length}</b><span>비교용 고정 표본<br>28개 × 20건</span></div>
            <div class="metric"><b>${totalE2Plus}</b><span>E2~E5<br>결과물 수요 이상</span></div>
            <div class="metric"><b>${totalE3Plus}</b><span>E3~E5<br>실제 적용 자기보고</span></div>
          </div>
          <div class="executive-line">FlowMe의 초반 승부처는 “계획을 생성해준다”가 아니라, <b>검증된 원본을 개인이 바로 쓸 결과물과 실행 기록으로 이어준다</b>는 데 있다.</div>
        </div>
        <aside class="hero-mark">
          <div>
            <div class="source-tag">표본 결과 + 전략적 해석</div>
            <div class="big">E2<br>→ E5</div>
          </div>
          <p><b>가장 강한 고정 표본</b><br>${escapeHtml(
            strongestCategory.category,
          )} · E3 이상 ${strongestCategory.e3PlusRate}%<br><br><small>표본 댓글 안의 비율이며 전체 사용자 전환율이 아니다.</small></p>
        </aside>
      </div>
    </section>

    <section class="slide core" id="slide-2">
      <div class="slide-head">
        <span class="slide-no">02</span>
        <div><div class="eyebrow">오늘 결정할 것</div><h2>보고서에서 세 가지만 판단하면 된다</h2></div>
        <span class="claim-tag">추천안</span>
      </div>
      <div class="decision-grid">
        <article class="decision-card">
          <div class="num">DECISION 01</div>
          <h3>무엇을 ‘실행 수요’로 볼 것인가</h3>
          <span class="recommend">추천: E2와 E3을 나눠 승인</span>
          <ul>
            <li><b>E2</b>: 표·체크리스트·캘린더 같은 결과물 수요</li>
            <li><b>E3 이상</b>: 진행·완료·반복을 말한 실제 적용 자기보고</li>
            <li>좋아요·감사 댓글은 수요 검증에서 제외</li>
          </ul>
        </article>
        <article class="decision-card">
          <div class="num">DECISION 02</div>
          <h3>어떤 콘텐츠부터 공급할 것인가</h3>
          <span class="recommend">추천: 루틴·레시피·만들기 우선</span>
          <ul>
            <li>진도와 반복이 잘 보이는 운동·정리 루틴</li>
            <li>가족 조건에 맞게 바뀌는 레시피·식단</li>
            <li>완료가 명확한 만들기·가벼운 수리</li>
          </ul>
        </article>
        <article class="decision-card">
          <div class="num">DECISION 03</div>
          <h3>P0 재고를 한 기준으로 볼 것인가</h3>
          <span class="recommend">추천: 공급 경로를 분리</span>
          <ul>
            <li>행동 증거형: 공개 적용 신호를 우선</li>
            <li>공식 필수형: 댓글보다 정확성·기한을 우선</li>
            <li>전략 가설형: 미측정으로 표시하고 작게 검증</li>
          </ul>
        </article>
      </div>
      <div class="note danger"><b>결정하지 않으면</b> 조회수나 콘텐츠 수량이 다시 선별 기준이 되고, 사용자가 실제로 옮겨 쓸 수 없는 Flow가 늘어난다.</div>
    </section>

    <section class="slide core" id="slide-3">
      <div class="slide-head">
        <span class="slide-no">03</span>
        <div><div class="eyebrow">조사 설계</div><h2>비율을 보는 표본과 강한 사례 찾기를 분리했다</h2></div>
        <span class="claim-tag">조사 방법</span>
      </div>
      <div class="method-strip">
        <div><b>28</b><span>YouTube 고정 원본<br>7개 분야 × 4개</span></div>
        <div><b>560</b><span>상위 공개 댓글<br>원본당 20건</span></div>
        <div><b>16</b><span>강한 사례 보강 원본<br>완료·후기·파일 요청</span></div>
        <div><b>${reviewedSubset.length}</b><span>별도 재판정<br>${percentage(
          reviewedSubset.length,
          reviewedReactions.length,
        )}% 표본</span></div>
      </div>
      <div class="three-grid">
        <article class="plain-card">
          <h3>고정 표본</h3>
          <p>카테고리마다 같은 댓글 정렬과 같은 수량을 적용했다. 여기서만 비율을 계산한다.</p>
          <div class="source-tag">E2 이상 ${fixedE2Plus} · E3 이상 ${fixedE3Plus}</div>
        </article>
        <article class="plain-card">
          <h3>강한 사례 탐색</h3>
          <p>레시피 후기, “I Made It”, “I did it”, 엑셀·체크리스트 요청을 찾아 실제 전환 형태를 본다.</p>
          <div class="source-tag">사례 발견용 · 비율 계산 금지</div>
        </article>
        <article class="plain-card">
          <h3>분류 점검</h3>
          <p>자동 E2~E5 59건 전수와 약한 신호 25건을 두 번 읽고, 불일치는 낮은 단계로 확정했다.</p>
          <div class="source-tag">일치 ${percentage(
            agreementCount,
            reviewedSubset.length,
          )}% · 2건 보수 판정</div>
        </article>
      </div>
      <div class="platform-list">
        ${[
          'YouTube',
          '만개의레시피',
          'Instructables',
          'iFixit',
          'Instagram',
          'Threads',
          '와캠퍼스',
        ]
          .map((item) => `<span>${item}</span>`)
          .join('')}
      </div>
      <p class="footer-note">공개 댓글은 삭제·수정될 수 있다. 확인일은 2026-07-27이며 사용자 이름·프로필·채널 식별자는 보관하지 않았다.</p>
    </section>

    <section class="slide core" id="slide-4">
      <div class="slide-head">
        <span class="slide-no">04</span>
        <div><div class="eyebrow">증거 사다리</div><h2>“좋아요”와 “실제로 썼다”를 같은 말로 다루지 않는다</h2></div>
        <span class="claim-tag">판정 기준</span>
      </div>
      <div class="ladder">
        ${levels
          .map(
            (level, index) => `
            <div class="ladder-step" style="--rise:${index * 26}px">
              <b>${level}</b>
              <strong>${escapeHtml(levelMeta[level].label)}</strong>
              <p>${escapeHtml(levelMeta[level].short)}<br>${escapeHtml(
                levelMeta[level].interpretation,
              )}</p>
            </div>`,
          )
          .join('')}
      </div>
      <div class="ladder-line">
        <span>E0–E1 · 관심과 의향</span>
        <span>E2 · 실행 결과물 수요</span>
        <span>E3–E5 · 실제 적용 자기보고</span>
      </div>
      <div class="note danger"><b>중요</b> E3~E5도 ‘자기보고’다. FlowMe가 사용자의 행동을 직접 관찰한 검증 결과는 아니다.</div>
    </section>

    <section class="slide core" id="slide-5">
      <div class="slide-head">
        <span class="slide-no">05</span>
        <div><div class="eyebrow">고정 표본 결과</div><h2>560개 댓글 중 강한 흔적은 30개였다</h2></div>
        <span class="claim-tag">YouTube 고정 표본</span>
      </div>
      <div class="funnel">
        <div class="funnel-row" style="--width:100%"><span>확인한 공개 댓글</span><b>${reviewedReactions.length}</b></div>
        <div class="funnel-row" style="--width:76%"><span>E1 이상 · 의향 포함</span><b>${reviewedReactions.length - fixedLevelCounts.E0}</b></div>
        <div class="funnel-row" style="--width:58%"><span>E2 이상 · 결과물 수요 포함</span><b>${fixedE2Plus}</b></div>
        <div class="funnel-row" style="--width:47%"><span>E3 이상 · 실제 적용 자기보고</span><b>${fixedE3Plus}</b></div>
        <div class="funnel-row" style="--width:34%"><span>E5 · 반복·재사용</span><b>${fixedLevelCounts.E5}</b></div>
      </div>
      <div class="note-grid">
        <div class="note"><b>읽어야 할 결론</b><br>강한 신호는 흔하지 않지만 존재한다. 따라서 댓글 수가 아니라 <b>무슨 행동이 적혀 있는지</b>를 선별해야 한다.</div>
        <div class="note danger"><b>읽으면 안 되는 결론</b><br>${fixedE3Plus}건을 전체 시청자 전환율로 계산하거나 플랫폼별 수요 크기로 일반화하면 안 된다.</div>
      </div>
    </section>

    <section class="slide core" id="slide-6">
      <div class="slide-head">
        <span class="slide-no">06</span>
        <div><div class="eyebrow">카테고리 비교</div><h2>운동은 진행 기록, 만들기는 완료, 여행은 준비 수정이 보였다</h2></div>
        <span class="claim-tag">고정 표본만 비교</span>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>카테고리</th><th>댓글</th><th>E2 이상</th><th>E3 이상</th><th>E3 원본 비율</th></tr></thead>
          <tbody>${categoryRows}</tbody>
        </table>
      </div>
      <div class="note-grid">
        <div class="note"><b>우선 공급 후보</b><br>운동·습관은 날짜별 진도가 자연스럽고, 만들기는 완료 기준이 선명하다. 레시피는 별도 후기 플랫폼에서 수정·반복 증거가 강했다.</div>
        <div class="note danger"><b>주의</b><br>육아·여행의 신호가 약하다고 수요가 없다는 뜻은 아니다. 댓글 구조보다 표·체크리스트를 요청하는 배포형 게시물에서 수요가 더 잘 드러났다.</div>
      </div>
    </section>

    <section class="slide core" id="slide-7">
      <div class="slide-head">
        <span class="slide-no">07</span>
        <div><div class="eyebrow">플랫폼별 행동 흔적</div><h2>플랫폼이 다르면 ‘실행했다’는 흔적도 다르게 남는다</h2></div>
        <span class="claim-tag">공개 기능·후기</span>
      </div>
      <div class="platform-mechanisms">
        <article class="mechanism"><div class="symbol">DAY</div><h3>YouTube</h3><p>댓글을 일기처럼 수정하며 Day 1, 몸 상태, 완료를 누적한다.</p><p class="take">차용: 가벼운 진도·상태 기록</p></article>
        <article class="mechanism"><div class="symbol">±</div><h3>레시피 후기</h3><p>재료 양, 아이용 양념, 가족 반응을 남기고 같은 레시피를 다시 쓴다.</p><p class="take">차용: 개인 수정본과 재사용</p></article>
        <article class="mechanism"><div class="symbol">✓</div><h3>Instructables</h3><p>전체 글을 새로 쓰지 않아도 “만들었다”와 사진으로 작은 기여를 남긴다.</p><p class="take">차용: 완료 한 번, 짧은 보완</p></article>
        <article class="mechanism"><div class="symbol">4,094</div><h3>iFixit</h3><p>단계형 원문 끝에 완료 버튼을 두고 누적 완료 수를 보여준다.</p><p class="take">차용: 원문과 완료 신호의 연결</p></article>
        <article class="mechanism"><div class="symbol">XLS</div><h3>Instagram·Threads</h3><p>이미지보다 수정 가능한 엑셀·체크리스트를 요청하는 댓글이 반복된다.</p><p class="take">차용: 도착 결과물을 먼저 보여주기</p></article>
      </div>
      <p class="footer-note">Instructables와 iFixit의 완료 수는 플랫폼 사용자의 자기신고 누적값이다. 완료율이나 성공률로 해석하지 않는다.</p>
    </section>

    ${caseSlides}

    <section class="slide core" id="slide-14">
      <div class="slide-head">
        <span class="slide-no">14</span>
        <div><div class="eyebrow">콘텐츠 선별 기준</div><h2>좋은 원본은 정보를 많이 주는 것이 아니라 다음 행동을 쉽게 만든다</h2></div>
        <span class="claim-tag">전략 제안</span>
      </div>
      <div class="scorecard">
        <div class="score-list">
          ${[
            ['결과가 보이는가', '완료한 모습·방문·식사·정리 상태가 분명함', '필수'],
            ['행동이 작게 나뉘는가', '지금 체크할 한 항목이 있음', '필수'],
            ['기간·진도가 있는가', '며칠·몇 주 또는 반복 주기가 보임', '가점'],
            ['개인 변수가 있는가', '연령·재료·예산·장소가 결과를 바꿈', '가점'],
            ['원문으로 돌아갈 이유가 있는가', '영상·사진·전문 설명이 원문에 남음', '필수'],
            ['공개 적용 흔적이 있는가', 'E2 또는 E3 이상 신호가 확인됨', '가점'],
          ]
            .map(
              ([a, b, c]) =>
                `<div class="score-row"><b>${a}</b><span>${b}</span><em>${c}</em></div>`,
            )
            .join('')}
        </div>
        <article class="plain-card">
          <div class="eyebrow">P0 통과 질문</div>
          <h3>콘텐츠팀은 발행 전에 다섯 문장에 답한다</h3>
          <ol>
            <li>사용자가 원문을 보고 <b>무엇을 하게 되는가?</b></li>
            <li>지금 실행할까, 저장할까, 날짜를 정할까?</li>
            <li>사용자에게 꼭 물어야 하는 값은 무엇인가?</li>
            <li>체크리스트·표·캘린더·메모 중 기본 도착은 무엇인가?</li>
            <li>FlowMe가 담지 않고 원문에 남길 것은 무엇인가?</li>
          </ol>
          <div class="note danger"><b>탈락</b> 원문을 요약한 목록일 뿐, 사용자 행동·결과물·완료 기준이 없으면 공개 Flow로 세지 않는다.</div>
        </article>
      </div>
    </section>

    <section class="slide core" id="slide-15">
      <div class="slide-head">
        <span class="slide-no">15</span>
        <div><div class="eyebrow">FlowMe UX 우선순위</div><h2>댓글에서 하던 일을 제품 안에서 더 짧게 만든다</h2></div>
        <span class="claim-tag">증거 → UX</span>
      </div>
      <div class="journey">
        <div class="journey-step"><span class="signal">원문</span><b>발견</b><p>제작자·출처와 결과를 먼저 본다.</p></div>
        <div class="journey-step"><span class="signal">E1</span><b>저장</b><p>지금 저장하고 날짜는 나중에 정한다.</p></div>
        <div class="journey-step"><span class="signal">E2</span><b>결과물 선택</b><p>체크리스트·표·캘린더·메모 중 하나를 고른다.</p></div>
        <div class="journey-step"><span class="signal">개인 수정</span><b>최소 입력</b><p>날짜, 가족 수, 재료처럼 결과를 바꾸는 값만 묻는다.</p></div>
        <div class="journey-step"><span class="signal">E3–E4</span><b>한 행동 실행</b><p>목록 전체보다 오늘 할 항목과 상태를 보여준다.</p></div>
        <div class="journey-step"><span class="signal">E5</span><b>다시 사용</b><p>수정본을 보관하고 다음 실행에 재사용한다.</p></div>
      </div>
      <div class="three-grid">
        <article class="plain-card"><h3>P0에 꼭 필요</h3><p>저장·도착 형식 선택·최소 입력·한 행동 보기·원문으로 돌아가기</p></article>
        <article class="plain-card"><h3>가볍게 남길 신호</h3><p>사용함 / 수정함 / 완료함 / 다시 씀. 공개 공유는 요구하지 않는다.</p></article>
        <article class="plain-card"><h3>아직 주장할 수 없음</h3><p>어떤 버튼이 전환율을 높이는지, 사용자가 FlowMe에서 계속 관리할지는 미측정이다.</p></article>
      </div>
    </section>

    <section class="slide core" id="slide-16">
      <div class="slide-head">
        <span class="slide-no">16</span>
        <div><div class="eyebrow">기존 P0 24개 재판정</div><h2>직접 증거 1개, 인접 증거 19개, 공개 증거 미확인 4개</h2></div>
        <span class="claim-tag">외부 증거 매핑</span>
      </div>
      <div class="mapping-band">
        <div class="mapping-stat"><b>${p0Direct.length}</b><span>동일 원본에서 직접 적용 증거<br>${escapeHtml(
          p0Direct.map((item) => item.title).join(', ') || '없음',
        )}</span></div>
        <div class="mapping-stat"><b>${p0Adjacent.length}</b><span>같은 유형의 인접 증거<br>원본 자체 검증은 아님</span></div>
        <div class="mapping-stat"><b>${p0None.length}</b><span>공개 증거 미확인<br>공식 절차 포함</span></div>
      </div>
      <div class="three-grid">
        <article class="plain-card"><h3>계속</h3><p>레시피·만들기·루틴 중 원본과 도착 형태가 선명한 후보를 실제 사용자 관찰 후보로 둔다.</p></article>
        <article class="plain-card"><h3>보강</h3><p>인접 증거만 있는 19개는 날짜 미정, 최소 입력, 결과물 미리보기를 먼저 점검한다.</p></article>
        <article class="plain-card"><h3>별도 기준</h3><p>여권·자동차검사 같은 공식 절차는 댓글이 없어도 정확성과 마감 효용으로 평가한다.</p></article>
      </div>
      <div class="note danger"><b>인접 증거 ≠ 검증 완료</b> 같은 카테고리에서 누군가 실행했다는 사실은 현재 FlowMe 변환본의 품질을 보장하지 않는다.</div>
    </section>

    <section class="slide core" id="slide-17">
      <div class="slide-head">
        <span class="slide-no">17</span>
        <div><div class="eyebrow">현재 대표 후보 44개</div><h2>공개 반응을 붙일 수 있는 후보는 아직 12개뿐이다</h2></div>
        <span class="claim-tag">저장소 근거 + 외부 매핑</span>
      </div>
      <div class="mapping-band">
        <div class="mapping-stat"><b>${currentAdjacent.length}</b><span>같은 유형의 인접 증거 있음<br>직접 증거는 0개</span></div>
        <div class="mapping-stat"><b>${currentNone.length}</b><span>이번 조사에서 공개 증거 미확인<br>공식·민감 영역 다수</span></div>
        <div class="mapping-stat"><b>0/15</b><span>FlowMe 관찰 사용자 기준선<br>외부 댓글과 별개</span></div>
      </div>
      <div class="supply-lanes">
        <div class="lane"><b>40%</b><strong>행동 증거형</strong><p>루틴·레시피·만들기처럼 E3 이상 신호가 있는 원본. P0의 사용성 관찰을 우선한다.</p></div>
        <div class="lane"><b>20%</b><strong>결과물 수요형</strong><p>엑셀·체크리스트·캘린더 요청이 반복되는 원본. 도착 형식부터 검증한다.</p></div>
        <div class="lane"><b>25%</b><strong>공식 필수형</strong><p>마감·서류·기간이 중요한 공식 원본. 댓글보다 정확성과 최신성이 기준이다.</p></div>
        <div class="lane"><b>15%</b><strong>전략 가설형</strong><p>공개 증거가 약한 새 분야. 미측정으로 표시하고 작게 시험한다.</p></div>
      </div>
      <p class="footer-note">비율은 초기 포트폴리오 구성에 대한 전략 제안이며 실제 수요 측정값이 아니다.</p>
    </section>

    <section class="slide core" id="slide-18">
      <div class="slide-head">
        <span class="slide-no">18</span>
        <div><div class="eyebrow">결론과 승인안</div><h2>콘텐츠 수가 아니라 실행 흔적을 공급 기준으로 삼는다</h2></div>
        <span class="claim-tag">CEO 승인 필요</span>
      </div>
      <div class="decision-final">
        <div class="approval-list">
          <div class="approval"><div class="check">1</div><div><b>E2와 E3을 구분한 증거 기준 승인</b><span>E2는 결과물 수요, E3 이상은 실제 적용 자기보고로 쓴다.</span></div><em>승인 권고</em></div>
          <div class="approval"><div class="check">2</div><div><b>루틴·레시피·만들기 우선 검증 승인</b><span>강한 공개 흔적이 있는 유형부터 FlowMe 도착 UX를 관찰한다.</span></div><em>승인 권고</em></div>
          <div class="approval"><div class="check">3</div><div><b>공급 경로별 발행 기준 분리 승인</b><span>행동 증거형·결과물 수요형·공식 필수형·전략 가설형을 섞지 않는다.</span></div><em>승인 권고</em></div>
        </div>
        <aside class="next-card">
          <h3>승인 후 다음 전략 작업</h3>
          <ol>
            <li>P0 후보에서 관찰 세션용 8~12개를 다시 고른다.</li>
            <li>각 후보의 기본 도착 형식과 최소 입력을 한 장으로 확정한다.</li>
            <li>실제 사용에서 ‘저장·시작·완료·재사용’을 분리 측정한다.</li>
          </ol>
          <p><b>이번 보고서가 답한 것</b><br>외부 콘텐츠가 개인 Flow로 바뀌는 공개 흔적이 실제로 존재하는가.</p>
          <p><b>아직 답하지 않은 것</b><br>FlowMe가 그 전환을 더 잘 만들 수 있는가.</p>
        </aside>
      </div>
    </section>

    <section class="slide appendix" id="appendix-sources">
      <div class="slide-head">
        <span class="slide-no">A1</span>
        <div><div class="eyebrow">근거 부록</div><h2>확인한 공개 원본 ${allSourceCount}개</h2></div>
        <span class="claim-tag">출처 링크</span>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>ID</th><th>플랫폼</th><th>카테고리</th><th>시장</th><th>원본</th><th>표본 역할</th></tr></thead>
          <tbody>${sourceIndexRows}</tbody>
        </table>
      </div>
    </section>

    <section class="slide appendix" id="appendix-p0">
      <div class="slide-head">
        <span class="slide-no">A2</span>
        <div><div class="eyebrow">근거 부록</div><h2>P0 후보 24개 외부 적용 증거 매핑</h2></div>
        <span class="claim-tag">저장소 + 공개 증거</span>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>#</th><th>후보</th><th>카테고리</th><th>원본</th><th>증거 상태</th><th>다음 행동</th></tr></thead>
          <tbody>${p0Rows}</tbody>
        </table>
      </div>
    </section>

    <section class="slide appendix" id="appendix-current">
      <div class="slide-head">
        <span class="slide-no">A3</span>
        <div><div class="eyebrow">근거 부록</div><h2>현재 대표 후보 44개 외부 적용 증거 매핑</h2></div>
        <span class="claim-tag">현재 저장소</span>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>슬러그</th><th>제목</th><th>카테고리</th><th>원본</th><th>도착</th><th>증거 상태</th></tr></thead>
          <tbody>${currentRows}</tbody>
        </table>
      </div>
    </section>

    <section class="slide appendix" id="appendix-review">
      <div class="slide-head">
        <span class="slide-no">A4</span>
        <div><div class="eyebrow">품질 부록</div><h2>재판정 84건 기록</h2></div>
        <span class="claim-tag">15% 재확인</span>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>ID</th><th>카테고리</th><th>자동</th><th>1차</th><th>2차</th><th>최종</th><th>익명화 발췌</th></tr></thead>
          <tbody>${reviewRows}</tbody>
        </table>
      </div>
      <p class="footer-note">84건 중 ${agreementCount}건 일치(${percentage(
        agreementCount,
        reviewedSubset.length,
      )}%). 두 건은 E3/E1로 갈려 E1로 보수적으로 확정했다.</p>
    </section>

    <section class="slide appendix" id="appendix-files">
      <div class="slide-head">
        <span class="slide-no">A5</span>
        <div><div class="eyebrow">문서·데이터</div><h2>보고서의 숫자와 원장을 같은 생성 로직으로 묶었다</h2></div>
        <span class="claim-tag">연결 문서</span>
      </div>
      <div class="appendix-links">
        <a class="appendix-link" href="./2026-07-27-flowme-content-personal-adoption-evidence-ledger.json">증거 원장 JSON · E2~E5 ${totalE2Plus}건</a>
        <a class="appendix-link" href="./2026-07-27-flowme-public-reaction-sample.json">고정 표본 JSON · 공개 반응 ${reviewedReactions.length}건</a>
        <a class="appendix-link" href="./2026-07-27-flowme-current-content-adoption-evidence-map.json">P0 24개·현재 44개 증거 매핑 JSON</a>
        <a class="appendix-link" href="./2026-07-27-flowme-content-supply-potential-ceo-ko.html">콘텐츠 공급 잠재력 보고서</a>
        <a class="appendix-link" href="./2026-07-22-flowme-vertical-service-content-coverage-atlas-ceo-ko.html">버티컬 서비스 콘텐츠 도감</a>
        <a class="appendix-link" href="./2026-07-18-flowme-flow-content-model-category-playbook-ceo-ko.html">Flow 콘텐츠 모델·카테고리 플레이북</a>
        <a class="appendix-link" href="./2026-07-14-flowme-parenting-creator-action-strategy-ceo-ko.html">육아·제작자 행동 전략 보고서</a>
        <a class="appendix-link" href="./2026-07-13-flowme-ecosystem-platform-vertical-strategy-ceo-ko.html">생태계·플랫폼·버티컬 전략 보고서</a>
      </div>
      <div class="note-grid">
        <div class="note"><b>확인된 사실</b><br>44개 원본, 560개 고정 반응, E2~E5 ${totalE2Plus}건, E3~E5 ${totalE3Plus}건, P0 24개, 현재 대표 후보 44개.</div>
        <div class="note danger"><b>미측정</b><br>FlowMe 저장률·시작률·완료율·재사용률, 제작자 전환율, 댓글이 실제 행동을 정확히 반영하는 비율.</div>
      </div>
      <p class="footer-note">자동 렌더링과 공개 댓글 분석은 실제 FlowMe 사용자 검증이 아니다. 실제 관찰 기준선은 0/15로 유지한다.</p>
    </section>
  </main>
</body>
</html>`;

writeFileSync(reportPath, reportHtml, 'utf8');

console.log(
  JSON.stringify(
    {
      reportPath,
      checkedSources: allSourceCount,
      fixedReactions: reviewedReactions.length,
      evidence: {
        e2ToE5: totalE2Plus,
        e3ToE5: totalE3Plus,
      },
      reread: {
        count: reviewedSubset.length,
        agreementRate: percentage(agreementCount, reviewedSubset.length),
      },
      maps: mappingSummary,
    },
    null,
    2,
  ),
);
