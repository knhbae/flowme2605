import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const assetDir = path.join(root, 'docs', 'content-audit', '2026-07-22-flow-content-demand-business-assets');
fs.mkdirSync(assetDir, { recursive: true });

const postView = (blogId, logNo) =>
  `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true&directAccess=false`;

const targets = [
  {
    id: 'gold-funmom',
    url: 'https://funmom.tistory.com/',
    anchors: [
      ['structure', ['전체 글보기', '한글공부', '수학공부']],
    ],
  },
  {
    id: 'gold-opic',
    url: 'https://mansour.tistory.com/entry/%EC%98%A4%ED%94%BD-%EB%AA%A8%EC%9D%98%EA%B3%A0%EC%82%AC-%EA%B3%B5%EB%B6%80-%EB%B0%A9%EB%B2%95',
    anchors: [
      ['plan', ['오픽 모의고사 공부 계획표', '구체적인 계획표']],
      ['download', ['엑셀 버전 다운로드', '2주 계획표']],
    ],
  },
  {
    id: 'gold-baby-food',
    url: postView('01695258757', '222768860919'),
    anchors: [
      ['files', ['초기식단표', '파일 비번']],
      ['comments', ['댓글 9,999+', '댓글']],
    ],
  },
  {
    id: 'gold-reading',
    url: postView('naristyle87', '222978131890'),
    anchors: [
      ['routine', ['아침 1시간', 'read and write', '한달에 5권']],
      ['comments', ['댓글 37', '댓글']],
    ],
  },
  {
    id: 'gold-new-car',
    url: 'https://web.getcha.kr/blog/complete-guide-new-car-purchase-procedure-for-beginners',
    anchors: [
      ['steps', ['1단계: 예산 설정 및 차량 선택', '계약 체결']],
      ['business', ['3분 만에 새 차 견적받기', '무료 견적받기']],
    ],
  },
  {
    id: 'gold-vaccination',
    url: 'https://khms.or.kr/healthy_life/prevention/vaccination_child',
    anchors: [
      ['schedule', ['예방접종 일정표', 'BCG', 'B형간염']],
    ],
  },
  {
    id: 'gold-moving',
    url: 'https://www.ajd.co.kr/contents/basic-tip/detail/%EC%9D%B4%EC%82%AC_%EC%A4%80%EB%B9%84_%EC%B2%B4%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8_2024_%EC%99%84%EB%B2%BD%EC%A0%95%EB%A6%AC!-23363',
    anchors: [
      ['table', ['D-30', '이사 방식 확인']],
      ['metrics', ['조회 98,401', '스크랩 20']],
    ],
  },
  {
    id: 'gold-wedding-naver',
    url: postView('wilklove', '223518896995'),
    anchors: [
      ['timeline', ['12개월 전', '웨딩홀 최종 계약']],
      ['comments', ['댓글 1,102', '노션이 필요하신 분']],
    ],
  },
  {
    id: 'gold-wedding-guide',
    url: 'https://gongysd.com/wedding-notion/?bmode=view&idx=167989966',
    anchors: [['body', ['결혼 준비', '웨딩']]],
  },
  {
    id: 'gold-allblanc',
    url: 'https://www.youtube.com/playlist?list=PLhWr-n-L9kWj5NFTs11Yb8CpZeKC-edMq',
    anchors: [
      ['videos', ['7 Days Abs Challenge', '코어 + 복근 한방에']],
    ],
  },
  {
    id: 'gold-allblanc-video',
    url: 'https://www.youtube.com/watch?v=XwUKn-52ykk',
    anchors: [
      ['comments', ['댓글 154', '댓글']],
    ],
  },
  {
    id: 'new-ohouse-storage',
    url: 'https://ohou.se/advices/9345',
    anchors: [
      ['rows', ['쓰레기 봉투 수납 신박팁', '틈새 공중부양 수납 팁']],
      ['metrics', ['조회', '684,233', '댓글 398']],
    ],
  },
  {
    id: 'new-ohouse-lunchbox',
    url: 'https://ohou.se/advices/9098',
    anchors: [
      ['rows', ['도시락 일주일 식단표', '스팸볶음밥']],
      ['metrics', ['10,942', '댓글 27', '스크랩 451']],
    ],
  },
  {
    id: 'new-ohouse-remodel',
    url: 'https://ohou.se/advices/1972',
    anchors: [
      ['rows', ['시공업체 정보를 확인해요', '착공일과 공사 완료일']],
      ['metrics', ['253,495', '댓글 124', '스크랩 8,029']],
    ],
  },
  {
    id: 'new-ossu',
    url: 'https://github.com/ossu/computer-science',
    anchors: [
      ['community', ['Fork 25.7k', 'Star 207k', 'Issues 16']],
      ['curriculum', ['Intro CS', 'Core programming']],
    ],
  },
  {
    id: 'support-kocw',
    url: 'https://kocw.net/home/search/kemView.do?kemId=1422415',
    anchors: [['lessons', ['강의 목록', '차시별 강의']]],
  },
  {
    id: 'support-recipe',
    url: 'https://www.10000recipe.com/recipe/6865737',
    anchors: [['steps', ['조리순서', '야채 참치 볶음']]],
  },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: 'ko-KR',
  colorScheme: 'light',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36',
});

const results = [];

async function dismissOverlays(page) {
  const labels = ['닫기', '나중에', '동의', '확인', '앱으로 보기 닫기'];
  for (const label of labels) {
    const locator = page.getByRole('button', { name: label, exact: true }).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click({ timeout: 1_000 }).catch(() => {});
    }
  }
  await page.keyboard.press('Escape').catch(() => {});
}

async function screenshot(page, filename) {
  const target = path.join(assetDir, filename);
  await page.screenshot({ path: target, animations: 'disabled' });
  return path.basename(target);
}

async function scrollToAnyText(page, texts) {
  for (const text of texts) {
    const locator = page.getByText(text, { exact: false }).first();
    if (await locator.count().catch(() => 0)) {
      await locator.scrollIntoViewIfNeeded({ timeout: 3_000 }).catch(() => {});
      await page.evaluate(() => window.scrollBy(0, -180)).catch(() => {});
      await page.waitForTimeout(800);
      return text;
    }
  }
  return null;
}

for (const target of targets) {
  const page = await context.newPage();
  const record = { id: target.id, sourceUrl: target.url, openedAt: new Date().toISOString(), screenshots: [] };
  try {
    const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(target.url.includes('youtube.com') ? 4_500 : 2_000);
    await dismissOverlays(page);
    record.httpStatus = response?.status() ?? null;
    record.finalUrl = page.url();
    record.title = await page.title();
    record.screenshots.push({ kind: 'top', file: await screenshot(page, `${target.id}-top.png`) });

    for (const [kind, texts] of target.anchors) {
      const matchedText = await scrollToAnyText(page, texts);
      if (!matchedText) {
        record.screenshots.push({ kind, file: null, limitation: 'anchor_not_found', tried: texts });
        continue;
      }
      record.screenshots.push({ kind, matchedText, file: await screenshot(page, `${target.id}-${kind}.png`) });
    }
  } catch (error) {
    record.error = String(error?.message || error);
  } finally {
    results.push(record);
    await page.close();
  }
}

await browser.close();
fs.writeFileSync(
  path.join(assetDir, 'screenshot-evidence-v1.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), targetCount: targets.length, results }, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({ targetCount: targets.length, capturedFiles: results.flatMap((row) => row.screenshots).filter((shot) => shot.file).length, errors: results.filter((row) => row.error).length }, null, 2));
