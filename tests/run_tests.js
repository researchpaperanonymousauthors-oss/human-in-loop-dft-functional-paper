// Page tests for the Skala map explorer package. Needs Node and Playwright (npm i playwright). Run from the package root:  node tests/run_tests.js
// Serves the package at http://127.0.0.1:PORT/a/b/repo/ (a sub-folder, as on GitHub Pages) and also opens the pages from file://.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), PREFIX = '/a/b/repo/', PAGES = ['index', 'demo', 'explore-click', 'explore-box', 'compare', 'reproduce'];
const MIME = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/markdown', '.py': 'text/plain', '.jsonl': 'text/plain', '.cff': 'text/plain'};
const fails = []; const fail = (t, m) => { fails.push(t + ': ' + m); console.log('FAIL', t, m); }; const pass = t => console.log('ok  ', t);
const shots = fs.mkdtempSync(path.join(os.tmpdir(), 'b3shots-'));
const outside = [];
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (!u.startsWith(PREFIX)) { outside.push(u); res.writeHead(404); res.end('outside prefix'); return; }
  let f = path.join(ROOT, u.slice(PREFIX.length)); if (f.endsWith(path.sep) || (fs.existsSync(f) && fs.statSync(f).isDirectory())) f = path.join(f, 'index.html');
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, {'content-type': MIME[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(res);
});
const BANNED = [/\bparticipants?\b/i, /\bvolunteers?\b/i, /\buser stud(y|ies)\b/i, /\bAI\b/, /\bagents?\b/i, /\blanguage models?\b/i, /\bchooser\b/i, /\bRoute B\b/];
const med = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const PORT = server.address().port, BASE = `http://127.0.0.1:${PORT}${PREFIX}`;
  const b = await chromium.launch();
  // ---- tests 1, 2, 7: every page, two sizes, served from a sub-folder and from file://
  for (const [origin, label] of [[BASE + 'site/', 'served'], ['file://' + path.join(ROOT, 'site') + '/', 'file']]) {
    for (const [vw, vh] of [[1280, 900], [390, 844]]) {
      for (const pg of PAGES) {
        const p = await b.newPage({viewport: {width: vw, height: vh}}); const errs = [];
        p.on('pageerror', e => errs.push('pageerror ' + String(e).slice(0, 160))); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 160)); });
        p.on('requestfailed', r => errs.push('request failed ' + r.url())); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
        await p.goto(origin + pg + '.html' + (pg === 'demo' ? '?autoplay=0' : '')); await p.waitForLoadState('load'); await p.waitForTimeout(1200);
        const t = `${label} ${vw}x${vh} ${pg}`;
        const sw = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); if (sw[0] > sw[1]) errs.push(`horizontal scroll ${sw[0]} > ${sw[1]}`);
        const robots = await p.evaluate(() => (document.querySelector('meta[name=robots]') || {}).content || ''); if (!/noindex/.test(robots)) errs.push('no noindex meta tag');
        const txt = await p.evaluate(() => document.body.innerText); for (const re of BANNED) if (re.test(txt)) errs.push('banned word ' + re);
        const small = await p.evaluate(() => [...document.querySelectorAll('button, a.btn, nav a, select, input')].filter(e => e.offsetParent && (e.getBoundingClientRect().height < 43.5)).map(e => e.tagName + '#' + e.id).slice(0, 3)); if (small.length) errs.push('target below 44 px: ' + small.join(','));
        await p.screenshot({path: path.join(shots, `${label}_${vw}_${pg}.png`), fullPage: true});
        errs.length ? fail(t, errs.join(' | ')) : pass(t); await p.close();
      }
    }
  }
  if (outside.length) fail('requests outside the prefix', outside.slice(0, 5).join(', ')); else pass('no request outside the prefix');
  // ---- test 3: internal links and the root redirect
  { const p = await b.newPage(); const seen = new Set(); let bad = [];
    for (const pg of PAGES) { await p.goto(BASE + 'site/' + pg + '.html?autoplay=0'); const urls = await p.evaluate(() => [...document.querySelectorAll('a[href], img[src], script[src], link[href]')].map(e => e.href || e.src)); 
      for (const u of urls) { if (!u.startsWith(BASE) || seen.has(u.split('#')[0].split('?')[0])) continue; seen.add(u.split('#')[0].split('?')[0]); const r = await p.request.get(u.split('#')[0]); if (r.status() !== 200) bad.push(r.status() + ' ' + u); } }
    bad.length ? fail('internal links', bad.join(', ')) : pass(`internal links (${seen.size} files return 200)`);
    await p.goto(BASE); await p.waitForURL(/site\/index\.html/, {timeout: 5000}).then(() => pass('root index.html redirects to site/index.html')).catch(() => fail('root redirect', p.url())); await p.close(); }
  // ---- test 4: demo numbers
  { const p = await b.newPage({viewport: {width: 1280, height: 900}}); await p.goto(BASE + 'site/demo.html?autoplay=0'); await p.waitForSelector('#map .heatmaplayer');
    const exp = {wells: [[34.4, 41.8, 42.1, 42.1], 0.9], pass: [[34.4, 31.1, 31.0, 29.7], 13.3], random: [[34.4, 38.5, 38.4, 43.2], 0.2]};
    for (const [sc, [arr, d]] of Object.entries(exp)) {
      await p.goto(BASE + `site/demo.html?scenario=${sc}&start=1&autoplay=0`); await p.waitForSelector('#map .heatmaplayer');
      const r = await p.evaluate(() => ({a: [0, 5, 10, 20].map(k => +B3_DEMO.goto(k).toFixed(1)), diff: document.getElementById('diff').textContent}));
      (JSON.stringify(r.a) === JSON.stringify(arr) && +r.diff === d) ? pass('demo numbers ' + sc) : fail('demo numbers ' + sc, JSON.stringify(r) + ' expected ' + JSON.stringify([arr, d])); }
    const f = await p.evaluate(() => { const out = []; for (const sc of ['wells', 'pass', 'random']) for (let s = 1; s <= 40; s++) { B3_DEMO.setup(sc, s); if (B3_CHECK.failed) out.push(sc + s); } return out; });
    f.length ? fail('B3_CHECK.failed', f.slice(0, 5).join(',')) : pass('B3_CHECK.failed false for 3 scenarios x 40 starts');
    await p.goto(BASE + 'site/demo.html?scenario=pass&start=3'); await p.waitForSelector('#map .heatmaplayer'); await p.selectOption('#speed', '4'); await p.waitForTimeout(700); await p.keyboard.press('Space');
    const k1 = await p.textContent('#k'); await p.waitForTimeout(1000); const k2 = await p.textContent('#k'); k1 === k2 ? pass('Space pauses') : fail('Space pauses', k1 + ' then ' + k2);
    await p.keyboard.press('Space'); await p.waitForSelector('#end:not([hidden])', {timeout: 20000}).then(() => pass('speed-4 run reaches the end card')).catch(() => fail('end card', 'not reached')); await p.close(); }
  // ---- test 5: Table 1
  { const p = await b.newPage(); await p.goto(BASE + 'site/compare.html'); await p.waitForSelector('#t1 tbody'); const t = await p.evaluate(() => B3_TABLE1);
    const tab = {random: [[4.0, 3.3, 1.8], [10, 25, 33]], spread: [[4.4, 3.9, 3.0], [15, 30, 38]], pass_only: [[9.2, 10.5, 12.8], [2, 2, 5]], uncertainty_only: [[3.1, 4.2, 3.9], [16, 35, 31]], wells_then_pass: [[1.4, 0.9, 0.9], [31, 31, 31]]};
    let bad = 0; for (const [n, [m, o]] of Object.entries(tab)) for (let i = 0; i < 3; i++) if (Math.abs(t.rows[n].med[i] - m[i]) > 0.05 || t.rows[n].ok[i] !== o[i]) bad++;
    (!bad && Math.abs(t.cheap - 8.7) < 0.05) ? pass('Table 1 and the cheap-map error match') : fail('Table 1', bad + ' mismatches'); await p.close(); }
  // ---- test 6: explorer
  { const p = await b.newPage({viewport: {width: 1280, height: 900}}); await p.goto(BASE + 'site/explore-click.html'); await p.waitForSelector('#map .heatmaplayer');
    const bx = await p.locator('#map .nsewdrag').boundingBox(); await p.mouse.click(bx.x + bx.width * 0.5, bx.y + bx.height * 0.5); await p.waitForTimeout(300);
    (await p.textContent('#count')) === '1' ? pass('a click reveals one point') : fail('click', await p.textContent('#count'));
    await p.fill('#kb-angle', '150'); await p.fill('#kb-dist', '1.5'); await p.click('#kb-go'); await p.waitForTimeout(200);
    (await p.textContent('#count')) === '2' ? pass('keyboard form reveals the nearest stored point') : fail('keyboard form', await p.textContent('#count'));
    await p.goto(BASE + 'site/explore-box.html'); await p.waitForSelector('#map .heatmaplayer'); const b2 = await p.locator('#map .nsewdrag').boundingBox();
    await p.mouse.move(b2.x + b2.width * 0.2, b2.y + b2.height * 0.2); await p.mouse.down(); await p.mouse.move(b2.x + b2.width * 0.5, b2.y + b2.height * 0.6, {steps: 8}); await p.mouse.up(); await p.waitForTimeout(500);
    const n = +(await p.textContent('#count')); (n >= 1 && n <= 12) ? pass('a zoom box reveals at most 12 points (' + n + ')') : fail('zoom box', String(n)); await p.close(); }
  await b.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED (screenshots in ${shots})` : `\nall tests passed (screenshots in ${shots})`); process.exit(fails.length ? 1 : 0);
})();
