async (page) => {
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  const results=[];
  for(const [width,height] of [[390,844],[1440,900]]){
    await page.setViewportSize({width,height});await page.reload();
    const summary=page.getByText('검사 한계·로컬 근거',{exact:true});await summary.click();
    await page.getByRole('heading',{name:'날짜·부분 붙여넣기 갭 검증 결과',exact:true}).scrollIntoViewIfNeeded();
    const geometry=await page.evaluate(()=>({overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,
      brokenImages:[...document.images].filter(img=>!img.complete||!img.naturalWidth).length,
      smallText:[...document.querySelectorAll('td,p')].filter(node=>parseFloat(getComputedStyle(node).fontSize)<14).length,
      links:[...document.querySelectorAll('.links a')].map(node=>{const r=node.getBoundingClientRect();return {height:r.height,width:r.width};})}));
    await page.screenshot({path:`output/playwright/feedback-gaps/report-${width}x${height}.png`,fullPage:true});
    results.push({width,height,...geometry,pass:geometry.overflow===0&&geometry.brokenImages===0&&geometry.smallText===0&&geometry.links.every(link=>link.height>=44)});
  }
  return {schema:'flowme-feedback-gaps-report-browser/1',results,passed:results.filter(result=>result.pass).length,failed:results.filter(result=>!result.pass).length,pageErrors,consoleErrors,observedUsers:0};
}
