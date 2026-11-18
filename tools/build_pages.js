// Builds the six static pages of site/ from tools/src/<name>.body.html: head, shared navigation, footer, script tags.
// Usage: node tools/build_pages.js [--check]   (--check fails if a page is stale)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SRC = path.join(__dirname, 'src'), SITE = path.join(ROOT, 'site');
const MAP = ['plotly.min.js', 'data/hono.js', 'js/engine.js', 'js/mapview.js'];
const PAGES = [
  {file: 'index.html', key: 'HOME', title: 'Skala map explorer: human-steered sampling of energy maps', scripts: []},
  {file: 'demo.html', key: 'DEMO', title: 'Auto-play demo: a simulated clicker', scripts: [...MAP, 'data/simulation.js', 'js/demo.js'], mode: 'demo'},
  {file: 'explore-click.html', key: 'CLICK', title: 'Explore: click to reveal Skala energies', scripts: [...MAP, 'js/explorer.js'], mode: 'click'},
  {file: 'explore-box.html', key: 'BOX', title: 'Explore: zoom box to reveal Skala energies', scripts: [...MAP, 'js/explorer.js'], mode: 'zoom'},
  {file: 'compare.html', key: 'COMPARE', title: 'Compare click strategies (40 simulated starts)', scripts: ['data/simulation.js', 'js/compare.js']},
  {file: 'reproduce.html', key: 'REPRO', title: 'Reproduce: methods, versions, commands, licences', scripts: []},
];
const nav = fs.readFileSync(path.join(SRC, 'nav.html'), 'utf8');
const stale = [];
for (const p of PAGES) {
  let n = nav; for (const k of ['HOME', 'DEMO', 'CLICK', 'BOX', 'COMPARE', 'REPRO']) n = n.replace('@' + k + '@', k === p.key ? ' aria-current="page"' : '');
  const body = fs.readFileSync(path.join(SRC, p.file.replace('.html', '.body.html')), 'utf8');
  const scripts = p.scripts.map(s => `<script src="${s}" defer></script>`).join('\n');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>${p.title}</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body${p.mode ? ` data-mode="${p.mode}"` : ''}>
${n}${body}
<footer>Replay mode: every Skala-1.1 / def2-SVP energy shown here was computed in advance and stored; no quantum-chemistry calculation runs in your browser. The clickers on the demo and comparison pages are simulated by fixed rules, not people. Code: MIT. Data and figures: CC BY 4.0 (see the Reproduce page).</footer>
${scripts}
</body>
</html>
`;
  const out = path.join(SITE, p.file);
  if (process.argv.includes('--check')) { if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== html) stale.push(p.file); }
  else fs.writeFileSync(out, html);
}
if (process.argv.includes('--check')) { if (stale.length) { console.error('stale pages:', stale.join(', ')); process.exit(1); } console.log('pages up to date'); }
else console.log('wrote', PAGES.length, 'pages');
