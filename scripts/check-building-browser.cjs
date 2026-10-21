// Usage: node scripts/check-building-browser.cjs <playwright-package-path> [base-url]
const assert = require('node:assert/strict');
const { chromium } = require(process.argv[2] || 'playwright');
(async () => {
 const browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
  const page = await browser.newPage();
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  const base=process.argv[3] || 'http://localhost:3001';
  for (const width of [1440,1024,390]) {
   await page.setViewportSize({width,height:1000}); await page.goto(base+'/building');
   await page.locator('canvas').waitFor();
   await page.waitForFunction(()=>{const c=document.querySelector('canvas');return c && Math.abs(c.getBoundingClientRect().width-c.parentElement.getBoundingClientRect().width)<1;});
   const canvas=page.locator('canvas');
   const bounds=await canvas.evaluate(node=>{const c=node.getBoundingClientRect(),v=node.closest('[class*=exteriorViewer]').getBoundingClientRect();return {canvas:c.x+c.width/2,viewer:v.x+v.width/2};});
   assert.ok(Math.abs(bounds.canvas-bounds.viewer)<1,'Model canvas must stay centered');
   assert.equal(await page.getByRole('button',{name:'Floor 9 Plan',exact:true}).count(),0);
   await page.getByRole('button',{name:/Floor:/}).click();await page.getByRole('dialog',{name:'Floor',exact:true}).getByRole('button',{name:'Floor 4',exact:true}).click();await page.waitForURL(/floors=F04/);await page.waitForFunction(()=>document.querySelector('aside[aria-label="Floor energy details"]')?.textContent.includes('Electricity:'));
   const details=page.getByRole('complementary',{name:'Floor energy details'});
   assert.match(await details.textContent(),/Electricity:/);
   await page.getByRole('button',{name:/Analysis Period:/}).click();await page.getByRole('combobox',{name:'Start month'}).selectOption('6');await page.getByRole('combobox',{name:'End month'}).selectOption('6');await page.getByRole('button',{name:'Done',exact:true}).click();await page.waitForURL(/startMonth=6.*endMonth=6/);
   await page.waitForFunction(()=>document.querySelector('aside[aria-label="Floor energy details"]')?.textContent.includes('9,925'));assert.match(await details.textContent(),/9,925/);
   await page.getByRole('button',{name:/^Filters/}).click();await page.getByRole('combobox',{name:'Heatmap metric'}).selectOption('intensity');await page.getByRole('button',{name:'Apply filters',exact:true}).click();
   assert.ok((await details.textContent()).includes('kWh/m'));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page overflow');
   if(width===1440){
    await page.waitForTimeout(300);const initial=await canvas.screenshot(),box=await canvas.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+80,box.y+box.height/2+20,{steps:10});await page.mouse.up();await page.waitForTimeout(400);
    assert.notDeepEqual(await canvas.screenshot(),initial,'Orbit remains interactive');
   }
   console.log('Building '+width+'px: data filters, selected details, centering and overflow passed');
  }
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
