// Screenshot of the page after 10 clicks of the wells-first strategy, plus the boxes of the parts for the callouts of Figure 1.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  await p.goto('http://localhost:8777/explore-click.html'); await p.waitForSelector('#map .heatmaplayer'); await p.waitForTimeout(500);
  for (let k = 0; k < 10; k++) {
    const labs = await p.$$eval('#sugg button', bs => bs.map(x => x.parentElement.textContent.slice(0, 40)));
    let idx = labs.findIndex(l => /Unmeasured well/.test(l)); if (idx < 0) idx = labs.findIndex(l => /Pass guess/.test(l)); if (idx < 0) idx = 0;
    await p.click(`#sugg button[data-k="${idx}"]`); await p.waitForTimeout(150);
  }
  await p.mouse.move(5, 5); await p.waitForTimeout(300);
  // hide the parts that do not matter for the figure, so the page is short enough to read
  await p.evaluate(() => { for (const id of ['kb-go', 'mol']) { const c = document.getElementById(id).closest('.card'); if (c) c.style.display = 'none'; } const rd = [...document.querySelectorAll('.card h2')].find(h => /How to read/.test(h.textContent)); if (rd) rd.closest('.card').style.display = 'none'; const lb = document.getElementById('logbox'); lb.style.maxHeight = 'none'; lb.scrollTop = 0; });
  await p.waitForTimeout(300);
  const box = async sel => { const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const c = e.closest('.card, section, .panel') || e.parentElement; const r = c.getBoundingClientRect(); return {x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height}; }, sel); return r; };
  const boxes = {map: await box('#map'), sugg: await box('#sugg'), est: await box('#barrier'), log: await box('#log'), hover: await box('#hov')};
  const size = await p.evaluate(() => ({w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight}));
  await p.screenshot({ path: 'data/page_after10.png', fullPage: true });
  fs.writeFileSync('data/page_boxes.json', JSON.stringify({boxes, size}));
  console.log(JSON.stringify({boxes, size})); await b.close();
})();
