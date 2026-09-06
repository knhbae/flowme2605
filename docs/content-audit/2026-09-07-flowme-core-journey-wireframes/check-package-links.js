async (page) => {
  const base = 'http://127.0.0.1:8767/';
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + 'index.html');
  await page.getByRole('button', { name: '검토 요약', exact: true }).click();
  const section = page.locator('details').filter({
    has: page.getByText('기존 개발 근거와 다음 작업', { exact: true })
  });
  await section.locator('summary').click();
  const links = await section.locator('a').evaluateAll(as => as.map(a => ({
    label: a.textContent, href: a.getAttribute('href')
  })));
  const responses = [];
  for (const link of links) {
    const response = await page.request.get(base + link.href);
    responses.push({ ...link, status: response.status() });
  }
  const layouts = [];
  for (const [width, height] of [[1440, 900], [1194, 834], [1024, 768], [390, 844]]) {
    await page.setViewportSize({ width, height });
    layouts.push({
      width, height,
      overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    });
  }
  await section.getByRole('link', { name: '기존 v4.1 기준 화면', exact: true }).click();
  const image = page.locator('img');
  await image.waitFor({ state: 'visible' });
  const reference = await image.evaluate(el => ({
    complete: el.complete, width: el.naturalWidth, height: el.naturalHeight
  }));
  await page.goBack();
  await page.setViewportSize({ width: 1194, height: 834 });
  await page.getByRole('button', { name: '개인 기록', exact: true }).click();
  const result = { responses, layouts, reference, errors };
  if (responses.length !== 4 || responses.some(r => r.status !== 200) ||
      layouts.some(l => l.overflow > 0) || !reference.complete ||
      reference.width === 0 || errors.length) {
    throw new Error(JSON.stringify(result));
  }
  return result;
}
