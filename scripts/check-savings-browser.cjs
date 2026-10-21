// Usage: node scripts/check-savings-browser.cjs <playwright-package-path> [base-url]
const assert=require('node:assert/strict');
const {chromium}=require(process.argv[2] || 'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));const base=process.argv[3] || 'http://localhost:3001';
  for(const width of [1440,1024,390]){
   await page.setViewportSize({width,height:1000});await page.goto(base+'/savings',{waitUntil:'networkidle'});await page.getByRole('button',{name:/Analysis Period:/}).waitFor();
   assert.equal(await page.getByRole('tab').count(),2,'Planner remains hidden');
   const metrics=page.getByRole('region',{name:'Cost performance metrics'});const before=await metrics.textContent();
   await page.getByRole('button',{name:/Analysis Period:/}).click();await page.getByRole('combobox',{name:'Analysis year'}).selectOption('2025');await page.getByRole('button',{name:'Done',exact:true}).click();await page.waitForURL(/year=2025/);
   assert.notEqual(await metrics.textContent(),before,'Year changes cost data');
   await page.getByRole('button',{name:/Analysis Period:/}).click();await page.getByRole('button',{name:'Q1',exact:true}).click();await page.waitForURL(/endMonth=2/);
   await page.getByRole('button',{name:'View monthly cost and differences'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
   await page.getByRole('tab',{name:'Savings Opportunities',exact:true}).click();
   await page.getByRole('button',{name:/^Filters/}).click();await page.getByRole('combobox',{name:'Category',exact:true}).focus();await page.keyboard.press('Escape');
   await page.getByRole('button',{name:/Opportunity portfolio sort:/}).click();await page.getByRole('option',{name:/Financial opportunity/}).click();
   await page.getByRole('button',{name:/Assess power-factor correction/}).click();await page.getByRole('region',{name:'Details for AUD-007'}).waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page overflow');
   console.log('Savings '+width+'px: year/period filters, modal, portfolio sorting and details passed');
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
